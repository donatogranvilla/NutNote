use rusqlite::Connection;

pub fn run_migrations(conn: &Connection) -> Result<(), rusqlite::Error> {
    // -----------------------------------------------------------
    // TEAMS
    // -----------------------------------------------------------
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS teams (
            id          TEXT PRIMARY KEY,
            name        TEXT NOT NULL UNIQUE,
            description TEXT NOT NULL DEFAULT '',
            color       TEXT NOT NULL DEFAULT '#4263eb',
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );"
    )?;

    // -----------------------------------------------------------
    // USERS
    // -----------------------------------------------------------
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS users (
            id           TEXT PRIMARY KEY,
            display_name TEXT NOT NULL,
            avatar_color TEXT NOT NULL,
            role         TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
            password     TEXT NOT NULL DEFAULT '1234',
            team_id      TEXT REFERENCES teams(id) ON DELETE SET NULL,
            created_at   TEXT NOT NULL DEFAULT (datetime('now'))
        );"
    )?;

    // Migrazioni per colonne su users
    let _ = conn.execute("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'", ());
    let _ = conn.execute("ALTER TABLE users ADD COLUMN password TEXT NOT NULL DEFAULT '1234'", ());
    let _ = conn.execute("ALTER TABLE users ADD COLUMN team_id TEXT REFERENCES teams(id) ON DELETE SET NULL", ());

    // -----------------------------------------------------------
    // PAGE_TYPES
    // -----------------------------------------------------------
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS page_types (
            id                  TEXT PRIMARY KEY,
            name                TEXT NOT NULL UNIQUE,
            label               TEXT NOT NULL,
            label_plural        TEXT NOT NULL,
            icon                TEXT NOT NULL,
            color               TEXT NOT NULL,
            properties_schema   TEXT NOT NULL DEFAULT '[]',
            status_flow         TEXT NOT NULL DEFAULT '[]',
            allowed_children    TEXT NOT NULL DEFAULT '[]',
            default_view_type   TEXT NOT NULL DEFAULT 'table',
            is_system           INTEGER NOT NULL DEFAULT 0,
            position            INTEGER NOT NULL DEFAULT 0,
            created_at          TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
        );"
    )?;

    // -----------------------------------------------------------
    // PAGES
    // -----------------------------------------------------------
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS pages (
            id          TEXT PRIMARY KEY,
            type_id     TEXT NOT NULL REFERENCES page_types(id),
            parent_id   TEXT REFERENCES pages(id) ON DELETE CASCADE,
            title       TEXT NOT NULL,
            icon        TEXT,
            cover_url   TEXT,
            properties  TEXT NOT NULL DEFAULT '{}',
            priority    TEXT NOT NULL DEFAULT 'none' CHECK (priority IN ('urgent','high','medium','low','none')),
            status      TEXT NOT NULL DEFAULT '',
            position    INTEGER NOT NULL DEFAULT 0,
            is_pinned   INTEGER NOT NULL DEFAULT 0,
            is_archived INTEGER NOT NULL DEFAULT 0,
            created_by  TEXT NOT NULL REFERENCES users(id),
            updated_by  TEXT NOT NULL REFERENCES users(id),
            created_at  TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
            root_client_id TEXT REFERENCES pages(id) ON DELETE SET NULL,
            visibility  TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
            version     INTEGER NOT NULL DEFAULT 1
        );"
    )?;

    // Migrazione per aggiungere visibility e version a tabelle esistenti
    let _ = conn.execute("ALTER TABLE pages ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public'", ());
    let _ = conn.execute("ALTER TABLE pages ADD COLUMN version INTEGER NOT NULL DEFAULT 1", ());
    let _ = conn.execute("UPDATE pages SET visibility = 'public' WHERE visibility IS NULL OR visibility = ''", ());
    let _ = conn.execute("UPDATE pages SET version = 1 WHERE version IS NULL OR version = 0", ());
    let _ = conn.execute("UPDATE pages SET properties = '{}' WHERE properties IS NULL", ());
    let _ = conn.execute("UPDATE pages SET priority = 'none' WHERE priority IS NULL", ());
    let _ = conn.execute("UPDATE pages SET status = '' WHERE status IS NULL", ());

    // -----------------------------------------------------------
    // PAGE_ANCESTORS (Closure table)
    // -----------------------------------------------------------
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS page_ancestors (
            page_id     TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
            ancestor_id TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
            depth       INTEGER NOT NULL,
            PRIMARY KEY (page_id, ancestor_id)
        );"
    )?;

    // -----------------------------------------------------------
    // BLOCKS
    // -----------------------------------------------------------
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS blocks (
            id              TEXT PRIMARY KEY,
            page_id         TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
            parent_block_id TEXT REFERENCES blocks(id) ON DELETE CASCADE,
            type            TEXT NOT NULL,
            content         TEXT NOT NULL DEFAULT '{}',
            position        INTEGER NOT NULL DEFAULT 0,
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
            version         INTEGER NOT NULL DEFAULT 1
        );"
    )?;

    let _ = conn.execute("ALTER TABLE blocks ADD COLUMN version INTEGER NOT NULL DEFAULT 1", ());

    // -----------------------------------------------------------
    // CHANGE_LOG (Cronologia e revisioni)
    // -----------------------------------------------------------
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS change_log (
            id           TEXT PRIMARY KEY,
            entity_type  TEXT NOT NULL CHECK (entity_type IN ('page', 'block')),
            entity_id    TEXT NOT NULL,
            action       TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'move')),
            field_name   TEXT,
            old_value    TEXT,
            new_value    TEXT,
            user_id      TEXT NOT NULL REFERENCES users(id),
            device_id    TEXT,
            created_at   TEXT NOT NULL DEFAULT (datetime('now'))
        );
        CREATE INDEX IF NOT EXISTS idx_changelog_entity ON change_log(entity_type, entity_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_changelog_user ON change_log(user_id, created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_changelog_created ON change_log(created_at DESC);"
    )?;

    // -----------------------------------------------------------
    // PAGE_RELATIONS
    // -----------------------------------------------------------
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS page_relations (
            id              TEXT PRIMARY KEY,
            source_id       TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
            target_id       TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
            relation_type   TEXT NOT NULL CHECK (relation_type IN ('reference','blocks','depends_on','related','duplicate')),
            description     TEXT,
            created_by      TEXT NOT NULL REFERENCES users(id),
            created_at      TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE (source_id, target_id, relation_type),
            CHECK (source_id != target_id)
        );"
    )?;

    // -----------------------------------------------------------
    // VIEWS
    // -----------------------------------------------------------
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS views (
            id                  TEXT PRIMARY KEY,
            name                TEXT NOT NULL,
            display_type        TEXT NOT NULL CHECK (display_type IN ('table','kanban','list','calendar','gallery')),
            filters             TEXT NOT NULL DEFAULT '[]',
            sort_by             TEXT NOT NULL DEFAULT '[]',
            group_by            TEXT,
            visible_properties  TEXT NOT NULL DEFAULT '[]',
            scope_type          TEXT NOT NULL DEFAULT 'global' CHECK (scope_type IN ('global','type','page')),
            scope_id            TEXT,
            is_default          INTEGER NOT NULL DEFAULT 0,
            position            INTEGER NOT NULL DEFAULT 0,
            created_by          TEXT NOT NULL REFERENCES users(id),
            created_at          TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
        );"
    )?;

    // -----------------------------------------------------------
    // FORMS
    // -----------------------------------------------------------
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS forms (
            id                  TEXT PRIMARY KEY,
            name                TEXT NOT NULL,
            page_type_id        TEXT NOT NULL REFERENCES page_types(id),
            fields              TEXT NOT NULL DEFAULT '[]',
            default_parent_id   TEXT REFERENCES pages(id) ON DELETE SET NULL,
            is_quick_form       INTEGER NOT NULL DEFAULT 0,
            include_title       INTEGER NOT NULL DEFAULT 1,
            include_content     INTEGER NOT NULL DEFAULT 0,
            created_by          TEXT NOT NULL REFERENCES users(id),
            created_at          TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at          TEXT NOT NULL DEFAULT (datetime('now'))
        );"
    )?;

    // -----------------------------------------------------------
    // CHAT_MESSAGES
    // -----------------------------------------------------------
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS chat_messages (
            id          TEXT PRIMARY KEY,
            page_id     TEXT NOT NULL REFERENCES pages(id) ON DELETE CASCADE,
            user_id     TEXT NOT NULL REFERENCES users(id),
            content     TEXT NOT NULL,
            created_at  TEXT NOT NULL DEFAULT (datetime('now'))
        );"
    )?;

    // -----------------------------------------------------------
    // FTS5
    // -----------------------------------------------------------
    conn.execute_batch(
        "CREATE VIRTUAL TABLE IF NOT EXISTS pages_fts USING fts5(
            page_id UNINDEXED,
            title,
            content
        );"
    )?;

    // -----------------------------------------------------------
    // INDICES
    // -----------------------------------------------------------
    conn.execute_batch(
        "CREATE INDEX IF NOT EXISTS idx_pages_type ON pages(type_id);
         CREATE INDEX IF NOT EXISTS idx_pages_parent ON pages(parent_id);
         CREATE INDEX IF NOT EXISTS idx_pages_status ON pages(status);
         CREATE INDEX IF NOT EXISTS idx_pages_priority ON pages(priority);
         CREATE INDEX IF NOT EXISTS idx_pages_root_client ON pages(root_client_id);
         CREATE INDEX IF NOT EXISTS idx_pages_pinned ON pages(is_pinned) WHERE is_pinned = 1;
         CREATE INDEX IF NOT EXISTS idx_pages_updated ON pages(updated_at DESC);
         
         CREATE INDEX IF NOT EXISTS idx_ancestors_ancestor ON page_ancestors(ancestor_id, depth);
         
         CREATE INDEX IF NOT EXISTS idx_blocks_page ON blocks(page_id, position);
         CREATE INDEX IF NOT EXISTS idx_blocks_parent ON blocks(parent_block_id);
         
         CREATE INDEX IF NOT EXISTS idx_relations_source ON page_relations(source_id);
         CREATE INDEX IF NOT EXISTS idx_relations_target ON page_relations(target_id);
        "
    )?;

    // Trigger per updated_at su pages e blocks
    conn.execute_batch(
        "CREATE TRIGGER IF NOT EXISTS pages_updated_at
            AFTER UPDATE ON pages
            FOR EACH ROW
            WHEN OLD.updated_at = NEW.updated_at
        BEGIN
            UPDATE pages SET updated_at = datetime('now') WHERE id = NEW.id;
        END;

        CREATE TRIGGER IF NOT EXISTS blocks_updated_at
            AFTER UPDATE ON blocks
            FOR EACH ROW
            WHEN OLD.updated_at = NEW.updated_at
        BEGIN
            UPDATE blocks SET updated_at = datetime('now') WHERE id = NEW.id;
        END;"
    )?;

    // Seed teams di default
    conn.execute_batch(
        "INSERT OR IGNORE INTO teams (id, name, description, color) VALUES
         ('team-dev', 'Sviluppo', 'Team di ingegneria e sviluppo software', '#1971c2'),
         ('team-design', 'Design', 'UI/UX e Grafica', '#e64980'),
         ('team-mgmt', 'Management', 'Direzione e gestione progetti', '#f59f00'),
         ('team-sales', 'Commerciale', 'Vendite e relazioni clienti', '#2f9e44');"
    )?;

    // Seed utente di default (Admin)
    conn.execute(
        "INSERT OR IGNORE INTO users (id, display_name, avatar_color, role, password, team_id) 
         VALUES ('123e4567-e89b-12d3-a456-426614174000', 'Admin', '#4263eb', 'admin', 'admin', 'team-mgmt')",
        (),
    )?;
    // Assicuriamoci che l'admin abbia sempre role='admin' e password='admin' se già esistente senza password
    let _ = conn.execute(
        "UPDATE users SET role = 'admin', password = 'admin', team_id = COALESCE(team_id, 'team-mgmt') WHERE id = '123e4567-e89b-12d3-a456-426614174000'",
        (),
    );

    // Seed tipi built-in
    seed_builtin_types(conn)?;

    // Seed dati di esempio se il database è vuoto
    seed_sample_data(conn)?;

    // Seed guide wiki multilingue (IT, EN, ES, FR, DE)
    crate::wiki_seed::seed_wiki_guides(conn)?;

    Ok(())
}

fn seed_builtin_types(conn: &Connection) -> Result<(), rusqlite::Error> {
    let types = vec![
        (
            "base_type_id", "base", "Elemento Base", "Elementi", "Box", "hsl(0, 0%, 50%)",
            r##"[]"##,
            r##"[
                {"value":"draft","label":"Bozza","color":"#868e96","transitionsTo":["active"],"isInitial":true,"isTerminal":false},
                {"value":"active","label":"Attivo","color":"#2b8a3e","transitionsTo":["archived"],"isInitial":false,"isTerminal":false},
                {"value":"archived","label":"Archiviato","color":"#495057","transitionsTo":["active"],"isInitial":false,"isTerminal":true}
            ]"##,
            r##"["base", "client", "project", "commessa", "note", "wiki", "bug", "todo", "file"]"##
        ),
        (
            "client_type_id", "client", "Cliente", "Clienti", "Users", "hsl(210, 80%, 50%)",
            r##"[
                {"key":"code","label":"Codice","type":"text","required":true,"position":0,"showInTable":true,"showInCard":true},
                {"key":"email","label":"Email","type":"email","required":false,"position":1,"showInTable":true,"showInCard":true},
                {"key":"phone","label":"Telefono","type":"phone","required":false,"position":2,"showInTable":false,"showInCard":false},
                {"key":"referent","label":"Referente","type":"text","required":false,"position":3,"showInTable":true,"showInCard":false}
            ]"##,
            r##"[
                {"value":"active","label":"Attivo","color":"#2b8a3e","transitionsTo":["archived"],"isInitial":true,"isTerminal":false},
                {"value":"archived","label":"Archiviato","color":"#868e96","transitionsTo":["active"],"isInitial":false,"isTerminal":true}
            ]"##,
            r##"["base", "project", "commessa", "note", "file"]"##
        ),
        (
            "project_type_id", "project", "Progetto", "Progetti", "FolderOpen", "hsl(30, 90%, 50%)",
            r##"[
                {"key":"description","label":"Descrizione","type":"text","required":false,"position":0,"showInTable":true,"showInCard":false},
                {"key":"startDate","label":"Data inizio","type":"date","required":false,"position":1,"showInTable":true,"showInCard":true},
                {"key":"dueDate","label":"Scadenza","type":"date","required":false,"position":2,"showInTable":true,"showInCard":true},
                {"key":"budget","label":"Budget (€)","type":"number","required":false,"position":3,"showInTable":true,"showInCard":false}
            ]"##,
            r##"[
                {"value":"backlog","label":"Backlog","color":"#868e96","transitionsTo":["active","cancelled"],"isInitial":true,"isTerminal":false},
                {"value":"active","label":"In Corso","color":"#1971c2","transitionsTo":["paused","completed","cancelled"],"isInitial":false,"isTerminal":false},
                {"value":"paused","label":"In Pausa","color":"#e67700","transitionsTo":["active","cancelled"],"isInitial":false,"isTerminal":false},
                {"value":"completed","label":"Completato","color":"#2b8a3e","transitionsTo":[],"isInitial":false,"isTerminal":true},
                {"value":"cancelled","label":"Annullato","color":"#c92a2a","transitionsTo":[],"isInitial":false,"isTerminal":true}
            ]"##,
            r##"["base", "commessa", "note", "bug", "todo", "wiki", "file"]"##
        ),
        (
            "commessa_type_id", "commessa", "Commessa", "Commesse", "Briefcase", "hsl(280, 70%, 50%)",
            r##"[
                {"key":"code","label":"Codice Commessa","type":"text","required":true,"position":0,"showInTable":true,"showInCard":true},
                {"key":"orderDate","label":"Data Ordine","type":"date","required":false,"position":1,"showInTable":true,"showInCard":false},
                {"key":"amount","label":"Importo (€)","type":"number","required":false,"position":2,"showInTable":true,"showInCard":true}
            ]"##,
            r##"[
                {"value":"draft","label":"Preventivo","color":"#868e96","transitionsTo":["approved","rejected"],"isInitial":true,"isTerminal":false},
                {"value":"approved","label":"Approvata","color":"#1971c2","transitionsTo":["working","cancelled"],"isInitial":false,"isTerminal":false},
                {"value":"working","label":"In Lavorazione","color":"#e67700","transitionsTo":["delivered","cancelled"],"isInitial":false,"isTerminal":false},
                {"value":"delivered","label":"Consegnata/Chiusa","color":"#2b8a3e","transitionsTo":[],"isInitial":false,"isTerminal":true},
                {"value":"rejected","label":"Rifiutata","color":"#c92a2a","transitionsTo":[],"isInitial":false,"isTerminal":true}
            ]"##,
            r##"["note", "bug", "todo", "file"]"##
        ),
        (
            "note_type_id", "note", "Nota", "Note", "FileText", "hsl(200, 70%, 45%)",
            r##"[
                {"key":"category","label":"Categoria","type":"select","options":["Riunione","Ideazione","Tecnica","Generale"],"required":false,"position":0,"showInTable":true,"showInCard":true}
            ]"##,
            r##"[
                {"value":"draft","label":"Bozza","color":"#868e96","transitionsTo":["published"],"isInitial":true,"isTerminal":false},
                {"value":"published","label":"Pubblicata","color":"#2b8a3e","transitionsTo":["draft","archived"],"isInitial":false,"isTerminal":false},
                {"value":"archived","label":"Archiviata","color":"#495057","transitionsTo":["published"],"isInitial":false,"isTerminal":true}
            ]"##,
            r##"["file", "todo"]"##
        ),
        (
            "wiki_type_id", "wiki", "Wiki", "Wiki Docs", "BookOpen", "hsl(160, 60%, 40%)",
            r##"[
                {"key":"section","label":"Sezione","type":"text","required":false,"position":0,"showInTable":true,"showInCard":true}
            ]"##,
            r##"[
                {"value":"draft","label":"Bozza","color":"#868e96","transitionsTo":["verified"],"isInitial":true,"isTerminal":false},
                {"value":"verified","label":"Verificata","color":"#2b8a3e","transitionsTo":["outdated"],"isInitial":false,"isTerminal":false},
                {"value":"outdated","label":"Obsoleta","color":"#e67700","transitionsTo":["draft","verified"],"isInitial":false,"isTerminal":false}
            ]"##,
            r##"["wiki", "file"]"##
        ),
        (
            "bug_type_id", "bug", "Bug", "Bug Tracker", "Bug", "hsl(0, 75%, 55%)",
            r##"[
                {"key":"severity","label":"Gravità","type":"select","options":["Bloccante","Grave","Minore","Cosmetico"],"required":true,"position":0,"showInTable":true,"showInCard":true},
                {"key":"environment","label":"Ambiente","type":"text","required":false,"position":1,"showInTable":true,"showInCard":false},
                {"key":"steps","label":"Passi per riprodurre","type":"text","required":false,"position":2,"showInTable":false,"showInCard":false}
            ]"##,
            r##"[
                {"value":"open","label":"Aperto","color":"#c92a2a","transitionsTo":["investigating","resolved","invalid"],"isInitial":true,"isTerminal":false},
                {"value":"investigating","label":"In Analisi","color":"#e67700","transitionsTo":["fixing","resolved","invalid"],"isInitial":false,"isTerminal":false},
                {"value":"fixing","label":"In Risoluzione","color":"#1971c2","transitionsTo":["resolved","reopened"],"isInitial":false,"isTerminal":false},
                {"value":"resolved","label":"Risolto","color":"#2b8a3e","transitionsTo":["closed","reopened"],"isInitial":false,"isTerminal":false},
                {"value":"closed","label":"Chiuso","color":"#495057","transitionsTo":["reopened"],"isInitial":false,"isTerminal":true},
                {"value":"invalid","label":"Non Riproducibile","color":"#868e96","transitionsTo":[],"isInitial":false,"isTerminal":true}
            ]"##,
            r##"["note", "file"]"##
        ),
        (
            "todo_type_id", "todo", "Task", "Todo List", "CheckSquare", "hsl(145, 60%, 40%)",
            r##"[
                {"key":"dueDate","label":"Scadenza","type":"date","required":false,"position":0,"showInTable":true,"showInCard":true},
                {"key":"estimatedHours","label":"Ore stimate","type":"number","required":false,"position":1,"showInTable":true,"showInCard":false},
                {"key":"assignee","label":"Assegnato a","type":"text","required":false,"position":2,"showInTable":true,"showInCard":true}
            ]"##,
            r##"[
                {"value":"todo","label":"Da Fare","color":"#868e96","transitionsTo":["in_progress","done","cancelled"],"isInitial":true,"isTerminal":false},
                {"value":"in_progress","label":"In Lavorazione","color":"#1971c2","transitionsTo":["review","done","paused"],"isInitial":false,"isTerminal":false},
                {"value":"review","label":"In Revisione","color":"#e67700","transitionsTo":["in_progress","done"],"isInitial":false,"isTerminal":false},
                {"value":"done","label":"Completato","color":"#2b8a3e","transitionsTo":["in_progress"],"isInitial":false,"isTerminal":true},
                {"value":"cancelled","label":"Annullato","color":"#c92a2a","transitionsTo":[],"isInitial":false,"isTerminal":true}
            ]"##,
            r##"["note", "file"]"##
        ),
        (
            "file_type_id", "file", "File", "File & Allegati", "Paperclip", "hsl(240, 50%, 55%)",
            r##"[
                {"key":"fileSize","label":"Dimensione","type":"text","required":false,"position":0,"showInTable":true,"showInCard":true},
                {"key":"fileType","label":"Formato","type":"text","required":false,"position":1,"showInTable":true,"showInCard":true},
                {"key":"filePath","label":"Percorso / URI","type":"text","required":false,"position":2,"showInTable":true,"showInCard":false}
            ]"##,
            r##"[
                {"value":"available","label":"Disponibile","color":"#2b8a3e","transitionsTo":["archived"],"isInitial":true,"isTerminal":false},
                {"value":"archived","label":"Archiviato","color":"#868e96","transitionsTo":["available"],"isInitial":false,"isTerminal":true}
            ]"##,
            r##"[]"##
        )
    ];

    for t in types {
        conn.execute(
            "INSERT OR REPLACE INTO page_types (id, name, label, label_plural, icon, color, properties_schema, status_flow, allowed_children, is_system, position) 
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, 1, 0)",
            (&t.0, &t.1, &t.2, &t.3, &t.4, &t.5, &t.6, &t.7, &t.8),
        )?;
    }

    Ok(())
}

fn seed_sample_data(conn: &Connection) -> Result<(), rusqlite::Error> {
    let user_id = "123e4567-e89b-12d3-a456-426614174000";

    // 1. Client 1: Acme Corporation
    conn.execute(
        "INSERT OR IGNORE INTO pages (id, type_id, parent_id, title, icon, cover_url, properties, priority, status, position, is_pinned, is_archived, created_by, updated_by, root_client_id)
         VALUES ('client-1', 'client_type_id', NULL, 'Acme Corporation', '🏢', 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=1200&q=80', '{\"code\":\"ACM-001\",\"email\":\"info@acme.com\",\"phone\":\"+39 02 1234567\",\"referent\":\"Mario Rossi\"}', 'none', 'active', 0, 1, 0, ?1, ?1, 'client-1')",
        rusqlite::params![user_id]
    )?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('client-1', 'client-1', 0)", [])?;
    conn.execute("INSERT OR IGNORE INTO pages_fts (page_id, title, content) VALUES ('client-1', 'Acme Corporation', 'Cliente corporate leader nel settore retail')", [])?;

    // 2. Project 1: Portale Web & E-Commerce (Child of Acme)
    conn.execute(
        "INSERT OR IGNORE INTO pages (id, type_id, parent_id, title, icon, cover_url, properties, priority, status, position, is_pinned, is_archived, created_by, updated_by, root_client_id)
         VALUES ('proj-1', 'project_type_id', 'client-1', 'Rinnovamento Portale Web & E-Commerce', '🚀', 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1200&q=80', '{\"description\":\"Rifacimento completo piattaforma con stack moderno\",\"startDate\":\"2026-03-01\",\"dueDate\":\"2026-06-30\",\"budget\":25000}', 'high', 'active', 0, 1, 0, ?1, ?1, 'client-1')",
        rusqlite::params![user_id]
    )?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('proj-1', 'proj-1', 0)", [])?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('proj-1', 'client-1', 1)", [])?;
    conn.execute("INSERT OR IGNORE INTO pages_fts (page_id, title, content) VALUES ('proj-1', 'Rinnovamento Portale Web & E-Commerce', 'Progetto principale Acme Corp per e-commerce e catalogo prodotti')", [])?;

    // 3. Commessa 1: Sprint 1 (Child of proj-1)
    conn.execute(
        "INSERT OR IGNORE INTO pages (id, type_id, parent_id, title, icon, cover_url, properties, priority, status, position, is_pinned, is_archived, created_by, updated_by, root_client_id)
         VALUES ('comm-1', 'commessa_type_id', 'proj-1', 'Sprint 1: UI/UX & Design System', '💼', NULL, '{\"code\":\"COM-2026-01\",\"orderDate\":\"2026-03-05\",\"amount\":8500}', 'urgent', 'approved', 0, 0, 0, ?1, ?1, 'client-1')",
        rusqlite::params![user_id]
    )?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('comm-1', 'comm-1', 0)", [])?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('comm-1', 'proj-1', 1)", [])?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('comm-1', 'client-1', 2)", [])?;
    conn.execute("INSERT OR IGNORE INTO pages_fts (page_id, title, content) VALUES ('comm-1', 'Sprint 1: UI/UX & Design System', 'Prima commessa approvata per wireframe e design system')", [])?;

    // 4. Task 1: Component Library (Child of comm-1)
    conn.execute(
        "INSERT OR IGNORE INTO pages (id, type_id, parent_id, title, icon, cover_url, properties, priority, status, position, is_pinned, is_archived, created_by, updated_by, root_client_id)
         VALUES ('task-1', 'todo_type_id', 'comm-1', 'Creare Component Library in Figma', '🎨', NULL, '{\"dueDate\":\"2026-03-15\",\"estimatedHours\":16,\"assignee\":\"Laura Bianchi\"}', 'medium', 'done', 0, 0, 0, ?1, ?1, 'client-1')",
        rusqlite::params![user_id]
    )?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('task-1', 'task-1', 0)", [])?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('task-1', 'comm-1', 1)", [])?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('task-1', 'proj-1', 2)", [])?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('task-1', 'client-1', 3)", [])?;
    conn.execute("INSERT OR IGNORE INTO pages_fts (page_id, title, content) VALUES ('task-1', 'Creare Component Library in Figma', 'Design system token colori tipografia bottoni')", [])?;

    // 5. Task 2: Database SQLite & FTS5 (Child of comm-1)
    conn.execute(
        "INSERT OR IGNORE INTO pages (id, type_id, parent_id, title, icon, cover_url, properties, priority, status, position, is_pinned, is_archived, created_by, updated_by, root_client_id)
         VALUES ('task-2', 'todo_type_id', 'comm-1', 'Implementare Database SQLite e FTS5', '⚡', NULL, '{\"dueDate\":\"2026-03-22\",\"estimatedHours\":24,\"assignee\":\"Marco Verdi\"}', 'urgent', 'in_progress', 1, 0, 0, ?1, ?1, 'client-1')",
        rusqlite::params![user_id]
    )?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('task-2', 'task-2', 0)", [])?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('task-2', 'comm-1', 1)", [])?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('task-2', 'proj-1', 2)", [])?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('task-2', 'client-1', 3)", [])?;
    conn.execute("INSERT OR IGNORE INTO pages_fts (page_id, title, content) VALUES ('task-2', 'Implementare Database SQLite e FTS5', 'Sviluppo backend rust con closure table per gerarchia e ricerca full text')", [])?;

    // 6. Bug 1: Allineamento date picker (Child of comm-1)
    conn.execute(
        "INSERT OR IGNORE INTO pages (id, type_id, parent_id, title, icon, cover_url, properties, priority, status, position, is_pinned, is_archived, created_by, updated_by, root_client_id)
         VALUES ('bug-1', 'bug_type_id', 'comm-1', 'Allineamento errato nel selettore date su Safari', '🐛', NULL, '{\"severity\":\"Minore\",\"environment\":\"macOS Safari 17\",\"steps\":\"Aprire modal e cliccare sul campo data\"}', 'low', 'investigating', 2, 0, 0, ?1, ?1, 'client-1')",
        rusqlite::params![user_id]
    )?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('bug-1', 'bug-1', 0)", [])?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('bug-1', 'comm-1', 1)", [])?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('bug-1', 'proj-1', 2)", [])?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('bug-1', 'client-1', 3)", [])?;
    conn.execute("INSERT OR IGNORE INTO pages_fts (page_id, title, content) VALUES ('bug-1', 'Allineamento errato nel selettore date su Safari', 'Bug grafico nel popover del calendario')", [])?;

    // 7. Note 1: Verbale Kick-off (Child of proj-1)
    conn.execute(
        "INSERT OR IGNORE INTO pages (id, type_id, parent_id, title, icon, cover_url, properties, priority, status, position, is_pinned, is_archived, created_by, updated_by, root_client_id)
         VALUES ('note-1', 'note_type_id', 'proj-1', 'Verbale Kick-off e Requisiti Funzionali', '📝', NULL, '{\"category\":\"Riunione\"}', 'none', 'published', 0, 1, 0, ?1, ?1, 'client-1')",
        rusqlite::params![user_id]
    )?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('note-1', 'note-1', 0)", [])?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('note-1', 'proj-1', 1)", [])?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('note-1', 'client-1', 2)", [])?;
    conn.execute("INSERT OR IGNORE INTO pages_fts (page_id, title, content) VALUES ('note-1', 'Verbale Kick-off e Requisiti Funzionali', 'Punti discussi: timeline, stack tecnologico Tauri v2 e design system')", [])?;

    // Blocks per Note 1
    conn.execute(
        "INSERT OR IGNORE INTO blocks (id, page_id, parent_block_id, type, content, position) VALUES 
        ('blk-1', 'note-1', NULL, 'heading', '{\"attrs\":{\"level\":1},\"content\":[{\"type\":\"text\",\"text\":\"Riunione di Avvio Progetto Acme\"}]}', 0),
        ('blk-2', 'note-1', NULL, 'paragraph', '{\"content\":[{\"type\":\"text\",\"text\":\"In data odierna si è tenuto il kick-off del progetto. Erano presenti il referente cliente Mario Rossi e il nostro team di sviluppo.\"}]}', 1),
        ('blk-3', 'note-1', NULL, 'heading', '{\"attrs\":{\"level\":2},\"content\":[{\"type\":\"text\",\"text\":\"Decisioni Principali\"}]}', 2),
        ('blk-4', 'note-1', NULL, 'bulletList', '{\"content\":[{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Architettura basata su SQLite locale e Tauri per massime prestazioni.\"}]}]},{\"type\":\"listItem\",\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Gestione gerarchica completa con relazioni bi-direzionali tra entità.\"}]}]}]}', 3),
        ('blk-5', 'note-1', NULL, 'blockquote', '{\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Obiettivo Q2: Rilasciare la prima versione usabile entro il 30 Giugno 2026.\"}]}]}', 4)",
        []
    )?;

    // 8. Wiki 1: Linee Guida Architetturali
    conn.execute(
        "INSERT OR IGNORE INTO pages (id, type_id, parent_id, title, icon, cover_url, properties, priority, status, position, is_pinned, is_archived, created_by, updated_by, root_client_id)
         VALUES ('wiki-1', 'wiki_type_id', 'proj-1', 'Guida Architettura & Convenzioni API', '📚', NULL, '{\"section\":\"Ingegneria\"}', 'none', 'verified', 1, 0, 0, ?1, ?1, 'client-1')",
        rusqlite::params![user_id]
    )?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('wiki-1', 'wiki-1', 0)", [])?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('wiki-1', 'proj-1', 1)", [])?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('wiki-1', 'client-1', 2)", [])?;
    conn.execute("INSERT OR IGNORE INTO pages_fts (page_id, title, content) VALUES ('wiki-1', 'Guida Architettura & Convenzioni API', 'Standard REST, Tauri commands, e formattazione JSON')", [])?;

    // Blocks per Wiki 1
    conn.execute(
        "INSERT OR IGNORE INTO blocks (id, page_id, parent_block_id, type, content, position) VALUES 
        ('blk-w1', 'wiki-1', NULL, 'heading', '{\"attrs\":{\"level\":1},\"content\":[{\"type\":\"text\",\"text\":\"Linee Guida di Sviluppo NutNote\"}]}', 0),
        ('blk-w2', 'wiki-1', NULL, 'paragraph', '{\"content\":[{\"type\":\"text\",\"text\":\"Tutti i comandi Tauri devono restituire strutture con naming camelCase e gestire gli errori con Result standard.\"}]}', 1),
        ('blk-w3', 'wiki-1', NULL, 'codeBlock', '{\"attrs\":{\"language\":\"rust\"},\"content\":[{\"type\":\"text\",\"text\":\"#[tauri::command]\npub async fn get_page(id: String) -> Result<PageResponse, String> {\n    // logic\n}\"}]}', 2)",
        []
    )?;

    // 9. Client 2: Nexus Tech Labs
    conn.execute(
        "INSERT OR IGNORE INTO pages (id, type_id, parent_id, title, icon, cover_url, properties, priority, status, position, is_pinned, is_archived, created_by, updated_by, root_client_id)
         VALUES ('client-2', 'client_type_id', NULL, 'Nexus Tech Labs', '🌐', 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80', '{\"code\":\"NEX-002\",\"email\":\"hello@nexustech.io\",\"phone\":\"+39 06 9876543\",\"referent\":\"Elena Neri\"}', 'none', 'active', 1, 0, 0, ?1, ?1, 'client-2')",
        rusqlite::params![user_id]
    )?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('client-2', 'client-2', 0)", [])?;
    conn.execute("INSERT OR IGNORE INTO pages_fts (page_id, title, content) VALUES ('client-2', 'Nexus Tech Labs', 'Laboratorio di ricerca e sviluppo software AI')", [])?;

    // 10. Standalone Note: Idee Roadmap
    conn.execute(
        "INSERT OR IGNORE INTO pages (id, type_id, parent_id, title, icon, cover_url, properties, priority, status, position, is_pinned, is_archived, created_by, updated_by, root_client_id)
         VALUES ('note-2', 'note_type_id', NULL, 'Idee Roadmap & Nuove Feature NutNote', '💡', NULL, '{\"category\":\"Ideazione\"}', 'medium', 'draft', 2, 1, 0, ?1, ?1, NULL)",
        rusqlite::params![user_id]
    )?;
    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES ('note-2', 'note-2', 0)", [])?;
    conn.execute("INSERT OR IGNORE INTO pages_fts (page_id, title, content) VALUES ('note-2', 'Idee Roadmap & Nuove Feature NutNote', 'Lista idee: esportazione docx pdf xls, viste calendario e gantt, automazioni')", [])?;

    // Blocks per Note 2
    conn.execute(
        "INSERT OR IGNORE INTO blocks (id, page_id, parent_block_id, type, content, position) VALUES 
        ('blk-n1', 'note-2', NULL, 'heading', '{\"attrs\":{\"level\":1},\"content\":[{\"type\":\"text\",\"text\":\"Roadmap NutNote 2026\"}]}', 0),
        ('blk-n2', 'note-2', NULL, 'paragraph', '{\"content\":[{\"type\":\"text\",\"text\":\"Funzionalità pianificate per i prossimi aggiornamenti:\"}]}', 1),
        ('blk-n3', 'note-2', NULL, 'taskList', '{\"content\":[{\"type\":\"taskItem\",\"attrs\":{\"checked\":true},\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Viste Tabella e Kanban interattive con Drag and Drop\"}]}]},{\"type\":\"taskItem\",\"attrs\":{\"checked\":true},\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Upload allegati su filesystem locale\"}]}]},{\"type\":\"taskItem\",\"attrs\":{\"checked\":false},\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Esportazione PDF, DOCX, Markdown, CSV ed Excel\"}]}]},{\"type\":\"taskItem\",\"attrs\":{\"checked\":false},\"content\":[{\"type\":\"paragraph\",\"content\":[{\"type\":\"text\",\"text\":\"Grafici di avanzamento commesse e budget\"}]}]}]}', 2)",
        []
    )?;

    // 11. Relations di esempio
    conn.execute(
        "INSERT OR IGNORE INTO page_relations (id, source_id, target_id, relation_type, description, created_by)
         VALUES 
         ('rel-1', 'note-1', 'proj-1', 'related', 'Verbale approvato durante il kick-off del progetto', ?1),
         ('rel-2', 'task-2', 'task-1', 'depends_on', 'Richiede la libreria Figma per completare i componenti UI', ?1),
         ('rel-3', 'wiki-1', 'proj-1', 'reference', 'Documento di riferimento architetturale', ?1)",
        rusqlite::params![user_id]
    )?;

    Ok(())
}

