use std::path::Path;
use std::fs;
use tauri::{AppHandle, State};
use crate::db::DbState;

#[tauri::command]
pub fn upload_file(_app: AppHandle, source_path: String, state: State<'_, DbState>) -> Result<serde_json::Value, String> {
    let files_dir = {
        let config = state.config.lock().map_err(|e| e.to_string())?;
        config.resolve_files_dir(&state.app_dir)
    };

    if !files_dir.exists() {
        fs::create_dir_all(&files_dir).map_err(|e| e.to_string())?;
    }

    let source = Path::new(&source_path);
    if !source.exists() {
        return Err("Source file does not exist".to_string());
    }

    let ext = source.extension().unwrap_or_default().to_string_lossy().to_string();
    let name = source.file_stem().unwrap_or_default().to_string_lossy().to_string();
    
    // Generate a timestamped unique name to avoid collisions
    let timestamp = std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis();
    let unique_filename = format!("{}-{}.{}", name, timestamp, ext);
    let dest_path = files_dir.join(&unique_filename);

    fs::copy(source, &dest_path).map_err(|e| e.to_string())?;

    let dest_path_str = dest_path.to_string_lossy().to_string();

    Ok(serde_json::json!({
        "path": dest_path_str,
        "filename": unique_filename
    }))
}

use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct FolderFileInfo {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
    pub size_bytes: u64,
    pub extension: String,
    pub modified_str: String,
}

#[tauri::command]
pub fn list_directory_contents(folder_path: String) -> Result<Vec<FolderFileInfo>, String> {
    let path = Path::new(&folder_path);
    if !path.exists() {
        return Err("Il percorso specificato non esiste sul disco o nella rete locale.".to_string());
    }
    if !path.is_dir() {
        return Err("Il percorso specificato non è una cartella.".to_string());
    }

    let mut results = Vec::new();
    let entries = fs::read_dir(path).map_err(|e| format!("Errore di lettura cartella: {}", e))?;

    for entry in entries.flatten() {
        let meta = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let file_name = entry.file_name().to_string_lossy().to_string();
        let full_path = entry.path().to_string_lossy().to_string();
        let is_dir = meta.is_dir();
        let size_bytes = if is_dir { 0 } else { meta.len() };
        let extension = entry.path()
            .extension()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string()
            .to_lowercase();

        let modified_str = match meta.modified() {
            Ok(time) => {
                let secs = time.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs();
                format!("{}", secs)
            },
            Err(_) => "-".to_string(),
        };

        results.push(FolderFileInfo {
            name: file_name,
            path: full_path,
            is_dir,
            size_bytes,
            extension,
            modified_str,
        });
    }

    // Ordina prima le cartelle, poi alfabeticamente
    results.sort_by(|a, b| {
        b.is_dir.cmp(&a.is_dir).then_with(|| a.name.to_lowercase().cmp(&b.name.to_lowercase()))
    });

    Ok(results)
}

#[tauri::command]
pub fn open_path_in_os(path_to_open: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(&path_to_open)
            .spawn()
            .map_err(|e| format!("Errore nell'apertura di Esplora Risorse: {}", e))?;
    }
    #[cfg(target_os = "macos")]
    {
        std::process::Command::new("open")
            .arg(&path_to_open)
            .spawn()
            .map_err(|e| format!("Errore nell'apertura del percorso: {}", e))?;
    }
    #[cfg(target_os = "linux")]
    {
        std::process::Command::new("xdg-open")
            .arg(&path_to_open)
            .spawn()
            .map_err(|e| format!("Errore nell'apertura del percorso: {}", e))?;
    }
    Ok(())
}

