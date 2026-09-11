use axum::{
    extract::{Path, Query, State},
    http::StatusCode,
    routing::{get, post, put, delete},
    Json, Router,
};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

use crate::commands::{
    pages::{
        self, CreatePagePayload, MovePagePayload, PageResponse, PageWithAncestorsResponse,
        QueryPagesPayload, UpdatePagePayload,
    },
    blocks::{self, BlockData, SaveBlocksPayload},
    page_types::{self, PageTypeResponse},
    relations::{self, CreateRelationPayload, PageRelationItem},
    search::{self, SearchResultItem},
    users::{self, AuthPayload, UserData},
    teams::{self, CreateTeamPayload, Team, UpdateTeamPayload},
    chat::{self, ChatMessage, CreateChatMessagePayload},
    changelog::{self, ChangeLogEntry},
};
use crate::server::ServerAppState;

#[derive(Debug, Deserialize)]
pub struct SearchQuery {
    pub q: String,
    pub limit: Option<i64>,
}

#[derive(Debug, Deserialize)]
pub struct RecentQuery {
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize)]
pub struct HealthResponse {
    pub status: String,
    pub app: String,
    pub version: String,
}

// -------------------------------------------------------------
// ROUTE HANDLERS
// -------------------------------------------------------------

async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
        app: "NutNote".to_string(),
        version: "0.1.0".to_string(),
    })
}

// Pages
async fn create_page_route(
    State(state): State<Arc<ServerAppState>>,
    Json(payload): Json<CreatePagePayload>,
) -> Result<Json<PageResponse>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let page = pages::create_page_internal(&conn, payload, "123e4567-e89b-12d3-a456-426614174000")
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(page))
}

async fn get_page_route(
    State(state): State<Arc<ServerAppState>>,
    Path(id): Path<String>,
) -> Result<Json<PageResponse>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let page = pages::get_page_internal(&conn, &id)
        .map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))?;
    Ok(Json(page))
}

async fn get_page_with_ancestors_route(
    State(state): State<Arc<ServerAppState>>,
    Path(id): Path<String>,
) -> Result<Json<PageWithAncestorsResponse>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = pages::get_page_with_ancestors_internal(&conn, &id, None)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(res))
}

async fn query_pages_route(
    State(state): State<Arc<ServerAppState>>,
    Json(payload): Json<QueryPagesPayload>,
) -> Result<Json<Vec<PageResponse>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = pages::query_pages_internal(&conn, payload, None)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(res))
}

async fn update_page_route(
    State(state): State<Arc<ServerAppState>>,
    Path(id): Path<String>,
    Json(mut payload): Json<UpdatePagePayload>,
) -> Result<Json<PageResponse>, (StatusCode, String)> {
    payload.id = id;
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = pages::update_page_internal(&conn, payload, "123e4567-e89b-12d3-a456-426614174000")
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(res))
}

async fn move_page_route(
    State(state): State<Arc<ServerAppState>>,
    Path(id): Path<String>,
    Json(mut payload): Json<MovePagePayload>,
) -> Result<Json<PageResponse>, (StatusCode, String)> {
    payload.id = id;
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = pages::move_page_internal(&conn, payload, "123e4567-e89b-12d3-a456-426614174000")
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(res))
}

async fn delete_page_route(
    State(state): State<Arc<ServerAppState>>,
    Path(id): Path<String>,
) -> Result<Json<bool>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = pages::delete_page_internal(&conn, &id, "123e4567-e89b-12d3-a456-426614174000")
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(res))
}

async fn toggle_pin_page_route(
    State(state): State<Arc<ServerAppState>>,
    Path(id): Path<String>,
) -> Result<Json<bool>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    conn.execute(
        "UPDATE pages SET is_pinned = CASE WHEN is_pinned = 1 THEN 0 ELSE 1 END WHERE id = ?1",
        rusqlite::params![id],
    ).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let is_pinned: i32 = conn.query_row(
        "SELECT is_pinned FROM pages WHERE id = ?1",
        rusqlite::params![id],
        |r| r.get(0),
    ).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(is_pinned != 0))
}

async fn get_pinned_pages_route(
    State(state): State<Arc<ServerAppState>>,
) -> Result<Json<Vec<PageResponse>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let sql = format!("SELECT {} FROM pages WHERE is_pinned = 1 AND is_archived = 0 AND visibility = 'public' ORDER BY updated_at DESC", pages::PAGE_SELECT_FIELDS);
    let mut stmt = conn.prepare(&sql).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows = stmt.query_map([], |row| {
        pages::get_page_internal(&conn, &row.get::<_, String>(0)?)
    }).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let list: Vec<PageResponse> = rows.filter_map(|r| r.ok()).collect();
    Ok(Json(list))
}

async fn get_recent_pages_route(
    State(state): State<Arc<ServerAppState>>,
    Query(q): Query<RecentQuery>,
) -> Result<Json<Vec<PageResponse>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let lim = q.limit.unwrap_or(10);
    let sql = format!("SELECT id FROM pages WHERE is_archived = 0 AND visibility = 'public' ORDER BY updated_at DESC LIMIT {}", lim);
    let mut stmt = conn.prepare(&sql).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let ids: Vec<String> = stmt.query_map([], |r| r.get(0)).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
        .filter_map(|r| r.ok()).collect();
    let mut pages_list = Vec::new();
    for id in ids {
        if let Ok(p) = pages::get_page_internal(&conn, &id) {
            pages_list.push(p);
        }
    }
    Ok(Json(pages_list))
}

// Blocks
async fn get_blocks_route(
    State(state): State<Arc<ServerAppState>>,
    Path(page_id): Path<String>,
) -> Result<Json<Vec<BlockData>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = blocks::get_blocks_internal(&conn, &page_id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(res))
}

async fn save_blocks_route(
    State(state): State<Arc<ServerAppState>>,
    Path(page_id): Path<String>,
    Json(mut payload): Json<SaveBlocksPayload>,
) -> Result<Json<bool>, (StatusCode, String)> {
    payload.page_id = page_id;
    let mut conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let user_id = payload.user_id.clone().unwrap_or_else(|| "123e4567-e89b-12d3-a456-426614174000".to_string());
    let res = blocks::save_blocks_internal(&mut conn, payload, &user_id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(res))
}

// Page Types
async fn get_page_types_route(
    State(state): State<Arc<ServerAppState>>,
) -> Result<Json<Vec<PageTypeResponse>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = page_types::get_page_types_internal(&conn)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(res))
}

async fn get_page_type_route(
    State(state): State<Arc<ServerAppState>>,
    Path(id): Path<String>,
) -> Result<Json<PageTypeResponse>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = page_types::get_page_type_internal(&conn, &id)
        .map_err(|e| (StatusCode::NOT_FOUND, e))?;
    Ok(Json(res))
}

// Relations
async fn get_relations_route(
    State(state): State<Arc<ServerAppState>>,
    Path(page_id): Path<String>,
) -> Result<Json<Vec<PageRelationItem>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = relations::get_page_relations_internal(&conn, &page_id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(res))
}

async fn create_relation_route(
    State(state): State<Arc<ServerAppState>>,
    Json(payload): Json<CreateRelationPayload>,
) -> Result<Json<bool>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = relations::create_page_relation_internal(&conn, payload, "123e4567-e89b-12d3-a456-426614174000")
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(res))
}

async fn delete_relation_route(
    State(state): State<Arc<ServerAppState>>,
    Path(id): Path<String>,
) -> Result<Json<bool>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = relations::delete_page_relation_internal(&conn, &id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(res))
}

// Search
async fn search_route(
    State(state): State<Arc<ServerAppState>>,
    Query(q): Query<SearchQuery>,
) -> Result<Json<Vec<SearchResultItem>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = search::search_pages_internal(&conn, &q.q, q.limit, None)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(res))
}

// Users
async fn get_users_route(
    State(state): State<Arc<ServerAppState>>,
) -> Result<Json<Vec<UserData>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = users::get_users_internal(&conn)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(res))
}

async fn auth_route(
    State(state): State<Arc<ServerAppState>>,
    Json(payload): Json<AuthPayload>,
) -> Result<Json<UserData>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let user = users::authenticate_user_internal(&conn, payload)
        .map_err(|e| (StatusCode::UNAUTHORIZED, e))?;
    Ok(Json(user))
}

// Teams
async fn get_teams_route(
    State(state): State<Arc<ServerAppState>>,
) -> Result<Json<Vec<Team>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = teams::get_teams_internal(&conn)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(res))
}

async fn create_team_route(
    State(state): State<Arc<ServerAppState>>,
    Json(payload): Json<CreateTeamPayload>,
) -> Result<Json<Team>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = teams::create_team_internal(&conn, payload)
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(res))
}

async fn update_team_route(
    State(state): State<Arc<ServerAppState>>,
    Path(id): Path<String>,
    Json(mut payload): Json<UpdateTeamPayload>,
) -> Result<Json<Team>, (StatusCode, String)> {
    payload.id = id;
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = teams::update_team_internal(&conn, payload)
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(res))
}

async fn delete_team_route(
    State(state): State<Arc<ServerAppState>>,
    Path(id): Path<String>,
) -> Result<Json<bool>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    teams::delete_team_internal(&conn, &id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(true))
}

// Chat
async fn get_chat_route(
    State(state): State<Arc<ServerAppState>>,
    Path(page_id): Path<String>,
) -> Result<Json<Vec<ChatMessage>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = chat::get_chat_messages_internal(&conn, &page_id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(res))
}

async fn create_chat_route(
    State(state): State<Arc<ServerAppState>>,
    Json(payload): Json<CreateChatMessagePayload>,
) -> Result<Json<ChatMessage>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = chat::create_chat_message_internal(&conn, payload, "123e4567-e89b-12d3-a456-426614174000")
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(res))
}

// ChangeLog
async fn get_changelog_route(
    State(state): State<Arc<ServerAppState>>,
    Path((entity_type, entity_id)): Path<(String, String)>,
) -> Result<Json<Vec<ChangeLogEntry>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let mut stmt = conn.prepare(
        "SELECT cl.id, cl.entity_type, cl.entity_id, cl.action, cl.field_name, 
                cl.old_value, cl.new_value, cl.user_id, u.display_name, cl.device_id, cl.created_at
         FROM change_log cl
         LEFT JOIN users u ON u.id = cl.user_id
         WHERE cl.entity_type = ?1 AND cl.entity_id = ?2
         ORDER BY cl.created_at DESC
         LIMIT 100"
    ).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let rows = stmt.query_map(rusqlite::params![entity_type, entity_id], |r| {
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
    }).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    Ok(Json(rows.filter_map(|r| r.ok()).collect()))
}

#[derive(Debug, Deserialize)]
pub struct RestorePayload {
    pub log_id: String,
    pub user_id: Option<String>,
}

async fn restore_changelog_route(
    State(state): State<Arc<ServerAppState>>,
    Json(payload): Json<RestorePayload>,
) -> Result<Json<bool>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let uid = payload.user_id.unwrap_or_else(|| "123e4567-e89b-12d3-a456-426614174000".to_string());

    let (entity_type, entity_id, field_name, old_value): (String, String, Option<String>, Option<String>) = conn.query_row(
        "SELECT entity_type, entity_id, field_name, old_value FROM change_log WHERE id = ?1",
        rusqlite::params![payload.log_id],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?, r.get(3)?)),
    ).map_err(|e| (StatusCode::NOT_FOUND, e.to_string()))?;

    let field = field_name.ok_or_else(|| (StatusCode::BAD_REQUEST, "Nessun campo specificato in questa revisione".to_string()))?;
    let val = old_value.unwrap_or_default();

    if entity_type == "page" {
        let current_val: String = conn.query_row(
            &format!("SELECT COALESCE({}, '') FROM pages WHERE id = ?1", field),
            rusqlite::params![entity_id],
            |r| r.get(0),
        ).unwrap_or_default();

        conn.execute(
            &format!("UPDATE pages SET {} = ?1, updated_by = ?2, version = version + 1 WHERE id = ?3", field),
            rusqlite::params![val, uid, entity_id],
        ).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

        let _ = changelog::log_change(
            &conn,
            "page",
            &entity_id,
            "update",
            Some(&field),
            Some(&current_val),
            Some(&val),
            &uid,
            Some("restore"),
        );
    }

    Ok(Json(true))
}

// -------------------------------------------------------------
// CREATE ROUTER
// -------------------------------------------------------------

pub fn build_router(state: Arc<ServerAppState>) -> Router {
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    Router::new()
        .route("/api/health", get(health_check))
        // Pages
        .route("/api/pages", post(create_page_route))
        .route("/api/pages/query", post(query_pages_route))
        .route("/api/pages/pinned", get(get_pinned_pages_route))
        .route("/api/pages/recent", get(get_recent_pages_route))
        .route("/api/pages/:id", get(get_page_route).put(update_page_route).delete(delete_page_route))
        .route("/api/pages/:id/full", get(get_page_with_ancestors_route))
        .route("/api/pages/:id/move", put(move_page_route))
        .route("/api/pages/:id/pin", post(toggle_pin_page_route))
        // Blocks
        .route("/api/blocks/:page_id", get(get_blocks_route).put(save_blocks_route))
        // Page Types
        .route("/api/page-types", get(get_page_types_route))
        .route("/api/page-types/:id", get(get_page_type_route))
        // Relations
        .route("/api/relations", post(create_relation_route))
        .route("/api/relations/:page_id", get(get_relations_route))
        .route("/api/relations/item/:id", delete(delete_relation_route))
        // Search
        .route("/api/search", get(search_route))
        // Users & Auth
        .route("/api/users", get(get_users_route))
        .route("/api/auth", post(auth_route))
        // Teams
        .route("/api/teams", get(get_teams_route).post(create_team_route))
        .route("/api/teams/:id", put(update_team_route).delete(delete_team_route))
        // Chat
        .route("/api/chat", post(create_chat_route))
        .route("/api/chat/:page_id", get(get_chat_route))
        // ChangeLog
        .route("/api/changelog/:entity_type/:entity_id", get(get_changelog_route))
        .route("/api/changelog/restore", post(restore_changelog_route))
        .layer(cors)
        .with_state(state)
}
