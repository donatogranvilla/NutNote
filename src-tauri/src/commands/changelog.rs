use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbState;
use rusqlite::params;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChangeLogEntry {
    pub id: String,
    pub entity_type: String,
    pub entity_id: String,
    pub action: String,
    pub field_name: Option<String>,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub user_id: String,
    pub user_name: Option<String>,
    pub device_id: Option<String>,
    pub created_at: String,
}

pub fn log_change(
    conn: &rusqlite::Connection,
    entity_type: &str,
    entity_id: &str,
    action: &str,
    field_name: Option<&str>,
    old_value: Option<&str>,
    new_value: Option<&str>,
    user_id: &str,
    device_id: Option<&str>,
) -> rusqlite::Result<()> {
    // Non registrare update se il valore non è cambiato
    if action == "update" && old_value == new_value {
        return Ok(());
    }

    let id = Uuid::new_v4().to_string();
    conn.execute(
        "INSERT INTO change_log (id, entity_type, entity_id, action, field_name, old_value, new_value, user_id, device_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        params![id, entity_type, entity_id, action, field_name, old_value, new_value, user_id, device_id],
    )?;

    Ok(())
}

#[tauri::command]
pub async fn get_entity_history(
    entity_type: String,
    entity_id: String,
    state: State<'_, DbState>,
) -> Result<Vec<ChangeLogEntry>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare(
        "SELECT cl.id, cl.entity_type, cl.entity_id, cl.action, cl.field_name, 
                cl.old_value, cl.new_value, cl.user_id, u.display_name, cl.device_id, cl.created_at
         FROM change_log cl
         LEFT JOIN users u ON u.id = cl.user_id
         WHERE cl.entity_type = ?1 AND cl.entity_id = ?2
         ORDER BY cl.created_at DESC
         LIMIT 100"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![entity_type, entity_id], |r| {
        Ok(ChangeLogEntry {
            id: r.get(0)?,
            entity_type: r.get(1)?,
            entity_id: r.get(2)?,
            action: r.get(3)?,
            field_name: r.get(4)?,
            old_value: r.get(5)?,
            new_value: r.get(6)?,
            user_id: r.get(7)?,
            user_name: r.get(8)?,
            device_id: r.get(9)?,
            created_at: r.get(10)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub async fn get_recent_changes(
    limit: Option<i64>,
    state: State<'_, DbState>,
) -> Result<Vec<ChangeLogEntry>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let lim = limit.unwrap_or(30);

    let mut stmt = conn.prepare(
        "SELECT cl.id, cl.entity_type, cl.entity_id, cl.action, cl.field_name, 
                cl.old_value, cl.new_value, cl.user_id, u.display_name, cl.device_id, cl.created_at
         FROM change_log cl
         LEFT JOIN users u ON u.id = cl.user_id
         ORDER BY cl.created_at DESC
         LIMIT ?1"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map(params![lim], |r| {
        Ok(ChangeLogEntry {
            id: r.get(0)?,
            entity_type: r.get(1)?,
            entity_id: r.get(2)?,
            action: r.get(3)?,
            field_name: r.get(4)?,
            old_value: r.get(5)?,
            new_value: r.get(6)?,
            user_id: r.get(7)?,
            user_name: r.get(8)?,
            device_id: r.get(9)?,
            created_at: r.get(10)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub async fn restore_field(
    log_id: String,
    user_id: String,
    state: State<'_, DbState>,
) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;

    // Recupera entry
    let (entity_type, entity_id, field_name, old_value): (String, String, Option<String>, Option<String>) = conn.query_row(
        "SELECT entity_type, entity_id, field_name, old_value FROM change_log WHERE id = ?1",
        params![log_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
    ).map_err(|e| e.to_string())?;

    let field = field_name.ok_or_else(|| "Nessun campo specificato in questa revisione".to_string())?;
    let val = old_value.unwrap_or_default();

    if entity_type == "page" {
        // Recupera valore corrente per registrarlo
        let current_val: String = conn.query_row(
            &format!("SELECT COALESCE({}, '') FROM pages WHERE id = ?1", field),
            params![entity_id],
            |r| r.get(0),
        ).unwrap_or_default();

        conn.execute(
            &format!("UPDATE pages SET {} = ?1, updated_by = ?2, version = version + 1 WHERE id = ?3", field),
            params![val, user_id, entity_id],
        ).map_err(|e| e.to_string())?;

        // Registra nel change_log l'azione di ripristino
        let _ = log_change(
            &conn,
            "page",
            &entity_id,
            "update",
            Some(&field),
            Some(&current_val),
            Some(&val),
            &user_id,
            Some("restore"),
        );

        if field == "title" {
            let _ = conn.execute("UPDATE pages_fts SET title = ?1 WHERE page_id = ?2", params![val, entity_id]);
        }
    }

    Ok(true)
}

#[tauri::command]
pub async fn cleanup_old_logs(
    max_entries_per_entity: Option<i64>,
    state: State<'_, DbState>,
) -> Result<usize, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let limit = max_entries_per_entity.unwrap_or(50);

    // Elimina record oltre la soglia configurata per entity
    let count = conn.execute(
        "DELETE FROM change_log 
         WHERE id NOT IN (
             SELECT id FROM change_log cl2 
             WHERE cl2.entity_type = change_log.entity_type 
               AND cl2.entity_id = change_log.entity_id 
             ORDER BY created_at DESC LIMIT ?1
         )",
        params![limit],
    ).map_err(|e| e.to_string())?;

    Ok(count)
}
