use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::fs;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NutNoteConfig {
    /// "local" | "shared" | "server" | "client"
    pub mode: String,
    /// Custom path for the database directory or file (None = default app_data_dir)
    pub db_path: Option<String>,
    /// Custom path for uploaded files (None = default app_data_dir/files)
    pub files_path: Option<String>,
    /// HTTP server port when running in server mode (default 9700)
    pub server_port: Option<u16>,
    /// Remote server URL when running in client mode (e.g. http://192.168.1.50:9700)
    pub server_url: Option<String>,
}

impl Default for NutNoteConfig {
    fn default() -> Self {
        Self {
            mode: "local".to_string(),
            db_path: None,
            files_path: None,
            server_port: Some(9700),
            server_url: None,
        }
    }
}

impl NutNoteConfig {
    pub fn config_file_path(app_dir: &Path) -> PathBuf {
        app_dir.join("nutnote-config.json")
    }

    pub fn load(app_dir: &Path) -> Self {
        let path = Self::config_file_path(app_dir);
        if path.exists() {
            if let Ok(content) = fs::read_to_string(&path) {
                if let Ok(config) = serde_json::from_str::<NutNoteConfig>(&content) {
                    return config;
                }
            }
        }
        Self::default()
    }

    pub fn save(&self, app_dir: &Path) -> Result<(), String> {
        let path = Self::config_file_path(app_dir);
        let json = serde_json::to_string_pretty(self).map_err(|e| e.to_string())?;
        fs::write(path, json).map_err(|e| e.to_string())?;
        Ok(())
    }

    pub fn resolve_db_file(&self, app_dir: &Path) -> PathBuf {
        if let Some(ref p) = self.db_path {
            let path = PathBuf::from(p);
            if path.is_file() {
                path
            } else {
                path.join("nutnote.db")
            }
        } else {
            app_dir.join("nutnote.db")
        }
    }

    pub fn resolve_files_dir(&self, app_dir: &Path) -> PathBuf {
        if let Some(ref p) = self.files_path {
            PathBuf::from(p)
        } else if let Some(ref p) = self.db_path {
            // Se db_path è specificato ma files_path no, teniamo i file nella stessa cartella del db
            let db_dir = PathBuf::from(p);
            if db_dir.is_file() {
                db_dir.parent().unwrap_or(app_dir).join("files")
            } else {
                db_dir.join("files")
            }
        } else {
            app_dir.join("files")
        }
    }
}
