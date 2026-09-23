/**
 * Preferenze di aspetto dell'interfaccia.
 *
 * Il design system di NutNote è costruito interamente su variabili CSS (index.css):
 * personalizzare l'aspetto significa sovrascrivere quei token su <html>, senza
 * toccare un solo componente. Le preferenze vivono in localStorage e vengono
 * riapplicate prima del primo paint dallo script di avvio in index.html, così
 * all'apertura non si vede il lampo del tema chiaro.
 *
 * Nota prestazioni: i font proposti sono tutti già presenti nel sistema operativo.
 * Nessun webfont da scaricare, nessun blocco del rendering in attesa del font.
 */

/** Chiave di persistenza. Deve combaciare con quella dello script in index.html. */
export const CHIAVE_ASPETTO = 'nutnote_aspetto';

/** Intensità degli effetti grafici: è la leva principale sulle prestazioni. */
export type LivelloEffetti = 'completi' | 'ridotti' | 'minimi';

export interface PreferenzeAspetto {
  /** 'auto' segue il tema del sistema operativo. */
  tema: 'light' | 'dark' | 'auto';
  /** Id di una voce di FAMIGLIE_TESTO. */
  fontTesto: string;
  /** Id di una voce di FAMIGLIE_CODICE. */
  fontCodice: string;
  /** Corpo del testo dell'interfaccia in px (menu, elenchi, pannelli). */
  dimensioneInterfaccia: number;
  /** Corpo del testo dentro l'editor in px. */
  dimensioneEditor: number;
  /** Interlinea del testo dell'editor. */
  interlineaEditor: number;
  /** Larghezza massima della colonna di lettura in px. */
  larghezzaColonna: number;
  /** Colore d'accento in esadecimale. */
  accento: string;
  /** Larghezza massima delle immagini nell'editor, in percentuale della colonna. */
  larghezzaImmagini: number;
  /** Moltiplicatore del raggio degli angoli: 0 = squadrato, 2 = molto tondo. */
  scalaRaggio: number;
  /** Sfondi e sfocature: scendere di livello alleggerisce il disegno di ogni frame. */
  effetti: LivelloEffetti;
}

/** Famiglie per il testo. Solo font di sistema, con fallback a catena. */
export const FAMIGLIE_TESTO = [
  { id: 'sistema', nome: 'Sistema', stack: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { id: 'segoe', nome: 'Segoe UI', stack: "'Segoe UI Variable Text', 'Segoe UI', system-ui, sans-serif" },
  { id: 'grazie', nome: 'Con grazie', stack: "Georgia, 'Times New Roman', Cambria, serif" },
  { id: 'umanista', nome: 'Umanista', stack: "Calibri, Candara, 'Trebuchet MS', sans-serif" },
  { id: 'stretto', nome: 'Stretto', stack: "'Segoe UI Semilight', 'Roboto Condensed', 'Arial Narrow', sans-serif" },
];

/** Famiglie monospaziate per blocchi di codice e valori tecnici. */
export const FAMIGLIE_CODICE = [
  { id: 'sistema', nome: 'Sistema', stack: "'Fira Code', 'JetBrains Mono', 'Cascadia Code', monospace" },
  { id: 'cascadia', nome: 'Cascadia Mono', stack: "'Cascadia Mono', 'Cascadia Code', monospace" },
  { id: 'consolas', nome: 'Consolas', stack: "Consolas, 'Lucida Console', monospace" },
  { id: 'courier', nome: 'Courier', stack: "'Courier New', Courier, monospace" },
];

/** Accenti proposti. Il primo è quello storico di NutNote. */
export const ACCENTI_PROPOSTI = [
  { nome: 'Indaco', valore: '#4263eb' },
  { nome: 'Verde bosco', valore: '#2f9e44' },
  { nome: 'Ambra', valore: '#e8590c' },
  { nome: 'Porpora', valore: '#9c36b5' },
  { nome: 'Teal', valore: '#0c8599' },
  { nome: 'Rosso mattone', valore: '#c92a2a' },
];

/** Valori di partenza: riproducono esattamente l'aspetto storico dell'app. */
export const ASPETTO_PREDEFINITO: PreferenzeAspetto = {
  tema: 'light',
  fontTesto: 'sistema',
  fontCodice: 'sistema',
  dimensioneInterfaccia: 14,
  dimensioneEditor: 15,
  interlineaEditor: 1.65,
  larghezzaColonna: 900,
  accento: '#4263eb',
  larghezzaImmagini: 100,
  scalaRaggio: 1,
  effetti: 'completi',
};

/** Limiti di sicurezza: evitano che un valore fuori scala renda l'app illeggibile. */
const LIMITI: Record<string, [number, number]> = {
  dimensioneInterfaccia: [11, 20],
  dimensioneEditor: [12, 24],
  interlineaEditor: [1.2, 2.2],
  larghezzaColonna: [600, 1400],
  scalaRaggio: [0, 2],
  larghezzaImmagini: [40, 100],
};

/** Riporta un numero dentro l'intervallo consentito. */
function entroLimiti(valore: number, [minimo, massimo]: [number, number]): number {
  if (!Number.isFinite(valore)) return minimo;
  return Math.min(massimo, Math.max(minimo, valore));
}

/**
 * Legge le preferenze salvate, completando con i valori predefiniti le voci
 * mancanti: così una versione futura che aggiunge un campo non rompe i profili
 * già salvati.
 */
export function leggiAspetto(): PreferenzeAspetto {
  try {
    const grezzo = localStorage.getItem(CHIAVE_ASPETTO);
    if (!grezzo) return { ...ASPETTO_PREDEFINITO };
    const salvato = JSON.parse(grezzo) as Partial<PreferenzeAspetto>;
    return { ...ASPETTO_PREDEFINITO, ...salvato };
  } catch {
    return { ...ASPETTO_PREDEFINITO };
  }
}

/** Salva le preferenze. Un localStorage non disponibile non deve far cadere l'app. */
export function salvaAspetto(preferenze: PreferenzeAspetto): void {
  try {
    localStorage.setItem(CHIAVE_ASPETTO, JSON.stringify(preferenze));
  } catch {
    /* modalità privata o quota esaurita: l'aspetto resta valido per la sessione */
  }
}

/** Risolve 'auto' consultando il tema del sistema operativo. */
export function temaEffettivo(tema: PreferenzeAspetto['tema']): 'light' | 'dark' {
  if (tema !== 'auto') return tema;
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

/** Stack CSS della famiglia scelta, con ritorno al predefinito se l'id è ignoto. */
function stackFont(elenco: { id: string; stack: string }[], id: string): string {
  const trovata = elenco.find((voce) => voce.id === id);
  return trovata ? trovata.stack : elenco[0].stack;
}

/**
 * Applica le preferenze scrivendo i token CSS su <html>.
 *
 * È l'unico punto che tocca il DOM: tutto il resto dell'app continua a leggere
 * le stesse variabili di sempre e non si accorge della personalizzazione.
 */
export function applicaAspetto(preferenze: PreferenzeAspetto): void {
  const radice = document.documentElement;
  const stile = radice.style;

  radice.setAttribute('data-theme', temaEffettivo(preferenze.tema));
  // Governa da CSS la disattivazione di sfocature e animazioni: spegnerle con una
  // regola è molto più economico che rimuoverle componente per componente.
  radice.setAttribute('data-effetti', preferenze.effetti);

  stile.setProperty('--font-sans', stackFont(FAMIGLIE_TESTO, preferenze.fontTesto));
  stile.setProperty('--font-mono', stackFont(FAMIGLIE_CODICE, preferenze.fontCodice));

  const corpo = entroLimiti(preferenze.dimensioneInterfaccia, LIMITI.dimensioneInterfaccia);
  stile.setProperty('--text-base', corpo + 'px');
  // La scala tipografica resta proporzionale al corpo scelto, così i rapporti
  // fra titoli e testo non cambiano al variare della dimensione.
  stile.setProperty('--text-xs', Math.round(corpo * 0.79) + 'px');
  stile.setProperty('--text-sm', Math.round(corpo * 0.93) + 'px');
  stile.setProperty('--text-lg', Math.round(corpo * 1.14) + 'px');
  stile.setProperty('--text-xl', Math.round(corpo * 1.29) + 'px');
  stile.setProperty('--text-2xl', Math.round(corpo * 1.57) + 'px');
  stile.setProperty('--text-3xl', Math.round(corpo * 2) + 'px');

  stile.setProperty('--editor-font-size', entroLimiti(preferenze.dimensioneEditor, LIMITI.dimensioneEditor) + 'px');
  stile.setProperty('--editor-line-height', String(entroLimiti(preferenze.interlineaEditor, LIMITI.interlineaEditor)));
  stile.setProperty('--content-max-width', entroLimiti(preferenze.larghezzaColonna, LIMITI.larghezzaColonna) + 'px');
  stile.setProperty('--editor-image-max-width', entroLimiti(preferenze.larghezzaImmagini, LIMITI.larghezzaImmagini) + '%');

  const scala = entroLimiti(preferenze.scalaRaggio, LIMITI.scalaRaggio);
  stile.setProperty('--radius-sm', Math.round(4 * scala) + 'px');
  stile.setProperty('--radius-md', Math.round(6 * scala) + 'px');
  stile.setProperty('--radius-lg', Math.round(8 * scala) + 'px');
  stile.setProperty('--radius-xl', Math.round(12 * scala) + 'px');

  // Le tinte derivate dall'accento si ricavano per mescolanza, così cambiando
  // un solo colore restano coerenti gli stati hover e gli sfondi tenui.
  stile.setProperty('--accent', preferenze.accento);
  stile.setProperty('--accent-hover', 'color-mix(in srgb, ' + preferenze.accento + ' 82%, black)');
  stile.setProperty('--accent-light', 'color-mix(in srgb, ' + preferenze.accento + ' 18%, var(--bg-surface))');
}
