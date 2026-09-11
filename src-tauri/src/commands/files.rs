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
