pub mod identity;
pub mod routes;

use serde::{Deserialize, Serialize};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use rusqlite::Connection;
use tauri::State;
use crate::db::DbState;

#[derive(Clone)]
pub struct ServerAppState {
    pub db: Arc<Mutex<Connection>>,
    #[allow(dead_code)]
    pub app_dir: PathBuf,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerStatus {
    pub is_running: bool,
    pub port: u16,
    pub local_ips: Vec<String>,
}

fn get_local_ips() -> Vec<String> {
    let mut ips = Vec::new();
    if let Ok(hostname) = std::env::var("COMPUTERNAME") {
        ips.push(format!("localhost (Computer: {})", hostname));
    } else {
        ips.push("localhost".to_string());
    }

    // Tenta di ottenere gli IP delle interfacce locali
    if let Ok(socket) = std::net::UdpSocket::bind("0.0.0.0:0") {
        if socket.connect("8.8.8.8:80").is_ok() {
            if let Ok(local_addr) = socket.local_addr() {
                let ip_str = local_addr.ip().to_string();
                if !ips.contains(&ip_str) {
                    ips.push(ip_str);
                }
            }
        }
    }

    ips
}

#[tauri::command]
pub async fn get_server_status(
    state: State<'_, DbState>,
) -> Result<ServerStatus, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    let port = config.server_port.unwrap_or(9700);
    let is_running = state.server_shutdown.lock().map_err(|e| e.to_string())?.is_some();
    let local_ips = get_local_ips();

    Ok(ServerStatus {
        is_running,
        port,
        local_ips,
    })
}

#[tauri::command]
pub async fn start_server(
    port_override: Option<u16>,
    state: State<'_, DbState>,
) -> Result<ServerStatus, String> {
    {
        let shutdown_guard = state.server_shutdown.lock().map_err(|e| e.to_string())?;
        if shutdown_guard.is_some() {
            // Già in esecuzione
            let config = state.config.lock().map_err(|e| e.to_string())?;
            return Ok(ServerStatus {
                is_running: true,
                port: config.server_port.unwrap_or(9700),
                local_ips: get_local_ips(),
            });
        }
    }

    let port = port_override.or_else(|| {
        state.config.lock().ok().and_then(|c| c.server_port)
    }).unwrap_or(9700);

    let server_state = Arc::new(ServerAppState {
        db: state.db.clone(),
        app_dir: state.app_dir.clone(),
    });

    let router = routes::build_router(server_state);
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    let listener = tokio::net::TcpListener::bind(addr).await
        .map_err(|e| format!("Impossibile avviare il server sulla porta {}: {}", port, e))?;

    let (tx, rx) = tokio::sync::oneshot::channel::<()>();

    // Spawn server background task
    tokio::spawn(async move {
        axum::serve(listener, router)
            .with_graceful_shutdown(async {
                let _ = rx.await;
            })
            .await
            .unwrap_or_default();
    });

    {
        let mut shutdown_guard = state.server_shutdown.lock().map_err(|e| e.to_string())?;
        *shutdown_guard = Some(tx);
    }

    // Aggiorna config
    if let Ok(mut config) = state.config.lock() {
        config.mode = "server".to_string();
        config.server_port = Some(port);
        let _ = config.save(&state.app_dir);
    }

    Ok(ServerStatus {
        is_running: true,
        port,
        local_ips: get_local_ips(),
    })
}

#[tauri::command]
pub async fn stop_server(
    state: State<'_, DbState>,
) -> Result<ServerStatus, String> {
    let mut shutdown_guard = state.server_shutdown.lock().map_err(|e| e.to_string())?;
    if let Some(tx) = shutdown_guard.take() {
        let _ = tx.send(());
    }

    if let Ok(mut config) = state.config.lock() {
        if config.mode == "server" {
            config.mode = "local".to_string();
            let _ = config.save(&state.app_dir);
        }
    }

    let config = state.config.lock().map_err(|e| e.to_string())?;
    let port = config.server_port.unwrap_or(9700);

    Ok(ServerStatus {
        is_running: false,
        port,
        local_ips: get_local_ips(),
    })
}
