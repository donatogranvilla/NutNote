use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbState;
use rusqlite::params;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserData {
    pub id: String,
    pub display_name: String,
    pub avatar_color: String,
    pub role: String,
    pub team_id: Option<String>,
    pub team_name: Option<String>,
    pub team_color: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserWithPassword {
    pub id: String,
    pub display_name: String,
    pub avatar_color: String,
    pub role: String,
    pub password: String,
    pub team_id: Option<String>,
    pub team_name: Option<String>,
    pub team_color: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AuthPayload {
    pub id: String,
    pub password: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateUserPayload {
    pub display_name: String,
    pub avatar_color: Option<String>,
    pub password: Option<String>,
    pub role: Option<String>,
    pub team_id: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateUserPayload {
    pub id: String,
    pub display_name: String,
    pub avatar_color: Option<String>,
    pub role: Option<String>,
    pub team_id: Option<String>,
    pub password: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdatePasswordPayload {
    pub user_id: String,
    pub new_password: String,
}

pub fn get_users_internal(conn: &rusqlite::Connection) -> Result<Vec<UserData>, String> {
    let mut stmt = conn.prepare(
        "SELECT u.id, u.display_name, u.avatar_color, u.role, u.team_id, t.name, t.color, u.created_at
         FROM users u
         LEFT JOIN teams t ON u.team_id = t.id
         ORDER BY u.display_name ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(UserData {
            id: row.get(0)?,
            display_name: row.get(1)?,
            avatar_color: row.get(2)?,
            role: row.get(3)?,
            team_id: row.get(4)?,
            team_name: row.get(5)?,
            team_color: row.get(6)?,
            created_at: row.get(7)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}

pub fn authenticate_user_internal(
    conn: &rusqlite::Connection,
    payload: AuthPayload,
) -> Result<UserData, String> {
    let mut stmt = conn.prepare(
        "SELECT u.id, u.display_name, u.avatar_color, u.role, u.password, u.team_id, t.name, t.color, u.created_at
         FROM users u
         LEFT JOIN teams t ON u.team_id = t.id
         WHERE u.id = ?1"
    ).map_err(|e| e.to_string())?;

    let user_res: Result<(UserData, String), _> = stmt.query_row(params![payload.id], |row| {
        let u = UserData {
            id: row.get(0)?,
            display_name: row.get(1)?,
            avatar_color: row.get(2)?,
            role: row.get(3)?,
            team_id: row.get(5)?,
            team_name: row.get(6)?,
            team_color: row.get(7)?,
            created_at: row.get(8)?,
        };
        let stored_pwd: String = row.get(4)?;
        Ok((u, stored_pwd))
    });

    let (user, stored_pwd) = user_res.map_err(|_| "Utente non trovato".to_string())?;

    if stored_pwd != payload.password {
        return Err("Password non corretta".to_string());
    }

    Ok(user)
}

#[tauri::command]
pub async fn get_users(
    state: State<'_, DbState>,
) -> Result<Vec<UserData>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_users_internal(&conn)
}

/// Elenco completo con password in chiaro, per il pannello di amministrazione.
pub fn get_all_users_admin_internal(
    conn: &rusqlite::Connection,
) -> Result<Vec<UserWithPassword>, String> {
    let mut stmt = conn.prepare(
        "SELECT u.id, u.display_name, u.avatar_color, u.role, u.password, u.team_id, t.name, t.color, u.created_at
         FROM users u
         LEFT JOIN teams t ON u.team_id = t.id
         ORDER BY u.display_name ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(UserWithPassword {
            id: row.get(0)?,
            display_name: row.get(1)?,
            avatar_color: row.get(2)?,
            role: row.get(3)?,
            password: row.get(4)?,
            team_id: row.get(5)?,
            team_name: row.get(6)?,
            team_color: row.get(7)?,
            created_at: row.get(8)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}

#[tauri::command]
pub async fn get_all_users_admin(
    state: State<'_, DbState>,
) -> Result<Vec<UserWithPassword>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_all_users_admin_internal(&conn)
}

#[tauri::command]
pub async fn authenticate_user(
    payload: AuthPayload,
    state: State<'_, DbState>,
) -> Result<UserData, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let user = authenticate_user_internal(&conn, payload)?;

    let mut active_user = state.active_user_id.lock().map_err(|e| e.to_string())?;
    *active_user = Some(user.id.clone());

    Ok(user)
}

/// Crea un profilo. Password e ruolo hanno valori di ripiego perché la creazione
/// rapida dalla schermata di scelta profilo non li chiede.
pub fn create_user_internal(
    conn: &rusqlite::Connection,
    payload: CreateUserPayload,
) -> Result<UserData, String> {
    let id = Uuid::new_v4().to_string();
    let avatar_color = payload.avatar_color.unwrap_or_else(|| "#4263eb".to_string());
    let password = payload.password.unwrap_or_else(|| "1234".to_string());
    let role = payload.role.unwrap_or_else(|| "user".to_string());

    conn.execute(
        "INSERT INTO users (id, display_name, avatar_color, role, password, team_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, payload.display_name, avatar_color, role, password, payload.team_id],
    ).map_err(|e| e.to_string())?;

    // Recuperiamo il nome/colore del team associato
    let team_info: Option<(String, String)> = if let Some(ref tid) = payload.team_id {
        conn.query_row(
            "SELECT name, color FROM teams WHERE id = ?1",
            params![tid],
            |row| Ok((row.get(0)?, row.get(1)?))
        ).ok()
    } else {
        None
    };

    let (team_name, team_color) = match team_info {
        Some((n, c)) => (Some(n), Some(c)),
        None => (None, None),
    };

    let created_at: String = conn.query_row(
        "SELECT created_at FROM users WHERE id = ?1",
        params![id],
        |row| row.get(0)
    ).unwrap_or_default();

    Ok(UserData {
        id,
        display_name: payload.display_name,
        avatar_color,
        role,
        team_id: payload.team_id,
        team_name,
        team_color,
        created_at,
    })
}

#[tauri::command]
pub async fn create_user(
    payload: CreateUserPayload,
    state: State<'_, DbState>,
) -> Result<UserData, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    create_user_internal(&conn, payload)
}

/// Imposta una nuova password senza verificare la precedente: il ripristino
/// avviene dal pannello di amministrazione, non dall'utente stesso.
pub fn update_user_password_internal(
    conn: &rusqlite::Connection,
    payload: UpdatePasswordPayload,
) -> Result<(), String> {
    conn.execute(
        "UPDATE users SET password = ?1 WHERE id = ?2",
        params![payload.new_password, payload.user_id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn update_user_password(
    payload: UpdatePasswordPayload,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    update_user_password_internal(&conn, payload)
}

/// Aggiorna il profilo. Una password vuota significa "lasciala com'è".
pub fn update_user_internal(
    conn: &rusqlite::Connection,
    payload: UpdateUserPayload,
) -> Result<UserData, String> {
    let avatar_color = payload.avatar_color.unwrap_or_else(|| "#4263eb".to_string());
    let role = payload.role.unwrap_or_else(|| "user".to_string());

    if let Some(ref pwd) = payload.password {
        if !pwd.is_empty() {
            conn.execute(
                "UPDATE users SET display_name = ?1, avatar_color = ?2, role = ?3, team_id = ?4, password = ?5 WHERE id = ?6",
                params![payload.display_name, avatar_color, role, payload.team_id, pwd, payload.id],
            ).map_err(|e| e.to_string())?;
        } else {
            conn.execute(
                "UPDATE users SET display_name = ?1, avatar_color = ?2, role = ?3, team_id = ?4 WHERE id = ?5",
                params![payload.display_name, avatar_color, role, payload.team_id, payload.id],
            ).map_err(|e| e.to_string())?;
        }
    } else {
        conn.execute(
            "UPDATE users SET display_name = ?1, avatar_color = ?2, role = ?3, team_id = ?4 WHERE id = ?5",
            params![payload.display_name, avatar_color, role, payload.team_id, payload.id],
        ).map_err(|e| e.to_string())?;
    }

    let (created_at, team_name, team_color): (String, Option<String>, Option<String>) = conn.query_row(
        "SELECT u.created_at, t.name, t.color
         FROM users u
         LEFT JOIN teams t ON u.team_id = t.id
         WHERE u.id = ?1",
        params![payload.id],
        |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?))
    ).map_err(|e| e.to_string())?;

    Ok(UserData {
        id: payload.id,
        display_name: payload.display_name,
        avatar_color,
        role,
        team_id: payload.team_id,
        team_name,
        team_color,
        created_at,
    })
}

#[tauri::command]
pub async fn update_user(
    payload: UpdateUserPayload,
    state: State<'_, DbState>,
) -> Result<UserData, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    update_user_internal(&conn, payload)
}

/// Elimina un profilo. Le pagine che ha creato restano, ma il vincolo di chiave
/// esterna su `created_by` impedisce la cancellazione finché ne esiste qualcuna.
pub fn delete_user_internal(conn: &rusqlite::Connection, id: &str) -> Result<(), String> {
    conn.execute(
        "DELETE FROM users WHERE id = ?1",
        params![id],
    ).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn delete_user(
    id: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    delete_user_internal(&conn, &id)
}

#[tauri::command]
pub async fn set_active_user(
    id: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let mut active_user = state.active_user_id.lock().map_err(|e| e.to_string())?;
    *active_user = Some(id);
    Ok(())
}

#[tauri::command]
pub async fn get_active_user(
    state: State<'_, DbState>,
) -> Result<Option<UserData>, String> {
    let active_user = state.active_user_id.lock().map_err(|e| e.to_string())?;
    let user_id = match active_user.as_ref() {
        Some(id) => id.clone(),
        None => return Ok(None),
    };

    let conn = state.db.lock().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare(
        "SELECT u.id, u.display_name, u.avatar_color, u.role, u.team_id, t.name, t.color, u.created_at
         FROM users u
         LEFT JOIN teams t ON u.team_id = t.id
         WHERE u.id = ?1"
    ).map_err(|e| e.to_string())?;

    let user = stmt.query_row(params![user_id], |row| {
        Ok(UserData {
            id: row.get(0)?,
            display_name: row.get(1)?,
            avatar_color: row.get(2)?,
            role: row.get(3)?,
            team_id: row.get(4)?,
            team_name: row.get(5)?,
            team_color: row.get(6)?,
            created_at: row.get(7)?,
        })
    }).ok();

    Ok(user)
}
