use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbState;
use rusqlite::params;
use uuid::Uuid;

/// Viste salvate: una configurazione di elenco a cui si è dato un nome.
///
/// La tabella `views` esisteva nello schema fin dall'inizio ma nessuna query la
/// interrogava: filtri e tipo di visualizzazione vivevano solo nello stato del
/// componente e si perdevano cambiando pagina. Qui la si mette finalmente in uso.
///
/// Filtri, ordinamenti e proprietà visibili restano JSON opachi lato Rust: la
/// loro forma la decide l'interfaccia, e tenerla fuori dal database evita una
/// migrazione ogni volta che si aggiunge un criterio.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ViewData {
    pub id: String,
    pub name: String,
    pub display_type: String,
    pub filters: String,
    pub sort_by: String,
    pub group_by: Option<String>,
    pub visible_properties: String,
    pub scope_type: String,
    pub scope_id: Option<String>,
    pub is_default: bool,
    pub position: i64,
    pub created_by: String,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateViewPayload {
    pub name: String,
    pub display_type: String,
    pub filters: Option<String>,
    pub sort_by: Option<String>,
    pub group_by: Option<String>,
    pub visible_properties: Option<String>,
    pub scope_type: Option<String>,
    pub scope_id: Option<String>,
    pub is_default: Option<bool>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateViewPayload {
    pub id: String,
    pub name: Option<String>,
    pub display_type: Option<String>,
    pub filters: Option<String>,
    pub sort_by: Option<String>,
    pub group_by: Option<String>,
    pub visible_properties: Option<String>,
    pub is_default: Option<bool>,
    pub position: Option<i64>,
}

/// Valori ammessi dal vincolo sulla colonna `display_type`.
const TIPI_VISUALIZZAZIONE: [&str; 5] = ["table", "kanban", "list", "calendar", "gallery"];

/// Valori ammessi dal vincolo sulla colonna `scope_type`.
const AMBITI: [&str; 3] = ["global", "type", "page"];

/// Controlla un valore contro l'elenco ammesso, restituendo un messaggio chiaro.
///
/// Senza questo, un valore sbagliato arriverebbe fino al vincolo CHECK di SQLite
/// e l'utente leggerebbe un errore del database invece del motivo vero.
fn valore_ammesso(valore: &str, ammessi: &[&str], campo: &str) -> Result<(), String> {
    if ammessi.contains(&valore) {
        Ok(())
    } else {
        Err(format!("Valore non ammesso per {}: '{}'. Ammessi: {}", campo, valore, ammessi.join(", ")))
    }
}

fn leggi_riga(row: &rusqlite::Row) -> rusqlite::Result<ViewData> {
    Ok(ViewData {
        id: row.get(0)?,
        name: row.get(1)?,
        display_type: row.get(2)?,
        filters: row.get(3)?,
        sort_by: row.get(4)?,
        group_by: row.get(5)?,
        visible_properties: row.get(6)?,
        scope_type: row.get(7)?,
        scope_id: row.get(8)?,
        is_default: row.get::<_, i64>(9)? != 0,
        position: row.get(10)?,
        created_by: row.get(11)?,
        created_at: row.get(12)?,
    })
}

const CAMPI: &str = "id, name, display_type, filters, sort_by, group_by, visible_properties, \
                     scope_type, scope_id, is_default, position, created_by, created_at";

/// Viste di un ambito. Senza `scope_id` restituisce quelle globali.
pub fn get_views_internal(
    conn: &rusqlite::Connection,
    scope_type: Option<&str>,
    scope_id: Option<&str>,
) -> Result<Vec<ViewData>, String> {
    let ambito = scope_type.unwrap_or("global");
    valore_ammesso(ambito, &AMBITI, "scope_type")?;

    let sql = format!(
        "SELECT {} FROM views WHERE scope_type = ?1 AND (?2 IS NULL OR scope_id = ?2) \
         ORDER BY position ASC, created_at ASC",
        CAMPI
    );

    let mut stmt = conn.prepare(&sql).map_err(|e| e.to_string())?;
    let rows = stmt
        .query_map(params![ambito, scope_id], |row| leggi_riga(row))
        .map_err(|e| e.to_string())?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}

pub fn create_view_internal(
    conn: &rusqlite::Connection,
    payload: CreateViewPayload,
    user_id: &str,
) -> Result<ViewData, String> {
    valore_ammesso(&payload.display_type, &TIPI_VISUALIZZAZIONE, "displayType")?;
    let ambito = payload.scope_type.unwrap_or_else(|| "global".to_string());
    valore_ammesso(&ambito, &AMBITI, "scopeType")?;

    let id = Uuid::new_v4().to_string();
    let predefinita = payload.is_default.unwrap_or(false);

    // Una sola vista predefinita per ambito: le altre vengono declassate.
    if predefinita {
        conn.execute(
            "UPDATE views SET is_default = 0 WHERE scope_type = ?1 AND scope_id IS ?2",
            params![ambito, payload.scope_id],
        )
        .map_err(|e| e.to_string())?;
    }

    // La nuova vista si accoda a quelle esistenti dello stesso ambito.
    let posizione: i64 = conn
        .query_row(
            "SELECT COALESCE(MAX(position), -1) + 1 FROM views WHERE scope_type = ?1 AND scope_id IS ?2",
            params![ambito, payload.scope_id],
            |row| row.get(0),
        )
        .unwrap_or(0);

    conn.execute(
        "INSERT INTO views (id, name, display_type, filters, sort_by, group_by, visible_properties,
                            scope_type, scope_id, is_default, position, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
        params![
            id,
            payload.name,
            payload.display_type,
            payload.filters.unwrap_or_else(|| "[]".to_string()),
            payload.sort_by.unwrap_or_else(|| "[]".to_string()),
            payload.group_by,
            payload.visible_properties.unwrap_or_else(|| "[]".to_string()),
            ambito,
            payload.scope_id,
            predefinita as i64,
            posizione,
            user_id
        ],
    )
    .map_err(|e| e.to_string())?;

    get_view_internal(conn, &id)
}

pub fn get_view_internal(conn: &rusqlite::Connection, id: &str) -> Result<ViewData, String> {
    let sql = format!("SELECT {} FROM views WHERE id = ?1", CAMPI);
    conn.query_row(&sql, params![id], |row| leggi_riga(row))
        .map_err(|e| format!("Vista non trovata: {}", e))
}

pub fn update_view_internal(
    conn: &rusqlite::Connection,
    payload: UpdateViewPayload,
) -> Result<ViewData, String> {
    let attuale = get_view_internal(conn, &payload.id)?;

    if let Some(ref tipo) = payload.display_type {
        valore_ammesso(tipo, &TIPI_VISUALIZZAZIONE, "displayType")?;
    }

    if payload.is_default == Some(true) {
        conn.execute(
            "UPDATE views SET is_default = 0 WHERE scope_type = ?1 AND scope_id IS ?2 AND id != ?3",
            params![attuale.scope_type, attuale.scope_id, payload.id],
        )
        .map_err(|e| e.to_string())?;
    }

    conn.execute(
        "UPDATE views SET name = ?1, display_type = ?2, filters = ?3, sort_by = ?4, group_by = ?5,
                          visible_properties = ?6, is_default = ?7, position = ?8,
                          updated_at = datetime('now')
         WHERE id = ?9",
        params![
            payload.name.unwrap_or(attuale.name),
            payload.display_type.unwrap_or(attuale.display_type),
            payload.filters.unwrap_or(attuale.filters),
            payload.sort_by.unwrap_or(attuale.sort_by),
            payload.group_by.or(attuale.group_by),
            payload.visible_properties.unwrap_or(attuale.visible_properties),
            payload.is_default.unwrap_or(attuale.is_default) as i64,
            payload.position.unwrap_or(attuale.position),
            payload.id
        ],
    )
    .map_err(|e| e.to_string())?;

    get_view_internal(conn, &payload.id)
}

pub fn delete_view_internal(conn: &rusqlite::Connection, id: &str) -> Result<(), String> {
    conn.execute("DELETE FROM views WHERE id = ?1", params![id])
        .map_err(|e| e.to_string())?;
    Ok(())
}

// ── Comandi Tauri ──

#[tauri::command]
pub async fn get_views(
    scope_type: Option<String>,
    scope_id: Option<String>,
    state: State<'_, DbState>,
) -> Result<Vec<ViewData>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_views_internal(&conn, scope_type.as_deref(), scope_id.as_deref())
}

#[tauri::command]
pub async fn create_view(
    payload: CreateViewPayload,
    state: State<'_, DbState>,
) -> Result<ViewData, String> {
    let utente = state
        .active_user_id
        .lock()
        .map_err(|e| e.to_string())?
        .clone()
        .ok_or_else(|| "Nessun utente attivo: impossibile salvare la vista".to_string())?;

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    create_view_internal(&conn, payload, &utente)
}

#[tauri::command]
pub async fn update_view(
    payload: UpdateViewPayload,
    state: State<'_, DbState>,
) -> Result<ViewData, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    update_view_internal(&conn, payload)
}

#[tauri::command]
pub async fn delete_view(id: String, state: State<'_, DbState>) -> Result<bool, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    delete_view_internal(&conn, &id)?;
    Ok(true)
}
