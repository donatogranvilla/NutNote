// Prevents additional console window on Windows, DO NOT REMOVE!!
#![windows_subsystem = "windows"]

mod config;
mod db;
mod schema;
mod commands;
mod server;
mod wiki_seed;

use std::sync::{Arc, Mutex};
use tauri::Manager;

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let app_dir = app.path().app_data_dir().unwrap_or_else(|_| std::path::PathBuf::from("."));
            std::fs::create_dir_all(&app_dir).unwrap();
            
            // Carica configurazione NutNote
            let config = config::NutNoteConfig::load(&app_dir);
            let db_file = config.resolve_db_file(&app_dir);
            
            let conn = db::init_db(&db_file).expect("Failed to initialize database");
            let db_arc = Arc::new(Mutex::new(conn));

            let (initial_shutdown_tx, initial_shutdown_rx) = if config.mode == "server" {
                let (tx, rx) = tokio::sync::oneshot::channel::<()>();
                (Some(tx), Some(rx))
            } else {
                (None, None)
            };

            app.manage(db::DbState {
                db: db_arc.clone(),
                active_user_id: Mutex::new(None),
                config: Mutex::new(config.clone()),
                app_dir: app_dir.clone(),
                server_shutdown: Mutex::new(initial_shutdown_tx),
            });

            // Se la modalità salvata è "server", avvia automaticamente il server HTTP integrato
            if config.mode == "server" {
                if let Some(rx) = initial_shutdown_rx {
                    let port = config.server_port.unwrap_or(9700);
                    let server_state = Arc::new(server::ServerAppState {
                        db: db_arc.clone(),
                        app_dir: app_dir.clone(),
                    });
                    let router = server::routes::build_router(server_state);
                    let addr = std::net::SocketAddr::from(([0, 0, 0, 0], port));
                    
                    tauri::async_runtime::spawn(async move {
                        if let Ok(listener) = tokio::net::TcpListener::bind(addr).await {
                            let _ = axum::serve(listener, router)
                                .with_graceful_shutdown(async {
                                    let _ = rx.await;
                                })
                                .await;
                        }
                    });
                }
            }
            
            Ok(())
        })
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            // Pages
            commands::pages::create_page,
            commands::pages::get_page,
            commands::pages::get_page_with_ancestors,
            commands::pages::query_pages,
            commands::pages::update_page,
            commands::pages::move_page,
            commands::pages::delete_page,
            commands::pages::toggle_pin_page,
            commands::pages::get_pinned_pages,
            commands::pages::get_recent_pages,
            // Page Types
            commands::page_types::get_page_types,
            commands::page_types::get_page_type,
            // Blocks
            commands::blocks::get_blocks,
            commands::blocks::save_blocks,
            // Relations
            commands::relations::create_page_relation,
            commands::relations::delete_page_relation,
            commands::relations::get_page_relations,
            // Search
            commands::search::search_pages,
            // Users
            commands::users::get_users,
            commands::users::get_all_users_admin,
            commands::users::authenticate_user,
            commands::users::create_user,
            commands::users::update_user_password,
            commands::users::update_user,
            commands::users::delete_user,
            commands::users::set_active_user,
            commands::users::get_active_user,
            // Teams
            commands::teams::get_teams,
            commands::teams::create_team,
            commands::teams::update_team,
            commands::teams::delete_team,
            // Chat
            commands::chat::get_chat_messages,
            commands::chat::create_chat_message,
            // Files
            commands::files::upload_file,
            commands::files::list_directory_contents,
            commands::files::open_path_in_os,
            // Config
            commands::config::get_config,
            commands::config::save_config,
            commands::config::test_db_path,
            // ChangeLog & Revisioni
            commands::changelog::get_entity_history,
            commands::changelog::get_recent_changes,
            commands::changelog::restore_field,
            commands::changelog::cleanup_old_logs,
            // Server Embedded
            server::get_server_status,
            server::start_server,
            server::stop_server,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
