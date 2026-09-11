use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbState;
use rusqlite::{params, Row};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageTypeResponse {
    pub id: String,
    pub name: String,
    pub label: String,
    pub label_plural: String,
    pub icon: String,
    pub color: String,
    pub properties_schema: serde_json::Value,
    pub status_flow: serde_json::Value,
    pub allowed_children: serde_json::Value,
    pub default_view_type: String,
    pub is_system: bool,
    pub position: i32,
    pub created_at: String,
    pub updated_at: String,
}

fn map_page_type_row(row: &Row) -> rusqlite::Result<PageTypeResponse> {
    let schema_raw: Option<String> = row.get(6).ok();
    let status_raw: Option<String> = row.get(7).ok();
    let children_raw: Option<String> = row.get(8).ok();
    let is_system_int: i32 = row.get(10).unwrap_or(0);

    Ok(PageTypeResponse {
        id: row.get(0)?,
        name: row.get(1)?,
        label: row.get(2)?,
        label_plural: row.get(3)?,
        icon: row.get(4).unwrap_or_else(|_| "📄".to_string()),
        color: row.get(5).unwrap_or_else(|_| "#4263eb".to_string()),
        properties_schema: schema_raw
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_else(|| serde_json::json!([])),
        status_flow: status_raw
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_else(|| serde_json::json!([])),
        allowed_children: children_raw
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or_else(|| serde_json::json!([])),
        default_view_type: row.get(9).unwrap_or_else(|_| "table".to_string()),
        is_system: is_system_int != 0,
        position: row.get(11).unwrap_or(0),
        created_at: row.get(12).unwrap_or_default(),
        updated_at: row.get(13).unwrap_or_default(),
    })
}

pub fn get_page_types_internal(conn: &rusqlite::Connection) -> Result<Vec<PageTypeResponse>, String> {
    let mut stmt = conn.prepare(
        "SELECT id, name, label, label_plural, icon, color, properties_schema, status_flow, allowed_children, default_view_type, is_system, position, created_at, updated_at 
         FROM page_types 
         ORDER BY position ASC, label ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], map_page_type_row).map_err(|e| e.to_string())?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

pub fn get_page_type_internal(conn: &rusqlite::Connection, id: &str) -> Result<PageTypeResponse, String> {
    conn.query_row(
        "SELECT id, name, label, label_plural, icon, color, properties_schema, status_flow, allowed_children, default_view_type, is_system, position, created_at, updated_at 
         FROM page_types 
         WHERE id = ?1 OR name = ?1",
        params![id],
        map_page_type_row,
    ).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_page_types(
    state: State<'_, DbState>,
) -> Result<Vec<PageTypeResponse>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_page_types_internal(&conn)
}

#[tauri::command]
pub async fn get_page_type(
    id: String,
    state: State<'_, DbState>,
) -> Result<PageTypeResponse, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_page_type_internal(&conn, &id)
}

