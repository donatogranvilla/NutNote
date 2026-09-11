use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbState;
use uuid::Uuid;
use rusqlite::params;
use crate::commands::changelog::log_change;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BlockData {
    pub id: String,
    pub page_id: String,
    pub parent_block_id: Option<String>,
    #[serde(rename = "type")]
    pub block_type: String,
    pub content: serde_json::Value,
    pub position: i32,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveBlockItem {
    pub id: Option<String>,
    pub parent_block_id: Option<String>,
    #[serde(rename = "type")]
    pub block_type: String,
    pub content: serde_json::Value,
    pub position: i32,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SaveBlocksPayload {
    pub page_id: String,
    pub blocks: Vec<SaveBlockItem>,
    pub plain_text: Option<String>,
    pub user_id: Option<String>,
}

pub fn get_blocks_internal(
    conn: &rusqlite::Connection,
    page_id: &str,
) -> Result<Vec<BlockData>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, page_id, parent_block_id, type, content, position, created_at, updated_at 
         FROM blocks 
         WHERE page_id = ?1 
         ORDER BY position ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![page_id], |row| {
        let content_raw: String = row.get(4)?;
        let content: serde_json::Value = serde_json::from_str(&content_raw).unwrap_or(serde_json::json!({}));
        Ok(BlockData {
            id: row.get(0)?,
            page_id: row.get(1)?,
            parent_block_id: row.get(2)?,
            block_type: row.get(3)?,
            content,
            position: row.get(5)?,
            created_at: row.get(6)?,
            updated_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}

pub fn save_blocks_internal(
    conn: &mut rusqlite::Connection,
    payload: SaveBlocksPayload,
    user_id: &str,
) -> Result<bool, String> {
    let tx = conn.transaction().map_err(|e| e.to_string())?;

    // Cancella i blocchi esistenti per questa pagina e reinseriscili ordinati
    tx.execute("DELETE FROM blocks WHERE page_id = ?1", params![payload.page_id]).map_err(|e| e.to_string())?;

    for b in payload.blocks {
        let block_id = b.id.unwrap_or_else(|| Uuid::new_v4().to_string());
        let content_str = b.content.to_string();

        tx.execute(
            "INSERT INTO blocks (id, page_id, parent_block_id, type, content, position, version) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 1)",
            params![block_id, payload.page_id, b.parent_block_id, b.block_type, content_str, b.position],
        ).map_err(|e| e.to_string())?;
    }

    // Aggiorna FTS5 con il contenuto plain_text
    if let Some(ref text) = payload.plain_text {
        let exists: i32 = tx.query_row(
            "SELECT COUNT(*) FROM pages_fts WHERE page_id = ?1",
            params![payload.page_id],
            |r| r.get(0)
        ).unwrap_or(0);

        if exists > 0 {
            let _ = tx.execute(
                "UPDATE pages_fts SET content = ?1 WHERE page_id = ?2",
                params![text, payload.page_id]
            );
        } else {
            let title: String = tx.query_row(
                "SELECT title FROM pages WHERE id = ?1",
                params![payload.page_id],
                |r| r.get(0)
            ).unwrap_or_default();

            let _ = tx.execute(
                "INSERT INTO pages_fts (page_id, title, content) VALUES (?1, ?2, ?3)",
                params![payload.page_id, title, text]
            );
        }
    }

    // Aggiorna updated_at e incrementa version della pagina
    let _ = tx.execute(
        "UPDATE pages SET updated_at = datetime('now'), version = version + 1 WHERE id = ?1",
        params![payload.page_id]
    );

    // Registra nel change_log
    let _ = log_change(
        &tx,
        "block",
        &payload.page_id,
        "update",
        Some("content"),
        None,
        payload.plain_text.as_deref(),
        user_id,
        None,
    );

    tx.commit().map_err(|e| e.to_string())?;
    Ok(true)
}

#[tauri::command]
pub async fn get_blocks(
    page_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<BlockData>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_blocks_internal(&conn, &page_id)
}

#[tauri::command]
pub async fn save_blocks(
    payload: SaveBlocksPayload,
    state: State<'_, DbState>,
) -> Result<bool, String> {
    let mut conn = state.db.lock().map_err(|e| e.to_string())?;
    let active_user = state.active_user_id.lock().map_err(|e| e.to_string())?.clone();
    let uid = payload.user_id.clone().or(active_user).unwrap_or_else(|| "123e4567-e89b-12d3-a456-426614174000".to_string());
    save_blocks_internal(&mut conn, payload, &uid)
}
