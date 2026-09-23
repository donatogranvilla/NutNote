//! Identità della richiesta sul server HTTP della LAN.
//!
//! Sul desktop l'utente attivo è uno stato di processo (`DbState::active_user_id`):
//! l'app serve una persona alla volta. Il server LAN no — ogni richiesta arriva da
//! un client diverso — quindi qui l'identità è una proprietà *della richiesta* e
//! viaggia nell'header `X-NutNote-User`.

use axum::{
    extract::FromRequestParts,
    http::{request::Parts, StatusCode},
};

/// Header con cui i client NutNote dichiarano chi sta agendo.
pub const USER_HEADER: &str = "x-nutnote-user";

/// Utente che ha originato la richiesta HTTP.
///
/// Dichiararlo nella firma di un handler è ciò che impedisce alla rotta di
/// "dimenticare" l'identità: prima di questo extractor le rotte passavano `None`
/// alle funzioni `_internal` oppure l'UUID dell'utente Admin creato dal seed, così
/// che in LAN ogni modifica risultava firmata da Admin.
#[derive(Debug, Clone)]
pub struct CurrentUser(pub Option<String>);

impl CurrentUser {
    /// Id da usare come filtro di visibilità nelle letture.
    /// `None` significa "vede solo le pagine pubbliche".
    pub fn filter_id(&self) -> Option<&str> {
        self.0.as_deref()
    }

    /// Id da registrare come autore di una scrittura.
    ///
    /// `pages.created_by`, `pages.updated_by`, `change_log.user_id` e
    /// `chat_messages.user_id` sono tutti `REFERENCES users(id)` con
    /// `PRAGMA foreign_keys = ON`: questo id deve corrispondere a una riga reale
    /// della tabella `users`, altrimenti la INSERT fallisce con un errore FK oscuro.
    /// Per questo una scrittura senza identità viene respinta qui, non dal database.
    pub fn author_id(&self) -> Result<&str, (StatusCode, String)> {
        self.0.as_deref().ok_or((
            StatusCode::UNAUTHORIZED,
            "Richiesta senza utente: il client deve inviare l'header X-NutNote-User".to_string(),
        ))
    }
}

impl<S> FromRequestParts<S> for CurrentUser
where
    S: Send + Sync,
{
    type Rejection = (StatusCode, String);

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        let header = parts
            .headers
            .get(USER_HEADER)
            .and_then(|value| value.to_str().ok())
            .map(str::trim)
            .filter(|value| !value.is_empty());

        if let Some(id) = header {
            return Ok(CurrentUser(Some(id.to_string())));
        }

        // Nessuna identità dichiarata: si prosegue in forma anonima invece di
        // respingere la richiesta. Le letture degradano da sole (restano visibili
        // le sole pagine pubbliche, vedi `filter_id`), mentre ogni scrittura viene
        // comunque fermata da `author_id`. Così un client rimasto indietro continua
        // a leggere e /api/health resta interrogabile, senza che nessuno possa
        // però scrivere a nome di altri.
        //
        // L'avviso serve a non rendere il degrado silenzioso: senza, chi si vedesse
        // sparire le note private non avrebbe modo di capire il perché.
        log::warn!(
            "Richiesta a {} senza header {}: trattata come anonima, visibili le sole pagine pubbliche",
            parts.uri.path(),
            USER_HEADER
        );
        Ok(CurrentUser(None))
    }
}
