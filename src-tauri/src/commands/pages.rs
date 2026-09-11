use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbState;
use uuid::Uuid;
use rusqlite::{params, Row};
use crate::commands::changelog::log_change;

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatePagePayload {
    pub type_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub icon: Option<String>,
    pub cover_url: Option<String>,
    pub properties: Option<serde_json::Value>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub visibility: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePagePayload {
    pub id: String,
    pub title: Option<String>,
    pub icon: Option<String>,
    pub cover_url: Option<String>,
    pub properties: Option<serde_json::Value>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub is_pinned: Option<bool>,
    pub is_archived: Option<bool>,
    pub position: Option<i32>,
    pub visibility: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MovePagePayload {
    pub id: String,
    pub new_parent_id: Option<String>,
    pub new_position: Option<i32>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QueryPagesPayload {
    pub type_id: Option<String>,
    pub type_name: Option<String>,
    pub parent_id: Option<String>,
    pub root_client_id: Option<String>,
    pub priority: Option<String>,
    pub status: Option<String>,
    pub is_pinned: Option<bool>,
    pub is_archived: Option<bool>,
    pub limit: Option<i64>,
    pub offset: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageResponse {
    pub id: String,
    pub type_id: String,
    pub parent_id: Option<String>,
    pub title: String,
    pub icon: Option<String>,
    pub cover_url: Option<String>,
    pub properties: serde_json::Value,
    pub priority: String,
    pub status: String,
    pub position: i32,
    pub is_pinned: bool,
    pub is_archived: bool,
    pub created_by: String,
    pub updated_by: String,
    pub created_at: String,
    pub updated_at: String,
    pub root_client_id: Option<String>,
    pub visibility: String,
    pub version: i64,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PageWithAncestorsResponse {
    pub page: PageResponse,
    pub ancestors: Vec<PageResponse>,
    pub children: Vec<PageResponse>,
}

fn map_page_row(row: &Row) -> rusqlite::Result<PageResponse> {
    let properties_raw: Option<String> = row.get(6).ok();
    let properties: serde_json::Value = properties_raw
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_else(|| serde_json::json!({}));
    let is_pinned_int: i32 = row.get(9).unwrap_or(0);
    let is_archived_int: i32 = row.get(10).unwrap_or(0);

    Ok(PageResponse {
        id: row.get(0)?,
        type_id: row.get(1)?,
        parent_id: row.get(2).ok(),
        title: row.get(3).unwrap_or_else(|_| "Senza Titolo".to_string()),
        icon: row.get(4).ok(),
        cover_url: row.get(5).ok(),
        properties,
        priority: row.get(7).unwrap_or_else(|_| "none".to_string()),
        status: row.get(8).unwrap_or_default(),
        position: row.get(11).unwrap_or(0),
        is_pinned: is_pinned_int != 0,
        is_archived: is_archived_int != 0,
        created_by: row.get(12).unwrap_or_default(),
        updated_by: row.get(13).unwrap_or_default(),
        created_at: row.get(14).unwrap_or_default(),
        updated_at: row.get(15).unwrap_or_default(),
        root_client_id: row.get(16).ok(),
        visibility: row.get::<_, Option<String>>(17).ok().flatten().unwrap_or_else(|| "public".to_string()),
        version: row.get::<_, Option<i64>>(18).ok().flatten().unwrap_or(1),
    })
}

pub const PAGE_SELECT_FIELDS: &str = 
    "id, type_id, parent_id, title, icon, cover_url, properties, priority, status, is_pinned, is_archived, position, created_by, updated_by, created_at, updated_at, root_client_id, visibility, version";

pub const PAGE_SELECT_FIELDS_PREFIXED: &str = 
    "p.id, p.type_id, p.parent_id, p.title, p.icon, p.cover_url, p.properties, p.priority, p.status, p.is_pinned, p.is_archived, p.position, p.created_by, p.updated_by, p.created_at, p.updated_at, p.root_client_id, p.visibility, p.version";

fn find_root_client_id(conn: &rusqlite::Connection, page_id: &str) -> Result<Option<String>, rusqlite::Error> {
    let mut stmt = conn.prepare(
        "SELECT a.id, pt.name 
         FROM page_ancestors pa 
         JOIN pages a ON a.id = pa.ancestor_id 
         JOIN page_types pt ON pt.id = a.type_id 
         WHERE pa.page_id = ?1 
         ORDER BY pa.depth DESC"
    )?;
    
    let mut rows = stmt.query(params![page_id])?;
    while let Some(row) = rows.next()? {
        let type_name: String = row.get(1)?;
        if type_name == "client" {
            let client_id: String = row.get(0)?;
            return Ok(Some(client_id));
        }
    }
    Ok(None)
}

pub fn get_page_internal(conn: &rusqlite::Connection, id: &str) -> Result<PageResponse, rusqlite::Error> {
    let sql = format!("SELECT {} FROM pages WHERE id = ?1", PAGE_SELECT_FIELDS);
    conn.query_row(&sql, params![id], map_page_row)
}

pub fn create_page_internal(
    conn: &rusqlite::Connection,
    payload: CreatePagePayload,
    user_id: &str,
) -> Result<PageResponse, String> {
    let id = Uuid::new_v4().to_string();
    let properties_str = payload.properties
        .as_ref()
        .map(|v| v.to_string())
        .unwrap_or_else(|| "{}".to_string());
    
    let priority = payload.priority.unwrap_or_else(|| "none".to_string());
    let status = payload.status.unwrap_or_else(|| "".to_string());
    let visibility = payload.visibility.unwrap_or_else(|| "public".to_string());
    
    // Inserimento pagina base con version = 1
    conn.execute(
        "INSERT INTO pages (id, type_id, parent_id, title, icon, cover_url, properties, priority, status, created_by, updated_by, visibility, version)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?10, ?11, 1)",
        params![
            id, payload.type_id, payload.parent_id, payload.title, payload.icon, payload.cover_url,
            properties_str, priority, status, user_id, visibility
        ]
    ).map_err(|e| e.to_string())?;
    
    // Aggiornamento closure table
    conn.execute(
        "INSERT INTO page_ancestors (page_id, ancestor_id, depth) VALUES (?1, ?1, 0)",
        params![id]
    ).map_err(|e| e.to_string())?;

    if let Some(ref p_id) = payload.parent_id {
        conn.execute(
            "INSERT INTO page_ancestors (page_id, ancestor_id, depth)
             SELECT ?1, ancestor_id, depth + 1 FROM page_ancestors WHERE page_id = ?2",
            params![id, p_id]
        ).map_err(|e| e.to_string())?;
    }

    // Calcola e aggiorna root_client_id
    if let Ok(root_client) = find_root_client_id(conn, &id) {
        if let Some(client_id) = root_client {
            let _ = conn.execute("UPDATE pages SET root_client_id = ?1 WHERE id = ?2", params![client_id, id]);
        }
    }

    // Inserimento in FTS5
    let _ = conn.execute(
        "INSERT INTO pages_fts (page_id, title, content) VALUES (?1, ?2, '')",
        params![id, payload.title]
    );

    // Registra creazione nel change_log
    let _ = log_change(
        conn,
        "page",
        &id,
        "create",
        None,
        None,
        Some(&payload.title),
        user_id,
        None,
    );

    get_page_internal(conn, &id).map_err(|e| e.to_string())
}

pub fn update_page_internal(
    conn: &rusqlite::Connection,
    payload: UpdatePagePayload,
    user_id: &str,
) -> Result<PageResponse, String> {
    // Recupera la pagina corrente per change tracking
    let current = get_page_internal(conn, &payload.id).map_err(|e| e.to_string())?;

    let mut sets = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    if let Some(ref t) = payload.title {
        if t != &current.title {
            let _ = log_change(conn, "page", &payload.id, "update", Some("title"), Some(&current.title), Some(t), user_id, None);
        }
        params_vec.push(Box::new(t.clone()));
        sets.push(format!("title = ?{}", params_vec.len()));
    }

    if let Some(ref icon) = payload.icon {
        let current_icon = current.icon.as_deref().unwrap_or("");
        if icon != current_icon {
            let _ = log_change(conn, "page", &payload.id, "update", Some("icon"), Some(current_icon), Some(icon), user_id, None);
        }
        params_vec.push(Box::new(icon.clone()));
        sets.push(format!("icon = ?{}", params_vec.len()));
    }

    if let Some(ref cover) = payload.cover_url {
        params_vec.push(Box::new(cover.clone()));
        sets.push(format!("cover_url = ?{}", params_vec.len()));
    }

    if let Some(ref props) = payload.properties {
        let old_props_str = current.properties.to_string();
        let new_props_str = props.to_string();
        if old_props_str != new_props_str {
            let _ = log_change(conn, "page", &payload.id, "update", Some("properties"), Some(&old_props_str), Some(&new_props_str), user_id, None);
        }
        params_vec.push(Box::new(props.to_string()));
        sets.push(format!("properties = ?{}", params_vec.len()));
    }

    if let Some(ref prio) = payload.priority {
        if prio != &current.priority {
            let _ = log_change(conn, "page", &payload.id, "update", Some("priority"), Some(&current.priority), Some(prio), user_id, None);
        }
        params_vec.push(Box::new(prio.clone()));
        sets.push(format!("priority = ?{}", params_vec.len()));
    }

    if let Some(ref stat) = payload.status {
        if stat != &current.status {
            let _ = log_change(conn, "page", &payload.id, "update", Some("status"), Some(&current.status), Some(stat), user_id, None);
        }
        params_vec.push(Box::new(stat.clone()));
        sets.push(format!("status = ?{}", params_vec.len()));
    }

    if let Some(pinned) = payload.is_pinned {
        params_vec.push(Box::new(if pinned { 1 } else { 0 }));
        sets.push(format!("is_pinned = ?{}", params_vec.len()));
    }

    if let Some(archived) = payload.is_archived {
        params_vec.push(Box::new(if archived { 1 } else { 0 }));
        sets.push(format!("is_archived = ?{}", params_vec.len()));
    }

    if let Some(pos) = payload.position {
        params_vec.push(Box::new(pos));
        sets.push(format!("position = ?{}", params_vec.len()));
    }
    
    if let Some(ref vis) = payload.visibility {
        if vis != &current.visibility {
            let _ = log_change(conn, "page", &payload.id, "update", Some("visibility"), Some(&current.visibility), Some(vis), user_id, None);
        }
        params_vec.push(Box::new(vis.clone()));
        sets.push(format!("visibility = ?{}", params_vec.len()));
    }

    // Incrementa version ad ogni update
    sets.push("version = version + 1".to_string());

    params_vec.push(Box::new(user_id.to_string()));
    sets.push(format!("updated_by = ?{}", params_vec.len()));

    params_vec.push(Box::new(payload.id.clone()));
    let id_index = params_vec.len();

    let sql = format!("UPDATE pages SET {} WHERE id = ?{}", sets.join(", "), id_index);
    let rusqlite_params: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
    
    conn.execute(&sql, &rusqlite_params[..]).map_err(|e| e.to_string())?;

    // Aggiorna FTS5 se il titolo è cambiato
    if let Some(ref t) = payload.title {
        let _ = conn.execute(
            "UPDATE pages_fts SET title = ?1 WHERE page_id = ?2",
            params![t, payload.id]
        );
    }

    get_page_internal(conn, &payload.id).map_err(|e| e.to_string())
}

pub fn move_page_internal(
    conn: &rusqlite::Connection,
    payload: MovePagePayload,
    user_id: &str,
) -> Result<PageResponse, String> {
    let old_page = get_page_internal(conn, &payload.id).map_err(|e| e.to_string())?;

    // 1. Rimuovi i vecchi legami antenato per questo sottoalbero
    conn.execute(
        "DELETE FROM page_ancestors 
         WHERE page_id IN (SELECT page_id FROM page_ancestors WHERE ancestor_id = ?1)
           AND ancestor_id IN (
               SELECT ancestor_id FROM page_ancestors 
               WHERE page_id = ?1 AND ancestor_id != ?1
           )",
        params![payload.id]
    ).map_err(|e| e.to_string())?;

    // 2. Se c'è un nuovo parent, inserisci le nuove relazioni antenato per tutto il sottoalbero
    if let Some(ref new_p_id) = payload.new_parent_id {
        conn.execute(
            "INSERT INTO page_ancestors (page_id, ancestor_id, depth)
             SELECT subtree.page_id, supertree.ancestor_id, subtree.depth + supertree.depth + 1
             FROM page_ancestors AS subtree
             CROSS JOIN page_ancestors AS supertree
             WHERE subtree.ancestor_id = ?1
               AND supertree.page_id = ?2",
            params![payload.id, new_p_id]
        ).map_err(|e| e.to_string())?;
    }

    // 3. Aggiorna parent_id, position e version nella tabella pages
    conn.execute(
        "UPDATE pages SET parent_id = ?1, position = COALESCE(?2, position), updated_by = ?3, version = version + 1 WHERE id = ?4",
        params![payload.new_parent_id, payload.new_position, user_id, payload.id]
    ).map_err(|e| e.to_string())?;

    // 4. Ricalcola root_client_id per il sottoalbero
    let subtree_ids: Vec<String> = {
        let mut stmt = conn.prepare("SELECT page_id FROM page_ancestors WHERE ancestor_id = ?1").map_err(|e| e.to_string())?;
        let rows = stmt.query_map(params![payload.id], |r| r.get(0)).map_err(|e| e.to_string())?;
        rows.filter_map(|r| r.ok()).collect()
    };

    for sub_id in subtree_ids {
        let root_client = find_root_client_id(conn, &sub_id).unwrap_or(None);
        let _ = conn.execute("UPDATE pages SET root_client_id = ?1 WHERE id = ?2", params![root_client, sub_id]);
    }

    // Registra lo spostamento nel change_log
    let _ = log_change(
        conn,
        "page",
        &payload.id,
        "move",
        Some("parentId"),
        old_page.parent_id.as_deref(),
        payload.new_parent_id.as_deref(),
        user_id,
        None,
    );

    get_page_internal(conn, &payload.id).map_err(|e| e.to_string())
}

pub fn delete_page_internal(
    conn: &rusqlite::Connection,
    id: &str,
    user_id: &str,
) -> Result<bool, String> {
    let title: String = conn.query_row("SELECT title FROM pages WHERE id = ?1", params![id], |r| r.get(0)).unwrap_or_default();

    conn.execute("DELETE FROM pages WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    let _ = conn.execute("DELETE FROM pages_fts WHERE page_id = ?1", params![id]);
    
    let _ = log_change(
        conn,
        "page",
        id,
        "delete",
        None,
        Some(&title),
        None,
        user_id,
        None,
    );

    Ok(true)
}

pub fn get_page_with_ancestors_internal(
    conn: &rusqlite::Connection,
    id: &str,
    active_user_id: Option<&str>,
) -> Result<PageWithAncestorsResponse, String> {
    let page = get_page_internal(conn, id).map_err(|e| e.to_string())?;

    let ancestors_sql = format!(
        "SELECT {} FROM pages p 
         JOIN page_ancestors pa ON pa.ancestor_id = p.id 
         WHERE pa.page_id = ?1 AND pa.ancestor_id != ?1 
         ORDER BY pa.depth DESC",
         PAGE_SELECT_FIELDS_PREFIXED
    );

    let mut stmt = conn.prepare(&ancestors_sql).map_err(|e| e.to_string())?;
    let ancestor_rows = stmt.query_map(params![id], map_page_row).map_err(|e| e.to_string())?;
    let ancestors: Vec<PageResponse> = ancestor_rows.filter_map(|r| r.ok()).collect();

    let uid = active_user_id.unwrap_or_default();

    let children_sql = format!(
        "SELECT {} FROM pages WHERE parent_id = ?1 AND is_archived = 0 AND (visibility = 'public' OR created_by = ?2) ORDER BY position ASC, created_at DESC",
        PAGE_SELECT_FIELDS
    );
    let mut child_stmt = conn.prepare(&children_sql).map_err(|e| e.to_string())?;
    let child_rows = child_stmt.query_map(params![id, uid], map_page_row).map_err(|e| e.to_string())?;
    let children: Vec<PageResponse> = child_rows.filter_map(|r| r.ok()).collect();

    Ok(PageWithAncestorsResponse {
        page,
        ancestors,
        children,
    })
}

pub fn query_pages_internal(
    conn: &rusqlite::Connection,
    payload: QueryPagesPayload,
    active_user_id: Option<&str>,
) -> Result<Vec<PageResponse>, String> {
    let mut sql = format!("SELECT {} FROM pages p", PAGE_SELECT_FIELDS_PREFIXED);
    
    if payload.type_name.is_some() {
        sql.push_str(" JOIN page_types pt ON pt.id = p.type_id");
    }

    let mut conditions = Vec::new();
    let mut params_vec: Vec<Box<dyn rusqlite::ToSql>> = Vec::new();

    let uid = active_user_id.unwrap_or_default().to_string();
    params_vec.push(Box::new(uid));
    conditions.push(format!("(p.visibility = 'public' OR p.created_by = ?{})", params_vec.len()));

    if let Some(ref tid) = payload.type_id {
        params_vec.push(Box::new(tid.clone()));
        conditions.push(format!("p.type_id = ?{}", params_vec.len()));
    }

    if let Some(ref tname) = payload.type_name {
        params_vec.push(Box::new(tname.clone()));
        conditions.push(format!("pt.name = ?{}", params_vec.len()));
    }

    if let Some(ref pid) = payload.parent_id {
        params_vec.push(Box::new(pid.clone()));
        conditions.push(format!("p.parent_id = ?{}", params_vec.len()));
    }

    if let Some(ref rcid) = payload.root_client_id {
        params_vec.push(Box::new(rcid.clone()));
        let p_idx = params_vec.len();
        conditions.push(format!("(p.root_client_id = ?{p_idx} OR p.id = ?{p_idx})"));
    }

    if let Some(ref prio) = payload.priority {
        params_vec.push(Box::new(prio.clone()));
        conditions.push(format!("p.priority = ?{}", params_vec.len()));
    }

    if let Some(ref stat) = payload.status {
        params_vec.push(Box::new(stat.clone()));
        conditions.push(format!("p.status = ?{}", params_vec.len()));
    }

    if let Some(pinned) = payload.is_pinned {
        params_vec.push(Box::new(if pinned { 1 } else { 0 }));
        conditions.push(format!("p.is_pinned = ?{}", params_vec.len()));
    }

    if let Some(archived) = payload.is_archived {
        params_vec.push(Box::new(if archived { 1 } else { 0 }));
        conditions.push(format!("p.is_archived = ?{}", params_vec.len()));
    } else {
        conditions.push("p.is_archived = 0".to_string());
    }

    if !conditions.is_empty() {
        sql.push_str(" WHERE ");
        sql.push_str(&conditions.join(" AND "));
    }

    sql.push_str(
        " ORDER BY 
         CASE p.priority 
             WHEN 'urgent' THEN 1 
             WHEN 'high' THEN 2 
             WHEN 'medium' THEN 3 
             WHEN 'low' THEN 4 
             ELSE 5 
         END ASC, 
         p.position ASC, 
         p.updated_at DESC"
    );

    if let Some(l) = payload.limit {
        sql.push_str(&format!(" LIMIT {}", l));
        if let Some(o) = payload.offset {
            sql.push_str(&format!(" OFFSET {}", o));
        }
    }

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rusqlite_params: Vec<&dyn rusqlite::ToSql> = params_vec.iter().map(|b| b.as_ref()).collect();
    let rows = stmt.query_map(&rusqlite_params[..], map_page_row).map_err(|e| e.to_string())?;

    let pages: Vec<PageResponse> = rows.filter_map(|r| r.ok()).collect();
    Ok(pages)
}

// -------------------------------------------------------------
// TAURI COMMANDS
// -------------------------------------------------------------

#[tauri::command]
pub async fn create_page(
    payload: CreatePagePayload,
    user_id: String,
    state: State<'_, DbState>,
) -> Result<PageResponse, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    create_page_internal(&conn, payload, &user_id)
}

#[tauri::command]
pub async fn get_page(
    id: String,
    state: State<'_, DbState>,
) -> Result<PageResponse, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_page_internal(&conn, &id).map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn get_page_with_ancestors(
    id: String,
    state: State<'_, DbState>,
) -> Result<PageWithAncestorsResponse, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let active_user = state.active_user_id.lock().map_err(|e| e.to_string())?.clone();
    get_page_with_ancestors_internal(&conn, &id, active_user.as_deref())
}

#[tauri::command]
pub async fn query_pages(
    payload: QueryPagesPayload,
    state: State<'_, DbState>,
) -> Result<Vec<PageResponse>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let active_user = state.active_user_id.lock().map_err(|e| e.to_string())?.clone();
    query_pages_internal(&conn, payload, active_user.as_deref())
}

#[tauri::command]
pub async fn update_page(
    payload: UpdatePagePayload,
    user_id: String,
    state: State<'_, DbState>,
) -> Result<PageResponse, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    update_page_internal(&conn, payload, &user_id)
}

#[tauri::command]
pub async fn move_page(
    payload: MovePagePayload,
    user_id: String,
    state: State<'_, DbState>,
) -> Result<PageResponse, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    move_page_internal(&conn, payload, &user_id)
}

#[tauri::command]
pub async fn delete_page(
    id: String,
    state: State<'_, DbState>,
) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let active_user = state.active_user_id.lock().map_err(|e| e.to_string())?.clone();
    let uid = active_user.unwrap_or_else(|| "unknown".to_string());
    delete_page_internal(&conn, &id, &uid)
}

#[tauri::command]
pub async fn toggle_pin_page(
    id: String,
    state: State<'_, DbState>,
) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    conn.execute("UPDATE pages SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END WHERE id = ?1", params![id]).map_err(|e| e.to_string())?;
    let is_pinned: i32 = conn.query_row("SELECT is_pinned FROM pages WHERE id = ?1", params![id], |r| r.get(0)).map_err(|e| e.to_string())?;
    Ok(is_pinned != 0)
}

#[tauri::command]
pub async fn get_pinned_pages(
    state: State<'_, DbState>,
) -> Result<Vec<PageResponse>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let active_user = state.active_user_id.lock().map_err(|e| e.to_string())?.clone();
    let uid = active_user.unwrap_or_default();

    let sql = format!("SELECT {} FROM pages WHERE is_pinned = 1 AND is_archived = 0 AND (visibility = 'public' OR created_by = ?1) ORDER BY updated_at DESC", PAGE_SELECT_FIELDS);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![uid], map_page_row).map_err(|e| e.to_string())?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub async fn get_recent_pages(
    limit: Option<i64>,
    state: State<'_, DbState>,
) -> Result<Vec<PageResponse>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let active_user = state.active_user_id.lock().map_err(|e| e.to_string())?.clone();
    let uid = active_user.unwrap_or_default();

    let lim = limit.unwrap_or(10);
    let sql = format!("SELECT {} FROM pages WHERE is_archived = 0 AND (visibility = 'public' OR created_by = ?1) ORDER BY updated_at DESC LIMIT {}", PAGE_SELECT_FIELDS, lim);
    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![uid], map_page_row).map_err(|e| e.to_string())?;
    Ok(rows.filter_map(|r| r.ok()).collect())
}
