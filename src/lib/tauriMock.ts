/**
 * Tauri Mock Bridge for Browser / Test Mode
 * Allows the entire application to run and be tested in a standard browser (Vite dev server)
 * without throwing "window.__TAURI_INTERNALS__ is undefined" errors.
 */

interface MockState {
  users: any[];
  teams: any[];
  activeUserId: string | null;
  config: any;
  serverStatus: {
    isRunning: boolean;
    port: number;
    localIps: string[];
  };
  pages: any[];
  pageTypes: any[];
  blocks: Record<string, any[]>;
  chatMessages: Record<string, any[]>;
  relations: any[];
}

const STORAGE_KEY = 'nutnote_browser_mock_state_v4';

function getDefaultState(): MockState {
  return {
    activeUserId: null,
    teams: [
      {
        id: 'team-dev',
        name: 'Sviluppo Software',
        description: 'Team di ingegneria, frontend e backend',
        color: '#4263eb',
        memberCount: 1,
        createdAt: new Date().toISOString(),
      },
      {
        id: 'team-design',
        name: 'Design & UI/UX',
        description: 'Team di product design e user experience',
        color: '#e67700',
        memberCount: 1,
        createdAt: new Date().toISOString(),
      },
    ],
    users: [
      {
        id: 'user-admin',
        displayName: 'Amministratore Dev',
        avatarColor: '#4263eb',
        role: 'admin',
        password: 'admin',
        teamId: 'team-dev',
        teamName: 'Sviluppo Software',
        teamColor: '#4263eb',
        createdAt: new Date().toISOString(),
      },
      {
        id: 'user-mario',
        displayName: 'Mario Rossi',
        avatarColor: '#2b8a3e',
        role: 'user',
        password: '1234',
        teamId: 'team-design',
        teamName: 'Design & UI/UX',
        teamColor: '#e67700',
        createdAt: new Date().toISOString(),
      },
    ],
    config: {
      serverMode: 'standalone',
      serverIp: '127.0.0.1',
      serverPort: 9700,
      dbPath: 'nutnote.db',
    },
    serverStatus: {
      isRunning: false,
      port: 9700,
      localIps: ['192.168.1.150', '10.0.0.12'],
    },
    pageTypes: [
      { id: 'client', name: 'client', label: 'Cliente', labelPlural: 'Clienti', icon: 'Users', color: '#1971c2', isHierarchical: true },
      { id: 'project', name: 'project', label: 'Progetto', labelPlural: 'Progetti', icon: 'FolderOpen', color: '#f59f00', isHierarchical: true },
      { id: 'commessa', name: 'commessa', label: 'Commessa', labelPlural: 'Commesse', icon: 'Briefcase', color: '#ae3ec9', isHierarchical: true },
      { id: 'note', name: 'note', label: 'Nota', labelPlural: 'Note', icon: 'FileText', color: '#1098ad', isHierarchical: false },
      { id: 'wiki', name: 'wiki', label: 'Wiki', labelPlural: 'Wiki Docs', icon: 'BookOpen', color: '#7048e8', isHierarchical: true },
      { id: 'bug', name: 'bug', label: 'Bug', labelPlural: 'Bug Tracker', icon: 'Bug', color: '#e03131', isHierarchical: false },
      { id: 'todo', name: 'todo', label: 'Task', labelPlural: 'Todo List', icon: 'CheckSquare', color: '#2f9e44', isHierarchical: false },
      { id: 'file', name: 'file', label: 'File', labelPlural: 'File & Allegati', icon: 'Paperclip', color: '#495057', isHierarchical: false },
    ],
    pages: [
      // Mock client & project
      {
        id: 'page-client-1',
        typeId: 'client',
        parentId: null,
        title: 'Acme Corporation SpA',
        icon: '🏢',
        priority: 'high',
        status: 'active',
        visibility: 'public',
        isPinned: true,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { code: 'ACM-2026', email: 'contact@acme.corp', referent: 'Ing. Giovanni Bianchi' },
      },
      {
        id: 'page-project-1',
        typeId: 'project',
        parentId: 'page-client-1',
        rootClientId: 'page-client-1',
        title: 'Nuova Piattaforma E-commerce B2B',
        icon: '🚀',
        priority: 'urgent',
        status: 'in_progress',
        visibility: 'public',
        isPinned: true,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { budget: 45000, startDate: '2026-03-01', dueDate: '2026-09-30' },
      },
      {
        id: 'page-commessa-1',
        typeId: 'commessa',
        parentId: 'page-project-1',
        rootClientId: 'page-client-1',
        title: 'Sviluppo Modulo Checkout & Gateway Pagamenti',
        icon: '💼',
        priority: 'high',
        status: 'working',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { code: 'COM-01', amount: 15000 },
      },
      {
        id: 'page-note-1',
        typeId: 'note',
        parentId: 'page-project-1',
        rootClientId: 'page-client-1',
        title: 'Verbale Kick-off Meeting Acme',
        icon: '📝',
        priority: 'none',
        status: 'published',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { category: 'Riunione' },
      },
      {
        id: 'page-bug-1',
        typeId: 'bug',
        parentId: 'page-commessa-1',
        rootClientId: 'page-client-1',
        title: 'Mancata ricezione webhook Stripe su checkout multi-valuta',
        icon: '🐛',
        priority: 'urgent',
        status: 'open',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { severity: 'Bloccante', environment: 'Staging' },
      },
      {
        id: 'page-todo-1',
        typeId: 'todo',
        parentId: 'page-commessa-1',
        rootClientId: 'page-client-1',
        title: 'Implementazione tokenizzazione carte di credito',
        icon: '✅',
        priority: 'high',
        status: 'in_progress',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { estimatedHours: 24 },
      },

      // ── WIKI HUB & 9 CAPITOLI MONOGRAFICI ──
      {
        id: 'wiki-hub',
        typeId: 'wiki',
        parentId: null,
        title: 'NutNote Documentation Hub & Manuale Ufficiale',
        icon: '📚',
        priority: 'none',
        status: 'published',
        visibility: 'public',
        isPinned: true,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { section: 'Generale', category: 'Documentazione', version: '2.4.0' },
      },
      {
        id: 'wiki-ch1-architettura',
        typeId: 'wiki',
        parentId: 'wiki-hub',
        title: "Capitolo 1: Architettura di Sistema & Modello 'Everything is a Page'",
        icon: '🏛️',
        priority: 'none',
        status: 'verified',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { section: 'Capitolo 1', difficulty: 'Fondamentale', reading_time: '8 min' },
      },
      {
        id: 'wiki-ch2-editor',
        typeId: 'wiki',
        parentId: 'wiki-hub',
        title: 'Capitolo 2: Editor a Blocchi, Formattazione Avanzata & Comandi Rapidi',
        icon: '✍️',
        priority: 'none',
        status: 'verified',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { section: 'Capitolo 2', difficulty: 'Base', reading_time: '10 min' },
      },
      {
        id: 'wiki-ch3-relazioni',
        typeId: 'wiki',
        parentId: 'wiki-hub',
        title: 'Capitolo 3: Relazioni Intelligenti, Backlink & Mappa a Nuvola',
        icon: '🔗',
        priority: 'none',
        status: 'verified',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { section: 'Capitolo 3', difficulty: 'Avanzato', reading_time: '9 min' },
      },
      {
        id: 'wiki-ch4-database-viste',
        typeId: 'wiki',
        parentId: 'wiki-hub',
        title: 'Capitolo 4: Viste Database, Tabelle, Kanban & Ricerca FTS5',
        icon: '📊',
        priority: 'none',
        status: 'verified',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { section: 'Capitolo 4', difficulty: 'Base', reading_time: '8 min' },
      },
      {
        id: 'wiki-ch5-collaborazione',
        typeId: 'wiki',
        parentId: 'wiki-hub',
        title: 'Capitolo 5: Collaborazione, Gestione Team, Ruoli & Chat Contestuale',
        icon: '👥',
        priority: 'none',
        status: 'verified',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { section: 'Capitolo 5', difficulty: 'Intermedio', reading_time: '7 min' },
      },
      {
        id: 'wiki-ch6-networking-lan',
        typeId: 'wiki',
        parentId: 'wiki-hub',
        title: 'Capitolo 6: Networking, Server LAN Condiviso & Sincronizzazione',
        icon: '🌐',
        priority: 'none',
        status: 'verified',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { section: 'Capitolo 6', difficulty: 'Avanzato', reading_time: '11 min' },
      },
      {
        id: 'wiki-ch7-export-backup',
        typeId: 'wiki',
        parentId: 'wiki-hub',
        title: 'Capitolo 7: Esportazione Documenti, Backup Database & Sicurezza',
        icon: '💾',
        priority: 'none',
        status: 'verified',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { section: 'Capitolo 7', difficulty: 'Intermedio', reading_time: '8 min' },
      },
      {
        id: 'wiki-ch8-casi-uso',
        typeId: 'wiki',
        parentId: 'wiki-hub',
        title: 'Capitolo 8: Casi d\'Uso Reali & Workflow Operativi Aziendali',
        icon: '💼',
        priority: 'none',
        status: 'verified',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { section: 'Capitolo 8', difficulty: 'Pratico', reading_time: '12 min' },
      },
      {
        id: 'wiki-ch9-faq-riferimento',
        typeId: 'wiki',
        parentId: 'wiki-hub',
        title: 'Capitolo 9: Guida di Riferimento Rapido, Shortcut da Tastiera & FAQ',
        icon: '⚡',
        priority: 'none',
        status: 'verified',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { section: 'Capitolo 9', difficulty: 'Base', reading_time: '6 min' },
      },

      // Guide Internazionali
      {
        id: 'wiki-guide-en',
        typeId: 'wiki',
        parentId: 'wiki-hub',
        title: 'NutNote Complete User Guide (English)',
        icon: '🇬🇧',
        priority: 'none',
        status: 'verified',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { section: 'English', language: 'en' },
      },
      {
        id: 'wiki-guide-es',
        typeId: 'wiki',
        parentId: 'wiki-hub',
        title: 'Guía Completa de Usuario de NutNote (Español)',
        icon: '🇪🇸',
        priority: 'none',
        status: 'verified',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { section: 'Español', language: 'es' },
      },
      {
        id: 'wiki-guide-fr',
        typeId: 'wiki',
        parentId: 'wiki-hub',
        title: "Guide Complet d'Utilisation NutNote (Français)",
        icon: '🇫🇷',
        priority: 'none',
        status: 'verified',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { section: 'Français', language: 'fr' },
      },
      {
        id: 'wiki-guide-de',
        typeId: 'wiki',
        parentId: 'wiki-hub',
        title: 'NutNote Benutzerhandbuch - Vollständige Anleitung (Deutsch)',
        icon: '🇩🇪',
        priority: 'none',
        status: 'verified',
        visibility: 'public',
        isPinned: false,
        createdBy: 'user-admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        properties: { section: 'Deutsch', language: 'de' },
      },
    ],
    relations: [
      {
        id: 'rel-mock-1',
        sourceId: 'page-note-1',
        targetId: 'page-project-1',
        relationType: 'related',
        description: 'Verbale approvato durante il kick-off del progetto',
      },
      // Hub -> Capitoli
      { id: 'rel-hub-ch1', sourceId: 'wiki-hub', targetId: 'wiki-ch1-architettura', relationType: 'reference', description: 'Capitolo 1: Architettura di Sistema' },
      { id: 'rel-hub-ch2', sourceId: 'wiki-hub', targetId: 'wiki-ch2-editor', relationType: 'reference', description: 'Capitolo 2: Editor a Blocchi' },
      { id: 'rel-hub-ch3', sourceId: 'wiki-hub', targetId: 'wiki-ch3-relazioni', relationType: 'reference', description: 'Capitolo 3: Relazioni Intelligenti' },
      { id: 'rel-hub-ch4', sourceId: 'wiki-hub', targetId: 'wiki-ch4-database-viste', relationType: 'reference', description: 'Capitolo 4: Viste Database' },
      { id: 'rel-hub-ch5', sourceId: 'wiki-hub', targetId: 'wiki-ch5-collaborazione', relationType: 'reference', description: 'Capitolo 5: Collaborazione e Team' },
      { id: 'rel-hub-ch6', sourceId: 'wiki-hub', targetId: 'wiki-ch6-networking-lan', relationType: 'reference', description: 'Capitolo 6: Networking e Server LAN' },
      { id: 'rel-hub-ch7', sourceId: 'wiki-hub', targetId: 'wiki-ch7-export-backup', relationType: 'reference', description: 'Capitolo 7: Esportazione e Backup' },
      { id: 'rel-hub-ch8', sourceId: 'wiki-hub', targetId: 'wiki-ch8-casi-uso', relationType: 'reference', description: 'Capitolo 8: Casi d\'Uso Aziendali' },
      { id: 'rel-hub-ch9', sourceId: 'wiki-hub', targetId: 'wiki-ch9-faq-riferimento', relationType: 'reference', description: 'Capitolo 9: Riferimento Rapido e FAQ' },
      // Sequenza Capitoli
      { id: 'rel-seq-ch1-ch2', sourceId: 'wiki-ch1-architettura', targetId: 'wiki-ch2-editor', relationType: 'reference', description: 'Capitolo Successivo: Editor a Blocchi' },
      { id: 'rel-seq-ch2-ch3', sourceId: 'wiki-ch2-editor', targetId: 'wiki-ch3-relazioni', relationType: 'reference', description: 'Capitolo Successivo: Relazioni Intelligenti' },
      { id: 'rel-seq-ch3-ch4', sourceId: 'wiki-ch3-relazioni', targetId: 'wiki-ch4-database-viste', relationType: 'reference', description: 'Capitolo Successivo: Viste Database' },
      { id: 'rel-seq-ch4-ch5', sourceId: 'wiki-ch4-database-viste', targetId: 'wiki-ch5-collaborazione', relationType: 'reference', description: 'Capitolo Successivo: Collaborazione e Team' },
      { id: 'rel-seq-ch5-ch6', sourceId: 'wiki-ch5-collaborazione', targetId: 'wiki-ch6-networking-lan', relationType: 'reference', description: 'Capitolo Successivo: Networking e Server LAN' },
      { id: 'rel-seq-ch6-ch7', sourceId: 'wiki-ch6-networking-lan', targetId: 'wiki-ch7-export-backup', relationType: 'reference', description: 'Capitolo Successivo: Esportazione e Backup' },
      { id: 'rel-seq-ch7-ch8', sourceId: 'wiki-ch7-export-backup', targetId: 'wiki-ch8-casi-uso', relationType: 'reference', description: 'Capitolo Successivo: Casi d\'Uso Aziendali' },
      { id: 'rel-seq-ch8-ch9', sourceId: 'wiki-ch8-casi-uso', targetId: 'wiki-ch9-faq-riferimento', relationType: 'reference', description: 'Capitolo Successivo: Riferimento Rapido e FAQ' },
      // Hub -> Guide Internazionali
      { id: 'rel-hub-en', sourceId: 'wiki-hub', targetId: 'wiki-guide-en', relationType: 'reference', description: 'English User Guide' },
      { id: 'rel-hub-es', sourceId: 'wiki-hub', targetId: 'wiki-guide-es', relationType: 'reference', description: 'Guía en Español' },
      { id: 'rel-hub-fr', sourceId: 'wiki-hub', targetId: 'wiki-guide-fr', relationType: 'reference', description: 'Guide en Français' },
      { id: 'rel-hub-de', sourceId: 'wiki-hub', targetId: 'wiki-guide-de', relationType: 'reference', description: 'Deutsches Handbuch' },
    ],
    blocks: {
      'wiki-hub': [
        { id: 'b-h1', type: 'heading', content: { attrs: { level: 1 }, content: [{ type: 'text', text: 'NutNote Documentation Hub & Manuale Ufficiale' }] }, position: 0 },
        { id: 'b-h2', type: 'paragraph', content: { content: [{ type: 'text', text: 'Benvenuto nel centro di documentazione e manuale operativo ufficiale di NutNote. NutNote è una suite modulare avanzata pensata per studi professionali e aziende, basata sul paradigma unificante \'Everything is a Page\'.' }] }, position: 1 },
        { id: 'b-h3', type: 'callout', content: { attrs: { calloutIcon: '🚀' }, text: 'La presente Wiki è strutturata in 9 capitoli monografici completi che coprono l\'intero ciclo di vita applicativo: dall\'architettura del dato, all\'editor a blocchi, alle relazioni semantiche fino al networking LAN e al disaster recovery.' }, position: 2 },
        { id: 'b-h4', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: 'Indice Completo dei Capitoli' }] }, position: 3 },
        { id: 'b-h5', type: 'bulletList', content: { content: [{ type: 'text', text: '🏛️ Capitolo 1: Architettura di Sistema & Modello \'Everything is a Page\' (ID: wiki-ch1-architettura)' }] }, position: 4 },
        { id: 'b-h6', type: 'bulletList', content: { content: [{ type: 'text', text: '✍️ Capitolo 2: Editor a Blocchi, Formattazione Avanzata & Comandi Rapidi (ID: wiki-ch2-editor)' }] }, position: 5 },
        { id: 'b-h7', type: 'bulletList', content: { content: [{ type: 'text', text: '🔗 Capitolo 3: Relazioni Intelligenti, Backlink & Mappa a Nuvola (ID: wiki-ch3-relazioni)' }] }, position: 6 },
        { id: 'b-h8', type: 'bulletList', content: { content: [{ type: 'text', text: '📊 Capitolo 4: Viste Database, Tabelle, Kanban & Ricerca FTS5 (ID: wiki-ch4-database-viste)' }] }, position: 7 },
        { id: 'b-h9', type: 'bulletList', content: { content: [{ type: 'text', text: '👥 Capitolo 5: Collaborazione, Gestione Team, Ruoli & Chat Contestuale (ID: wiki-ch5-collaborazione)' }] }, position: 8 },
        { id: 'b-h10', type: 'bulletList', content: { content: [{ type: 'text', text: '🌐 Capitolo 6: Networking, Server LAN Condiviso & Sincronizzazione (ID: wiki-ch6-networking-lan)' }] }, position: 9 },
        { id: 'b-h11', type: 'bulletList', content: { content: [{ type: 'text', text: '💾 Capitolo 7: Esportazione Documenti, Backup Database & Sicurezza (ID: wiki-ch7-export-backup)' }] }, position: 10 },
        { id: 'b-h12', type: 'bulletList', content: { content: [{ type: 'text', text: '💼 Capitolo 8: Casi d\'Uso Reali & Workflow Operativi Aziendali (ID: wiki-ch8-casi-uso)' }] }, position: 11 },
        { id: 'b-h13', type: 'bulletList', content: { content: [{ type: 'text', text: '⚡ Capitolo 9: Guida di Riferimento Rapido, Shortcut da Tastiera & FAQ (ID: wiki-ch9-faq-riferimento)' }] }, position: 12 },
        { id: 'b-h14', type: 'divider', content: {}, position: 13 },
        { id: 'b-h15', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: 'Percorsi di Lettura Consigliati per Ruolo' }] }, position: 14 },
        { id: 'b-h16', type: 'paragraph', content: { content: [{ type: 'text', text: 'A seconda delle tue responsabilità all\'interno del team, ti consigliamo di consultare prioritariamente:' }] }, position: 15 },
        { id: 'b-h17', type: 'taskList', content: { attrs: { checked: true }, content: [{ type: 'text', text: 'Project Manager: Capitoli 1, 3, 4, 5, 8 (Pianificazione, Kanban, Stati, Relazioni e Clienti)' }] }, position: 16 },
        { id: 'b-h18', type: 'taskList', content: { attrs: { checked: true }, content: [{ type: 'text', text: 'Sviluppatori & Tech Lead: Capitoli 1, 2, 6, 7, 9 (Architettura dati, Blocchi di codice, Server LAN, SQLite WAL)' }] }, position: 17 },
        { id: 'b-h19', type: 'taskList', content: { attrs: { checked: true }, content: [{ type: 'text', text: 'Product Designer & UI/UX: Capitoli 2, 3, 4 (Editor visuale, Mappa a nuvola, Board kanban)' }] }, position: 18 },
        { id: 'b-h20', type: 'taskList', content: { attrs: { checked: true }, content: [{ type: 'text', text: 'Amministratori di Sistema: Capitoli 6, 7 (Porta 9700, configurazione firewall, backup a caldo)' }] }, position: 19 },
        { id: 'b-h21', type: 'divider', content: {}, position: 20 },
        { id: 'b-h22', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: 'Guide Rapide Internazionali (Quick Start)' }] }, position: 21 },
        { id: 'b-h23', type: 'bulletList', content: { content: [{ type: 'text', text: '🇬🇧 English: NutNote Complete User Guide (ID: wiki-guide-en)' }] }, position: 22 },
        { id: 'b-h24', type: 'bulletList', content: { content: [{ type: 'text', text: '🇪🇸 Español: Guía Completa de Usuario de NutNote (ID: wiki-guide-es)' }] }, position: 23 },
        { id: 'b-h25', type: 'bulletList', content: { content: [{ type: 'text', text: '🇫🇷 Français: Guide Complet d\'Utilisation NutNote (ID: wiki-guide-fr)' }] }, position: 24 },
        { id: 'b-h26', type: 'bulletList', content: { content: [{ type: 'text', text: '🇩🇪 Deutsch: NutNote Benutzerhandbuch (ID: wiki-guide-de)' }] }, position: 25 },
      ],

      'wiki-ch1-architettura': [
        { id: 'b-c1-1', type: 'heading', content: { attrs: { level: 1 }, content: [{ type: 'text', text: 'Capitolo 1: Architettura di Sistema & Modello \'Everything is a Page\'' }] }, position: 0 },
        { id: 'b-c1-2', type: 'paragraph', content: { content: [{ type: 'text', text: 'Il cardine architetturale di NutNote risiede nel principio \'Everything is a Page\'. A differenza dei sistemi gestionali monolitici tradizionali, dove clienti, progetti e task risiedono in schemi relazionali rigidi e separati, in NutNote ogni singola entità è un\'istanza polimorfica di Page.' }] }, position: 1 },
        { id: 'b-c1-3', type: 'callout', content: { attrs: { calloutIcon: '💡' }, text: 'La filosofia \'Everything is a Page\' permette a qualsiasi elemento di avere contenuti a blocchi, sotto-pagine gerarchiche, allegati multimediali, discussioni contestuali e relazioni trasversali senza eccezioni.' }, position: 2 },
        { id: 'b-c1-4', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '1.1 La Tabella Pagine e il Dynamic Typing' }] }, position: 3 },
        { id: 'b-c1-5', type: 'paragraph', content: { content: [{ type: 'text', text: 'Nel database SQLite, tutte le entità risiedono nella tabella primaria \'pages\', arricchita da un discriminatore \'type_id\' collegato a \'page_types\':' }] }, position: 4 },
        { id: 'b-c1-6', type: 'codeBlock', content: { attrs: { language: 'sql' }, content: [{ type: 'text', text: 'CREATE TABLE pages (\n    id              TEXT PRIMARY KEY,\n    type_id         TEXT NOT NULL REFERENCES page_types(id),\n    parent_id       TEXT REFERENCES pages(id) ON DELETE CASCADE,\n    title           TEXT NOT NULL,\n    icon            TEXT,\n    cover_url       TEXT,\n    properties      TEXT NOT NULL DEFAULT \'{}\',\n    priority        TEXT NOT NULL DEFAULT \'none\',\n    status          TEXT NOT NULL DEFAULT \'active\',\n    position        INTEGER NOT NULL DEFAULT 0,\n    is_pinned       INTEGER NOT NULL DEFAULT 0,\n    is_archived     INTEGER NOT NULL DEFAULT 0,\n    root_client_id  TEXT,\n    version         INTEGER NOT NULL DEFAULT 1,\n    created_at      TEXT NOT NULL DEFAULT (datetime(\'now\')),\n    updated_at      TEXT NOT NULL DEFAULT (datetime(\'now\'))\n);' }] }, position: 5 },
        { id: 'b-c1-7', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '1.2 Gerarchia ad Albero e Calcolo degli Antenati' }] }, position: 6 },
        { id: 'b-c1-8', type: 'paragraph', content: { content: [{ type: 'text', text: 'Le pagine formano un grafo ad albero naturale. Per garantire query istantanee anche con alberature a profondità elevata, NutNote mantiene sincronizzata la closure transitiva \'page_ancestors\':' }] }, position: 7 },
        { id: 'b-c1-9', type: 'bulletList', content: { content: [{ type: 'text', text: 'Depth 0: ogni pagina è antenata di se stessa (self-reference).' }] }, position: 8 },
        { id: 'b-c1-10', type: 'bulletList', content: { content: [{ type: 'text', text: 'Depth 1: il parent diretto.' }] }, position: 9 },
        { id: 'b-c1-11', type: 'bulletList', content: { content: [{ type: 'text', text: 'Depth N: tutti gli avi fino alla radice dell\'albero.' }] }, position: 10 },
        { id: 'b-c1-12', type: 'paragraph', content: { content: [{ type: 'text', text: 'Grazie a questa tabella, per estrarre tutti i task o bug appartenenti a un cliente o a un progetto occorre una singola istruzione SQL con JOIN indicizzata, senza ricorsione runtime.' }] }, position: 11 },
        { id: 'b-c1-13', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '1.3 Ereditarietà del Root Client ID' }] }, position: 12 },
        { id: 'b-c1-14', type: 'paragraph', content: { content: [{ type: 'text', text: 'Quando una pagina viene creata come figlia di un\'altra pagina (ad esempio un Task dentro un Progetto), NutNote propaga automaticamente il \'root_client_id\' dell\'antenato cliente radice.' }] }, position: 13 },
        { id: 'b-c1-15', type: 'callout', content: { attrs: { calloutIcon: '🔒' }, text: 'L\'isolamento via root_client_id è fondamentale per il selettore intelligente di relazioni: quando colleghi una pagina, il sistema ti propone prioritariamente le risorse dello stesso cliente.' }, position: 14 },
        { id: 'b-c1-16', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '1.4 Schema Registry delle Proprietà' }] }, position: 15 },
        { id: 'b-c1-17', type: 'paragraph', content: { content: [{ type: 'text', text: 'Ogni PageType definisce un JSON \'properties_schema\'. Le proprietà supportano tipizzazioni forti: text, number, date, select, email, phone.' }] }, position: 16 },
        { id: 'b-c1-18', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '1.5 Macchina a Stati (Status Flow) e Priorità' }] }, position: 17 },
        { id: 'b-c1-19', type: 'paragraph', content: { content: [{ type: 'text', text: 'Ogni entità attraversa un ciclo di vita definito in \'status_flow\'. Ad esempio: Wiki (Bozza ➔ Verificata ➔ Obsoleta); Bug (Aperto ➔ In Analisi ➔ In Risoluzione ➔ Risolto ➔ Chiuso).' }] }, position: 18 },
        { id: 'b-c1-20', type: 'blockquote', content: { content: [{ type: 'text', text: 'La convergenza tra tipizzazione universale e proprietà dinamiche garantisce l\'assoluta coerenza dei dati preservando la massima libertà operativa.' }] }, position: 19 },
        { id: 'b-c1-21', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '1.6 Modalità Libro & Navigazione Sequenziale tra Note (Wiki & Manuali)' }] }, position: 20 },
        { id: 'b-c1-22', type: 'paragraph', content: { content: [{ type: 'text', text: 'NutNote include la Navigazione Sequenziale Automatica tra note e sotto-pagine: quando una pagina contiene sotto-pagine (capitoli o sezioni di una procedura), il sistema genera automaticamente in fondo alla pagina i pulsanti di navigazione a libro: [◀ Capitolo Precedente], [Indice Raccolta] per risalire alla pagina madre, e [Capitolo Successivo ▶], corredati dal contatore \'Capitolo X di N\'.' }] }, position: 21 },
        { id: 'b-c1-23', type: 'callout', content: { attrs: { calloutIcon: '📖' }, text: 'Non occorre creare manualmente link o configurare plugin: basta organizzare le note sotto una pagina genitore e l\'esperienza sfogliabile stile wiki/libro si attiva istantaneamente.' }, position: 22 },
      ],

      'wiki-ch2-editor': [
        { id: 'b-c2-1', type: 'heading', content: { attrs: { level: 1 }, content: [{ type: 'text', text: 'Capitolo 2: Editor a Blocchi, Formattazione Avanzata & Comandi Rapidi' }] }, position: 0 },
        { id: 'b-c2-2', type: 'paragraph', content: { content: [{ type: 'text', text: 'L\'editor a blocchi centrale costituisce il cuore dell\'esperienza di scrittura di NutNote. Basato sul motore TipTap e ProseMirror, l\'editor converte ogni paragrafo, titolo, to-do list o snippet di codice in un nodo atomico interattivo e riordinabile.' }] }, position: 1 },
        { id: 'b-c2-3', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '2.1 Catalogo dei Blocchi Supportati' }] }, position: 2 },
        { id: 'b-c2-4', type: 'bulletList', content: { content: [{ type: 'text', text: 'Titoli Gerarchici (H1, H2, H3): definiscono la struttura semantica del documento.' }] }, position: 3 },
        { id: 'b-c2-5', type: 'bulletList', content: { content: [{ type: 'text', text: 'Paragrafi: testo formattabile con grassetto, corsivo, codice inline e link.' }] }, position: 4 },
        { id: 'b-c2-6', type: 'bulletList', content: { content: [{ type: 'text', text: 'Task List Interattive: checkbox cliccabili con salvataggio dello stato di avanzamento.' }] }, position: 5 },
        { id: 'b-c2-7', type: 'bulletList', content: { content: [{ type: 'text', text: 'Blocchi di Codice con Syntax Highlighting: evidenziazione per Rust, TypeScript, Python, SQL, HTML, CSS, Bash e JSON.' }] }, position: 6 },
        { id: 'b-c2-8', type: 'bulletList', content: { content: [{ type: 'text', text: 'Callout Informativi: box colorati con emoji personalizzabile per consigli, avvisi o note di attenzione.' }] }, position: 7 },
        { id: 'b-c2-9', type: 'bulletList', content: { content: [{ type: 'text', text: 'Citazioni (Blockquote): formattazione con barra laterale d\'accento per note importanti.' }] }, position: 8 },
        { id: 'b-c2-9b', type: 'bulletList', content: { content: [{ type: 'text', text: 'Cartella / Mini Esplora Risorse: collega una cartella locale o server di rete con apertura diretta in Esplora File.' }] }, position: 9 },
        { id: 'b-c2-9c', type: 'bulletList', content: { content: [{ type: 'text', text: 'Evento & Calendario (.ics): fissa date e meeting, con countdown interattivo e download del file .ics per Outlook/Google.' }] }, position: 10 },
        { id: 'b-c2-9d', type: 'bulletList', content: { content: [{ type: 'text', text: 'Segnalibro Web: card ricca con favicon automatica, dominio e link per documentazione esterna.' }] }, position: 11 },
        { id: 'b-c2-9e', type: 'bulletList', content: { content: [{ type: 'text', text: 'Cassaforte Credenziali: password manager per la nota con valori oscurati anti shoulder-surfing e copia istantanea.' }] }, position: 12 },
        { id: 'b-c2-10', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '2.2 Il Comando Slash (/)' }] }, position: 13 },
        { id: 'b-c2-11', type: 'paragraph', content: { content: [{ type: 'text', text: 'All\'interno di qualsiasi blocco vuoto, digitando il carattere \'/\' si attiva il menu di inserimento rapido (/h1, /h2, /todo, /code, /callout, /quote, /cartella, /evento, /link, /vault).' }] }, position: 14 },
        { id: 'b-c2-12', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '2.3 Riordino con Drag & Drop' }] }, position: 15 },
        { id: 'b-c2-13', type: 'paragraph', content: { content: [{ type: 'text', text: 'Ogni blocco presenta a sinistra una maniglia a sei puntini (Grip Handle). Cliccando e trascinando la maniglia è possibile spostare il blocco in qualsiasi posizione all\'interno del documento.' }] }, position: 16 },
        { id: 'b-c2-14', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '2.4 Auto-Save & Debouncing' }] }, position: 17 },
        { id: 'b-c2-15', type: 'paragraph', content: { content: [{ type: 'text', text: 'Non è necessario premere \'Salva\' costantemente: ogni battuta viene memorizzata in locale e sincronizzata sul backend tramite debouncing (600ms dall\'ultimo input).' }] }, position: 18 },
        { id: 'b-c2-16', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '2.5 Blocchi di Utilità Operativa' }] }, position: 19 },
        { id: 'b-c2-17', type: 'paragraph', content: { content: [{ type: 'text', text: 'NutNote include 4 blocchi avanzati pensati per i flussi di lavoro aziendali e di studio:' }] }, position: 20 },
        { id: 'b-c2-18', type: 'bulletList', content: { content: [{ type: 'text', text: '1. Cartella Locale / Server (/cartella): visualizza i file di una directory con icone, estensioni, date e pulsante diretto \'Apri Cartella in Esplora Risorse\'.' }] }, position: 21 },
        { id: 'b-c2-19', type: 'bulletList', content: { content: [{ type: 'text', text: '2. Evento & Calendario (/evento): fissa date e meeting, con calcolo automatico del countdown e download del file standard .ics per Outlook e Google Calendar.' }] }, position: 22 },
        { id: 'b-c2-20', type: 'bulletList', content: { content: [{ type: 'text', text: '3. Segnalibro Web (/link): genera una card ricca con estrazione favicon, dominio e accesso rapido alla documentazione esterna.' }] }, position: 23 },
        { id: 'b-c2-21', type: 'bulletList', content: { content: [{ type: 'text', text: '4. Cassaforte Credenziali (/vault): protegge password e secret della nota mascherandoli per evitare sguardi indiscreti, con pulsante mostra/nascondi e copia istantanea.' }] }, position: 24 },
      ],

      'page-note-1': [
        { id: 'b-pn1-1', type: 'heading', content: { attrs: { level: 1 }, content: [{ type: 'text', text: 'Verbale Kick-off Meeting & Specifiche Acme' }] }, position: 0 },
        { id: 'b-pn1-2', type: 'paragraph', content: { content: [{ type: 'text', text: 'Verbale della sessione plenaria con il team direttivo Acme per la definizione del rilascio della nuova piattaforma e-commerce B2B.' }] }, position: 1 },
        { id: 'b-pn1-3', type: 'callout', content: { attrs: { calloutIcon: '📌' }, text: 'Questa nota include risorse operative interattive: la cartella condivisa dei contratti, la scadenza del collaudo, la documentazione Stripe e le credenziali di test protette.' }, position: 2 },
        {
          id: 'b-pn1-4',
          type: 'folder',
          content: {
            text: 'Cartella Contratti & Specifiche',
            folderPath: '\\\\server-lan\\Progetti\\Acme\\Contratti-2026',
            folderName: 'Documentazione & Contratti Firmati Acme',
            cachedFiles: [
              { name: 'Specifiche_Funzionali_Checkout_v2.pdf', size: 2840500, isDir: false, extension: 'pdf', modified: '2026-09-08' },
              { name: 'Contratto_Quadro_Fornitura_Firmato.docx', size: 1450200, isDir: false, extension: 'docx', modified: '2026-09-02' },
              { name: 'Piano_dei_Conti_Gateway_Stripe.xlsx', size: 984000, isDir: false, extension: 'xlsx', modified: '2026-09-05' },
              { name: 'Schema_Architettura_Cloud.png', size: 3410200, isDir: false, extension: 'png', modified: '2026-09-10' },
            ]
          },
          position: 3
        },
        {
          id: 'b-pn1-5',
          type: 'event',
          content: {
            text: 'Milestone: Collaudo & Rilascio Sandbox Staging',
            eventDate: '2026-09-30',
            eventTime: '10:00',
            eventEndDate: '2026-09-30',
            eventEndTime: '12:30',
            eventLocation: 'Microsoft Teams / Sala Riunioni A',
            eventDesc: 'Sessione di collaudo congiunto del modulo pagamenti multi-valuta e approvazione per la messa in pre-produzione.',
          },
          position: 4
        },
        {
          id: 'b-pn1-6',
          type: 'bookmark',
          content: {
            text: 'Documentazione Ufficiale Stripe Checkout',
            url: 'https://stripe.com/docs/payments/checkout',
            bookmarkTitle: 'Stripe Payments: Guida all\'Integrazione Checkout & Webhook',
            bookmarkDesc: 'Specifiche per la ricezione sicura di webhook idempotenti, autenticazione 3D Secure e tokenizzazione delle carte.',
            bookmarkCategory: 'Documentazione Tecnica Esterna'
          },
          position: 5
        },
        {
          id: 'b-pn1-7',
          type: 'vault',
          content: {
            text: 'Credenziali Ambiente Staging & Sandbox',
            vaultService: 'Portale Sandbox Staging Acme Corp',
            vaultUsername: 'lead_dev@acme-staging.internal',
            vaultPassword: 'Acme!Staging2026#SecureKey',
            vaultUrl: 'https://staging.acme.corp:8443',
            vaultNotes: 'Ambiente isolato collegato alle sandbox bancarie. Non utilizzare credenziali reali.'
          },
          position: 6
        },
        { id: 'b-pn1-8', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: 'Azioni Immediate Concordate' }] }, position: 7 },
        { id: 'b-pn1-9', type: 'taskList', content: { attrs: { checked: true }, content: [{ type: 'text', text: 'Condivisione credenziali sandbox con il team QA' }] }, position: 8 },
        { id: 'b-pn1-10', type: 'taskList', content: { attrs: { checked: false }, content: [{ type: 'text', text: 'Esecuzione test sui webhook Stripe in ambiente multi-valuta' }] }, position: 9 },
        { id: 'b-pn1-11', type: 'taskList', content: { attrs: { checked: false }, content: [{ type: 'text', text: 'Importazione promemoria .ics nei calendari di team' }] }, position: 10 },
      ],

      'wiki-ch3-relazioni': [
        { id: 'b-c3-1', type: 'heading', content: { attrs: { level: 1 }, content: [{ type: 'text', text: 'Capitolo 3: Relazioni Intelligenti, Backlink & Mappa a Nuvola' }] }, position: 0 },
        { id: 'b-c3-2', type: 'paragraph', content: { content: [{ type: 'text', text: 'Mentre la gerarchia parent/child organizza le pagine verticalmente, il motore di relazioni di NutNote costruisce un grafo della conoscenza orizzontale e bidirezionale tra qualsiasi entità del workspace.' }] }, position: 1 },
        { id: 'b-c3-3', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '3.1 I 5 Tipi Semantici di Relazione' }] }, position: 2 },
        { id: 'b-c3-4', type: 'bulletList', content: { content: [{ type: 'text', text: 'reference (Fa riferimento a): collegamento documentale, specifica tecnica o verbale correlato.' }] }, position: 3 },
        { id: 'b-c3-5', type: 'bulletList', content: { content: [{ type: 'text', text: 'depends_on (Dipende da): vincolo temporale o operativo. Il task A non può avanzare senza B.' }] }, position: 4 },
        { id: 'b-c3-6', type: 'bulletList', content: { content: [{ type: 'text', text: 'blocks (Blocca): impedimento critico. La pagina sorgente impedisce la chiusura del target.' }] }, position: 5 },
        { id: 'b-c3-7', type: 'bulletList', content: { content: [{ type: 'text', text: 'related (Correlato a): associazione simmetrica di contesto o affinità tematica.' }] }, position: 6 },
        { id: 'b-c3-8', type: 'bulletList', content: { content: [{ type: 'text', text: 'duplicate (Duplicato di): segnalazione di record o issue ridondanti.' }] }, position: 7 },
        { id: 'b-c3-9', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '3.2 La Mappa a Nuvola (Knowledge Cloud Map)' }] }, position: 8 },
        { id: 'b-c3-10', type: 'paragraph', content: { content: [{ type: 'text', text: 'Accessibile dalla voce \'Mappa a Nuvola\' nella barra laterale, visualizza l\'intero database come grafo interattivo a forze (D3.js Force Simulation) con nodi colorati per tipo, link direzionati, drag interattivo e doppio clic per aprire le pagine.' }] }, position: 9 },
      ],

      'wiki-ch4-database-viste': [
        { id: 'b-c4-1', type: 'heading', content: { attrs: { level: 1 }, content: [{ type: 'text', text: 'Capitolo 4: Viste Database, Tabelle, Kanban & Ricerca FTS5' }] }, position: 0 },
        { id: 'b-c4-2', type: 'paragraph', content: { content: [{ type: 'text', text: 'Le pagine di tipo omogeneo possono essere consultate e manipolate collettivamente tramite schermate di catalogo ad alte prestazioni, con supporto per vista Tabellare e vista Kanban.' }] }, position: 1 },
        { id: 'b-c4-3', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '4.1 Vista Tabellare e Modifica Inline' }] }, position: 2 },
        { id: 'b-c4-4', type: 'paragraph', content: { content: [{ type: 'text', text: 'La vista tabellare consente di editare direttamente le celle inline, ordinare per colonne e filtrare in tempo reale.' }] }, position: 3 },
        { id: 'b-c4-5', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '4.2 Vista Kanban Interattiva' }] }, position: 4 },
        { id: 'b-c4-6', type: 'paragraph', content: { content: [{ type: 'text', text: 'Raggruppa le schede per colonne di stato, consentendo di trascinarle da una fase all\'altra con aggiornamento atomico del database.' }] }, position: 5 },
        { id: 'b-c4-7', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '4.3 Ricerca Full-Text (SQLite FTS5)' }] }, position: 6 },
        { id: 'b-c4-8', type: 'paragraph', content: { content: [{ type: 'text', text: 'L\'engine FTS5 integrato indicizza costantemente sia i titoli che il corpo testuale di tutti i blocchi per ricerche istantanee in frazioni di millisecondo.' }] }, position: 7 },
      ],

      'wiki-ch5-collaborazione': [
        { id: 'b-c5-1', type: 'heading', content: { attrs: { level: 1 }, content: [{ type: 'text', text: 'Capitolo 5: Collaborazione, Gestione Team, Ruoli & Chat Contestuale' }] }, position: 0 },
        { id: 'b-c5-2', type: 'paragraph', content: { content: [{ type: 'text', text: 'NutNote è pensato per team che necessitano di operatività trasparente e immediata senza complessità burocratiche.' }] }, position: 1 },
        { id: 'b-c5-3', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '5.1 I 4 Team Aziendali' }] }, position: 2 },
        { id: 'b-c5-4', type: 'bulletList', content: { content: [{ type: 'text', text: 'Sviluppo Software (#1971c2): ingegneria, programmatori e QA.' }] }, position: 3 },
        { id: 'b-c5-5', type: 'bulletList', content: { content: [{ type: 'text', text: 'Design & UI/UX (#e64980): grafici e product designer.' }] }, position: 4 },
        { id: 'b-c5-6', type: 'bulletList', content: { content: [{ type: 'text', text: 'Management & Direzione (#f59f00): project manager e direzione.' }] }, position: 5 },
        { id: 'b-c5-7', type: 'bulletList', content: { content: [{ type: 'text', text: 'Commerciale & Sales (#2f9e44): account e vendite.' }] }, position: 6 },
        { id: 'b-c5-8', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '5.2 Chat Contestuale e Storico Revisioni' }] }, position: 7 },
        { id: 'b-c5-9', type: 'paragraph', content: { content: [{ type: 'text', text: 'Ogni pagina possiede una Project Chat per comunicazioni asincrone con avatar e timestamp, affiancata dal modale di storico versioni per verificare ogni revisione.' }] }, position: 8 },
      ],

      'wiki-ch6-networking-lan': [
        { id: 'b-c6-1', type: 'heading', content: { attrs: { level: 1 }, content: [{ type: 'text', text: 'Capitolo 6: Networking, Server LAN Condiviso & Sincronizzazione' }] }, position: 0 },
        { id: 'b-c6-2', type: 'paragraph', content: { content: [{ type: 'text', text: 'NutNote supporta tre modalità operative: Standalone Locale, Server LAN Condiviso (porta 9700 con discovery IP automatica) e Client Remoto. Il canale broadcast WebSocket propaga in tempo reale ogni mutazione a tutti i client connessi.' }] }, position: 1 },
        { id: 'b-c6-3', type: 'callout', content: { attrs: { calloutIcon: '🌐' }, text: 'In modalità Server LAN, nessun dato transita all\'esterno della rete aziendale locale o della VPN, garantendo massima riservatezza e zero dipendenze da cloud terzi.' }, position: 2 },
      ],

      'wiki-ch7-export-backup': [
        { id: 'b-c7-1', type: 'heading', content: { attrs: { level: 1 }, content: [{ type: 'text', text: 'Capitolo 7: Esportazione Documenti, Backup Database & Sicurezza' }] }, position: 0 },
        { id: 'b-c7-2', type: 'paragraph', content: { content: [{ type: 'text', text: 'NutNote garantisce la completa sovranità dei dati: puoi esportare qualsiasi documento in PDF, Word (.doc/.docx) o Markdown (.md), e scaricare tabelle in Excel (.xlsx) e CSV. Il database SQLite nutnote.db in modalità WAL supporta backup a caldo sicuri.' }] }, position: 1 },
      ],

      'wiki-ch8-casi-uso': [
        { id: 'b-c8-1', type: 'heading', content: { attrs: { level: 1 }, content: [{ type: 'text', text: 'Capitolo 8: Casi d\'Uso Reali & Workflow Operativi Aziendali' }] }, position: 0 },
        { id: 'b-c8-2', type: 'paragraph', content: { content: [{ type: 'text', text: 'Questo capitolo descrive i pattern operativi di successo in NutNote: Ciclo di Vita del Cliente (Lead > Progetto > Commesse > Task), Gestione Sprint & Bug Tracking, Verbali di Riunione con follow-up e Costruzione di una Knowledge Base / Wiki con Navigazione a Libro.' }] }, position: 1 },
        { id: 'b-c8-3', type: 'heading', content: { attrs: { level: 2 }, content: [{ type: 'text', text: '8.4 Creare una Wiki Aziendale con Navigazione a Libro' }] }, position: 2 },
        { id: 'b-c8-4', type: 'paragraph', content: { content: [{ type: 'text', text: 'Per strutturare un manuale operativo aziendale sfogliabile: 1. Crea la pagina radice (Hub); 2. Aggiungi i capitoli come sotto-pagine con il pulsante \'+ Sotto-pagina\'; 3. NutNote attiva automaticamente la barra di navigazione sequenziale a fondo pagina (Capitolo Precedente / Indice / Successivo); 4. Usa le relazioni intelligenti \'reference\' e le menzioni per collegare capitoli e commesse.' }] }, position: 3 },
      ],

      'wiki-ch9-faq-riferimento': [
        { id: 'b-c9-1', type: 'heading', content: { attrs: { level: 1 }, content: [{ type: 'text', text: 'Capitolo 9: Guida di Riferimento Rapido, Shortcut da Tastiera & FAQ' }] }, position: 0 },
        { id: 'b-c9-2', type: 'bulletList', content: { content: [{ type: 'text', text: 'Ctrl/Cmd + K: ricerca globale Spotlight.' }] }, position: 1 },
        { id: 'b-c9-3', type: 'bulletList', content: { content: [{ type: 'text', text: 'Ctrl/Cmd + B: grassetto; Ctrl/Cmd + I: corsivo.' }] }, position: 2 },
        { id: 'b-c9-4', type: 'bulletList', content: { content: [{ type: 'text', text: '/ (Slash) su riga vuota: inserimento blocchi.' }] }, position: 3 },
        { id: 'b-c9-5', type: 'callout', content: { attrs: { calloutIcon: '💡' }, text: 'FAQ: Per copiare l\'ID di qualsiasi pagina usa il pulsante \'ID: ...\' nella TopBar; per connetterti al server assicurati che entrambi i PC siano sulla stessa Wi-Fi/LAN con porta 9700 aperta.' }, position: 4 },
      ],

      'wiki-guide-en': [
        { id: 'b-en1', type: 'heading', content: { attrs: { level: 1 }, content: [{ type: 'text', text: 'NutNote Complete User Guide (English)' }] }, position: 0 },
        { id: 'b-en2', type: 'paragraph', content: { content: [{ type: 'text', text: 'Welcome to the official NutNote documentation. This guide covers the tree architecture, central block editor, smart relations, and local network collaboration.' }] }, position: 1 },
        { id: 'b-en3', type: 'callout', content: { attrs: { calloutIcon: '💡' }, text: 'Tip: You can copy any page ID with one click via the \'ID: wiki-guide-en\' pill button in the top bar.' }, position: 2 },
        { id: 'b-en4', type: 'bulletList', content: { content: [{ type: 'text', text: 'Tree Hierarchy: Clients > Projects > Work Orders > Tasks, Notes, Bugs, and Wiki docs.' }] }, position: 3 },
        { id: 'b-en5', type: 'bulletList', content: { content: [{ type: 'text', text: 'Block Editor: write with slash command (/), code highlighting, callouts, and drag-and-drop.' }] }, position: 4 },
        { id: 'b-en6', type: 'bulletList', content: { content: [{ type: 'text', text: 'LAN Server: share workspaces over office Wi-Fi on port 9700 in real-time.' }] }, position: 5 },
      ],
      'wiki-guide-es': [
        { id: 'b-es1', type: 'heading', content: { attrs: { level: 1 }, content: [{ type: 'text', text: 'Guía Completa de Usuario de NutNote (Español)' }] }, position: 0 },
        { id: 'b-es2', type: 'paragraph', content: { content: [{ type: 'text', text: 'Bienvenido a la guía oficial de NutNote. Esta documentación describe la estructura corporativa en árbol, el editor de bloques central y las relaciones inteligentes.' }] }, position: 1 },
        { id: 'b-es3', type: 'bulletList', content: { content: [{ type: 'text', text: 'Estructura Jerárquica: Clientes > Proyectos > Fases > Tareas, Notas y Errores.' }] }, position: 2 },
        { id: 'b-es4', type: 'bulletList', content: { content: [{ type: 'text', text: 'Servidor LAN: comparta su base de datos en tiempo real en el puerto 9700.' }] }, position: 3 },
      ],
      'wiki-guide-fr': [
        { id: 'b-fr1', type: 'heading', content: { attrs: { level: 1 }, content: [{ type: 'text', text: 'Guide Complet d\'Utilisation NutNote (Français)' }] }, position: 0 },
        { id: 'b-fr2', type: 'paragraph', content: { content: [{ type: 'text', text: 'Bienvenue dans la documentation officielle de NutNote. Ce manuel présente l\'arborescence, l\'éditeur de blocs centralisé et le réseau partagé.' }] }, position: 1 },
        { id: 'b-fr3', type: 'bulletList', content: { content: [{ type: 'text', text: 'Architecture: Clients > Projets > Commandes > Tâches, Notes et Bogues.' }] }, position: 2 },
        { id: 'b-fr4', type: 'bulletList', content: { content: [{ type: 'text', text: 'Réseau LAN: partagez votre espace de travail en temps reale sur le port 9700.' }] }, position: 3 },
      ],
      'wiki-guide-de': [
        { id: 'b-de1', type: 'heading', content: { attrs: { level: 1 }, content: [{ type: 'text', text: 'NutNote Benutzerhandbuch - Vollständige Anleitung (Deutsch)' }] }, position: 0 },
        { id: 'b-de2', type: 'paragraph', content: { content: [{ type: 'text', text: 'Willkommen zur offiziellen NutNote Dokumentation. Diese Anleitung erläutert die Baumarchitektur, den Block-Editor und die intelligente Verknüpfung.' }] }, position: 1 },
        { id: 'b-de3', type: 'bulletList', content: { content: [{ type: 'text', text: 'Hierarchie: Kunden > Projekte > Aufträge > Aufgaben, Notizen und Fehler.' }] }, position: 2 },
        { id: 'b-de4', type: 'bulletList', content: { content: [{ type: 'text', text: 'Lokales Netzwerk: Echtzeit-Server auf Port 9700.' }] }, position: 3 },
      ],
    },
    chatMessages: {},
  };
}

function loadState(): MockState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: MockState = JSON.parse(raw);
      const def = getDefaultState();
      
      // Ensure any newly added pages in getDefaultState are merged in if missing
      const existingPageIds = new Set((parsed.pages || []).map((p: any) => p.id));
      for (const p of def.pages) {
        if (!existingPageIds.has(p.id)) {
          parsed.pages.push(p);
        }
      }

      // Ensure any newly added relations in getDefaultState are merged in if missing
      if (!parsed.relations) parsed.relations = [];
      const existingRelIds = new Set(parsed.relations.map((r: any) => r.id));
      for (const r of def.relations) {
        if (!existingRelIds.has(r.id)) {
          parsed.relations.push(r);
        }
      }

      // Ensure default blocks are present
      if (!parsed.blocks) parsed.blocks = {};
      for (const [k, v] of Object.entries(def.blocks)) {
        if (!parsed.blocks[k] || parsed.blocks[k].length === 0) {
          parsed.blocks[k] = v;
        }
      }

      saveState(parsed);
      return parsed;
    }
  } catch (e) {
    console.warn('[TauriMock] Failed to load persisted state:', e);
  }
  const initial = getDefaultState();
  saveState(initial);
  return initial;
}

function saveState(state: MockState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[TauriMock] Failed to save state:', e);
  }
}

export function setupTauriMock() {
  if (typeof window === 'undefined') return;

  // If running inside actual Tauri native container, do nothing
  if ((window as any).__TAURI_INTERNALS__) {
    console.log('[Tauri] Native runtime detected.');
    return;
  }

  console.log('[TauriMock] Initializing browser mock environment for testing.');

  let state = loadState();

  const mockInvoke = async (cmd: string, args: Record<string, any> = {}): Promise<any> => {
    // Artificial small delay to simulate IPC
    await new Promise((r) => setTimeout(r, 40));

    switch (cmd) {
      // ── Users & Auth ──
      case 'get_active_user': {
        const uid = state.activeUserId || localStorage.getItem('nutnote_active_user_id');
        if (!uid) return null;
        const user = state.users.find((u) => u.id === uid);
        return user || null;
      }

      case 'set_active_user': {
        state.activeUserId = args.id || null;
        if (args.id) {
          localStorage.setItem('nutnote_active_user_id', args.id);
        } else {
          localStorage.removeItem('nutnote_active_user_id');
        }
        saveState(state);
        return true;
      }

      case 'get_users': {
        return state.users.map(({ password, ...u }) => u);
      }

      case 'get_all_users_admin': {
        return state.users;
      }

      case 'authenticate_user': {
        const { id, password } = args.payload || {};
        const user = state.users.find((u) => u.id === id);
        if (!user) throw new Error('Utente non trovato');
        if (user.password !== password) throw new Error('Password errata');
        state.activeUserId = user.id;
        localStorage.setItem('nutnote_active_user_id', user.id);
        saveState(state);
        const { password: _, ...safeUser } = user;
        return safeUser;
      }

      case 'create_user': {
        const payload = args.payload || {};
        const team = state.teams.find((t) => t.id === payload.teamId);
        const newUser = {
          id: `user-${Date.now().toString(36)}`,
          displayName: payload.displayName,
          avatarColor: payload.avatarColor || '#4263eb',
          role: payload.role || 'user',
          password: payload.password || '1234',
          teamId: payload.teamId || null,
          teamName: team ? team.name : null,
          teamColor: team ? team.color : null,
          createdAt: new Date().toISOString(),
        };
        state.users.push(newUser);
        // update memberCount of team
        if (team) {
          team.memberCount = (team.memberCount || 0) + 1;
        }
        saveState(state);
        const { password: _, ...safeUser } = newUser;
        return safeUser;
      }

      case 'update_user': {
        const payload = args.payload || {};
        const idx = state.users.findIndex((u) => u.id === payload.id);
        if (idx >= 0) {
          const team = state.teams.find((t) => t.id === payload.teamId);
          state.users[idx] = {
            ...state.users[idx],
            displayName: payload.displayName,
            avatarColor: payload.avatarColor,
            role: payload.role,
            teamId: payload.teamId || null,
            teamName: team ? team.name : null,
            teamColor: team ? team.color : null,
          };
          saveState(state);
          return state.users[idx];
        }
        throw new Error('Utente non trovato');
      }

      case 'update_user_password': {
        const { userId, newPassword } = args.payload || {};
        const user = state.users.find((u) => u.id === userId);
        if (user) {
          user.password = newPassword;
          saveState(state);
          return true;
        }
        throw new Error('Utente non trovato');
      }

      case 'delete_user': {
        state.users = state.users.filter((u) => u.id !== args.id);
        if (state.activeUserId === args.id) {
          state.activeUserId = null;
          localStorage.removeItem('nutnote_active_user_id');
        }
        saveState(state);
        return true;
      }

      // ── Teams ──
      case 'get_teams': {
        return state.teams.map((t) => ({
          ...t,
          memberCount: state.users.filter((u) => u.teamId === t.id).length,
        }));
      }

      case 'create_team': {
        const payload = args.payload || {};
        const newTeam = {
          id: `team-${Date.now().toString(36)}`,
          name: payload.name,
          description: payload.description || '',
          color: payload.color || '#4263eb',
          memberCount: 0,
          createdAt: new Date().toISOString(),
        };
        state.teams.push(newTeam);
        saveState(state);
        return newTeam;
      }

      case 'update_team': {
        const payload = args.payload || {};
        const idx = state.teams.findIndex((t) => t.id === payload.id);
        if (idx >= 0) {
          state.teams[idx] = {
            ...state.teams[idx],
            name: payload.name,
            description: payload.description || '',
            color: payload.color || '#4263eb',
          };
          saveState(state);
          return state.teams[idx];
        }
        throw new Error('Team non trovato');
      }

      case 'delete_team': {
        state.teams = state.teams.filter((t) => t.id !== args.id);
        state.users.forEach((u) => {
          if (u.teamId === args.id) {
            u.teamId = null;
            u.teamName = null;
            u.teamColor = null;
          }
        });
        saveState(state);
        return true;
      }

      // ── Configuration & Storage ──
      case 'get_config': {
        return state.config;
      }

      case 'save_config': {
        state.config = { ...state.config, ...args.newConfig };
        saveState(state);
        return true;
      }

      case 'test_db_path': {
        const path = args.path || '';
        if (path.includes('fail') || path.includes('invalid')) {
          throw new Error('Percorso specificato non valido o inaccessibile.');
        }
        return true;
      }

      // ── Embedded Server ──
      case 'get_server_status': {
        return state.serverStatus;
      }

      case 'start_server': {
        const port = args.portOverride || state.config.serverPort || 9700;
        state.serverStatus = {
          ...state.serverStatus,
          isRunning: true,
          port,
        };
        state.config.mode = 'server';
        state.config.serverPort = port;
        saveState(state);
        return state.serverStatus;
      }

      case 'stop_server': {
        state.serverStatus = {
          ...state.serverStatus,
          isRunning: false,
        };
        state.config.mode = 'local';
        saveState(state);
        return state.serverStatus;
      }

      // ── Page Types ──
      case 'get_page_types': {
        return state.pageTypes;
      }

      case 'get_page_type': {
        return state.pageTypes.find((pt) => pt.id === args.id) || null;
      }

      // ── Pages ──
      case 'query_pages': {
        const req = args.request || {};
        let result = [...state.pages];
        if (req.typeId) {
          result = result.filter((p) => p.typeId === req.typeId);
        }
        if (req.parentId !== undefined) {
          result = result.filter((p) => p.parentId === req.parentId);
        }
        return {
          items: result,
          total: result.length,
          page: 1,
          pageSize: 50,
          totalPages: 1,
        };
      }

      case 'get_page': {
        const page = state.pages.find((p) => p.id === args.id);
        if (!page) throw new Error('Pagina non trovata');
        const children = state.pages.filter((p) => p.parentId === page.id);
        return {
          ...page,
          children,
          blocks: state.blocks[page.id] || [],
        };
      }

      case 'get_page_with_ancestors': {
        const page = state.pages.find((p) => p.id === args.id);
        if (!page) throw new Error('Pagina non trovata');
        const ancestors: any[] = [];
        let cur = page;
        while (cur.parentId) {
          const parent = state.pages.find((p) => p.id === cur.parentId);
          if (!parent) break;
          ancestors.unshift(parent);
          cur = parent;
        }
        const children = state.pages.filter((p) => p.parentId === page.id);
        return {
          page: {
            ...page,
            children,
            blocks: state.blocks[page.id] || [],
          },
          ancestors,
        };
      }

      case 'create_page': {
        const payload = args.payload || {};
        const newPage = {
          id: `page-${Date.now().toString(36)}`,
          typeId: payload.typeId,
          parentId: payload.parentId || null,
          title: payload.title || 'Nuova Pagina',
          icon: payload.icon || '📄',
          properties: payload.properties || {},
          priority: payload.priority || 'none',
          status: payload.status || '',
          visibility: payload.visibility || 'public',
          isPinned: false,
          createdBy: state.activeUserId || 'user-admin',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        state.pages.push(newPage);
        saveState(state);
        return newPage;
      }

      case 'update_page': {
        const payload = args.payload || {};
        const idx = state.pages.findIndex((p) => p.id === payload.id);
        if (idx >= 0) {
          state.pages[idx] = {
            ...state.pages[idx],
            ...payload,
            updatedAt: new Date().toISOString(),
          };
          saveState(state);
          return state.pages[idx];
        }
        throw new Error('Pagina non trovata');
      }

      case 'delete_page': {
        state.pages = state.pages.filter((p) => p.id !== args.id && p.parentId !== args.id);
        saveState(state);
        return true;
      }

      case 'toggle_pin_page': {
        const page = state.pages.find((p) => p.id === args.id);
        if (page) {
          page.isPinned = !page.isPinned;
          saveState(state);
          return page.isPinned;
        }
        return false;
      }

      case 'get_pinned_pages': {
        return state.pages.filter((p) => p.isPinned);
      }

      case 'get_recent_pages': {
        return state.pages.slice(0, 10);
      }

      // ── Blocks ──
      case 'get_blocks': {
        return state.blocks[args.pageId] || [];
      }

      case 'save_blocks': {
        const { pageId, blocks } = args.payload || {};
        state.blocks[pageId] = blocks || [];
        saveState(state);
        return true;
      }

      // ── Query Pages ──
      case 'query_pages': {
        const payload = args.payload || {};
        let filtered = [...state.pages];
        if (payload.rootClientId) {
          filtered = filtered.filter((p) => p.rootClientId === payload.rootClientId || p.id === payload.rootClientId);
        }
        if (payload.typeId) {
          filtered = filtered.filter((p) => p.typeId === payload.typeId);
        }
        if (payload.parentId) {
          filtered = filtered.filter((p) => p.parentId === payload.parentId);
        }
        if (payload.isArchived !== undefined) {
          filtered = filtered.filter((p) => (p.isArchived ?? false) === payload.isArchived);
        }
        if (payload.limit) {
          filtered = filtered.slice(payload.offset || 0, (payload.offset || 0) + payload.limit);
        }
        return filtered;
      }

      // ── Relations ──
      case 'get_page_relations': {
        const pageId = args.pageId;
        const allRelations = state.relations || [];
        const matching = allRelations.filter((r) => r.sourceId === pageId || r.targetId === pageId);
        return matching.map((rel) => {
          const isOutgoing = rel.sourceId === pageId;
          const otherId = isOutgoing ? rel.targetId : rel.sourceId;
          const other = state.pages.find((p) => p.id === otherId) || {
            id: otherId,
            title: 'Pagina ' + otherId,
            icon: '📄',
            typeId: 'note',
            priority: 'none',
            status: 'active',
          };
          const pType = state.pageTypes.find((t) => t.id === other.typeId);
          return {
            id: rel.id,
            sourceId: rel.sourceId,
            targetId: rel.targetId,
            relationType: rel.relationType || 'related',
            description: rel.description || '',
            direction: isOutgoing ? 'outgoing' : 'incoming',
            isOutgoing,
            otherPage: {
              id: other.id,
              title: other.title,
              icon: other.icon || '📄',
              typeName: pType?.name || other.typeId || 'page',
              typeLabel: pType?.label || 'Pagina',
              typeColor: pType?.color || 'var(--text-secondary)',
              priority: other.priority || 'none',
              status: other.status || '',
              statusLabel: other.status || '',
            },
          };
        });
      }

      case 'create_page_relation': {
        const payload = args.payload || {};
        if (!state.relations) state.relations = [];
        const targetPage = state.pages.find((p) => p.id === payload.targetId);
        if (!targetPage) {
          throw new Error(`La pagina con ID '${payload.targetId}' non esiste nel database.`);
        }
        const existing = state.relations.find(
          (r) => r.sourceId === payload.sourceId && r.targetId === payload.targetId && r.relationType === payload.relationType
        );
        if (existing) {
          throw new Error('Questa relazione tra le pagine esiste già.');
        }
        state.relations.push({
          id: `rel-${Date.now().toString(36)}`,
          sourceId: payload.sourceId,
          targetId: payload.targetId,
          relationType: payload.relationType || 'related',
          description: payload.description || '',
          createdAt: new Date().toISOString(),
        });
        saveState(state);
        return true;
      }

      case 'delete_page_relation': {
        if (state.relations) {
          state.relations = state.relations.filter((r) => r.id !== args.id);
          saveState(state);
        }
        return true;
      }

      // ── Search ──
      case 'search_pages': {
        const q = (args.query || '').toLowerCase();
        const matches = state.pages.filter((p) => p.title.toLowerCase().includes(q));
        return matches.map((p) => ({
          pageId: p.id,
          title: p.title,
          typeId: p.typeId,
          icon: p.icon,
          snippet: p.title,
        }));
      }

      // ── Chat ──
      case 'get_chat_messages': {
        return state.chatMessages[args.entityId] || [];
      }

      case 'create_chat_message': {
        const payload = args.payload || {};
        const entityId = payload.entityId;
        if (!state.chatMessages[entityId]) {
          state.chatMessages[entityId] = [];
        }
        const user = state.users.find((u) => u.id === (state.activeUserId || 'user-admin'));
        const newMsg = {
          id: `msg-${Date.now().toString(36)}`,
          entityId,
          userId: user?.id || 'user-admin',
          userName: user?.displayName || 'Admin',
          userAvatarColor: user?.avatarColor || '#4263eb',
          content: payload.content,
          createdAt: new Date().toISOString(),
        };
        state.chatMessages[entityId].push(newMsg);
        saveState(state);
        return newMsg;
      }

      // ── ChangeLog ──
      case 'get_entity_history':
      case 'get_recent_changes': {
        return [];
      }

      case 'restore_field':
      case 'cleanup_old_logs': {
        return true;
      }

      case 'upload_file': {
        return {
          url: 'https://via.placeholder.com/150',
          filename: args.filename || 'mock-file.png',
        };
      }

      default: {
        console.warn(`[TauriMock] Unhandled command: "${cmd}" with args:`, args);
        return null;
      }
    }
  };

  // Attach mock to window.__TAURI_INTERNALS__ and custom mock bridge
  (window as any).__TAURI_INTERNALS__ = {
    invoke: mockInvoke,
    plugins: {},
  };

  (window as any).__NUTNOTE_TEST_MODE__ = true;
  (window as any).__NUTNOTE_RESET_MOCK__ = () => {
    localStorage.removeItem(STORAGE_KEY);
    state = getDefaultState();
    saveState(state);
    window.location.reload();
  };
}
