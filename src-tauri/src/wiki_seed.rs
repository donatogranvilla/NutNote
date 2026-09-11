#![allow(dead_code)]
use rusqlite::{params, Connection};

fn escape_json(s: &str) -> String {
    s.replace('\\', "\\\\")
     .replace('"', "\\\"")
     .replace('\n', "\\n")
     .replace('\r', "")
}

fn h1(text: &str) -> String {
    format!(r#"{{"attrs":{{"level":1}},"content":[{{"type":"text","text":"{}"}}]}}"#, escape_json(text))
}

fn h2(text: &str) -> String {
    format!(r#"{{"attrs":{{"level":2}},"content":[{{"type":"text","text":"{}"}}]}}"#, escape_json(text))
}

fn h3(text: &str) -> String {
    format!(r#"{{"attrs":{{"level":3}},"content":[{{"type":"text","text":"{}"}}]}}"#, escape_json(text))
}

fn p(text: &str) -> String {
    format!(r#"{{"content":[{{"type":"text","text":"{}"}}]}}"#, escape_json(text))
}

fn bullet(text: &str) -> String {
    format!(r#"{{"content":[{{"type":"text","text":"{}"}}]}}"#, escape_json(text))
}

fn numbered(text: &str) -> String {
    format!(r#"{{"content":[{{"type":"text","text":"{}"}}]}}"#, escape_json(text))
}

fn callout(icon: &str, text: &str) -> String {
    format!(r#"{{"attrs":{{"calloutIcon":"{}"}},"text":"{}"}}"#, icon, escape_json(text))
}

fn code(lang: &str, code_text: &str) -> String {
    format!(r#"{{"attrs":{{"language":"{}"}},"content":[{{"type":"text","text":"{}"}}]}}"#, lang, escape_json(code_text))
}

fn todo_item(checked: bool, text: &str) -> String {
    format!(r#"{{"attrs":{{"checked":{}}},"content":[{{"type":"text","text":"{}"}}]}}"#, checked, escape_json(text))
}

fn quote(text: &str) -> String {
    format!(r#"{{"content":[{{"type":"text","text":"{}"}}]}}"#, escape_json(text))
}

fn divider() -> String {
    "{}".to_string()
}

fn insert_page(
    conn: &Connection,
    id: &str,
    title: &str,
    icon: &str,
    parent_id: Option<&str>,
    position: i32,
    is_pinned: i32,
    properties_json: &str,
    user_id: &str,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT OR REPLACE INTO pages (id, type_id, parent_id, title, icon, cover_url, properties, priority, status, position, is_pinned, is_archived, created_by, updated_by, root_client_id, visibility, version)
         VALUES (?1, 'wiki_type_id', ?2, ?3, ?4, 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=1200&q=80', ?5, 'none', 'verified', ?6, ?7, 0, ?8, ?8, NULL, 'public', 1)",
        params![id, parent_id, title, icon, properties_json, position, is_pinned, user_id],
    )?;

    conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES (?1, ?1, 0)", params![id])?;
    if let Some(pid) = parent_id {
        conn.execute("INSERT OR IGNORE INTO page_ancestors (page_id, ancestor_id, depth) VALUES (?1, ?2, 1)", params![id, pid])?;
    }

    conn.execute(
        "INSERT OR REPLACE INTO pages_fts (page_id, title, content) VALUES (?1, ?2, ?3)",
        params![id, title, title],
    )?;

    Ok(())
}

fn insert_block(
    conn: &Connection,
    id: &str,
    page_id: &str,
    block_type: &str,
    content_json: &str,
    position: i32,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT OR REPLACE INTO blocks (id, page_id, parent_block_id, type, content, position) VALUES (?1, ?2, NULL, ?3, ?4, ?5)",
        params![id, page_id, block_type, content_json, position],
    )?;
    Ok(())
}

fn insert_relation(
    conn: &Connection,
    id: &str,
    source_id: &str,
    target_id: &str,
    rel_type: &str,
    description: &str,
    user_id: &str,
) -> Result<(), rusqlite::Error> {
    conn.execute(
        "INSERT OR REPLACE INTO page_relations (id, source_id, target_id, relation_type, description, created_by)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![id, source_id, target_id, rel_type, description, user_id],
    )?;
    Ok(())
}

pub fn seed_wiki_guides(conn: &Connection) -> Result<(), rusqlite::Error> {
    let admin_id = "123e4567-e89b-12d3-a456-426614174000";

    // ─────────────────────────────────────────────────────────────
    // 0. WIKI HUB: Centro Documentazione & Manuale Ufficiale
    // ─────────────────────────────────────────────────────────────
    insert_page(
        conn,
        "wiki-hub",
        "NutNote Documentation Hub & Manuale Ufficiale",
        "📚",
        None,
        0,
        1, // Pinned nei preferiti
        r#"{"section":"Generale","category":"Documentazione","version":"2.4.0","author":"NutNote Core Team"}"#,
        admin_id,
    )?;

    let hub_blocks = vec![
        ("blk-hub-1", "heading", h1("NutNote Documentation Hub & Manuale Ufficiale")),
        ("blk-hub-2", "paragraph", p("Benvenuto nel centro di documentazione e manuale operativo ufficiale di NutNote. NutNote è una suite modulare avanzata pensata per studi professionali e aziende, basata sul paradigma unificante 'Everything is a Page'.")),
        ("blk-hub-3", "callout", callout("🚀", "La presente Wiki è strutturata in 9 capitoli monografici completi che coprono l'intero ciclo di vita applicativo: dall'architettura del dato, all'editor a blocchi, alle relazioni semantiche fino al networking LAN e al disaster recovery.")),
        ("blk-hub-4", "heading", h2("Indice Completo dei Capitoli")),
        ("blk-hub-5", "bulletList", bullet("🏛️ Capitolo 1: Architettura di Sistema & Modello 'Everything is a Page' (ID: wiki-ch1-architettura)")),
        ("blk-hub-6", "bulletList", bullet("✍️ Capitolo 2: Editor a Blocchi, Formattazione Avanzata & Comandi Rapidi (ID: wiki-ch2-editor)")),
        ("blk-hub-7", "bulletList", bullet("🔗 Capitolo 3: Relazioni Intelligenti, Backlink & Mappa a Nuvola (ID: wiki-ch3-relazioni)")),
        ("blk-hub-8", "bulletList", bullet("📊 Capitolo 4: Viste Database, Tabelle, Kanban & Ricerca FTS5 (ID: wiki-ch4-database-viste)")),
        ("blk-hub-9", "bulletList", bullet("👥 Capitolo 5: Collaborazione, Gestione Team, Ruoli & Chat Contestuale (ID: wiki-ch5-collaborazione)")),
        ("blk-hub-10", "bulletList", bullet("🌐 Capitolo 6: Networking, Server LAN Condiviso & Sincronizzazione (ID: wiki-ch6-networking-lan)")),
        ("blk-hub-11", "bulletList", bullet("💾 Capitolo 7: Esportazione Documenti, Backup Database & Sicurezza (ID: wiki-ch7-export-backup)")),
        ("blk-hub-12", "bulletList", bullet("💼 Capitolo 8: Casi d'Uso Reali & Workflow Operativi Aziendali (ID: wiki-ch8-casi-uso)")),
        ("blk-hub-13", "bulletList", bullet("⚡ Capitolo 9: Guida di Riferimento Rapido, Shortcut da Tastiera & FAQ (ID: wiki-ch9-faq-riferimento)")),
        ("blk-hub-14", "divider", divider()),
        ("blk-hub-15", "heading", h2("Percorsi di Lettura Consigliati per Ruolo")),
        ("blk-hub-16", "paragraph", p("A seconda delle tue responsabilità all'interno del team, ti consigliamo di consultare prioritariamente:")),
        ("blk-hub-17", "taskList", todo_item(true, "Project Manager: Capitoli 1, 3, 4, 5, 8 (Pianificazione, Kanban, Stati, Relazioni e Clienti)")),
        ("blk-hub-18", "taskList", todo_item(true, "Sviluppatori & Tech Lead: Capitoli 1, 2, 6, 7, 9 (Architettura dati, Blocchi di codice, Server LAN, SQLite WAL)")),
        ("blk-hub-19", "taskList", todo_item(true, "Product Designer & UI/UX: Capitoli 2, 3, 4 (Editor visuale, Mappa a nuvola, Board kanban)")),
        ("blk-hub-20", "taskList", todo_item(true, "Amministratori di Sistema: Capitoli 6, 7 (Porta 9700, configurazione firewall, backup a caldo)")),
        ("blk-hub-21", "divider", divider()),
        ("blk-hub-22", "heading", h2("Guide Rapide Internazionali (Quick Start)")),
        ("blk-hub-23", "paragraph", p("Se necessiti di un riassunto operativo rapido in altre lingue:")),
        ("blk-hub-24", "bulletList", bullet("🇬🇧 English: NutNote Complete User Guide (ID: wiki-guide-en)")),
        ("blk-hub-25", "bulletList", bullet("🇪🇸 Español: Guía Completa de Usuario de NutNote (ID: wiki-guide-es)")),
        ("blk-hub-26", "bulletList", bullet("🇫🇷 Français: Guide Complet d'Utilisation NutNote (ID: wiki-guide-fr)")),
        ("blk-hub-27", "bulletList", bullet("🇩🇪 Deutsch: NutNote Benutzerhandbuch (ID: wiki-guide-de)")),
    ];

    for (pos, (b_id, b_type, b_content)) in hub_blocks.into_iter().enumerate() {
        insert_block(conn, b_id, "wiki-hub", b_type, &b_content, pos as i32)?;
    }

    // ─────────────────────────────────────────────────────────────
    // CAPITOLO 1: Architettura di Sistema & Modello "Everything is a Page"
    // ─────────────────────────────────────────────────────────────
    insert_page(
        conn,
        "wiki-ch1-architettura",
        "Capitolo 1: Architettura di Sistema & Modello 'Everything is a Page'",
        "🏛️",
        Some("wiki-hub"),
        1,
        0,
        r#"{"section":"Capitolo 1","difficulty":"Fondamentale","reading_time":"8 min"}"#,
        admin_id,
    )?;

    let ch1_blocks = vec![
        ("blk-c1-1", "heading", h1("Capitolo 1: Architettura di Sistema & Modello 'Everything is a Page'")),
        ("blk-c1-2", "paragraph", p("Il cardine architetturale di NutNote risiede nel principio 'Everything is a Page'. A differenza dei sistemi gestionali monolitici tradizionali, dove clienti, progetti e task risiedono in schemi relazionali rigidi e separati, in NutNote ogni singola entità è un'istanza polimorfica di Page.")),
        ("blk-c1-3", "callout", callout("💡", "La filosofia 'Everything is a Page' permette a qualsiasi elemento di avere contenuti a blocchi, sotto-pagine gerarchiche, allegati multimediali, discussioni contestuali e relazioni trasversali senza eccezioni.")),
        ("blk-c1-4", "heading", h2("1.1 La Tabella Pagine e il Dynamic Typing")),
        ("blk-c1-5", "paragraph", p("Nel database SQLite, tutte le entità risiedono nella tabella primaria 'pages', arricchita da un discriminatore 'type_id' collegato a 'page_types':")),
        ("blk-c1-6", "code", code("sql", "CREATE TABLE pages (\n    id              TEXT PRIMARY KEY,\n    type_id         TEXT NOT NULL REFERENCES page_types(id),\n    parent_id       TEXT REFERENCES pages(id) ON DELETE CASCADE,\n    title           TEXT NOT NULL,\n    icon            TEXT,\n    cover_url       TEXT,\n    properties      TEXT NOT NULL DEFAULT '{}',\n    priority        TEXT NOT NULL DEFAULT 'none',\n    status          TEXT NOT NULL DEFAULT 'active',\n    position        INTEGER NOT NULL DEFAULT 0,\n    is_pinned       INTEGER NOT NULL DEFAULT 0,\n    is_archived     INTEGER NOT NULL DEFAULT 0,\n    root_client_id  TEXT,\n    version         INTEGER NOT NULL DEFAULT 1,\n    created_at      TEXT NOT NULL DEFAULT (datetime('now')),\n    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))\n);")),
        ("blk-c1-7", "heading", h2("1.2 Gerarchia ad Albero e Calcolo degli Antenati")),
        ("blk-c1-8", "paragraph", p("Le pagine formano un grafo ad albero naturale. Per garantire query istantanee anche con alberature a profondità elevata, NutNote mantiene sincronizzata la closure transitiva 'page_ancestors':")),
        ("blk-c1-9", "bulletList", bullet("Depth 0: ogni pagina è antenata di se stessa (self-reference).")),
        ("blk-c1-10", "bulletList", bullet("Depth 1: il parent diretto.")),
        ("blk-c1-11", "bulletList", bullet("Depth N: tutti gli avi fino alla radice dell'albero.")),
        ("blk-c1-12", "paragraph", p("Grazie a questa tabella, per estrarre tutti i task o bug appartenenti a un cliente o a un progetto occorre una singola istruzione SQL con JOIN indicizzata, senza ricorsione runtime.")),
        ("blk-c1-13", "heading", h2("1.3 Ereditarietà del Root Client ID")),
        ("blk-c1-14", "paragraph", p("Quando una pagina viene creata come figlia di un'altra pagina (ad esempio un Task dentro un Progetto), NutNote propaga automaticamente il 'root_client_id' dell'antenato cliente radice.")),
        ("blk-c1-15", "callout", callout("🔒", "L'isolamento via root_client_id è fondamentale per il selettore intelligente di relazioni: quando colleghi una pagina, il sistema ti propone prioritariamente le risorse dello stesso cliente.")),
        ("blk-c1-16", "heading", h2("1.4 Schema Registry delle Proprietà")),
        ("blk-c1-17", "paragraph", p("Ogni PageType definisce un JSON 'properties_schema'. Le proprietà supportano tipizzazioni forti:")),
        ("blk-c1-18", "bulletList", bullet("text / email / phone / url: campi testuali validati.")),
        ("blk-c1-19", "bulletList", bullet("number: valori numerici per budget, importi o ore stimate.")),
        ("blk-c1-20", "bulletList", bullet("date: selettore date per scadenze e ordini.")),
        ("blk-c1-21", "bulletList", bullet("select / multi_select: elenchi di opzioni con badge cromatici personalizzati.")),
        ("blk-c1-22", "heading", h2("1.5 Macchina a Stati (Status Flow) e Priorità")),
        ("blk-c1-23", "paragraph", p("Ogni entità attraversa un ciclo di vita definito in 'status_flow'. Ad esempio:")),
        ("blk-c1-24", "bulletList", bullet("Wiki: Bozze (draft) ➔ Verificata (verified) ➔ Obsoleta (outdated).")),
        ("blk-c1-25", "bulletList", bullet("Bug: Aperto ➔ In Analisi ➔ In Risoluzione ➔ Risolto ➔ Chiuso.")),
        ("blk-c1-26", "bulletList", bullet("Task: Da Fare ➔ In Lavorazione ➔ In Revisione ➔ Completato.")),
        ("blk-c1-27", "quote", quote("La convergenza tra tipizzazione universale e proprietà dinamiche garantisce l'assoluta coerenza dei dati preservando la massima libertà operativa.")),
        ("blk-c1-28", "heading", h2("1.6 Modalità Libro & Navigazione Sequenziale tra Note (Wiki & Manuali)")),
        ("blk-c1-29", "paragraph", p("Uno dei punti di forza di NutNote per l'uso come Wiki aziendale è la Navigazione Sequenziale Automatica (Modalità Libro). Quando una pagina contiene sotto-pagine (ad esempio capitoli o sezioni di una procedura), NutNote genera dinamicamente una barra di navigazione a fondo pagina:")),
        ("blk-c1-30", "bulletList", bullet("Nella pagina genitore (Indice/Hub): viene visualizzato un riquadro con il conteggio delle sotto-pagine e il pulsante rapido per avviare la lettura dal primo capitolo.")),
        ("blk-c1-31", "bulletList", bullet("Nelle sotto-pagine (Capitoli): il sistema individua automaticamente le pagine sorelle (siblings) e offre: [◀ Capitolo Precedente], il link all'[Indice Raccolta] per risalire alla pagina madre, e [Capitolo Successivo ▶], con badge di avanzamento 'Nota X di Y'.")),
        ("blk-c1-32", "callout", callout("📖", "Non occorre creare manualmente link o configurare plugin: è sufficiente creare le note come sotto-pagine di una pagina madre e l'esperienza di navigazione sfogliabile a libro si attiva istantaneamente per chiunque consulti la documentazione.")),
    ];

    for (pos, (b_id, b_type, b_content)) in ch1_blocks.into_iter().enumerate() {
        insert_block(conn, b_id, "wiki-ch1-architettura", b_type, &b_content, pos as i32)?;
    }

    // ─────────────────────────────────────────────────────────────
    // CAPITOLO 2: Editor a Blocchi & Formattazione Avanzata
    // ─────────────────────────────────────────────────────────────
    insert_page(
        conn,
        "wiki-ch2-editor",
        "Capitolo 2: Editor a Blocchi, Formattazione Avanzata & Comandi Rapidi",
        "✍️",
        Some("wiki-hub"),
        2,
        0,
        r#"{"section":"Capitolo 2","difficulty":"Base","reading_time":"10 min"}"#,
        admin_id,
    )?;

    let ch2_blocks = vec![
        ("blk-c2-1", "heading", h1("Capitolo 2: Editor a Blocchi & Formattazione Avanzata")),
        ("blk-c2-2", "paragraph", p("L'editor a blocchi centrale costituisce il cuore dell'esperienza di scrittura di NutNote. Basato sul motore TipTap e ProseMirror, l'editor converte ogni paragrafo, titolo, to-do list o snippet di codice in un nodo atomico interattivo e riordinabile.")),
        ("blk-c2-3", "heading", h2("2.1 Catalogo dei Blocchi Supportati")),
        ("blk-c2-4", "bulletList", bullet("Titoli Gerarchici (H1, H2, H3): definiscono la struttura semantica del testo.")),
        ("blk-c2-5", "bulletList", bullet("Paragrafi: testo formattabile con grassetto, corsivo, codice inline e link.")),
        ("blk-c2-6", "bulletList", bullet("Elenchi Puntati e Numerati: per liste operative ordinate o non ordinate.")),
        ("blk-c2-7", "bulletList", bullet("Task List Interattive: checkbox cliccabili con salvataggio dello stato di avanzamento.")),
        ("blk-c2-8", "bulletList", bullet("Blocchi di Codice con Syntax Highlighting: evidenziazione per Rust, TypeScript, Python, SQL, HTML, CSS, Bash e JSON.")),
        ("blk-c2-9", "bulletList", bullet("Callout Informativi: box colorati con emoji personalizzabile per consigli, avvisi o note di attenzione.")),
        ("blk-c2-10", "bulletList", bullet("Citazioni (Blockquote): formattazione con barra laterale d'accento per note importanti.")),
        ("blk-c2-11", "bulletList", bullet("Separatori Orizzontali (Divider): per separare sezioni tematiche.")),
        ("blk-c2-12", "bulletList", bullet("Immagini: rendering con supporto per didascalie esplicative.")),
        ("blk-c2-13", "heading", h2("2.2 Il Comando Slash (/)")),
        ("blk-c2-14", "paragraph", p("All'interno di qualsiasi blocco vuoto, digitando il carattere '/' si attiva il menu di inserimento rapido. È possibile filtrare digitando il nome del blocco desiderato:")),
        ("blk-c2-15", "code", code("text", "/h1       -> Titolo 1 (Heading 1)\n/h2       -> Titolo 2 (Heading 2)\n/h3       -> Titolo 3 (Heading 3)\n/todo     -> Task list con checkbox\n/bullet   -> Elenco puntato\n/code     -> Blocco di codice con evidenziazione sintassi\n/callout  -> Riquadro informativo con icona\n/quote    -> Citazione\n/divider  -> Linea divisoria")),
        ("blk-c2-16", "heading", h2("2.3 Riordino con Drag & Drop")),
        ("blk-c2-17", "paragraph", p("Ogni blocco presenta a sinistra una maniglia a sei puntini (Grip Handle). Cliccando e trascinando la maniglia è possibile spostare il blocco in qualsiasi posizione all'interno del documento con feedback visivo fluido.")),
        ("blk-c2-18", "callout", callout("✨", "Il sistema riordina istantaneamente gli indici di posizione 'position' di tutti i blocchi sottostanti e salva la nuova sequenza in background.")),
        ("blk-c2-19", "heading", h2("2.4 Scorciatoie Markdown in Tempo Reale")),
        ("blk-c2-20", "paragraph", p("L'editor interpreta nativamente le consuete scorciatoie Markdown:")),
        ("blk-c2-21", "bulletList", bullet("Digita '# ' all'inizio di riga per trasformare il blocco in H1.")),
        ("blk-c2-22", "bulletList", bullet("Digita '## ' per H2 o '### ' per H3.")),
        ("blk-c2-23", "bulletList", bullet("Digita '- ' o '* ' per un elenco puntato.")),
        ("blk-c2-24", "bulletList", bullet("Digita '1. ' per un elenco numerato.")),
        ("blk-c2-25", "bulletList", bullet("Digita '[] ' per creare immediatamente una checkbox todo.")),
        ("blk-c2-26", "bulletList", bullet("Digita '> ' per una citazione blockquote.")),
        ("blk-c2-27", "bulletList", bullet("Digita '```' seguito da invio per un blocco di codice.")),
        ("blk-c2-28", "heading", h2("2.5 Auto-Save & Debouncing")),
        ("blk-c2-29", "paragraph", p("Non è necessario premere 'Salva' costantemente: ogni battuta viene memorizzata in locale e sincronizzata sul backend tramite debouncing (600ms dall'ultimo input), assicurando fluidità e protezione contro la perdita dati.")),
    ];

    for (pos, (b_id, b_type, b_content)) in ch2_blocks.into_iter().enumerate() {
        insert_block(conn, b_id, "wiki-ch2-editor", b_type, &b_content, pos as i32)?;
    }

    // ─────────────────────────────────────────────────────────────
    // CAPITOLO 3: Relazioni Intelligenti, Backlink & Mappa a Nuvola
    // ─────────────────────────────────────────────────────────────
    insert_page(
        conn,
        "wiki-ch3-relazioni",
        "Capitolo 3: Relazioni Intelligenti, Backlink & Mappa a Nuvola",
        "🔗",
        Some("wiki-hub"),
        3,
        0,
        r#"{"section":"Capitolo 3","difficulty":"Avanzato","reading_time":"9 min"}"#,
        admin_id,
    )?;

    let ch3_blocks = vec![
        ("blk-c3-1", "heading", h1("Capitolo 3: Relazioni Intelligenti, Backlink & Mappa a Nuvola")),
        ("blk-c3-2", "paragraph", p("Mentre la gerarchia parent/child organizza le pagine verticalmente, il motore di relazioni di NutNote costruisce un grafo della conoscenza orizzontale e bidirezionale tra qualsiasi entità del workspace.")),
        ("blk-c3-3", "heading", h2("3.1 I 5 Tipi Semantici di Relazione")),
        ("blk-c3-4", "paragraph", p("A differenza di collegamenti ipertestuali generici, ogni relazione in NutNote esprime un significato logico preciso:")),
        ("blk-c3-5", "bulletList", bullet("reference (Fa riferimento a): collegamento documentale, specifica tecnica o verbale correlato.")),
        ("blk-c3-6", "bulletList", bullet("depends_on (Dipende da): vincolo temporale o operativo. Il task A non può avanzare senza B.")),
        ("blk-c3-7", "bulletList", bullet("blocks (Blocca): impedimento critico. La pagina sorgente impedisce la chiusura del target.")),
        ("blk-c3-8", "bulletList", bullet("related (Correlato a): associazione simmetrica di contesto o affinità tematica.")),
        ("blk-c3-9", "bulletList", bullet("duplicate (Duplicato di): segnalazione di record o issue ridondanti.")),
        ("blk-c3-10", "heading", h2("3.2 Selettore Intelligente e Collegamento Rapido")),
        ("blk-c3-11", "paragraph", p("Nel pannello a scomparsa 'Relazioni & Collegamenti' in fondo a ogni pagina, il selettore propone due modalità operative:")),
        ("blk-c3-12", "bulletList", bullet("Pagine del Cliente Corrente: elenca automaticamente tutti i progetti, commesse, note e task del medesimo cliente, con filtro di ricerca istantaneo in tempo reale.")),
        ("blk-c3-13", "bulletList", bullet("Ricerca Globale o ID Manuale: permette di cercare su tutto l'archivio aziendale oppure incollare direttamente l'ID univoco copiato dalla barra superiore di un'altra pagina.")),
        ("blk-c3-14", "callout", callout("💡", "Ricorda: puoi copiare l'identificatore univoco di qualsiasi pagina con un solo clic sul pulsante 'ID: xxx' posizionato nella TopBar.")),
        ("blk-c3-15", "heading", h2("3.3 Bidirezionalità e Backlink Automatici")),
        ("blk-c3-16", "paragraph", p("Se crei una relazione da Pagina A a Pagina B con tipo 'depends_on', aprendo Pagina B il sistema mostrerà automaticamente il backlink inverso: 'Prerequisito di: Pagina A'. Non è necessaria alcuna doppia inserzione manuale.")),
        ("blk-c3-17", "heading", h2("3.4 La Mappa a Nuvola (Knowledge Cloud Map)")),
        ("blk-c3-18", "paragraph", p("Accessibile dalla voce 'Mappa a Nuvola' nella barra laterale, questo strumento visualizza l'intero database come grafo interattivo a forze (D3.js Force Simulation):")),
        ("blk-c3-19", "bulletList", bullet("Nodi differenziati cromaticamente per tipo di entità (Blu per Clienti, Arancio per Progetti, Viola per Commesse, Verde per Wiki, Rosso per Bug).")),
        ("blk-c3-20", "bulletList", bullet("Archi direzionati ed etichettati per tipo di relazione.")),
        ("blk-c3-21", "bulletList", bullet("Interazione fisica: trascina i nodi per riorganizzare i cluster visivi; usa la rotellina per zoom e pan.")),
        ("blk-c3-22", "bulletList", bullet("Doppio Clic su un Nodo: apre istantaneamente la pagina corrispondente.")),
        ("blk-c3-23", "bulletList", bullet("Filtro di ricerca: evidenzia all'istante i nodi corrispondenti a un criterio testuale.")),
    ];

    for (pos, (b_id, b_type, b_content)) in ch3_blocks.into_iter().enumerate() {
        insert_block(conn, b_id, "wiki-ch3-relazioni", b_type, &b_content, pos as i32)?;
    }

    // ─────────────────────────────────────────────────────────────
    // CAPITOLO 4: Viste Database, Tabelle, Kanban & Ricerca FTS5
    // ─────────────────────────────────────────────────────────────
    insert_page(
        conn,
        "wiki-ch4-database-viste",
        "Capitolo 4: Viste Database, Tabelle, Kanban & Ricerca FTS5",
        "📊",
        Some("wiki-hub"),
        4,
        0,
        r#"{"section":"Capitolo 4","difficulty":"Base","reading_time":"8 min"}"#,
        admin_id,
    )?;

    let ch4_blocks = vec![
        ("blk-c4-1", "heading", h1("Capitolo 4: Viste Database, Tabelle, Kanban & Ricerca FTS5")),
        ("blk-c4-2", "paragraph", p("Le pagine di tipo omogeneo possono essere consultate e manipolate collettivamente tramite schermate di catalogo ad alte prestazioni, con supporto per vista Tabellare e vista Kanban.")),
        ("blk-c4-3", "heading", h2("4.1 Vista Tabellare e Modifica Inline")),
        ("blk-c4-4", "paragraph", p("La vista tabellare (/type/:typeName) offre una panoramica a griglia ottimizzata per l'inserimento rapido:")),
        ("blk-c4-5", "bulletList", bullet("Editing delle Celle Inline: modifica titoli, stati, priorità e proprietà personalizzate direttamente dalla tabella senza aprire la pagina.")),
        ("blk-c4-6", "bulletList", bullet("Ordinamento per Colonne: clicca sulle intestazioni per ordinare per data, priorità o valori alfanumerici.")),
        ("blk-c4-7", "bulletList", bullet("Filtro Istantaneo: la barra di ricerca superiore filtra le righe in tempo reale senza latenza.")),
        ("blk-c4-8", "bulletList", bullet("Tasto '+ Aggiungi Record': crea una nuova riga precompilata in fondo alla tabella.")),
        ("blk-c4-9", "heading", h2("4.2 Vista Kanban / Board Interattiva")),
        ("blk-c4-10", "paragraph", p("Per entità orientate al flusso (Task, Bug, Commesse, Wiki), la vista Kanban raggruppa le pagine in colonne corrispondenti agli stati dello 'status_flow':")),
        ("blk-c4-11", "bulletList", bullet("Drag & Drop delle Schede: trascina una card da 'In Lavorazione' a 'Completato' per aggiornare lo stato nel database in modo atomico.")),
        ("blk-c4-12", "bulletList", bullet("Badge di Priorità: risalto visivo immediato per elementi Urgent (rosso), High (arancione), Medium (giallo).")),
        ("blk-c4-13", "bulletList", bullet("Contatore di Colonna: conteggio automatico degli elementi presenti in ogni fase di avanzamento.")),
        ("blk-c4-14", "heading", h2("4.3 Motore di Ricerca Full-Text (SQLite FTS5)")),
        ("blk-c4-15", "paragraph", p("NutNote include un modulo FTS5 (Full-Text Search 5) nativo in SQLite. Ogni volta che un blocco o il titolo di una pagina viene creato o modificato, l'indice FTS5 viene aggiornato istantaneamente:")),
        ("blk-c4-16", "code", code("sql", "SELECT page_id, title, snippet(pages_fts, 2, '<b>', '</b>', '...', 10) as snippet\nFROM pages_fts\nWHERE pages_fts MATCH 'WebSocket OR Axum'\nORDER BY rank;")),
        ("blk-c4-17", "callout", callout("🔍", "La ricerca FTS5 permette di trovare all'istante documenti anche cercandone il testo contenuto nei blocchi profondi, e non soltanto il titolo.")),
    ];

    for (pos, (b_id, b_type, b_content)) in ch4_blocks.into_iter().enumerate() {
        insert_block(conn, b_id, "wiki-ch4-database-viste", b_type, &b_content, pos as i32)?;
    }

    // ─────────────────────────────────────────────────────────────
    // CAPITOLO 5: Collaborazione, Gestione Team, Ruoli & Chat
    // ─────────────────────────────────────────────────────────────
    insert_page(
        conn,
        "wiki-ch5-collaborazione",
        "Capitolo 5: Collaborazione, Gestione Team, Ruoli & Chat Contestuale",
        "👥",
        Some("wiki-hub"),
        5,
        0,
        r#"{"section":"Capitolo 5","difficulty":"Intermedio","reading_time":"7 min"}"#,
        admin_id,
    )?;

    let ch5_blocks = vec![
        ("blk-c5-1", "heading", h1("Capitolo 5: Collaborazione, Gestione Team, Ruoli & Chat Contestuale")),
        ("blk-c5-2", "paragraph", p("NutNote è progettato per ambienti aziendali interni dove la trasparenza e l'agilità operativa sono essenziali. L'autenticazione adotta un modello trust-based con profili utente, team specializzati e chat di contesto.")),
        ("blk-c5-3", "heading", h2("5.1 Struttura dei Team Aziendali")),
        ("blk-c5-4", "paragraph", p("Il sistema prevede 4 team standard configurabili con codifica cromatica dedicata:")),
        ("blk-c5-5", "bulletList", bullet("Sviluppo Software (#1971c2): team di ingegneria, programmatori e tester.")),
        ("blk-c5-6", "bulletList", bullet("Design & UI/UX (#e64980): progettisti di interfacce, grafici e prototipatori.")),
        ("blk-c5-7", "bulletList", bullet("Management & Direzione (#f59f00): project manager, coordinatori e amministratori.")),
        ("blk-c5-8", "bulletList", bullet("Commerciale & Sales (#2f9e44): referenti clienti e responsabili di commessa.")),
        ("blk-c5-9", "heading", h2("5.2 Ruoli e Permessi")),
        ("blk-c5-10", "bulletList", bullet("Amministratore (admin): può modificare la modalità di rete, avviare o arrestare il server LAN, gestire utenti, team e resettare il seed iniziale.")),
        ("blk-c5-11", "bulletList", bullet("Membro del Team (user): può creare, modificare, relazionare ed esportare pagine, blocchi e partecipare alle discussioni.")),
        ("blk-c5-12", "heading", h2("5.3 Chat Contestuale di Pagina")),
        ("blk-c5-13", "paragraph", p("Al termine del corpo del testo di ogni pagina è presente il modulo di discussione 'Project Chat':")),
        ("blk-c5-14", "bulletList", bullet("Commenti Asincroni: discussione legata in modo esclusivo alla pagina visualizzata.")),
        ("blk-c5-15", "bulletList", bullet("Avatar e Timbro Temporale: identificazione immediata di chi ha postato la decisione.")),
        ("blk-c5-16", "bulletList", bullet("Sincronizzazione Real-Time: quando il server LAN è attivo, i nuovi messaggi compaiono all'istante su tutti i monitor dei colleghi collegati.")),
        ("blk-c5-17", "heading", h2("5.4 Storico e Versionamento (Page History)")),
        ("blk-c5-18", "paragraph", p("Attraverso l'icona dell'orologio nella barra superiore o il menu '•••', è possibile aprire il modale 'Cronologia Versioni'. Ogni modifica salvata incrementa il numero di revisione della pagina e registra l'utente autore, consentendo un audit trail completo.")),
    ];

    for (pos, (b_id, b_type, b_content)) in ch5_blocks.into_iter().enumerate() {
        insert_block(conn, b_id, "wiki-ch5-collaborazione", b_type, &b_content, pos as i32)?;
    }

    // ─────────────────────────────────────────────────────────────
    // CAPITOLO 6: Networking, Server LAN & Sincronizzazione Locale
    // ─────────────────────────────────────────────────────────────
    insert_page(
        conn,
        "wiki-ch6-networking-lan",
        "Capitolo 6: Networking, Server LAN Condiviso & Sincronizzazione",
        "🌐",
        Some("wiki-hub"),
        6,
        0,
        r#"{"section":"Capitolo 6","difficulty":"Avanzato","reading_time":"11 min"}"#,
        admin_id,
    )?;

    let ch6_blocks = vec![
        ("blk-c6-1", "heading", h1("Capitolo 6: Networking, Server LAN Condiviso & Sincronizzazione")),
        ("blk-c6-2", "paragraph", p("Una delle funzionalità distintive di NutNote è la sua flessibilità di deployment locale senza dover ricorrere a costosi abbonamenti cloud esterni o cedere la sovranità dei propri dati aziendali.")),
        ("blk-c6-3", "heading", h2("6.1 Le 3 Modalità di Funzionamento")),
        ("blk-c6-4", "bulletList", bullet("1. Standalone Locale: l'applicazione opera in isolamento totale sul PC dell'utente, salvando tutto su SQLite locale protetto.")),
        ("blk-c6-5", "bulletList", bullet("2. Server LAN Condiviso: la macchina avvia un server HTTP REST e WebSocket ad alte prestazioni (Axum / Tokio) sulla porta TCP 9700. L'app rileva e visualizza automaticamente gli IP locali della scheda di rete (ad es. 192.168.1.150).")),
        ("blk-c6-6", "bulletList", bullet("3. Client Remoto: le altre postazioni dell'ufficio possono selezionare la modalità Client e inserire l'indirizzo IP del Server per connettersi in tempo reale all'archivio centrale.")),
        ("blk-c6-7", "heading", h2("6.2 Architettura di Sincronizzazione WebSocket")),
        ("blk-c6-8", "paragraph", p("Quando il Server LAN è attivo, il backend Rust apre un canale broadcast. Quando un client salva un blocco, aggiorna uno stato o invia un messaggio di chat:")),
        ("blk-c6-9", "code", code("json", "{\n  \"event\": \"page_updated\",\n  \"pageId\": \"proj-1\",\n  \"userId\": \"user-mario\",\n  \"timestamp\": \"2026-09-11T10:30:00Z\"\n}")),
        ("blk-c6-10", "paragraph", p("Tutti i client connessi invalidano istantaneamente la query React Query corrispondente, aggiornando la vista a schermo entro pochi millisecondi senza necessità di ricaricare manualmente la pagina.")),
        ("blk-c6-11", "heading", h2("6.3 Configurazione Firewall e Porte")),
        ("blk-c6-12", "paragraph", p("Per consentire alle altre postazioni di raggiungere il server, la porta 9700 deve essere aperta nel firewall locale:")),
        ("blk-c6-13", "bulletList", bullet("Windows: consenti l'accesso all'app NutNote o crea una regola in entrata per la porta TCP 9700 in 'Windows Defender Firewall con sicurezza avanzata'.")),
        ("blk-c6-14", "bulletList", bullet("macOS: consenti le connessioni in entrata per NutNote in 'Impostazioni di Sistema > Rete > Firewall'.")),
        ("blk-c6-15", "bulletList", bullet("Linux: esegui 'sudo ufw allow 9700/tcp' o aggiorna iptables.")),
        ("blk-c6-16", "callout", callout("🛡️", "La comunicazione avviene all'interno del perimetro della rete dell'ufficio o tramite VPN aziendale, assicurando la massima riservatezza dei documenti.")),
    ];

    for (pos, (b_id, b_type, b_content)) in ch6_blocks.into_iter().enumerate() {
        insert_block(conn, b_id, "wiki-ch6-networking-lan", b_type, &b_content, pos as i32)?;
    }

    // ─────────────────────────────────────────────────────────────
    // CAPITOLO 7: Esportazione Documenti, Backup Database & Sicurezza
    // ─────────────────────────────────────────────────────────────
    insert_page(
        conn,
        "wiki-ch7-export-backup",
        "Capitolo 7: Esportazione Documenti, Backup Database & Sicurezza",
        "💾",
        Some("wiki-hub"),
        7,
        0,
        r#"{"section":"Capitolo 7","difficulty":"Intermedio","reading_time":"8 min"}"#,
        admin_id,
    )?;

    let ch7_blocks = vec![
        ("blk-c7-1", "heading", h1("Capitolo 7: Esportazione Documenti, Backup Database & Sicurezza")),
        ("blk-c7-2", "paragraph", p("Un buon sistema di gestione della conoscenza deve garantire la totale portabilità dei dati e procedure affidabili di disaster recovery.")),
        ("blk-c7-3", "heading", h2("7.1 Esportazione dei Documenti")),
        ("blk-c7-4", "paragraph", p("Dal menu azioni '•••' presente nella barra superiore di ogni pagina è possibile esportare in tre formati standard:")),
        ("blk-c7-5", "bulletList", bullet("PDF Formattato: genera un foglio A4 pulito con stili tipografici tipici da documento aziendale, pronto per essere stampato o inviato a clienti.")),
        ("blk-c7-6", "bulletList", bullet("Microsoft Word (.docx / .doc): genera un file compatibile con Microsoft Word e LibreOffice per ulteriori revisioni formali.")),
        ("blk-c7-7", "bulletList", bullet("Markdown (.md): esporta il sorgente puro con tutti i blocchi convertiti in sintassi standard CommonMark, ideale per versionamento Git.")),
        ("blk-c7-8", "heading", h2("7.2 Esportazione Dati Tabellari (Excel & CSV)")),
        ("blk-c7-9", "paragraph", p("Nelle viste catalogo (/type/:typeName) è possibile cliccare sul tasto 'Esporta' per generare fogli di lavoro con tutti i record filtrati:")),
        ("blk-c7-10", "bulletList", bullet("Excel (.xlsx): esportazione formattata con colonne strutturate, numeri e date.")),
        ("blk-c7-11", "bulletList", bullet("CSV: file delimitato da virgole universale per l'importazione in gestionali ERP o database esterni.")),
        ("blk-c7-12", "heading", h2("7.3 Struttura del Database SQLite e Modalità WAL")),
        ("blk-c7-13", "paragraph", p("Tutti i dati di NutNote sono salvati nel file 'nutnote.db' all'interno della cartella dati dell'applicazione. Il motore opera in modalità WAL (Write-Ahead Logging):")),
        ("blk-c7-14", "code", code("text", "Cartella Dati Applicazione:\n  ├── nutnote.db         -> Database principale (pagine, blocchi, relazioni, utenti)\n  ├── nutnote.db-wal     -> Write-Ahead Log (scritture concorrenti ad alta velocità)\n  └── nutnote.db-shm     -> Shared memory index per WAL")),
        ("blk-c7-15", "paragraph", p("In modalità WAL le operazioni di lettura non bloccano mai le scritture e viceversa, consentendo a decine di utenti concorrenti di lavorare sulla stessa istanza senza deadlock.")),
        ("blk-c7-16", "heading", h2("7.4 Strategia di Backup Periodico")),
        ("blk-c7-17", "paragraph", p("Per eseguire una copia di sicurezza completa dell'archivio aziendale è sufficiente copiare il file 'nutnote.db' su un supporto esterno o includerlo nei backup di rete automatizzati.")),
        ("blk-c7-18", "callout", callout("⚠️", "Assicurarsi di eseguire il checkpoint o copiare assieme anche i file nutnote.db-wal e nutnote.db-shm se l'applicazione è in esecuzione durante la copia.")),
    ];

    for (pos, (b_id, b_type, b_content)) in ch7_blocks.into_iter().enumerate() {
        insert_block(conn, b_id, "wiki-ch7-export-backup", b_type, &b_content, pos as i32)?;
    }

    // ─────────────────────────────────────────────────────────────
    // CAPITOLO 8: Casi d'Uso Reali & Workflow Operativi Aziendali
    // ─────────────────────────────────────────────────────────────
    insert_page(
        conn,
        "wiki-ch8-casi-uso",
        "Capitolo 8: Casi d'Uso Reali & Workflow Operativi Aziendali",
        "💼",
        Some("wiki-hub"),
        8,
        0,
        r#"{"section":"Capitolo 8","difficulty":"Pratico","reading_time":"12 min"}"#,
        admin_id,
    )?;

    let ch8_blocks = vec![
        ("blk-c8-1", "heading", h1("Capitolo 8: Casi d'Uso Reali & Workflow Operativi Aziendali")),
        ("blk-c8-2", "paragraph", p("In questo capitolo vengono illustrati i pattern operativi consigliati per sfruttare al massimo NutNote nei processi di lavoro quotidiani.")),
        ("blk-c8-3", "heading", h2("8.1 Caso 1: Ciclo di Vita Completo del Cliente")),
        ("blk-c8-4", "paragraph", p("Come strutturare l'alberatura quando viene acquisito un nuovo cliente:")),
        ("blk-c8-5", "numbered", numbered("1. Creazione Cliente (client): compila anagrafica, referente, email e telefono nel form dedicato.")),
        ("blk-c8-6", "numbered", numbered("2. Creazione Progetto (project): apri la pagina del cliente e clicca '+ Nuova Sotto-pagina', selezionando 'Progetto'. Definisci budget e scadenza stimata.")),
        ("blk-c8-7", "numbered", numbered("3. Creazione Commesse Operative (commessa): all'interno del progetto, crea le commesse di sviluppo con codice identificativo e valore contrattuale.")),
        ("blk-c8-8", "numbered", numbered("4. Scomposizione in Task e Note: assegna le attività al team con scadenze precise.")),
        ("blk-c8-9", "heading", h2("8.2 Caso 2: Sprint di Sviluppo Software e Bug Tracking")),
        ("blk-c8-10", "paragraph", p("Gestione dei ticket di difetto con la dovuta priorità:")),
        ("blk-c8-11", "bulletList", bullet("Creazione Bug: specifica la gravità ('Bloccante', 'Grave', 'Minore', 'Cosmetico'), l'ambiente operativo e i passaggi esatti per la riproduzione.")),
        ("blk-c8-12", "bulletList", bullet("Collegamento con Relazione 'blocks': collega il bug al task della commessa indicando che ne impedisce il completamento.")),
        ("blk-c8-13", "bulletList", bullet("Avanzamento Kanban: sposta la scheda da 'Aperto' ad 'In Analisi', 'In Risoluzione' fino a 'Risolto' e 'Chiuso'.")),
        ("blk-c8-14", "heading", h2("8.3 Caso 3: Verbali di Riunione e Knowledge Base")),
        ("blk-c8-15", "paragraph", p("Per riunioni interne o con il cliente:")),
        ("blk-c8-16", "bulletList", bullet("Crea una 'Nota' sotto il Progetto con categoria 'Riunione'.")),
        ("blk-c8-17", "bulletList", bullet("Usa l'editor con blocchi H2 e Tasklist per riassumere le decisioni e i punti di azione concordati.")),
        ("blk-c8-18", "bulletList", bullet("Esporta il verbale in PDF con un clic dal menu '•••' per inviarlo via email a tutti i partecipanti.")),
        ("blk-c8-19", "heading", h2("8.4 Caso 4: Creare una Wiki Aziendale, Manuale Tecnico o Knowledge Base di Reparto")),
        ("blk-c8-20", "paragraph", p("NutNote è stato progettato sin dalle fondamenta per operare come Wiki aziendale strutturata ed esaustiva. Per allestire un manuale o una base di conoscenza di reparto con navigazione a libro integrata:")),
        ("blk-c8-21", "numbered", numbered("1. Creazione della Pagina Radice (Hub): crea una nuova pagina (es. 'Manuale Operativo Reparto IT' o 'Wiki di Progetto'), imposta un'icona tematica (es. 📚 o 🏛️) e imposta la tipologia 'Wiki' o 'Nota'.")),
        ("blk-c8-22", "numbered", numbered("2. Strutturazione dei Capitoli in Sotto-Pagine: all'interno dell'Hub, clicca sul pulsante '+ Nuova Sotto-pagina' per ogni capitolo o sezione (es. 'Capitolo 1: Setup', 'Capitolo 2: Architettura', ecc.).")),
        ("blk-c8-23", "numbered", numbered("3. Attivazione Automatica della Modalità Libro: non occorre scrivere codice né configurare menu: NutNote riconosce automaticamente la gerarchia e genera a fondo pagina di ogni capitolo i pulsanti per passare al capitolo precedente, all'indice generale e al capitolo successivo, con badge 'Capitolo X di N'.")),
        ("blk-c8-24", "numbered", numbered("4. Collegamenti Ipertestuali e Riferimenti Incrociati: all'interno del corpo del testo dei blocchi, usa le citazioni e i riferimenti incrociati per rimandare ad altri capitoli o a specifiche commesse operative.")),
        ("blk-c8-25", "numbered", numbered("5. Ciclo di Revisione e Stati: imposta lo stato della pagina su 'Verificata' per procedure validate e 'Obsoleta' per documenti in fase di aggiornamento.")),
        ("blk-c8-26", "callout", callout("🎯", "Seguendo questo schema gerarchico a cartella/raccolta, l'intero archivio documentale della tua azienda diventa navigabile e sfogliabile come un vero libro digitale interattivo.")),
    ];

    for (pos, (b_id, b_type, b_content)) in ch8_blocks.into_iter().enumerate() {
        insert_block(conn, b_id, "wiki-ch8-casi-uso", b_type, &b_content, pos as i32)?;
    }

    // ─────────────────────────────────────────────────────────────
    // CAPITOLO 9: Guida di Riferimento Rapido, Shortcut & FAQ
    // ─────────────────────────────────────────────────────────────
    insert_page(
        conn,
        "wiki-ch9-faq-riferimento",
        "Capitolo 9: Guida di Riferimento Rapido, Shortcut da Tastiera & FAQ",
        "⚡",
        Some("wiki-hub"),
        9,
        0,
        r#"{"section":"Capitolo 9","difficulty":"Base","reading_time":"6 min"}"#,
        admin_id,
    )?;

    let ch9_blocks = vec![
        ("blk-c9-1", "heading", h1("Capitolo 9: Guida di Riferimento Rapido, Shortcut da Tastiera & FAQ")),
        ("blk-c9-2", "paragraph", p("Questa guida di riferimento sintetico raccoglie le scorciatoie da tastiera, le convenzioni e le risposte alle domande più frequenti emerse durante l'uso di NutNote.")),
        ("blk-c9-3", "heading", h2("9.1 Tavola delle Scorciatoie da Tastiera")),
        ("blk-c9-4", "bulletList", bullet("Ctrl / Cmd + K : attiva la ricerca globale istantanea (Spotlight).")),
        ("blk-c9-5", "bulletList", bullet("Ctrl / Cmd + B : applica il grassetto al testo selezionato.")),
        ("blk-c9-6", "bulletList", bullet("Ctrl / Cmd + I : applica il corsivo al testo selezionato.")),
        ("blk-c9-7", "bulletList", bullet("Ctrl / Cmd + Z : annulla l'ultima modifica (Undo).")),
        ("blk-c9-8", "bulletList", bullet("Ctrl / Cmd + Shift + Z : ripristina la modifica annullata (Redo).")),
        ("blk-c9-9", "bulletList", bullet("/ (Slash) su riga vuota : apre il menu di inserimento blocchi rapidi.")),
        ("blk-c9-10", "bulletList", bullet("Invio su riga vuota di lista : esce dall'elenco e crea un normale paragrafo.")),
        ("blk-c9-11", "heading", h2("9.2 Domande Frequenti (FAQ)")),
        ("blk-c9-12", "callout", callout("❓", "D: Cosa fare se non riesco a collegarmi al Server LAN di un collega?\nR: Verifica che il collega abbia avviato il server dal menu Impostazioni (icona ingranaggio), che entrambi i PC siano connessi alla stessa rete locale o Wi-Fi aziendale e che il firewall del server autorizzi la porta 9700.")),
        ("blk-c9-13", "callout", callout("❓", "D: Come faccio a citare o correlare una pagina di un altro cliente?\nR: Apri la sezione 'Relazioni & Collegamenti' in fondo alla pagina, seleziona 'Pagina Esterna / ID Manuale' e cerca la pagina per titolo oppure incolla direttamente il suo identificatore univoco.")),
        ("blk-c9-14", "callout", callout("❓", "D: Dove trovo l'ID univoco di una pagina per incollarlo altrove?\nR: Nella parte superiore della pagina, accanto al selettore di stato, è presente il pulsante 'ID: [nome-id]'. Cliccalo: l'ID viene copiato immediatamente negli appunti di sistema.")),
        ("blk-c9-15", "callout", callout("❓", "D: I dati sono al sicuro se chiudo l'app improvvisamente?\nR: Sì. L'auto-save salva ogni modifica entro 600ms e il database SQLite opera con protocollo WAL con transazioni atomiche ACID.")),
        ("blk-c9-16", "heading", h2("9.3 Contatti e Supporto")),
        ("blk-c9-17", "paragraph", p("Per segnalazioni interne di bug, apri un nuovo ticket nella sezione 'Bug Tracker' selezionando gravità e ambiente di riscontro.")),
    ];

    for (pos, (b_id, b_type, b_content)) in ch9_blocks.into_iter().enumerate() {
        insert_block(conn, b_id, "wiki-ch9-faq-riferimento", b_type, &b_content, pos as i32)?;
    }

    // ─────────────────────────────────────────────────────────────
    // GUIDE RAPIDE INTERNAZIONALI (EN, ES, FR, DE)
    // ─────────────────────────────────────────────────────────────
    insert_page(conn, "wiki-guide-en", "NutNote Complete User Guide (English)", "🇬🇧", Some("wiki-hub"), 10, 0, r#"{"language":"en"}"#, admin_id)?;
    let en_blocks = vec![
        ("blk-en-1", "heading", h1("Official NutNote User Manual (English)")),
        ("blk-en-2", "paragraph", p("Welcome to the NutNote documentation. This guide provides an overview of the 'Everything is a Page' architecture, block editor, relational graph, LAN server collaboration, and backup recovery.")),
        ("blk-en-3", "callout", callout("💡", "Pro-tip: You can easily copy any page's unique ID by clicking the 'ID: wiki-guide-en' pill button in the top navigation bar.")),
        ("blk-en-4", "heading", h2("Core Features Overview")),
        ("blk-en-5", "bulletList", bullet("Tree Hierarchy: Clients > Projects > Work Orders > Tasks / Notes / Bugs / Wiki docs.")),
        ("blk-en-6", "bulletList", bullet("Block Editor: rich blocks with slash command (/), code highlighting, callouts, and drag-and-drop reordering.")),
        ("blk-en-7", "bulletList", bullet("Smart Relations: connect pages across the workspace with bidirectional semantic relationships.")),
        ("blk-en-8", "bulletList", bullet("LAN Server Mode: share workspace in real-time over your office Wi-Fi on port 9700.")),
        ("blk-en-9", "bulletList", bullet("Multi-format Export: export documents to PDF, Word (.doc/.docx), and Markdown (.md).")),
    ];
    for (pos, (b_id, b_type, b_content)) in en_blocks.into_iter().enumerate() {
        insert_block(conn, b_id, "wiki-guide-en", b_type, &b_content, pos as i32)?;
    }

    insert_page(conn, "wiki-guide-es", "Guía Completa de Usuario de NutNote (Español)", "🇪🇸", Some("wiki-hub"), 11, 0, r#"{"language":"es"}"#, admin_id)?;
    let es_blocks = vec![
        ("blk-es-1", "heading", h1("Manual de Usuario Oficial de NutNote (Español)")),
        ("blk-es-2", "paragraph", p("Bienvenido a la guía oficial de NutNote. Esta documentación cubre la estructura jerárquica, el editor de bloques, las relaciones inteligentes y el despliegue en red local.")),
        ("blk-es-3", "bulletList", bullet("Arquitectura Jerárquica: Clientes > Proyectos > Fases > Tareas, Notas y Errores.")),
        ("blk-es-4", "bulletList", bullet("Editor de Bloques: títulos, listas de tareas, código y llamadas de atención.")),
        ("blk-es-5", "bulletList", bullet("Servidor LAN: comparta su base de datos en tiempo real en el puerto 9700.")),
    ];
    for (pos, (b_id, b_type, b_content)) in es_blocks.into_iter().enumerate() {
        insert_block(conn, b_id, "wiki-guide-es", b_type, &b_content, pos as i32)?;
    }

    insert_page(conn, "wiki-guide-fr", "Guide Complet d'Utilisation NutNote (Français)", "🇫🇷", Some("wiki-hub"), 12, 0, r#"{"language":"fr"}"#, admin_id)?;
    let fr_blocks = vec![
        ("blk-fr-1", "heading", h1("Manuel d'Utilisation Officiel NutNote (Français)")),
        ("blk-fr-2", "paragraph", p("Bienvenue dans la documentation officielle de NutNote. Ce guide présente l'architecture en arbre, l'éditeur de blocs riche et le travail collaboratif en réseau local.")),
        ("blk-fr-3", "bulletList", bullet("Architecture: Clients > Projets > Commandes > Tâches, Notes et Bogues.")),
        ("blk-fr-4", "bulletList", bullet("Éditeur riche: commande slash (/), blocs de code et réorganisation fluide.")),
        ("blk-fr-5", "bulletList", bullet("Réseau LAN: partagez votre espace de travail en temps réel sur le port 9700.")),
    ];
    for (pos, (b_id, b_type, b_content)) in fr_blocks.into_iter().enumerate() {
        insert_block(conn, b_id, "wiki-guide-fr", b_type, &b_content, pos as i32)?;
    }

    insert_page(conn, "wiki-guide-de", "NutNote Benutzerhandbuch - Vollständige Anleitung (Deutsch)", "🇩🇪", Some("wiki-hub"), 13, 0, r#"{"language":"de"}"#, admin_id)?;
    let de_blocks = vec![
        ("blk-de-1", "heading", h1("Offizielles NutNote Benutzerhandbuch (Deutsch)")),
        ("blk-de-2", "paragraph", p("Willkommen zur offiziellen NutNote Dokumentation. Dieser Leitfaden beschreibt die Baumarchitektur, den Block-Editor, intelligente Verknüpfungen und die lokale Netzwerkbereitstellung.")),
        ("blk-de-3", "bulletList", bullet("Hierarchie: Kunden > Projekte > Aufträge > Aufgaben, Notizen und Fehler.")),
        ("blk-de-4", "bulletList", bullet("Block-Editor: Überschriften, Aufgabenlisten und Syntaxhervorhebung.")),
        ("blk-de-5", "bulletList", bullet("Lokales Netzwerk: Echtzeit-Server auf Port 9700.")),
    ];
    for (pos, (b_id, b_type, b_content)) in de_blocks.into_iter().enumerate() {
        insert_block(conn, b_id, "wiki-guide-de", b_type, &b_content, pos as i32)?;
    }

    // ─────────────────────────────────────────────────────────────
    // RELAZIONI TRA HUB E TUTTI I CAPITOLI + SEQUENZA CAPITOLI
    // ─────────────────────────────────────────────────────────────
    let chapters = vec![
        ("wiki-ch1-architettura", "Capitolo 1: Architettura di Sistema"),
        ("wiki-ch2-editor", "Capitolo 2: Editor a Blocchi"),
        ("wiki-ch3-relazioni", "Capitolo 3: Relazioni Intelligenti"),
        ("wiki-ch4-database-viste", "Capitolo 4: Viste Database"),
        ("wiki-ch5-collaborazione", "Capitolo 5: Collaborazione e Team"),
        ("wiki-ch6-networking-lan", "Capitolo 6: Networking e Server LAN"),
        ("wiki-ch7-export-backup", "Capitolo 7: Esportazione e Backup"),
        ("wiki-ch8-casi-uso", "Capitolo 8: Casi d'Uso Aziendali"),
        ("wiki-ch9-faq-riferimento", "Capitolo 9: Riferimento Rapido e FAQ"),
    ];

    // Collega Hub a tutti i 9 capitoli
    for (c_id, label) in &chapters {
        insert_relation(
            conn,
            &format!("rel-hub-{}", c_id),
            "wiki-hub",
            c_id,
            "reference",
            label,
            admin_id,
        )?;
    }

    // Collega i capitoli in sequenza (Capitolo N -> Capitolo N+1 e viceversa)
    for i in 0..(chapters.len() - 1) {
        let (cur_id, _) = chapters[i];
        let (next_id, next_label) = chapters[i + 1];

        insert_relation(
            conn,
            &format!("rel-seq-{}-{}", cur_id, next_id),
            cur_id,
            next_id,
            "reference",
            &format!("Capitolo Successivo: {}", next_label),
            admin_id,
        )?;
    }

    // Collega Hub alle guide multilingue
    let lang_guides = vec![
        ("wiki-guide-en", "English User Guide"),
        ("wiki-guide-es", "Guía en Español"),
        ("wiki-guide-fr", "Guide en Français"),
        ("wiki-guide-de", "Deutsches Handbuch"),
    ];

    for (g_id, label) in &lang_guides {
        insert_relation(
            conn,
            &format!("rel-hub-{}", g_id),
            "wiki-hub",
            g_id,
            "reference",
            label,
            admin_id,
        )?;
    }

    Ok(())
}
