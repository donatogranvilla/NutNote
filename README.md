# NutNote 🥜📝

> Sviluppato con **Tauri 2**, **Rust**, **SQLite**, **React 19**, **TypeScript** e **TipTap**.

---

## 🌟 Cos'è NutNote?

**NutNote** è un'applicazione desktop-first concepita per superare i limiti tipici dei tool di documentazione generalisti (come Notion), introducendo una **forte gerarchia relazionale aziendale**, prestazioni native estreme, funzionamento garantito **completamente offline o in rete locale**, e privacy granulare.

Alla base vi è il paradigma **"Everything is a Page"**: qualsiasi entità gestionale (clienti, progetti, commesse, bug, note, wiki, task) condivide la stessa flessibilità a blocchi, ma è arricchita da tipizzazioni, attributi dedicati, relazioni bidirezionali e closure table SQL per query gerarchiche ultraveloci.

---

## 🚀 Caratteristiche Principali

### 🏢 1. Gerarchia Aziendale Forte & Closure Table
- **Struttura ad albero scalabile**: *Cliente ➔ Progetto ➔ Commessa ➔ Note / Bug / Task / File*.
- **Closure Table (`page_ancestors`)**: Navigazione di interi sottoalberi e calcolo dei breadcrumb in $O(1)$ senza costose query ricorsive SQLite.
- **Eredità e contesto**: Ogni nota, task o bug mantiene la tracciabilità fino al cliente radice (`root_client_id`).

### 🧩 2. Tipologie di Entità Built-in & Personalizzabili
- 👥 **Clienti**: Anagrafica, contatti, codice identificativo e stato account.
- 📁 **Progetti**: Budget, date inizio/fine, avanzamento e chat contestuale.
- 💼 **Commesse**: Codici commessa, importi e flussi di approvazione.
- 📝 **Note**: Pagine libere arricchite da categorie e metadati.
- 📖 **Wiki**: Documentazione tecnica aziendale con verifica di obsolescenza.
- 🐛 **Bug Tracker**: Gestione anomalie con severità, ambiente, passaggi di riproduzione e kanban di risoluzione.
- ✅ **Task / Todo List**: Assegnatari, date di scadenza, stima ore e board kanban.
- 📎 **File & Allegati**: Catalogazione risorse e allegati collegati al contesto.

### ✍️ 3. Editor a Blocchi TipTap Avanzato
- **Editor ricco e reattivo**: Basato su TipTap 3 con supporto per titoli, elenchi puntati/numerati, task list, tabelle, callout, citazioni e blocchi di codice.
- **Deep Linking ai singoli blocchi**: Cliccando su `⋮⋮` puoi copiare il link univoco di un singolo blocco (`nutnote://block/...`) per richiamarlo ovunque.
- **Auto-save debounced**: Nessuna perdita di dati, salvataggio automatico continuo in background.

### 💬 4. Chat di Progetto & Menzioni
- **Chat collaborativa integrata**: Presente nelle pagine di tipo Progetto e Commessa.
- **Menzioni con `@`**: Autocomplete rapido per taggare altri membri del team.
- **Anteprima blocchi in chat**: Incollando un link a un blocco nella chat, viene mostrato un badge cliccabile che reindirizza e fa auto-scroll al blocco evidenziandolo.

### 🔒 5. Multi-Utente Locale & Note Private
- **Profilo rapido ("Chi sta usando NutNote?")**: Selezione utente trust-based all'avvio con avatar e colori personalizzati.
- **Controllo Visibilità (Pubblica / Privata)**: Possibilità di impostare note private visibili esclusivamente al creatore sia nell'interfaccia che nelle query del database.

### 🔍 6. Ricerca Globale Full-Text (FTS5)
- Ricerca istantanea universale richiamabile con **`Ctrl + K`** o tramite la barra superiore.
- Indicizzazione nativa SQLite **FTS5** che analizza titoli, metadati e l'intero contenuto dei blocchi, con snippet evidenziati (`<mark>`).

### 🗺️ 7. Viste Multiple & Mappa Relazionale
- **Tabella dinamica**: Colonne riordinabili, filtri per stato/priorità.
- **Kanban Board**: Drag & drop fluido tra stati di avanzamento.
- **Cloud / Map View (Graph)**: Mappa visuale interattiva basata su **React Flow (`@xyflow/react`)** per esplorare le relazioni e le dipendenze tra pagine.
- **Gestione Priorità Globale**: Ordinamento uniforme (*Urgent ➔ High ➔ Medium ➔ Low*).

---

## 🛠️ Stack Tecnologico

| Layer | Tecnologia | Descrizione |
|---|---|---|
| **Piattaforma Desktop** | [Tauri 2](https://v2.tauri.app/) | Core leggero e sicuro in Rust, WebView nativa per consumi minimi di RAM. |
| **Backend & DB** | [Rust](https://www.rust-lang.org/) + [rusqlite](https://github.com/rusqlite/rusqlite) | Connessione SQLite embedded con **WAL mode**, indici ad alte prestazioni e FTS5. |
| **Frontend Framework** | [React 19](https://react.dev/) + [Vite](https://vite.dev/) | Rendering moderno, HMR istantaneo, architettura a componenti funzionali. |
| **Linguaggio** | [TypeScript 5/6](https://www.typescriptlang.org/) | Type-safety rigorosa condivisa tra frontend e contratti IPC Rust. |
| **Editor** | [TipTap 3](https://tiptap.dev/) | Editor estendibile headless basato su ProseMirror con supporto mention e task. |
| **Mappe & Grafi** | [@xyflow/react](https://reactflow.dev/) | Visualizzazione nodi e archi delle relazioni tra pagine. |
| **Drag & Drop** | [@dnd-kit](https://dndkit.com/) | Drag & drop accessibile e fluido per le board kanban e gli elementi riordinabili. |
| **Stile & Design** | Modern Vanilla CSS | Design system su misura con variabili CSS, supporto tema chiaro/scuro e layout fluido. |

---

## 📂 Struttura del Progetto

```text
nutnote/
├── src/                          # Frontend React + TypeScript
│   ├── assets/                   # Icone e risorse statiche
│   ├── components/
│   │   ├── admin/                # Pannelli di amministrazione e configurazione tipi
│   │   ├── chat/                 # Chat di progetto, mention list e messaggistica
│   │   ├── common/               # Modali (SearchModal Ctrl+K), conferme, badge
│   │   ├── layout/               # AppLayout, Sidebar, TopBar, Breadcrumb
│   │   ├── page/                 # Header pagina, editor TipTap, pannello relazioni
│   │   ├── settings/             # Gestione utenti e preferenze
│   │   └── views/                # TableView, KanbanView, ListView
│   ├── contexts/                 # UserContext (gestione utente attivo e switch)
│   ├── hooks/                    # Custom React Query hooks (usePages, useBlocks, ecc.)
│   ├── lib/                      # Wrapper API IPC Tauri (invoke) e definizioni tipi TS
│   ├── pages/                    # Schermate principali (Dashboard, Dettaglio, Liste, Grafi)
│   ├── App.tsx                   # Routing e provider React Query
│   ├── index.css                 # Design system, variabili CSS e temi (Dark/Light)
│   └── main.tsx                  # Bootstrap React
│
├── src-tauri/                    # Backend nativo Rust
│   ├── src/
│   │   ├── commands/             # Handler esposti al frontend (IPC)
│   │   │   ├── blocks.rs         # Salvataggio blocchi e sincro FTS5
│   │   │   ├── page_types.rs     # Gestione schemi e tipi pagina
│   │   │   ├── pages.rs          # CRUD pagine, closure table, priorità e visibilità
│   │   │   ├── relations.rs      # Gestione collegamenti bidirezionali tra pagine
│   │   │   ├── search.rs         # Query FTS5 con snippet e fallback
│   │   │   └── users.rs          # Gestione profili utente
│   │   ├── db.rs                 # Connessione SQLite, configurazione WAL e PRAGMA
│   │   ├── schema.rs             # Migrazioni DDL, trigger e seeding dei tipi built-in
│   │   └── main.rs               # Setup Tauri, registrazione comandi e stato DB
│   ├── Cargo.toml                # Dipendenze Rust (rusqlite, serde, uuid, tauri)
│   └── tauri.conf.json           # Configurazione finestra, permessi e bundle desktop
│
├── package.json                  # Script e dipendenze NPM
└── README.md                     # Documentazione del progetto
```

---

## ⚡ Prerequisiti

Prima di compilare o avviare il progetto, assicurati di avere installato:

1. **Node.js** (versione 20 LTS o superiore) e **npm**
2. **Rust & Cargo** (aggiornato all'ultima versione stabile via [rustup.rs](https://rustup.rs/)):
   ```bash
   rustup update
   ```
3. **Prerequisiti di sistema per Tauri**:
   - **Windows**: [C++ Build Tools di Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/) e WebView2 (solitamente già presente su Windows 10/11).
   - **Linux**: `libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `wget`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`.
   - **macOS**: Xcode Command Line Tools (`xcode-select --install`).

---

## 📦 Installazione e Avvio

### 1. Clona il repository
```bash
git clone <url-del-repository>
cd NutNote
```

### 2. Installa le dipendenze frontend
```bash
npm install
```

### 3. Avvia in modalità sviluppo (Desktop Tauri)
Questo comando avvierà contestualmente il dev server Vite e la finestra desktop nativa Tauri con Hot Reload sia per React che per Rust:
```bash
npm run tauri dev
```

### 4. Solo Frontend (Browser)
Se desideri visualizzare l'interfaccia nel browser web:
```bash
npm run dev
```

---

## 🔨 Build di Produzione

Per compilare l'eseguibile nativo ottimizzato con installer per la tua piattaforma:

```bash
npm run tauri build
```

I file generati (`.msi` o `.exe` su Windows, `.dmg` o `.app` su macOS, `.deb` o `.AppImage` su Linux) saranno disponibili nella directory:
```text
src-tauri/target/release/bundle/
```

---

## 💡 Scorciatoie da Tastiera & Funzionalità Rapide

- **`Ctrl + K`**: Apre la modale di ricerca full-text istantanea FTS5.
- **`/` (Slash command)**: Nell'editor a blocchi, inserisce rapidamente un nuovo tipo di blocco.
- **`@` nella Chat**: Menziona un utente del team.
- **Icona `⋮⋮` sui Blocchi**: Copia il link diretto da condividere o citare in chat.
- **Tema Chiaro / Scuro**: Clicca sull'icona sole/luna nella barra superiore per alternare il tema (memorizzato automaticamente).

---

## 🗺️ Roadmap & Sviluppi Futuri

- [x] Architettura Desktop Tauri 2 + SQLite WAL
- [x] Sistema di tipi gerarchico con Closure Table
- [x] Editor TipTap con blocchi avanzati e deep-linking
- [x] Multi-utente locale con note pubbliche/private
- [x] Chat collaborativa di progetto con menzioni
- [x] Ricerca Full-Text indicizzata FTS5
- [x] Mappa visuale a grafi delle relazioni
- [ ] Motore di sincronizzazione decentralizzato o su PostgreSQL remoto per team geograficamente distribuiti
- [ ] Esportazione avanzata in PDF/Markdown e importazione archivi Notion
- [ ] Form builder con generazione automatica di form di inserimento rapido

---

## 📄 Licenza

Distribuito sotto licenza proprietaria / aziendale interna. Tutti i diritti riservati.
