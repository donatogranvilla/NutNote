/**
 * Copertine delle pagine.
 *
 * Le copertine predefinite erano URL di Unsplash: in un'applicazione che deve
 * funzionare offline o in sola rete locale, significava intestazioni vuote ogni
 * volta che mancava Internet. Qui sono gradienti CSS, quindi non pesano un byte,
 * compaiono all'istante e funzionano staccati dalla rete. Restano possibili sia
 * un indirizzo esterno sia un file caricato, per chi vuole una foto vera.
 */

/** Come è fatta la copertina di una pagina. */
export type TipoCopertina = 'sfumatura' | 'immagine';

export interface Sfumatura {
  id: string;
  nome: string;
  /** Valore CSS completo, usabile sia come background sia in anteprima. */
  css: string;
}

/**
 * Le sfumature sono salvate nel campo `coverUrl` con questo prefisso: così il
 * campo resta uno solo e le pagine già esistenti con un indirizzo continuano a
 * funzionare senza migrazioni del database.
 */
export const PREFISSO_SFUMATURA = 'nutnote-gradient:';

export const SFUMATURE: Sfumatura[] = [
  { id: 'alba', nome: 'Alba', css: 'linear-gradient(120deg, #f6d365 0%, #fda085 100%)' },
  { id: 'oceano', nome: 'Oceano', css: 'linear-gradient(120deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 'bosco', nome: 'Bosco', css: 'linear-gradient(120deg, #43e97b 0%, #38f9d7 100%)' },
  { id: 'lavanda', nome: 'Lavanda', css: 'linear-gradient(120deg, #a18cd1 0%, #fbc2eb 100%)' },
  { id: 'tramonto', nome: 'Tramonto', css: 'linear-gradient(120deg, #ff9a9e 0%, #fecfef 100%)' },
  { id: 'notte', nome: 'Notte', css: 'linear-gradient(120deg, #30cfd0 0%, #330867 100%)' },
  { id: 'ardesia', nome: 'Ardesia', css: 'linear-gradient(120deg, #616161 0%, #9bc5c3 100%)' },
  { id: 'rame', nome: 'Rame', css: 'linear-gradient(120deg, #c79081 0%, #dfa579 100%)' },
  { id: 'acciaio', nome: 'Acciaio', css: 'linear-gradient(120deg, #2b5876 0%, #4e4376 100%)' },
  { id: 'agrume', nome: 'Agrume', css: 'linear-gradient(120deg, #fddb92 0%, #d1fdff 100%)' },
  { id: 'grafite', nome: 'Grafite', css: 'linear-gradient(120deg, #232526 0%, #414345 100%)' },
  { id: 'menta', nome: 'Menta', css: 'linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)' },
];

/** Valore da salvare in `coverUrl` per una sfumatura. */
export function riferimentoSfumatura(id: string): string {
  return `${PREFISSO_SFUMATURA}${id}`;
}

/** Vero se il valore salvato indica una sfumatura anziché un'immagine. */
export function isSfumatura(coverUrl: string | null | undefined): boolean {
  return typeof coverUrl === 'string' && coverUrl.startsWith(PREFISSO_SFUMATURA);
}

/**
 * Traduce il valore salvato in una proprietà `background` CSS.
 *
 * Una sfumatura sconosciuta (per esempio salvata da una versione più recente)
 * ricade sulla prima dell'elenco invece di lasciare l'intestazione vuota.
 */
export function sfondoCopertina(coverUrl: string | null | undefined): string | undefined {
  if (!coverUrl) return undefined;

  if (isSfumatura(coverUrl)) {
    const id = coverUrl.slice(PREFISSO_SFUMATURA.length);
    const trovata = SFUMATURE.find((s) => s.id === id);
    return (trovata ?? SFUMATURE[0]).css;
  }

  return `url(${coverUrl})`;
}
