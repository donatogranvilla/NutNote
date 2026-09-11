use serde::{Deserialize, Serialize};
use tauri::State;
use crate::db::DbState;
use rusqlite::params;
use uuid::Uuid;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Team {
    pub id: String,
    pub name: String,
    pub description: String,
    pub color: String,
    pub member_count: i64,
    pub created_at: String,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateTeamPayload {
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UpdateTeamPayload {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub color: Option<String>,
}

pub fn get_teams_internal(conn: &rusqlite::Connection) -> Result<Vec<Team>, String> {
    let mut stmt = conn.prepare(
        "SELECT t.id, t.name, t.description, t.color, t.created_at,
                (SELECT COUNT(*) FROM users u WHERE u.team_id = t.id) AS member_count
         FROM teams t
         ORDER BY t.name ASC"
    ).map_err(|e| e.to_string())?;

    let rows = stmt.query_map([], |row| {
        Ok(Team {
            id: row.get(0)?,
            name: row.get(1)?,
            description: row.get(2)?,
            color: row.get(3)?,
            created_at: row.get(4)?,
            member_count: row.get(5)?,
        })
    }).map_err(|e| e.to_string())?;

    Ok(rows.filter_map(|r| r.ok()).collect())
}

pub fn create_team_internal(conn: &rusqlite::Connection, payload: CreateTeamPayload) -> Result<Team, String> {
    let id = format!("team-{}", Uuid::new_v4().to_string().chars().take(8).collect::<String>());
    let desc = payload.description.unwrap_or_default();
    let color = payload.color.unwrap_or_else(|| "#4263eb".to_string());

    conn.execute(
        "INSERT INTO teams (id, name, description, color) VALUES (?1, ?2, ?3, ?4)",
        params![id, payload.name, desc, color],
    ).map_err(|e| e.to_string())?;

    let created_at: String = conn.query_row(
        "SELECT created_at FROM teams WHERE id = ?1",
        params![id],
        |row| row.get(0)
    ).unwrap_or_default();

    Ok(Team {
        id,
        name: payload.name,
        description: desc,
        color,
        member_count: 0,
        created_at,
    })
}

pub fn update_team_internal(conn: &rusqlite::Connection, payload: UpdateTeamPayload) -> Result<Team, String> {
    let desc = payload.description.unwrap_or_default();
    let color = payload.color.unwrap_or_else(|| "#4263eb".to_string());

    conn.execute(
        "UPDATE teams SET name = ?1, description = ?2, color = ?3 WHERE id = ?4",
        params![payload.name, desc, color, payload.id],
    ).map_err(|e| e.to_string())?;

    let (created_at, member_count): (String, i64) = conn.query_row(
        "SELECT t.created_at, (SELECT COUNT(*) FROM users u WHERE u.team_id = t.id)
         FROM teams t WHERE t.id = ?1",
        params![payload.id],
        |row| Ok((row.get(0)?, row.get(1)?))
    ).map_err(|e| e.to_string())?;

    Ok(Team {
        id: payload.id,
        name: payload.name,
        description: desc,
        color,
        member_count,
        created_at,
    })
}

pub fn delete_team_internal(conn: &rusqlite::Connection, id: &str) -> Result<(), String> {
    // Gli utenti che avevano questo team_id avranno team_id = NULL
    conn.execute(
        "UPDATE users SET team_id = NULL WHERE team_id = ?1",
        params![id],
    ).map_err(|e| e.to_string())?;

    conn.execute(
        "DELETE FROM teams WHERE id = ?1",
        params![id],
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn get_teams(
    state: State<'_, DbState>,
) -> Result<Vec<Team>, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    get_teams_internal(&conn)
}

#[tauri::command]
pub async fn create_team(
    payload: CreateTeamPayload,
    state: State<'_, DbState>,
) -> Result<Team, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    create_team_internal(&conn, payload)
}

#[tauri::command]
pub async fn update_team(
    payload: UpdateTeamPayload,
    state: State<'_, DbState>,
) -> Result<Team, String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    update_team_internal(&conn, payload)
}

#[tauri::command]
pub async fn delete_team(
    id: String,
    state: State<'_, DbState>,
) -> Result<(), String> {
    let conn = state.db.lock().map_err(|e| e.to_string())?;
    delete_team_internal(&conn, &id)
}
