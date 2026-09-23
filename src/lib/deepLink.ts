/**
 * Riferimenti interni a pagine e blocchi.
 *
 * Copiando il segnalino di un blocco si ottiene un indirizzo come
 * `nutnote://block/<pagina>/<blocco>`. Finora quell'indirizzo veniva riconosciuto
 * soltanto dentro la chat di progetto: incollato in una nota restava testo morto.
 * Qui c'è l'unica implementazione di lettura e scrittura di quegli indirizzi, in
 * modo che chi li genera e chi li risolve usino la stessa grammatica.
 */

/** Protocollo attuale. */
export const PROTOCOLLO = 'nutnote';

/** Protocollo della versione precedente dell'applicazione, ancora accettato. */
const PROTOCOLLO_STORICO = 'nution';

/** Riferimento trovato dentro un testo. */
export interface RiferimentoInterno {
  /** Testo esatto trovato, utile per sostituirlo o evidenziarlo. */
  originale: string;
  pageId: string;
  /** Assente quando il riferimento punta alla pagina intera. */
  blockId?: string;
}

/** Costruisce l'indirizzo di un blocco, da copiare negli appunti. */
export function riferimentoBlocco(pageId: string, blockId: string): string {
  return `${PROTOCOLLO}://block/${pageId}/${blockId}`;
}

/** Costruisce l'indirizzo di una pagina intera. */
export function riferimentoPagina(pageId: string): string {
  return `${PROTOCOLLO}://page/${pageId}`;
}

/**
 * Percorso interno corrispondente, da passare al router.
 *
 * Si usa la navigazione dell'applicazione invece di un indirizzo assoluto: un
 * `<a href>` normale farebbe ricaricare l'intera applicazione a ogni clic.
 */
export function percorsoInterno(riferimento: RiferimentoInterno): string {
  return riferimento.blockId
    ? `/page/${riferimento.pageId}?block=${riferimento.blockId}`
    : `/page/${riferimento.pageId}`;
}

/**
 * Riconosce un singolo indirizzo, se lo è.
 *
 * La punteggiatura finale viene scartata: incollando un riferimento in mezzo a
 * una frase è normale che lo segua una virgola o un punto.
 */
export function leggiRiferimento(parola: string): RiferimentoInterno | null {
  const pulita = parola.replace(/[.,;:!?)\]]+$/, '');

  const schema = new RegExp(
    `^(?:${PROTOCOLLO}|${PROTOCOLLO_STORICO})://(block|page)/([^/\\s]+)(?:/([^/\\s]+))?$`,
  );
  const esito = pulita.match(schema);
  if (!esito) return null;

  const [, genere, pageId, blockId] = esito;
  if (genere === 'block' && !blockId) return null;

  return { originale: pulita, pageId, blockId: genere === 'block' ? blockId : undefined };
}

/**
 * Estrae tutti i riferimenti presenti in un testo, senza ripetizioni.
 *
 * Serve a mostrare sotto un blocco le pagine a cui rimanda: il testo resta
 * modificabile in un'area di testo, dove un collegamento cliccabile non può stare.
 */
export function estraiRiferimenti(testo: string): RiferimentoInterno[] {
  if (!testo) return [];

  const trovati: RiferimentoInterno[] = [];
  const visti = new Set<string>();

  for (const parola of testo.split(/\s+/)) {
    const riferimento = leggiRiferimento(parola);
    if (riferimento && !visti.has(riferimento.originale)) {
      visti.add(riferimento.originale);
      trovati.push(riferimento);
    }
  }

  return trovati;
}
