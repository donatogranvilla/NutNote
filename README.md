# NutNote 🥜

> Note e gestione documentale per l'ufficio: locali, tue, senza cloud di terzi.
> Desktop **Tauri 2** + **Rust** + **SQLite**, interfaccia **React 19** + **TypeScript**.

---

## Cos'è

NutNote nasce dall'idea di **Joplin** — le note stanno sul tuo disco, il dato è
tuo, nessun servizio esterno in mezzo — e la porta dove un blocco note si ferma:
una **gerarchia aziendale vera**.

Il paradigma è *"tutto è una pagina"*: clienti, progetti, commesse, note, wiki,
bug e attività condividono lo stesso editor a blocchi, ma hanno tipi, attributi
propri, relazioni bidirezionali e una struttura ad albero navigabile.

Rispetto a un blocco note tradizionale aggiunge la gerarchia e le relazioni;
rispetto a una suite in cloud toglie la dipendenza da Internet e da un fornitore.
Funziona **completamente offline**, oppure in **rete locale** con un PC che fa da
server per i colleghi.

---

## Caratteristiche

### Gerarchia aziendale e closure table
Struttura `Cliente → Progetto → Commessa → Note / Bug / Attività / File`.
La tabella `page_ancestors` materializza ogni coppia antenato-discendente: i
percorsi di navigazione e le interrogazioni su un intero sottoalbero sono una
singola query indicizzata, senza ricorsione. Ogni pagina mantiene il legame fino
al cliente radice (`root_client_id`).

### Tipi di pagina
Clienti, Progetti, Commesse, Note, Wiki, Bug, Attività, File & Allegati.
Ogni tipo porta con sé il proprio schema di proprietà, il flusso di stati
ammessi e le transizioni consentite.

### Editor a blocchi
Editor proprietario, costruito su elementi nativi per restare leggero. Il menu
rapido si apre digitando `/`.

| Blocchi di testo | Blocchi operativi | Blocchi avanzati |
|---|---|---|
| Titoli, paragrafi, elenchi | 📁 Cartella locale o di rete | 📊 Diagrammi Mermaid |
| Attività con spunta | 📅 Evento con data e luogo | 🧮 Tabelle calcolate con totali |
| Citazioni, richiami | 🔖 Segnalibro web | 🗄️ Viste dinamiche su altre pagine |
| Codice, immagini, separatori | 🔐 Cassaforte credenziali | |

Salvataggio automatico con ritardo, senza pulsanti da premere.

### Viste salvate
La configurazione di un elenco — tabella o kanban, filtri, ordinamento — si
salva con un nome e si riapplica con un clic. Le viste restano circoscritte al
tipo di pagina a cui appartengono.

### Riferimenti interni
Ogni blocco ha un indirizzo proprio (`nutnote://block/...`), copiabile dal
segnalino `⋮⋮`. Incollato in una nota o in chat diventa un collegamento che
mostra il titolo della pagina di destinazione e vi salta portando il blocco in
evidenza.

### Ricerca full-text
Indicizzazione **SQLite FTS5** su titoli, proprietà e contenuto dei blocchi, con
estratti evidenziati. Si richiama con `Ctrl + K`.

### Viste multiple e mappa relazionale
Tabella con colonne riordinabili, board kanban con trascinamento, e una mappa a
nodi (React Flow) per esplorare le dipendenze fra pagine.

### Multi-utente e note private
Selezione del profilo all'avvio. Ogni nota può essere pubblica o privata: quelle
private restano visibili al solo autore, e il filtro è applicato nelle query SQL,
non nell'interfaccia.

### Chat di progetto
Presente nelle pagine di tipo Progetto e Commessa, con menzioni `@` e anteprima
dei riferimenti ai blocchi.

### Aspetto personalizzabile
Pannello dedicato per tema (chiaro, scuro o quello di sistema), famiglia e
dimensione dei caratteri, corpo e interlinea dell'editor, larghezza della colonna
di lettura, carattere del codice, colore d'accento, arrotondamento degli angoli e
intensità degli effetti grafici.

I caratteri proposti sono tutti già presenti nel sistema operativo: nessun
webfont da scaricare. Il livello "effetti" permette di spegnere sfocature e
animazioni sulle postazioni più datate.

### Esportazione
Pagina singola in **Markdown**, **Word** e **PDF**; elenchi in **CSV** ed
**Excel**. Tutti i tipi di blocco vengono resi, comprese cartelle, eventi,
tabelle calcolate e diagrammi.

> Le credenziali del blocco Cassaforte **non** vengono esportate: nel documento
> compaiono oscurate. Dentro l'applicazione restano leggibili, ma un file
> esportato viaggia per posta e finisce su altri computer.

---

## Architettura

```
┌──────────────────── Interfaccia React ────────────────────┐
│                      src/lib/api.ts                       │
│        punto unico che decide locale o remoto             │
└───────────────┬───────────────────────┬───────────────────┘
                │ IPC Tauri             │ HTTP + X-NutNote-User
        ┌───────▼───────┐       ┌───────▼────────┐
        │  commands/*   │       │ server/routes  │
        └───────┬───────┘       └───────┬────────┘
                └───────┬───────────────┘
                 funzioni *_internal
                        │
                 ┌──────▼──────┐
                 │   SQLite    │  WAL · FTS5 · closure table
                 └─────────────┘
```

Comandi desktop e rotte HTTP sono due **adattatori sulla stessa logica**: ogni
operazione vive in una funzione `*_internal` e viene servita da entrambi, così le
due strade non possono divergere.

Sul desktop l'utente attivo è uno stato del processo. Sul server no — ogni
richiesta arriva da un client diverso — quindi l'identità viaggia per richiesta
nell'header `X-NutNote-User` ed è letta da un extractor che tiene distinti il
filtro di visibilità e l'autore di una scrittura.

### Modalità di funzionamento

| Modalità | Descrizione |
|---|---|
| **Locale** | Database sul computer o su una cartella di rete condivisa |
| **Server** | Un PC espone l'archivio sulla porta 9700 per i colleghi |
| **Remota** | Il client parla con un server NutNote in rete locale |

---

## Stack tecnologico

| Livello | Tecnologia |
|---|---|
| Piattaforma desktop | Tauri 2.11 (WebView nativa, consumi ridotti) |
| Backend e database | Rust + rusqlite 0.40 — SQLite integrato, WAL, FTS5 |
| Server di rete | axum 0.8 + tokio |
| Interfaccia | React 19, TypeScript 6, Vite 8 |
| Stato server | TanStack React Query 5 |
| Grafi e trascinamento | @xyflow/react, @dnd-kit |
| Diagrammi | Mermaid, caricato solo alla prima apertura di un diagramma |
| Stile | CSS con variabili, senza framework |

---

## Struttura del progetto

```text
nutnote/
├── src/                              # Interfaccia React
│   ├── components/
│   │   ├── admin/                    # Gestione utenti e team
│   │   ├── chat/                     # Chat di progetto con menzioni
│   │   ├── common/                   # Confini di errore e componenti condivisi
│   │   ├── layout/                   # Struttura, barra laterale, barra superiore, ricerca
│   │   ├── page/                     # Editor a blocchi, proprietà, relazioni, cronologia
│   │   ├── settings/                 # Pannello Aspetto e configurazione rete/server
│   │   └── views/                    # Tabella, kanban, barra delle viste salvate
│   ├── contexts/                     # Utente attivo, preferenze di aspetto
│   ├── hooks/                        # Hook React Query (pagine, blocchi, relazioni)
│   ├── lib/
│   │   ├── api.ts                    # Unico punto di accesso ai dati, locale o remoto
│   │   ├── aspetto.ts                # Preferenze di aspetto applicate ai token CSS
│   │   ├── copertine.ts              # Copertine come sfumature, senza rete
│   │   ├── deepLink.ts               # Grammatica dei riferimenti nutnote://
│   │   ├── emoji.ts                  # Catalogo icone con ricerca in italiano
│   │   ├── export.ts                 # Markdown, Word, PDF, CSV, Excel
│   │   └── tauriMock.ts              # Backend finto per lo sviluppo in browser
│   ├── pages/                        # Dashboard, dettaglio, elenchi, mappa
│   └── index.css                     # Design system: token, temi, livelli
│
├── src-tauri/                        # Backend Rust
│   ├── src/
│   │   ├── commands/                 # Operazioni esposte via IPC
│   │   │   ├── pages.rs              # Pagine, closure table, visibilità
│   │   │   ├── blocks.rs             # Blocchi e sincronizzazione FTS5
│   │   │   ├── views.rs              # Viste salvate
│   │   │   ├── relations.rs          # Collegamenti bidirezionali
│   │   │   ├── changelog.rs          # Cronologia e ripristino dei campi
│   │   │   └── ...                   # Tipi, ricerca, utenti, team, chat, file
│   │   ├── server/
│   │   │   ├── routes.rs             # API HTTP per la rete locale
│   │   │   └── identity.rs           # Identità della richiesta
│   │   ├── schema.rs                 # Migrazioni, trigger, dati iniziali
│   │   └── db.rs                     # Connessione SQLite e PRAGMA
│   ├── capabilities/                 # Permessi concessi all'interfaccia
│   └── tauri.conf.json               # Finestra e pacchetti di installazione
│
└── .claude/launch.json               # Avvio del server di sviluppo
```

---

## Prerequisiti

1. **Node.js** 20 LTS o superiore
2. **Rust** stabile aggiornato (`rustup update`)
3. Requisiti di sistema per Tauri:
   - **Windows**: [Build Tools C++ di Visual Studio](https://visualstudio.microsoft.com/visual-cpp-build-tools/) e WebView2 (già presente su Windows 10/11)
   - **Linux**: `libwebkit2gtk-4.1-dev`, `build-essential`, `curl`, `wget`, `libssl-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`
   - **macOS**: `xcode-select --install`

---

## Avvio

```bash
npm install
```

Applicazione desktop completa, con ricarica a caldo di React e Rust:

```bash
npm run tauri dev
```

Sola interfaccia nel browser, con backend simulato (`tauriMock`) — utile per
lavorare sulla grafica senza compilare Rust:

```bash
npm run dev
```

### Compilazione

```bash
npm run tauri build
```

Produce l'eseguibile e i pacchetti di installazione in
`src-tauri/target/release/` e `src-tauri/target/release/bundle/`.

### Test

```bash
cd src-tauri && cargo test
```

---

## Uso in rete locale

Sul computer che fa da server: **Impostazioni & Server → Server Integrato →
Avvia**. Il servizio ascolta sulla porta `9700`; al primo avvio Windows chiederà
di autorizzare il firewall, va concesso per la rete **privata**.

Sugli altri computer: **Connetti a Remoto**, indicando `http://INDIRIZZO:9700`.
L'indirizzo è mostrato nella schermata del server.

---

## Scorciatoie

| Comando | Azione |
|---|---|
| `Ctrl + K` | Ricerca full-text istantanea |
| `/` | Menu rapido di inserimento blocchi |
| `@` | Menzione di un collega in chat |
| `⋮⋮` | Copia il riferimento diretto al blocco |

---

## Sicurezza: cosa aspettarsi

NutNote è pensato per l'**uso interno a un ufficio, su rete fidata**. Alcune
scelte sono deliberate e vanno conosciute prima di adottarlo:

- Le password dei profili sono conservate in chiaro nel database. Servono a
  distinguere i colleghi, non a proteggere da un attaccante.
- Il server di rete locale non richiede autenticazione: chi raggiunge la porta
  9700 accede all'archivio.
- Il blocco Cassaforte conserva le credenziali in chiaro, ma non le esporta.

**Non esporre il server su Internet.** Per uno scenario diverso da una rete
d'ufficio fidata servirebbe aggiungere autenticazione e cifratura.

---

## Stato dello sviluppo

- [x] Architettura desktop Tauri 2 + SQLite in modalità WAL
- [x] Gerarchia con closure table e tipi di pagina personalizzabili
- [x] Editor a blocchi con blocchi operativi e avanzati
- [x] Ricerca full-text FTS5
- [x] Mappa relazionale a nodi
- [x] Multi-utente con note pubbliche e private
- [x] Chat di progetto con menzioni
- [x] Server per rete locale con identità per richiesta
- [x] Esportazione in Markdown, Word, PDF, CSV ed Excel
- [x] Personalizzazione dell'aspetto
- [x] Viste salvate per tipo di pagina
- [x] Riferimenti interni risolti in tutta l'applicazione
- [ ] Moduli di inserimento rapido configurabili (tabella `forms` predisposta)
- [ ] Sincronizzazione fra sedi distinte
- [ ] Importazione di archivi da altri strumenti

---

## Licenza

Software proprietario a uso aziendale interno. Tutti i diritti riservati.
