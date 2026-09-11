# Walkthrough: Gestione Utenti e Chat di Progetto

Ho completato con successo l'implementazione della gestione multi-utente e della chat di progetto su Nution. Ecco un riepilogo di tutte le nuove funzionalità e di come utilizzarle.

## 👥 Gestione Utenti

Abbiamo introdotto un sistema multi-utente per consentire a diverse persone di utilizzare Nution dallo stesso computer (e in futuro tramite server):

*   **Schermata di Accesso:** All'apertura dell'applicazione, se non c'è un utente attivo, appare una schermata `UserSelectPage` che ti chiede "Chi sta usando Nution?".
*   **Creazione Profili:** Da questa schermata, puoi cliccare su "Nuovo Profilo" per aggiungere nuovi utenti, assegnando a ciascuno un nome e un colore personalizzato per l'avatar.
*   **Stato dell'Utente Attivo:** L'ID dell'utente attualmente attivo viene mantenuto sia nel frontend (tramite `UserContext` e `localStorage`) sia nel backend in Rust (`DbState`), garantendo che tutte le azioni nel database siano automaticamente attribuite a chi sta utilizzando l'app.

## 🔒 Note Private (Visibilità)

L'utente può ora gestire la privacy delle proprie note:

*   **Nuovo Toggle di Visibilità:** All'interno della pagina (se sei il creatore della stessa), vedrai un nuovo pulsante accanto a "Stato" e "Priorità" per impostare la nota come **Privata** o **Pubblica**.
*   **Filtri di Sicurezza (Backend):** Nel database SQLite, abbiamo aggiunto la colonna `visibility`. Tutte le query (lettura pagine, caricamento gerarchie, ricerca FTS5) filtrano ora i risultati. Un utente vedrà solo le pagine pubbliche e quelle private di cui è lui stesso il creatore.

## 💬 Chat di Progetto e Menzioni

Per le entità di tipo **Progetto** o **Commessa**, abbiamo aggiunto uno spazio collaborativo:

*   **Pannello Chat:** Alla fine della pagina, appena prima dell'editor dei blocchi, apparirà una sezione "Chat di Progetto".
*   **Messaggistica in Tempo Reale:** Puoi inviare messaggi, che verranno salvati nel database con il tuo avatar e nome utente.
*   **Taggare gli Utenti (@):** Scrivendo `@` nell'area di testo, si aprirà un comodo menu a tendina per selezionare gli altri utenti registrati nel workspace, permettendoti di taggarli (il loro nome verrà evidenziato).

## 🔗 Deep Linking dei Blocchi

Abbiamo migliorato la navigazione all'interno dei documenti:

*   **Copia Link del Blocco:** Cliccando sull'icona delle opzioni di un blocco di testo (i 6 puntini `⋮⋮`), troverai ora la voce **Copia Link**. Questo genererà un deep link univoco (es. `nution://block/.../...`).
*   **Link Ipertestuali in Chat:** Quando incolli questo link nella Chat di Progetto, il sistema lo formatterà in automatico come un link cliccabile chiamato "Referenza al Blocco".
*   **Auto-Scroll:** Cliccando sul link dalla chat, l'applicazione aprirà la pagina corretta e scorrerà automaticamente fino al blocco evidenziandolo temporaneamente in grigio.

## Verifica effettuata

*   ✔️ Migrazione schema database (`pages` alterata e `chat_messages` creata).
*   ✔️ Backend Rust compilato senza errori.
*   ✔️ Frontend React compilato senza errori TypeScript.

> [!TIP]
> Prova ad aprire Nution, creare un paio di profili, e testare la chat all'interno di un progetto copiando e incollano un link a un blocco. Se desideri raffinare il design della chat o del selettore utente, fammi sapere!
