use rusqlite::Connection;
use std::sync::{Arc, Mutex};
use std::path::{Path, PathBuf};
use crate::config::NutNoteConfig;

pub struct DbState {
    pub db: Arc<Mutex<Connection>>,
    pub active_user_id: Mutex<Option<String>>,
    pub config: Mutex<NutNoteConfig>,
    pub app_dir: PathBuf,
    pub server_shutdown: Mutex<Option<tokio::sync::oneshot::Sender<()>>>,
}

pub fn init_db(db_file: &Path) -> Result<Connection, rusqlite::Error> {
    if let Some(parent) = db_file.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    // Migrazione legacy da nution.db se presente nella stessa cartella
    if !db_file.exists() {
        if let Some(parent) = db_file.parent() {
            let legacy_db = parent.join("nution.db");
            if legacy_db.exists() {
                let _ = std::fs::copy(&legacy_db, db_file);
            }
        }
    }

    let conn = Connection::open(db_file)?;

    // Abilita busy_timeout (5s) per concorrenza multi-processo/multi-thread su LAN/NAS
    // Abilita WAL mode per performance di lettura/scrittura concorrenti
    conn.execute_batch(
        "PRAGMA busy_timeout = 5000;
         PRAGMA journal_mode = WAL;
         PRAGMA synchronous = NORMAL;
         PRAGMA foreign_keys = ON;",
    )?;

    // Esegui migrazioni
    crate::schema::run_migrations(&conn)?;

    Ok(conn)
}
