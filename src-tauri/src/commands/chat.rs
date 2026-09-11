use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbState;
use uuid::Uuid;
use rusqlite::params;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub id: String,
    pub page_id: String,
    pub user_id: String,
    pub content: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChatMessagePayload {
    pub page_id: String,
    pub content: String,
}

pub fn get_chat_messages_internal(
    conn: &rusqlite::Connection,
    page_id: &str,
) -> Result<Vec<ChatMessage>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, page_id, user_id, content, created_at FROM chat_messages WHERE page_id = ?1 ORDER BY created_at ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![page_id], |row| {
        Ok(ChatMessage {
            id: row.get(0)?,
            page_id: row.get(1)?,
            user_id: row.get(2)?,
            content: row.get(3)?,
            created_at: row.get(4)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}

pub fn create_chat_message_internal(
    conn: &rusqlite::Connection,
    payload: CreateChatMessagePayload,
    user_id: &str,
) -> Result<ChatMessage, String> {
    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO chat_messages (id, page_id, user_id, content) VALUES (?1, ?2, ?3, ?4)",
        params![id, payload.page_id, user_id, payload.content]
    ).map_err(|e| e.to_string())?;
    
    let created_at: String = conn.query_row(
        "SELECT created_at FROM chat_messages WHERE id = ?1",
        params![id],
        |row| row.get(0)
    ).unwrap_or_default();

    Ok(ChatMessage {
        id,
        page_id: payload.page_id,
        user_id: user_id.to_string(),
        content: payload.content,
        created_at,
    })
}

#[tauri::command]
pub async fn get_chat_messages(
    page_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<ChatMessage>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_chat_messages_internal(&conn, &page_id)
}

#[tauri::command]
pub async fn create_chat_message(
    payload: CreateChatMessagePayload,
    state: State<'_, DbState>,
) -> Result<ChatMessage, String> {
    let active_user = state.active_user_id.lock().map_err(|e| e.to_string())?.clone();
    let uid = active_user.unwrap_or_else(|| "123e4567-e89b-12d3-a456-426614174000".to_string());
    
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    create_chat_message_internal(&conn, payload, &uid)
}

