use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbState;
use rusqlite::params;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SearchResultItem {
    pub page_id: String,
    pub title: String,
    pub icon: Option<String>,
    pub type_name: String,
    pub type_label: String,
    pub snippet: String,
    pub priority: String,
    pub status: String,
    pub updated_at: String,
}

pub fn search_pages_internal(
    conn: &rusqlite::Connection,
    query: &str,
    limit: Option<i64>,
    active_user_id: Option<&str>,
) -> Result<Vec<SearchResultItem>, String> {
    let q = query.trim();
    if q.is_empty() {
        return Ok(Vec::new());
    }

    let lim = limit.unwrap_or(20);

    // Escape query per FTS5 e aggiungi wildcard
    let clean_query = q.replace('"', "").replace('*', "");
    let fts_query = format!("{}*", clean_query);

    let uid = active_user_id.unwrap_or_default();

    let sql = 
        "SELECT f.page_id, p.title, p.icon, pt.name, pt.label, 
                snippet(pages_fts, 1, '<mark>', '</mark>', '...', 12) as snippet_text,
                p.priority, p.status, p.updated_at
         FROM pages_fts f
         JOIN pages p ON p.id = f.page_id
         JOIN page_types pt ON pt.id = p.type_id
         WHERE pages_fts MATCH ?1 AND p.is_archived = 0 AND (p.visibility = 'public' OR p.created_by = ?3)
         ORDER BY bm25(pages_fts) ASC, p.updated_at DESC
         LIMIT ?2";

    let mut stmt = conn.prepare(sql).map_err(|e| e.to_string())?;
    let rows = stmt.query_map(params![fts_query, lim, uid], |row| {
        let snippet: String = row.get(5).unwrap_or_default();
        Ok(SearchResultItem {
            page_id: row.get(0)?,
            title: row.get(1)?,
            icon: row.get(2)?,
            type_name: row.get(3)?,
            type_label: row.get(4)?,
            snippet,
            priority: row.get(6)?,
            status: row.get(7)?,
            updated_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    let results: Vec<SearchResultItem> = rows.filter_map(|r| r.ok()).collect();
    
    // Se la ricerca FTS5 non trova nulla (es. query parziale o token speciale), proviamo un fallback LIKE
    if results.is_empty() {
        let like_query = format!("%{}%", clean_query);
        let fallback_sql = 
            "SELECT p.id, p.title, p.icon, pt.name, pt.label, 
                    p.title as snippet_text,
                    p.priority, p.status, p.updated_at
             FROM pages p
             JOIN page_types pt ON pt.id = p.type_id
             WHERE (p.title LIKE ?1 OR p.properties LIKE ?1) AND p.is_archived = 0 AND (p.visibility = 'public' OR p.created_by = ?3)
             ORDER BY p.updated_at DESC
             LIMIT ?2";

        let mut fb_stmt = conn.prepare(fallback_sql).map_err(|e| e.to_string())?;
        let fb_rows = fb_stmt.query_map(params![like_query, lim, uid], |row| {
            Ok(SearchResultItem {
                page_id: row.get(0)?,
                title: row.get(1)?,
                icon: row.get(2)?,
                type_name: row.get(3)?,
                type_label: row.get(4)?,
                snippet: row.get(5)?,
                priority: row.get(6)?,
                status: row.get(7)?,
                updated_at: row.get(8)?,
            })
        }).map_err(|e| e.to_string())?;

        return Ok(fb_rows.filter_map(|r| r.ok()).collect());
    }

    Ok(results)
}

#[tauri::command]
pub async fn search_pages(
    query: String,
    limit: Option<i64>,
    state: State<'_, DbState>,
) -> Result<Vec<SearchResultItem>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let active_user = state.active_user_id.lock().map_err(|e| e.to_string())?.clone();
    search_pages_internal(&conn, &query, limit, active_user.as_deref())
}

