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
    users::{
        self, AuthPayload, CreateUserPayload, UpdatePasswordPayload, UpdateUserPayload, UserData,
        UserWithPassword,
    },
    teams::{self, CreateTeamPayload, Team, UpdateTeamPayload},
    chat::{self, ChatMessage, CreateChatMessagePayload},
    changelog::{self, ChangeLogEntry},
    views::{self, CreateViewPayload, UpdateViewPayload, ViewData},
};
use crate::server::identity::CurrentUser;
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
    user: CurrentUser,
    Json(payload): Json<CreatePagePayload>,
) -> Result<Json<PageResponse>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let page = pages::create_page_internal(&conn, payload, user.author_id()?)
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
    user: CurrentUser,
    Path(id): Path<String>,
) -> Result<Json<PageWithAncestorsResponse>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = pages::get_page_with_ancestors_internal(&conn, &id, user.filter_id())
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(res))
}

async fn query_pages_route(
    State(state): State<Arc<ServerAppState>>,
    user: CurrentUser,
    Json(payload): Json<QueryPagesPayload>,
) -> Result<Json<Vec<PageResponse>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = pages::query_pages_internal(&conn, payload, user.filter_id())
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(res))
}

async fn update_page_route(
    State(state): State<Arc<ServerAppState>>,
    user: CurrentUser,
    Path(id): Path<String>,
    Json(mut payload): Json<UpdatePagePayload>,
) -> Result<Json<PageResponse>, (StatusCode, String)> {
    payload.id = id;
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = pages::update_page_internal(&conn, payload, user.author_id()?)
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(res))
}

async fn move_page_route(
    State(state): State<Arc<ServerAppState>>,
    user: CurrentUser,
    Path(id): Path<String>,
    Json(mut payload): Json<MovePagePayload>,
) -> Result<Json<PageResponse>, (StatusCode, String)> {
    payload.id = id;
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = pages::move_page_internal(&conn, payload, user.author_id()?)
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(res))
}

async fn delete_page_route(
    State(state): State<Arc<ServerAppState>>,
    user: CurrentUser,
    Path(id): Path<String>,
) -> Result<Json<bool>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = pages::delete_page_internal(&conn, &id, user.author_id()?)
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
    user: CurrentUser,
) -> Result<Json<Vec<PageResponse>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let uid = user.filter_id().unwrap_or("");
    let sql = format!("SELECT {} FROM pages WHERE is_pinned = 1 AND is_archived = 0 AND (visibility = 'public' OR created_by = ?1) ORDER BY updated_at DESC", pages::PAGE_SELECT_FIELDS);
    let mut stmt = conn.prepare(&sql).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let rows = stmt.query_map([uid], |row| {
        pages::get_page_internal(&conn, &row.get::<_, String>(0)?)
    }).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let list: Vec<PageResponse> = rows.filter_map(|r| r.ok()).collect();
    Ok(Json(list))
}

async fn get_recent_pages_route(
    State(state): State<Arc<ServerAppState>>,
    user: CurrentUser,
    Query(q): Query<RecentQuery>,
) -> Result<Json<Vec<PageResponse>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let lim = q.limit.unwrap_or(10);
    let uid = user.filter_id().unwrap_or("");
    let sql = format!("SELECT id FROM pages WHERE is_archived = 0 AND (visibility = 'public' OR created_by = ?1) ORDER BY updated_at DESC LIMIT {}", lim);
    let mut stmt = conn.prepare(&sql).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let ids: Vec<String> = stmt.query_map([uid], |r| r.get(0)).map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?
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
    user: CurrentUser,
    Path(page_id): Path<String>,
    Json(mut payload): Json<SaveBlocksPayload>,
) -> Result<Json<bool>, (StatusCode, String)> {
    payload.page_id = page_id;
    let mut conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let user_id = user.author_id()?;
    let res = blocks::save_blocks_internal(&mut conn, payload, user_id)
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
    user: CurrentUser,
    Json(payload): Json<CreateRelationPayload>,
) -> Result<Json<bool>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = relations::create_page_relation_internal(&conn, payload, user.author_id()?)
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
    user: CurrentUser,
    Query(q): Query<SearchQuery>,
) -> Result<Json<Vec<SearchResultItem>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = search::search_pages_internal(&conn, &q.q, q.limit, user.filter_id())
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

/// Elenco con le password, per il pannello di amministrazione.
async fn get_all_users_admin_route(
    State(state): State<Arc<ServerAppState>>,
) -> Result<Json<Vec<UserWithPassword>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = users::get_all_users_admin_internal(&conn)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(res))
}

/// Creazione di un profilo: volutamente senza identità richiesta, perché è
/// l'operazione che serve a un collega che apre NutNote per la prima volta da un
/// PC nuovo, quando ancora nessun profilo è suo.
async fn create_user_route(
    State(state): State<Arc<ServerAppState>>,
    Json(payload): Json<CreateUserPayload>,
) -> Result<Json<UserData>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = users::create_user_internal(&conn, payload)
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(res))
}

/// Modifica di un profilo altrui: qui l'identità serve, perché è un'operazione
/// amministrativa e le tabelle utenti non hanno un changelog proprio.
async fn update_user_route(
    State(state): State<Arc<ServerAppState>>,
    user: CurrentUser,
    Path(id): Path<String>,
    Json(mut payload): Json<UpdateUserPayload>,
) -> Result<Json<UserData>, (StatusCode, String)> {
    let esecutore = user.author_id()?;
    payload.id = id;
    log::info!("{} aggiorna il profilo {}", esecutore, payload.id);

    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = users::update_user_internal(&conn, payload)
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(res))
}

async fn delete_user_route(
    State(state): State<Arc<ServerAppState>>,
    user: CurrentUser,
    Path(id): Path<String>,
) -> Result<Json<bool>, (StatusCode, String)> {
    let esecutore = user.author_id()?;
    log::info!("{} elimina il profilo {}", esecutore, id);

    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    users::delete_user_internal(&conn, &id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(true))
}

/// Il profilo da modificare è quello nel percorso: la nuova password è l'unica
/// cosa che viaggia nel corpo, per non avere due fonti per lo stesso id.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NuovaPasswordPayload {
    pub new_password: String,
}

async fn update_user_password_route(
    State(state): State<Arc<ServerAppState>>,
    user: CurrentUser,
    Path(id): Path<String>,
    Json(payload): Json<NuovaPasswordPayload>,
) -> Result<Json<bool>, (StatusCode, String)> {
    let esecutore = user.author_id()?;
    log::info!("{} reimposta la password del profilo {}", esecutore, id);

    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    users::update_user_password_internal(
        &conn,
        UpdatePasswordPayload { user_id: id, new_password: payload.new_password },
    )
    .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(true))
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
    user: CurrentUser,
    Json(payload): Json<CreateChatMessagePayload>,
) -> Result<Json<ChatMessage>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = chat::create_chat_message_internal(&conn, payload, user.author_id()?)
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(res))
}

// Viste salvate
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AmbitoVisteQuery {
    pub scope_type: Option<String>,
    pub scope_id: Option<String>,
}

async fn get_views_route(
    State(state): State<Arc<ServerAppState>>,
    Query(q): Query<AmbitoVisteQuery>,
) -> Result<Json<Vec<ViewData>>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = views::get_views_internal(&conn, q.scope_type.as_deref(), q.scope_id.as_deref())
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(res))
}

async fn create_view_route(
    State(state): State<Arc<ServerAppState>>,
    user: CurrentUser,
    Json(payload): Json<CreateViewPayload>,
) -> Result<Json<ViewData>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = views::create_view_internal(&conn, payload, user.author_id()?)
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(res))
}

async fn update_view_route(
    State(state): State<Arc<ServerAppState>>,
    Path(id): Path<String>,
    Json(mut payload): Json<UpdateViewPayload>,
) -> Result<Json<ViewData>, (StatusCode, String)> {
    payload.id = id;
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let res = views::update_view_internal(&conn, payload)
        .map_err(|e| (StatusCode::BAD_REQUEST, e))?;
    Ok(Json(res))
}

async fn delete_view_route(
    State(state): State<Arc<ServerAppState>>,
    Path(id): Path<String>,
) -> Result<Json<bool>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    views::delete_view_internal(&conn, &id)
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e))?;
    Ok(Json(true))
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

// L'autore del ripristino arriva dall'header X-NutNote-User, non dal corpo:
// un campo nel payload sarebbe una seconda fonte di verità per la stessa cosa.
#[derive(Debug, Deserialize)]
pub struct RestorePayload {
    pub log_id: String,
}

async fn restore_changelog_route(
    State(state): State<Arc<ServerAppState>>,
    user: CurrentUser,
    Json(payload): Json<RestorePayload>,
) -> Result<Json<bool>, (StatusCode, String)> {
    let conn = state.db.lock().map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;
    let uid = user.author_id()?;

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
        .route("/api/pages/{id}", get(get_page_route).put(update_page_route).delete(delete_page_route))
        .route("/api/pages/{id}/full", get(get_page_with_ancestors_route))
        .route("/api/pages/{id}/move", put(move_page_route))
        .route("/api/pages/{id}/pin", post(toggle_pin_page_route))
        // Blocks
        .route("/api/blocks/{page_id}", get(get_blocks_route).put(save_blocks_route))
        // Page Types
        .route("/api/page-types", get(get_page_types_route))
        .route("/api/page-types/{id}", get(get_page_type_route))
        // Relations
        .route("/api/relations", post(create_relation_route))
        .route("/api/relations/{page_id}", get(get_relations_route))
        .route("/api/relations/item/{id}", delete(delete_relation_route))
        // Search
        .route("/api/search", get(search_route))
        // Users & Auth
        .route("/api/users", get(get_users_route).post(create_user_route))
        .route("/api/users/{id}", put(update_user_route).delete(delete_user_route))
        .route("/api/users/{id}/password", put(update_user_password_route))
        // Percorso separato invece di /api/users/admin: evita di far somigliare
        // una risorsa amministrativa all'id di un utente di nome "admin".
        .route("/api/admin/users", get(get_all_users_admin_route))
        .route("/api/auth", post(auth_route))
        // Teams
        .route("/api/teams", get(get_teams_route).post(create_team_route))
        .route("/api/teams/{id}", put(update_team_route).delete(delete_team_route))
        // Chat
        .route("/api/chat", post(create_chat_route))
        .route("/api/chat/{page_id}", get(get_chat_route))
        // Viste salvate
        .route("/api/views", get(get_views_route).post(create_view_route))
        .route("/api/views/{id}", put(update_view_route).delete(delete_view_route))
        // ChangeLog
        .route("/api/changelog/{entity_type}/{entity_id}", get(get_changelog_route))
        .route("/api/changelog/restore", post(restore_changelog_route))
        .layer(cors)
        .with_state(state)
}

// -------------------------------------------------------------
// TEST
// -------------------------------------------------------------

#[cfg(test)]
mod test {
    use super::*;
    use crate::server::identity::USER_HEADER;
    use axum::body::Body;
    use axum::extract::FromRequestParts;
    use axum::http::Request;
    use tower::ServiceExt;

    /// Router pronto su un database vuoto in memoria, per le prove sulle rotte.
    fn router_di_prova() -> Router {
        let conn = rusqlite::Connection::open_in_memory().expect("database in memoria");
        conn.execute_batch("PRAGMA foreign_keys = ON;").expect("chiavi esterne");
        crate::schema::run_migrations(&conn).expect("migrazioni dello schema");

        let stato = Arc::new(ServerAppState {
            db: Arc::new(std::sync::Mutex::new(conn)),
            app_dir: std::path::PathBuf::from("."),
        });
        build_router(stato)
    }

    /// Corpo della risposta interpretato come JSON.
    async fn corpo_json(risposta: axum::response::Response) -> serde_json::Value {
        let byte = axum::body::to_bytes(risposta.into_body(), usize::MAX).await.unwrap();
        serde_json::from_slice(&byte).unwrap_or(serde_json::Value::Null)
    }

    /// Costruire il router non deve andare in panic.
    ///
    /// axum 0.8 rifiuta la vecchia sintassi `/:id` dei parametri di percorso e lo
    /// verifica solo a runtime: senza questo test la regressione si scoprirebbe
    /// soltanto avviando il server, cioè quando un collega prova a collegarsi.
    #[test]
    fn il_router_si_costruisce_senza_panic() {
        let conn = rusqlite::Connection::open_in_memory().expect("database in memoria");
        crate::schema::run_migrations(&conn).expect("migrazioni dello schema");

        let stato = Arc::new(ServerAppState {
            db: Arc::new(std::sync::Mutex::new(conn)),
            app_dir: std::path::PathBuf::from("."),
        });

        let _router = build_router(stato);
    }

    /// Senza header l'identità resta vuota: si legge il pubblico, non si scrive.
    #[tokio::test]
    async fn richiesta_senza_header_resta_anonima() {
        let (mut parti, _) = Request::builder()
            .uri("/api/pages/query")
            .body(())
            .unwrap()
            .into_parts();

        let utente = CurrentUser::from_request_parts(&mut parti, &()).await.unwrap();

        assert_eq!(utente.filter_id(), None, "l'anonimo vede le sole pagine pubbliche");
        assert!(utente.author_id().is_err(), "l'anonimo non può firmare scritture");
    }

    /// Con l'header, lo stesso id vale sia per il filtro di visibilità sia come autore.
    #[tokio::test]
    async fn richiesta_con_header_identifica_utente() {
        let (mut parti, _) = Request::builder()
            .uri("/api/pages/query")
            .header(USER_HEADER, "  utente-1  ")
            .body(())
            .unwrap()
            .into_parts();

        let utente = CurrentUser::from_request_parts(&mut parti, &()).await.unwrap();

        assert_eq!(utente.filter_id(), Some("utente-1"), "gli spazi vengono ripuliti");
        assert_eq!(utente.author_id().unwrap(), "utente-1");
    }

    /// Percorso completo di una creazione utente via HTTP: è la rotta che prima
    /// non esisteva, per cui in rete il pannello di amministrazione finiva per
    /// scrivere nel database locale del client invece che su quello del server.
    #[tokio::test]
    async fn crea_utente_via_http_e_lo_rilegge() {
        let router = router_di_prova();

        // Delimitatore a due cancelletti: il valore del colore contiene `"#`,
        // che con `r#"..."#` chiuderebbe la stringa a metà.
        let corpo = r##"{"displayName":"Laura Bianchi","avatarColor":"#2f9e44","password":"segreta","role":"user"}"##;
        let creazione = Request::builder()
            .method("POST")
            .uri("/api/users")
            .header("content-type", "application/json")
            .body(Body::from(corpo))
            .unwrap();

        let risposta = router.clone().oneshot(creazione).await.unwrap();
        assert_eq!(risposta.status(), StatusCode::OK, "la creazione deve riuscire");
        assert_eq!(corpo_json(risposta).await["displayName"], "Laura Bianchi");

        let elenco = Request::builder().uri("/api/users").body(Body::empty()).unwrap();
        let risposta = router.oneshot(elenco).await.unwrap();
        let utenti = corpo_json(risposta).await;

        let presente = utenti
            .as_array()
            .expect("elenco utenti")
            .iter()
            .any(|u| u["displayName"] == "Laura Bianchi");
        assert!(presente, "il nuovo utente deve comparire nell'elenco del server");
    }

    /// Creare un profilo è libero, toccare quello di un altro no.
    #[tokio::test]
    async fn eliminare_un_profilo_senza_identita_viene_respinto() {
        let router = router_di_prova();

        let richiesta = Request::builder()
            .method("DELETE")
            .uri("/api/users/123e4567-e89b-12d3-a456-426614174000")
            .body(Body::empty())
            .unwrap();

        let risposta = router.oneshot(richiesta).await.unwrap();
        assert_eq!(
            risposta.status(),
            StatusCode::UNAUTHORIZED,
            "senza header non si devono poter toccare i profili altrui"
        );
    }
}
