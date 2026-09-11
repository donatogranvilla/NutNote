use tauri::State;
use std::path::PathBuf;
use crate::db::DbState;
use crate::config::NutNoteConfig;

#[tauri::command]
pub async fn get_config(state: State<'_, DbState>) -> Result<NutNoteConfig, String> {
    let config = state.config.lock().map_err(|e| e.to_string())?;
    Ok(config.clone())
}

#[tauri::command]
pub async fn save_config(
    new_config: NutNoteConfig,
    state: State<'_, DbState>,
) -> Result<bool, String> {
    new_config.save(&state.app_dir)?;
    let mut config = state.config.lock().map_err(|e| e.to_string())?;
    *config = new_config;
    Ok(true)
}

#[tauri::command]
pub async fn test_db_path(path: String) -> Result<bool, String> {
    let p = PathBuf::from(&path);
    if p.exists() {
        if p.is_dir() {
            // Verifica se la cartella è scrivibile creando un file temporaneo
            let test_file = p.join(".nutnote_test");
            std::fs::write(&test_file, b"ok").map_err(|e| format!("Cartella non scrivibile: {}", e))?;
            let _ = std::fs::remove_file(test_file);
            Ok(true)
        } else {
            // È un file esistente
            Ok(true)
        }
    } else {
        // Tenta di creare la directory genitore per verificare i permessi
        if let Some(parent) = p.parent() {
            if parent.exists() {
                Ok(true)
            } else {
                std::fs::create_dir_all(parent).map_err(|e| format!("Impossibile creare il percorso: {}", e))?;
                Ok(true)
            }
        } else {
            Err("Percorso non valido".to_string())
        }
    }
}
