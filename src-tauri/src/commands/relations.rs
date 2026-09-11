use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbState;
use uuid::Uuid;
use rusqlite::params;

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRelationPayload {
    pub source_id: String,
    pub target_id: String,
    pub relation_type: String,
    pub description: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RelatedPageInfo {
    pub id: String,
    pub title: String,
    pub icon: Option<String>,
    pub type_name: String,
    pub type_label: String,
    pub priority: String,
    pub status: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageRelationItem {
    pub id: String,
    pub source_id: String,
    pub target_id: String,
    pub relation_type: String,
    pub description: Option<String>,
    pub created_at: String,
    pub direction: String, // "outgoing" (source -> target) or "incoming" (target -> source)
    pub other_page: RelatedPageInfo,
}

pub fn create_page_relation_internal(
    conn: &rusqlite::Connection,
    payload: CreateRelationPayload,
    user_id: &str,
) -> Result<bool, String> {
    if payload.source_id == payload.target_id {
        return Err("Non è possibile collegare una pagina a se stessa.".to_string());
    }

    let target_exists: bool = conn.query_row(
        "SELECT 1 FROM pages WHERE id = ?1",
        params![payload.target_id],
        |_| Ok(true)
    ).unwrap_or(false);

    if !target_exists {
        return Err(format!("La pagina con ID '{}' non esiste nel database.", payload.target_id));
    }

    let already_exists: bool = conn.query_row(
        "SELECT 1 FROM page_relations WHERE source_id = ?1 AND target_id = ?2 AND relation_type = ?3",
        params![payload.source_id, payload.target_id, payload.relation_type],
        |_| Ok(true)
    ).unwrap_or(false);

    if already_exists {
        return Err("Questa relazione tra le pagine esiste già.".to_string());
    }

    let id = Uuid::new_v4().to_string();

    conn.execute(
        "INSERT INTO page_relations (id, source_id, target_id, relation_type, description, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, payload.source_id, payload.target_id, payload.relation_type, payload.description, user_id],
    ).map_err(|e| e.to_string())?;

    Ok(true)
}

pub fn delete_page_relation_internal(
    conn: &rusqlite::Connection,
    id: &str,
) -> Result<bool, String> {
    conn.execute("DELETE FROM page_relations WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    Ok(true)
}

pub fn get_page_relations_internal(
    conn: &rusqlite::Connection,
    page_id: &str,
) -> Result<Vec<PageRelationItem>, String> {
    // Outgoing relations
    let mut outgoing_stmt = conn.prepare(
        "SELECT r.id, r.source_id, r.target_id, r.relation_type, r.description, r.created_at,
                p.id, p.title, p.icon, pt.name, pt.label, p.priority, p.status
         FROM page_relations r
         JOIN pages p ON p.id = r.target_id
         JOIN page_types pt ON pt.id = p.type_id
         WHERE r.source_id = ?1"
    ).map_err(|e| e.to_string())?;

    let outgoing_rows = outgoing_stmt.query_map(params![page_id], |row| {
        Ok(PageRelationItem {
            id: row.get(0)?,
            source_id: row.get(1)?,
            target_id: row.get(2)?,
            relation_type: row.get(3)?,
            description: row.get(4)?,
            created_at: row.get(5)?,
            direction: "outgoing".to_string(),
            other_page: RelatedPageInfo {
                id: row.get(6)?,
                title: row.get(7)?,
                icon: row.get(8)?,
                type_name: row.get(9)?,
                type_label: row.get(10)?,
                priority: row.get(11)?,
                status: row.get(12)?,
            },
        })
    }).map_err(|e| e.to_string())?;

    let mut results: Vec<PageRelationItem> = outgoing_rows.filter_map(|r| r.ok()).collect();

    // Incoming relations
    let mut incoming_stmt = conn.prepare(
        "SELECT r.id, r.source_id, r.target_id, r.relation_type, r.description, r.created_at,
                p.id, p.title, p.icon, pt.name, pt.label, p.priority, p.status
         FROM page_relations r
         JOIN pages p ON p.id = r.source_id
         JOIN page_types pt ON pt.id = p.type_id
         WHERE r.target_id = ?1"
    ).map_err(|e| e.to_string())?;

    let incoming_rows = incoming_stmt.query_map(params![page_id], |row| {
        Ok(PageRelationItem {
            id: row.get(0)?,
            source_id: row.get(1)?,
            target_id: row.get(2)?,
            relation_type: row.get(3)?,
            description: row.get(4)?,
            created_at: row.get(5)?,
            direction: "incoming".to_string(),
            other_page: RelatedPageInfo {
                id: row.get(6)?,
                title: row.get(7)?,
                icon: row.get(8)?,
                type_name: row.get(9)?,
                type_label: row.get(10)?,
                priority: row.get(11)?,
                status: row.get(12)?,
            },
        })
    }).map_err(|e| e.to_string())?;

    results.extend(incoming_rows.filter_map(|r| r.ok()));

    Ok(results)
}

#[tauri::command]
pub async fn create_page_relation(
    payload: CreateRelationPayload,
    user_id: String,
    state: State<'_, DbState>,
) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    create_page_relation_internal(&conn, payload, &user_id)
}

#[tauri::command]
pub async fn delete_page_relation(
    id: String,
    state: State<'_, DbState>,
) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    delete_page_relation_internal(&conn, &id)
}

#[tauri::command]
pub async fn get_page_relations(
    page_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<PageRelationItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_page_relations_internal(&conn, &page_id)
}

