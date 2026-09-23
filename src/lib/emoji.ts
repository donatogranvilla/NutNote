/**
 * Catalogo di emoji per le icone delle pagine.
 *
 * Volutamente scritto a mano invece di importare una libreria: i pacchetti di
 * emoji completi pesano centinaia di kB per migliaia di simboli che in un
 * gestionale non servono. Qui c'è una selezione per l'uso aziendale, con parole
 * chiave in italiano perché la ricerca la fa chi scrive in italiano.
 */

export interface VoceEmoji {
  /** Il carattere da inserire. */
  simbolo: string;
  /** Nome mostrato nel suggerimento. */
  nome: string;
  /** Termini alternativi per la ricerca. */
  sinonimi: string[];
}

export interface CategoriaEmoji {
  id: string;
  nome: string;
  voci: VoceEmoji[];
}

export const CATEGORIE_EMOJI: CategoriaEmoji[] = [
  {
    id: 'lavoro',
    nome: 'Lavoro',
    voci: [
      { simbolo: '💼', nome: 'Valigetta', sinonimi: ['lavoro', 'business', 'commessa'] },
      { simbolo: '🏢', nome: 'Ufficio', sinonimi: ['azienda', 'cliente', 'sede', 'edificio'] },
      { simbolo: '🏭', nome: 'Stabilimento', sinonimi: ['fabbrica', 'produzione', 'impianto'] },
      { simbolo: '🤝', nome: 'Accordo', sinonimi: ['contratto', 'partner', 'intesa'] },
      { simbolo: '📊', nome: 'Grafico a barre', sinonimi: ['report', 'statistiche', 'dati'] },
      { simbolo: '📈', nome: 'In crescita', sinonimi: ['aumento', 'vendite', 'trend'] },
      { simbolo: '📉', nome: 'In calo', sinonimi: ['perdita', 'diminuzione'] },
      { simbolo: '💰', nome: 'Denaro', sinonimi: ['budget', 'costo', 'fatturato', 'soldi'] },
      { simbolo: '💳', nome: 'Pagamento', sinonimi: ['carta', 'fattura', 'saldo'] },
      { simbolo: '🧾', nome: 'Ricevuta', sinonimi: ['fattura', 'scontrino', 'nota spese'] },
      { simbolo: '📑', nome: 'Fascicolo', sinonimi: ['pratica', 'documenti', 'raccolta'] },
      { simbolo: '🗂️', nome: 'Schedario', sinonimi: ['archivio', 'categorie', 'ordine'] },
    ],
  },
  {
    id: 'documenti',
    nome: 'Documenti',
    voci: [
      { simbolo: '📄', nome: 'Foglio', sinonimi: ['documento', 'nota', 'pagina'] },
      { simbolo: '📝', nome: 'Appunti', sinonimi: ['scrivere', 'nota', 'verbale'] },
      { simbolo: '📚', nome: 'Libri', sinonimi: ['wiki', 'manuale', 'documentazione'] },
      { simbolo: '📖', nome: 'Libro aperto', sinonimi: ['lettura', 'capitolo', 'guida'] },
      { simbolo: '📁', nome: 'Cartella', sinonimi: ['raccolta', 'progetto', 'archivio'] },
      { simbolo: '📎', nome: 'Graffetta', sinonimi: ['allegato', 'file'] },
      { simbolo: '🗃️', nome: 'Archivio', sinonimi: ['storico', 'conservazione'] },
      { simbolo: '📋', nome: 'Lista', sinonimi: ['checklist', 'elenco', 'verifica'] },
      { simbolo: '🖨️', nome: 'Stampante', sinonimi: ['stampa', 'cartaceo'] },
      { simbolo: '✏️', nome: 'Matita', sinonimi: ['bozza', 'modifica', 'correzione'] },
      { simbolo: '🔖', nome: 'Segnalibro', sinonimi: ['salvato', 'riferimento'] },
      { simbolo: '📰', nome: 'Giornale', sinonimi: ['notizie', 'comunicazione'] },
    ],
  },
  {
    id: 'stato',
    nome: 'Stato',
    voci: [
      { simbolo: '✅', nome: 'Fatto', sinonimi: ['completato', 'ok', 'chiuso', 'spunta'] },
      { simbolo: '⏳', nome: 'In attesa', sinonimi: ['clessidra', 'sospeso', 'pendente'] },
      { simbolo: '🚧', nome: 'In corso', sinonimi: ['lavori', 'sviluppo', 'cantiere'] },
      { simbolo: '⛔', nome: 'Bloccato', sinonimi: ['fermo', 'stop', 'vietato'] },
      { simbolo: '❌', nome: 'Annullato', sinonimi: ['errore', 'no', 'scartato'] },
      { simbolo: '⚠️', nome: 'Attenzione', sinonimi: ['avviso', 'rischio', 'warning'] },
      { simbolo: '🔥', nome: 'Urgente', sinonimi: ['priorità', 'critico', 'fuoco'] },
      { simbolo: '⭐', nome: 'Importante', sinonimi: ['preferito', 'stella', 'rilevante'] },
      { simbolo: '📌', nome: 'Fissato', sinonimi: ['puntina', 'appuntato', 'pin'] },
      { simbolo: '🎯', nome: 'Obiettivo', sinonimi: ['target', 'traguardo', 'meta'] },
      { simbolo: '🏁', nome: 'Traguardo', sinonimi: ['fine', 'consegna', 'milestone'] },
      { simbolo: '🔴', nome: 'Rosso', sinonimi: ['critico', 'fermo', 'pallino'] },
      { simbolo: '🟡', nome: 'Giallo', sinonimi: ['medio', 'attenzione', 'pallino'] },
      { simbolo: '🟢', nome: 'Verde', sinonimi: ['ok', 'attivo', 'pallino'] },
    ],
  },
  {
    id: 'tecnologia',
    nome: 'Tecnologia',
    voci: [
      { simbolo: '💻', nome: 'Computer', sinonimi: ['pc', 'portatile', 'sviluppo'] },
      { simbolo: '🖥️', nome: 'Postazione', sinonimi: ['desktop', 'monitor', 'schermo'] },
      { simbolo: '🐛', nome: 'Bug', sinonimi: ['anomalia', 'errore', 'difetto'] },
      { simbolo: '⚙️', nome: 'Impostazioni', sinonimi: ['configurazione', 'ingranaggio'] },
      { simbolo: '🔧', nome: 'Manutenzione', sinonimi: ['chiave', 'riparazione', 'fix'] },
      { simbolo: '🛠️', nome: 'Strumenti', sinonimi: ['attrezzi', 'utilità', 'officina'] },
      { simbolo: '🗄️', nome: 'Database', sinonimi: ['archivio', 'server', 'dati'] },
      { simbolo: '🌐', nome: 'Rete', sinonimi: ['web', 'internet', 'lan', 'mondo'] },
      { simbolo: '🔌', nome: 'Collegamento', sinonimi: ['integrazione', 'spina', 'plugin'] },
      { simbolo: '🔑', nome: 'Chiave', sinonimi: ['accesso', 'password', 'credenziali'] },
      { simbolo: '🔒', nome: 'Riservato', sinonimi: ['privato', 'lucchetto', 'sicurezza'] },
      { simbolo: '⚡', nome: 'Prestazioni', sinonimi: ['veloce', 'energia', 'fulmine'] },
      { simbolo: '🚀', nome: 'Rilascio', sinonimi: ['deploy', 'lancio', 'razzo', 'avvio'] },
      { simbolo: '🤖', nome: 'Automazione', sinonimi: ['robot', 'script', 'bot'] },
    ],
  },
  {
    id: 'persone',
    nome: 'Persone',
    voci: [
      { simbolo: '👤', nome: 'Persona', sinonimi: ['utente', 'profilo', 'contatto'] },
      { simbolo: '👥', nome: 'Gruppo', sinonimi: ['team', 'squadra', 'reparto'] },
      { simbolo: '👔', nome: 'Direzione', sinonimi: ['manager', 'responsabile', 'capo'] },
      { simbolo: '🧑‍💻', nome: 'Sviluppatore', sinonimi: ['programmatore', 'tecnico'] },
      { simbolo: '🧑‍🔧', nome: 'Tecnico', sinonimi: ['manutentore', 'assistenza'] },
      { simbolo: '🧑‍🏫', nome: 'Formazione', sinonimi: ['corso', 'docente', 'training'] },
      { simbolo: '📞', nome: 'Telefono', sinonimi: ['chiamata', 'contatto', 'supporto'] },
      { simbolo: '✉️', nome: 'Email', sinonimi: ['posta', 'messaggio', 'comunicazione'] },
      { simbolo: '💬', nome: 'Discussione', sinonimi: ['chat', 'commento', 'messaggio'] },
      { simbolo: '🗣️', nome: 'Riunione', sinonimi: ['meeting', 'confronto', 'parlare'] },
    ],
  },
  {
    id: 'tempo',
    nome: 'Tempo',
    voci: [
      { simbolo: '📅', nome: 'Calendario', sinonimi: ['data', 'pianificazione', 'agenda'] },
      { simbolo: '🗓️', nome: 'Pianificazione', sinonimi: ['agenda', 'programma', 'mese'] },
      { simbolo: '⏰', nome: 'Scadenza', sinonimi: ['sveglia', 'promemoria', 'termine'] },
      { simbolo: '⏱️', nome: 'Cronometro', sinonimi: ['durata', 'tempi', 'misura'] },
      { simbolo: '🕐', nome: 'Orario', sinonimi: ['ora', 'orologio', 'turno'] },
      { simbolo: '🔁', nome: 'Ricorrente', sinonimi: ['ripetizione', 'ciclico', 'periodico'] },
      { simbolo: '📆', nome: 'Giorno', sinonimi: ['data', 'appuntamento'] },
    ],
  },
  {
    id: 'oggetti',
    nome: 'Oggetti',
    voci: [
      { simbolo: '📦', nome: 'Pacco', sinonimi: ['spedizione', 'magazzino', 'scatola'] },
      { simbolo: '🚚', nome: 'Consegna', sinonimi: ['trasporto', 'logistica', 'camion'] },
      { simbolo: '🏗️', nome: 'Costruzione', sinonimi: ['cantiere', 'gru', 'edilizia'] },
      { simbolo: '🔩', nome: 'Componente', sinonimi: ['ricambio', 'pezzo', 'bullone'] },
      { simbolo: '📐', nome: 'Progettazione', sinonimi: ['disegno', 'misura', 'squadra'] },
      { simbolo: '🧪', nome: 'Collaudo', sinonimi: ['test', 'prova', 'laboratorio'] },
      { simbolo: '🔍', nome: 'Analisi', sinonimi: ['ricerca', 'lente', 'ispezione'] },
      { simbolo: '💡', nome: 'Idea', sinonimi: ['proposta', 'lampadina', 'intuizione'] },
      { simbolo: '🎨', nome: 'Design', sinonimi: ['grafica', 'creatività', 'arte'] },
      { simbolo: '🗺️', nome: 'Mappa', sinonimi: ['percorso', 'territorio', 'piano'] },
      { simbolo: '🏆', nome: 'Risultato', sinonimi: ['premio', 'successo', 'coppa'] },
      { simbolo: '🎁', nome: 'Omaggio', sinonimi: ['regalo', 'bonus'] },
    ],
  },
  {
    id: 'simboli',
    nome: 'Simboli',
    voci: [
      { simbolo: '❤️', nome: 'Cuore', sinonimi: ['preferito', 'amore', 'rosso'] },
      { simbolo: '🔵', nome: 'Blu', sinonimi: ['pallino', 'neutro'] },
      { simbolo: '🟣', nome: 'Viola', sinonimi: ['pallino'] },
      { simbolo: '➕', nome: 'Aggiungi', sinonimi: ['nuovo', 'più'] },
      { simbolo: '➡️', nome: 'Avanti', sinonimi: ['freccia', 'successivo', 'destra'] },
      { simbolo: '🔄', nome: 'Aggiornamento', sinonimi: ['sincronizza', 'ricarica'] },
      { simbolo: '#️⃣', nome: 'Numero', sinonimi: ['codice', 'cancelletto', 'tag'] },
      { simbolo: '❓', nome: 'Domanda', sinonimi: ['dubbio', 'faq', 'chiarimento'] },
      { simbolo: '❗', nome: 'Esclamazione', sinonimi: ['importante', 'nota'] },
      { simbolo: '♻️', nome: 'Riciclo', sinonimi: ['riuso', 'ambiente', 'sostenibile'] },
    ],
  },
];

/** Tutte le voci, appiattite. Costruito una volta sola al caricamento del modulo. */
export const TUTTE_LE_EMOJI: VoceEmoji[] = CATEGORIE_EMOJI.flatMap((c) => c.voci);

/**
 * Cerca fra le emoji per nome o sinonimo.
 *
 * Confronto per sottostringa, senza distinzione di maiuscole: il catalogo è di
 * poche centinaia di voci, quindi non serve alcun indice.
 */
export function cercaEmoji(termine: string): VoceEmoji[] {
  const query = termine.trim().toLowerCase();
  if (!query) return TUTTE_LE_EMOJI;

  return TUTTE_LE_EMOJI.filter(
    (voce) =>
      voce.nome.toLowerCase().includes(query) ||
      voce.sinonimi.some((sinonimo) => sinonimo.includes(query)),
  );
}
