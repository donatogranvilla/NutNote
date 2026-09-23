import type { Page, Block, PropertyDefinition } from './types';

/**
 * Esportazione delle pagine in Markdown, Word, PDF e delle tabelle in CSV/Excel.
 *
 * Due note su come è fatto questo file.
 *
 * Il salvataggio passa da `salvaFile`, che dentro l'applicazione vera usa il
 * dialogo di sistema: nella webview di Windows il vecchio trucco del link con
 * l'attributo `download` non produce alcun file, quindi i pulsanti sembravano
 * semplicemente non funzionare pur senza dare errore.
 *
 * L'interpretazione dei blocchi sta in un punto solo, `descriviBlocco`, e i due
 * resi (Markdown e HTML) partono da lì. Prima lo stesso `switch` era ripetuto
 * tre volte e conosceva sette tipi di blocco su diciassette: tutto ciò che era
 * stato aggiunto dopo — cartelle, eventi, segnalibri, credenziali, diagrammi,
 * tabelle calcolate — usciva vuoto.
 */

// ─────────────────────────────────────────────────────────────
// SALVATAGGIO
// ─────────────────────────────────────────────────────────────

/**
 * Vero quando giriamo dentro l'applicazione Tauri.
 *
 * Il mock del browser installa anch'esso `__TAURI_INTERNALS__` per far girare
 * l'app in sviluppo, quindi da solo non basta a distinguere i due casi.
 */
function inTauri(): boolean {
  return (
    typeof window !== 'undefined' &&
    '__TAURI_INTERNALS__' in window &&
    !(window as { __NUTNOTE_TEST_MODE__?: boolean }).__NUTNOTE_TEST_MODE__
  );
}

/**
 * Salva un contenuto testuale su disco.
 *
 * Nell'applicazione chiede dove salvare e scrive il file; nel browser ricade sul
 * download tramite blob. I plugin Tauri si caricano su richiesta, così la
 * versione browser non se li porta dietro.
 */
async function salvaFile(
  contenuto: string,
  nomeFile: string,
  mime: string,
  estensione: string,
  descrizioneTipo: string,
): Promise<boolean> {
  if (inTauri()) {
    try {
      const { save } = await import('@tauri-apps/plugin-dialog');
      const { writeTextFile } = await import('@tauri-apps/plugin-fs');

      const percorso = await save({
        defaultPath: nomeFile,
        filters: [{ name: descrizioneTipo, extensions: [estensione] }],
      });
      if (!percorso) return false; // l'utente ha annullato

      await writeTextFile(percorso, contenuto);
      return true;
    } catch (errore) {
      console.error('Salvataggio non riuscito:', errore);
      return false;
    }
  }

  const blob = new Blob([contenuto], { type: mime });
  const url = URL.createObjectURL(blob);
  const ancora = document.createElement('a');
  ancora.href = url;
  ancora.download = nomeFile;
  document.body.appendChild(ancora);
  ancora.click();
  document.body.removeChild(ancora);
  URL.revokeObjectURL(url);
  return true;
}

/**
 * Apre il dialogo di stampa su un documento costruito al volo.
 *
 * Si usa un riquadro nascosto invece di una finestra separata perché la webview
 * non apre finestre di questo tipo: il vecchio `window.open` restituiva null e
 * l'esportazione in PDF terminava senza fare nulla.
 */
function stampaDocumento(html: string): void {
  const telaio = document.createElement('iframe');
  telaio.setAttribute('aria-hidden', 'true');
  telaio.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(telaio);

  const documento = telaio.contentWindow?.document;
  if (!documento) {
    telaio.remove();
    return;
  }

  documento.open();
  documento.write(html);
  documento.close();

  // Un istante perché il documento venga impaginato prima di stamparlo.
  setTimeout(() => {
    telaio.contentWindow?.focus();
    telaio.contentWindow?.print();
    setTimeout(() => telaio.remove(), 1000);
  }, 300);
}

// ─────────────────────────────────────────────────────────────
// LETTURA DEI BLOCCHI
// ─────────────────────────────────────────────────────────────

/** Dati di un blocco già normalizzati, indipendenti dal formato di uscita. */
interface BloccoDescritto {
  tipo: string;
  testo: string;
  dati: Record<string, any>;
}

/**
 * Legge un campo del blocco, che a seconda del tipo si trova al primo livello
 * del contenuto oppure dentro `attrs`.
 */
function campo(contenuto: any, nome: string): any {
  if (!contenuto) return undefined;
  if (contenuto[nome] !== undefined) return contenuto[nome];
  if (contenuto.attrs && contenuto.attrs[nome] !== undefined) return contenuto.attrs[nome];
  return undefined;
}

function testoDaTipTap(nodo: any): string {
  if (!nodo) return '';
  if (typeof nodo === 'string') return nodo;
  if (nodo.type === 'text') return nodo.text || '';
  if (Array.isArray(nodo.content)) return nodo.content.map(testoDaTipTap).join('');
  if (nodo.text) return String(nodo.text);
  return '';
}

function vociElenco(nodo: any): string[] {
  if (!nodo || !Array.isArray(nodo.content)) return [];
  return nodo.content.map((voce: any) => testoDaTipTap(voce));
}

/** Estrae da un blocco tutto ciò che serve a entrambi i resi. */
function descriviBlocco(blocco: Block): BloccoDescritto {
  const contenuto: any = blocco.content || {};
  const testo = testoDaTipTap(contenuto) || String(campo(contenuto, 'text') || '');

  return {
    tipo: String(blocco.type),
    testo,
    dati: {
      livello: campo(contenuto, 'level') || 1,
      completato: !!campo(contenuto, 'checked'),
      linguaggio: campo(contenuto, 'language') || '',
      src: campo(contenuto, 'src') || '',
      didascalia: campo(contenuto, 'caption') || '',
      icona: campo(contenuto, 'calloutIcon') || '💡',
      voci: vociElenco(contenuto),
      // cartella
      percorso: campo(contenuto, 'folderPath') || '',
      nomeCartella: campo(contenuto, 'folderName') || '',
      fileInCache: campo(contenuto, 'cachedFiles') || [],
      // evento
      dataInizio: campo(contenuto, 'eventDate') || '',
      oraInizio: campo(contenuto, 'eventTime') || '',
      dataFine: campo(contenuto, 'eventEndDate') || '',
      oraFine: campo(contenuto, 'eventEndTime') || '',
      luogo: campo(contenuto, 'eventLocation') || '',
      descrizioneEvento: campo(contenuto, 'eventDesc') || '',
      // segnalibro
      url: campo(contenuto, 'url') || '',
      titoloSegnalibro: campo(contenuto, 'bookmarkTitle') || '',
      descrizioneSegnalibro: campo(contenuto, 'bookmarkDesc') || '',
      categoria: campo(contenuto, 'bookmarkCategory') || '',
      // credenziali
      servizio: campo(contenuto, 'vaultService') || '',
      utente: campo(contenuto, 'vaultUsername') || '',
      indirizzoVault: campo(contenuto, 'vaultUrl') || '',
      noteVault: campo(contenuto, 'vaultNotes') || '',
      // diagramma
      codiceDiagramma: campo(contenuto, 'mermaidCode') || '',
      titoloDiagramma: campo(contenuto, 'mermaidTitle') || '',
      // tabella calcolata
      titoloTabella: campo(contenuto, 'calcTitle') || '',
      colonne: campo(contenuto, 'columns') || [],
      righe: campo(contenuto, 'rows') || [],
      mostraTotali: !!campo(contenuto, 'showTotalRow'),
      // vista database
      tipoInterrogato: campo(contenuto, 'queryTypeId') || '',
    },
  };
}

/** Dimensione leggibile di un file, per gli elenchi delle cartelle. */
function pesoLeggibile(byte: number): string {
  if (!byte) return '';
  if (byte < 1024) return `${byte} B`;
  if (byte < 1024 * 1024) return `${Math.round(byte / 1024)} kB`;
  return `${(byte / (1024 * 1024)).toFixed(1)} MB`;
}

/** Data e ora di un evento in forma discorsiva. */
function periodoEvento(d: Record<string, any>): string {
  const inizio = [d.dataInizio, d.oraInizio].filter(Boolean).join(' ');
  const fine = [d.dataFine, d.oraFine].filter(Boolean).join(' ');
  if (inizio && fine) return `${inizio} → ${fine}`;
  return inizio || fine || 'Data non indicata';
}

/**
 * Le credenziali non escono mai in chiaro da un'esportazione.
 *
 * Dentro NutNote restano leggibili, com'è nelle intenzioni dello strumento; un
 * file esportato però viaggia per posta e finisce su altri computer, dove quella
 * scelta non vale più.
 */
const PASSWORD_OSCURATA = '••••••••';

// ─────────────────────────────────────────────────────────────
// RESA IN MARKDOWN
// ─────────────────────────────────────────────────────────────

function bloccoInMarkdown(blocco: Block): string {
  const { tipo, testo, dati } = descriviBlocco(blocco);

  switch (tipo) {
    case 'heading':
      return `${'#'.repeat(Math.min(6, dati.livello))} ${testo}\n\n`;

    case 'paragraph':
      return testo ? `${testo}\n\n` : '';

    case 'bulletList':
      return (dati.voci.length ? dati.voci : [testo]).filter(Boolean).map((v: string) => `- ${v}`).join('\n') + '\n\n';

    case 'orderedList':
      return (dati.voci.length ? dati.voci : [testo]).filter(Boolean).map((v: string, i: number) => `${i + 1}. ${v}`).join('\n') + '\n\n';

    case 'taskList':
      return `- [${dati.completato ? 'x' : ' '}] ${testo}\n\n`;

    case 'blockquote':
      return `> ${testo}\n\n`;

    case 'codeBlock':
      return `\`\`\`${dati.linguaggio}\n${testo}\n\`\`\`\n\n`;

    case 'callout':
      return `> ${dati.icona} **${testo}**\n\n`;

    case 'divider':
      return `---\n\n`;

    case 'image':
      return dati.src ? `![${dati.didascalia || testo || 'immagine'}](${dati.src})\n\n` : '';

    case 'folder': {
      let md = `### 📁 ${dati.nomeCartella || testo || 'Cartella'}\n\n`;
      if (dati.percorso) md += `\`${dati.percorso}\`\n\n`;
      const file = dati.fileInCache as any[];
      if (file.length) {
        md += `| Nome | Tipo | Dimensione |\n|---|---|---|\n`;
        for (const f of file) {
          md += `| ${f.name} | ${f.is_dir ? 'Cartella' : (f.extension || 'file')} | ${f.is_dir ? '' : pesoLeggibile(f.size_bytes)} |\n`;
        }
        md += `\n`;
      }
      return md;
    }

    case 'event': {
      let md = `### 📅 ${testo || 'Evento'}\n\n`;
      md += `- **Quando**: ${periodoEvento(dati)}\n`;
      if (dati.luogo) md += `- **Dove**: ${dati.luogo}\n`;
      if (dati.descrizioneEvento) md += `- **Note**: ${dati.descrizioneEvento}\n`;
      return md + `\n`;
    }

    case 'bookmark': {
      const titolo = dati.titoloSegnalibro || testo || dati.url;
      let md = `### 🔖 [${titolo}](${dati.url})\n\n`;
      if (dati.categoria) md += `*${dati.categoria}*\n\n`;
      if (dati.descrizioneSegnalibro) md += `${dati.descrizioneSegnalibro}\n\n`;
      return md;
    }

    case 'vault': {
      let md = `### 🔐 ${dati.servizio || testo || 'Credenziali'}\n\n`;
      if (dati.utente) md += `- **Utente**: ${dati.utente}\n`;
      md += `- **Password**: ${PASSWORD_OSCURATA} *(non esportata)*\n`;
      if (dati.indirizzoVault) md += `- **Indirizzo**: ${dati.indirizzoVault}\n`;
      if (dati.noteVault) md += `- **Note**: ${dati.noteVault}\n`;
      return md + `\n`;
    }

    case 'mermaid': {
      let md = `### 📊 ${dati.titoloDiagramma || testo || 'Diagramma'}\n\n`;
      md += `\`\`\`mermaid\n${dati.codiceDiagramma}\n\`\`\`\n\n`;
      return md;
    }

    case 'calcTable': {
      const colonne = dati.colonne as any[];
      const righe = dati.righe as any[];
      if (!colonne.length) return '';

      let md = `### 🧮 ${dati.titoloTabella || testo || 'Tabella'}\n\n`;
      md += `| ${colonne.map((c: any) => c.label || c.key).join(' | ')} |\n`;
      md += `|${colonne.map(() => '---').join('|')}|\n`;
      for (const riga of righe) {
        md += `| ${colonne.map((c: any) => String(riga[c.key] ?? '')).join(' | ')} |\n`;
      }
      if (dati.mostraTotali) {
        md += `| ${colonne.map((c: any, i: number) =>
          i === 0 ? '**Totale**' : String(righe.reduce((somma: number, r: any) => somma + (parseFloat(r[c.key]) || 0), 0)),
        ).join(' | ')} |\n`;
      }
      return md + `\n`;
    }

    case 'database_view':
      return `> 🗄️ *Vista dinamica${dati.tipoInterrogato ? ` su "${dati.tipoInterrogato}"` : ''}: il contenuto si aggiorna dentro NutNote e non viene riprodotto qui.*\n\n`;

    default:
      return testo ? `${testo}\n\n` : '';
  }
}

// ─────────────────────────────────────────────────────────────
// RESA IN HTML (usata da Word e PDF)
// ─────────────────────────────────────────────────────────────

function escapeHtml(str: string): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function bloccoInHtml(blocco: Block): string {
  const { tipo, testo, dati } = descriviBlocco(blocco);
  const e = escapeHtml;

  switch (tipo) {
    case 'heading': {
      const livello = Math.min(6, dati.livello);
      return `<h${livello}>${e(testo)}</h${livello}>`;
    }

    case 'paragraph':
      return testo ? `<p>${e(testo)}</p>` : '';

    case 'bulletList':
      return `<ul>${(dati.voci.length ? dati.voci : [testo]).filter(Boolean).map((v: string) => `<li>${e(v)}</li>`).join('')}</ul>`;

    case 'orderedList':
      return `<ol>${(dati.voci.length ? dati.voci : [testo]).filter(Boolean).map((v: string) => `<li>${e(v)}</li>`).join('')}</ol>`;

    case 'taskList':
      return `<p class="attivita">${dati.completato ? '☑' : '☐'} ${e(testo)}</p>`;

    case 'blockquote':
      return `<blockquote>${e(testo)}</blockquote>`;

    case 'codeBlock':
      return `<pre><code>${e(testo)}</code></pre>`;

    case 'callout':
      return `<div class="richiamo">${e(dati.icona)} <strong>${e(testo)}</strong></div>`;

    case 'divider':
      return `<hr />`;

    case 'image':
      return dati.src
        ? `<figure><img src="${e(dati.src)}" alt="${e(dati.didascalia || testo)}" />${
            dati.didascalia ? `<figcaption>${e(dati.didascalia)}</figcaption>` : ''
          }</figure>`
        : '';

    case 'folder': {
      let html = `<h3>📁 ${e(dati.nomeCartella || testo || 'Cartella')}</h3>`;
      if (dati.percorso) html += `<p class="percorso">${e(dati.percorso)}</p>`;
      const file = dati.fileInCache as any[];
      if (file.length) {
        html += `<table><thead><tr><th>Nome</th><th>Tipo</th><th>Dimensione</th></tr></thead><tbody>`;
        for (const f of file) {
          html += `<tr><td>${e(f.name)}</td><td>${f.is_dir ? 'Cartella' : e(f.extension || 'file')}</td><td>${
            f.is_dir ? '' : pesoLeggibile(f.size_bytes)
          }</td></tr>`;
        }
        html += `</tbody></table>`;
      }
      return html;
    }

    case 'event': {
      let html = `<h3>📅 ${e(testo || 'Evento')}</h3><ul>`;
      html += `<li><strong>Quando:</strong> ${e(periodoEvento(dati))}</li>`;
      if (dati.luogo) html += `<li><strong>Dove:</strong> ${e(dati.luogo)}</li>`;
      if (dati.descrizioneEvento) html += `<li><strong>Note:</strong> ${e(dati.descrizioneEvento)}</li>`;
      return html + `</ul>`;
    }

    case 'bookmark': {
      const titolo = dati.titoloSegnalibro || testo || dati.url;
      let html = `<h3>🔖 <a href="${e(dati.url)}">${e(titolo)}</a></h3>`;
      if (dati.categoria) html += `<p><em>${e(dati.categoria)}</em></p>`;
      if (dati.descrizioneSegnalibro) html += `<p>${e(dati.descrizioneSegnalibro)}</p>`;
      return html;
    }

    case 'vault': {
      let html = `<h3>🔐 ${e(dati.servizio || testo || 'Credenziali')}</h3><ul>`;
      if (dati.utente) html += `<li><strong>Utente:</strong> ${e(dati.utente)}</li>`;
      html += `<li><strong>Password:</strong> ${PASSWORD_OSCURATA} <em>(non esportata)</em></li>`;
      if (dati.indirizzoVault) html += `<li><strong>Indirizzo:</strong> ${e(dati.indirizzoVault)}</li>`;
      if (dati.noteVault) html += `<li><strong>Note:</strong> ${e(dati.noteVault)}</li>`;
      return html + `</ul>`;
    }

    case 'mermaid':
      return `<h3>📊 ${e(dati.titoloDiagramma || testo || 'Diagramma')}</h3><pre><code>${e(
        dati.codiceDiagramma,
      )}</code></pre>`;

    case 'calcTable': {
      const colonne = dati.colonne as any[];
      const righe = dati.righe as any[];
      if (!colonne.length) return '';

      let html = `<h3>🧮 ${e(dati.titoloTabella || testo || 'Tabella')}</h3><table><thead><tr>`;
      html += colonne.map((c: any) => `<th>${e(c.label || c.key)}</th>`).join('');
      html += `</tr></thead><tbody>`;
      for (const riga of righe) {
        html += `<tr>${colonne.map((c: any) => `<td>${e(String(riga[c.key] ?? ''))}</td>`).join('')}</tr>`;
      }
      if (dati.mostraTotali) {
        html += `<tr class="totali">${colonne
          .map((c: any, i: number) =>
            i === 0
              ? `<td><strong>Totale</strong></td>`
              : `<td><strong>${righe.reduce((somma: number, r: any) => somma + (parseFloat(r[c.key]) || 0), 0)}</strong></td>`,
          )
          .join('')}</tr>`;
      }
      return html + `</tbody></table>`;
    }

    case 'database_view':
      return `<blockquote>🗄️ <em>Vista dinamica${
        dati.tipoInterrogato ? ` su "${e(dati.tipoInterrogato)}"` : ''
      }: il contenuto si aggiorna dentro NutNote e non viene riprodotto qui.</em></blockquote>`;

    default:
      return testo ? `<p>${e(testo)}</p>` : '';
  }
}

/** Intestazione con stato, priorità e proprietà della pagina. */
function intestazioneHtml(page: Page): string {
  if (!page.properties || Object.keys(page.properties).length === 0) return '';

  let html = `<div class="scheda"><p><strong>Stato:</strong> ${escapeHtml(page.status || 'N/D')} &nbsp;|&nbsp; <strong>Priorità:</strong> ${escapeHtml(page.priority)}</p>`;
  for (const [chiave, valore] of Object.entries(page.properties)) {
    if (valore !== undefined && valore !== null && valore !== '') {
      const reso = typeof valore === 'object' ? JSON.stringify(valore) : String(valore);
      html += `<p><strong>${escapeHtml(chiave)}:</strong> ${escapeHtml(reso)}</p>`;
    }
  }
  return html + `</div>`;
}

/** Foglio di stile condiviso da Word e PDF. */
const STILE_DOCUMENTO = `
  body { font-family: 'Segoe UI', Calibri, Arial, sans-serif; line-height: 1.6; color: #111; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
  h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; border-bottom: 2px solid #eee; padding-bottom: 12px; }
  h2 { font-size: 21px; font-weight: 600; margin-top: 26px; }
  h3 { font-size: 17px; font-weight: 600; margin-top: 22px; }
  p { margin: 8px 0; font-size: 15px; }
  ul, ol { margin: 8px 0; padding-left: 24px; }
  li { margin: 4px 0; }
  blockquote { border-left: 3px solid #4263eb; margin: 14px 0; padding: 4px 14px; color: #555; }
  pre { background: #f4f4f4; border: 1px solid #e0e0e0; border-radius: 4px; padding: 12px; overflow-x: auto; font-family: Consolas, monospace; font-size: 13px; }
  table { border-collapse: collapse; width: 100%; margin: 14px 0; font-size: 14px; }
  th { background: #4263eb; color: #fff; text-align: left; padding: 7px 10px; }
  td { border: 1px solid #e0e0e0; padding: 6px 10px; }
  tr.totali td { background: #f1f3f5; }
  figure { margin: 16px 0; }
  img { max-width: 100%; height: auto; }
  figcaption { font-size: 13px; color: #666; margin-top: 4px; }
  .scheda { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 12px 16px; margin: 16px 0 24px 0; }
  .richiamo { background: #fff9db; border-left: 3px solid #f59f00; padding: 10px 14px; margin: 14px 0; }
  .percorso { font-family: Consolas, monospace; font-size: 13px; color: #555; }
  .attivita { margin: 4px 0; }
  @media print { body { padding: 0; } }
`;

/** Nome file ricavato dal titolo, ripulito dai caratteri non ammessi. */
function nomeDaTitolo(titolo: string): string {
  return titolo.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'pagina';
}

// ─────────────────────────────────────────────────────────────
// FUNZIONI PUBBLICHE
// ─────────────────────────────────────────────────────────────

/** Esporta la pagina in Markdown. */
export async function exportPageToMarkdown(page: Page, blocks: Block[] = []): Promise<void> {
  let md = `# ${page.icon ? page.icon + ' ' : ''}${page.title}\n\n`;

  if (page.properties && Object.keys(page.properties).length > 0) {
    md += `> **Stato**: ${page.status || 'N/D'} | **Priorità**: ${page.priority}\n`;
    for (const [chiave, valore] of Object.entries(page.properties)) {
      if (valore !== undefined && valore !== null && valore !== '') {
        md += `> **${chiave}**: ${typeof valore === 'object' ? JSON.stringify(valore) : valore}\n`;
      }
    }
    md += `\n---\n\n`;
  }

  for (const blocco of blocks) md += bloccoInMarkdown(blocco);

  await salvaFile(md, `${nomeDaTitolo(page.title)}.md`, 'text/markdown;charset=utf-8', 'md', 'Documento Markdown');
}

/** Esporta la pagina in un documento apribile con Word. */
export async function exportPageToDocx(page: Page, blocks: Block[] = []): Promise<void> {
  const corpo =
    `<h1>${page.icon ? escapeHtml(page.icon) + ' ' : ''}${escapeHtml(page.title)}</h1>` +
    intestazioneHtml(page) +
    blocks.map(bloccoInHtml).join('');

  const documento = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>${escapeHtml(page.title)}</title><style>${STILE_DOCUMENTO}</style></head>
<body>${corpo}</body></html>`;

  await salvaFile(documento, `${nomeDaTitolo(page.title)}.doc`, 'application/msword;charset=utf-8', 'doc', 'Documento Word');
}

/** Apre il dialogo di stampa per salvare la pagina in PDF. */
export function exportPageToPdf(page: Page, blocks: Block[] = []): void {
  const corpo =
    `<h1>${page.icon ? escapeHtml(page.icon) + ' ' : ''}${escapeHtml(page.title)}</h1>` +
    intestazioneHtml(page) +
    blocks.map(bloccoInHtml).join('');

  stampaDocumento(`<!doctype html><html lang="it">
<head><meta charset="utf-8"><title>${escapeHtml(page.title)}</title><style>${STILE_DOCUMENTO}</style></head>
<body>${corpo}</body></html>`);
}

function escapeCsv(str: string): string {
  return `"${String(str ?? '').replace(/"/g, '""')}"`;
}

/** Esporta un elenco di pagine in CSV. */
export async function exportTableToCsv(
  items: Page[],
  schema: PropertyDefinition[],
  filename = 'export',
): Promise<void> {
  if (!items || items.length === 0) return;

  const intestazioni = ['Titolo', 'Stato', 'Priorità', ...schema.map((s) => s.label)];
  const righe = items.map((item) =>
    [
      escapeCsv(item.title),
      escapeCsv(item.status || ''),
      escapeCsv(item.priority || ''),
      ...schema.map((s) => escapeCsv(String(item.properties?.[s.key] ?? ''))),
    ].join(','),
  );

  // Il segno d'ordine iniziale serve a Excel per riconoscere la codifica UTF-8.
  const csv = '﻿' + [intestazioni.join(','), ...righe].join('\r\n');
  await salvaFile(csv, `${filename}.csv`, 'text/csv;charset=utf-8', 'csv', 'Valori separati da virgola');
}

/** Esporta un elenco di pagine in un foglio apribile con Excel. */
export async function exportTableToExcel(
  items: Page[],
  schema: PropertyDefinition[],
  filename = 'export',
): Promise<void> {
  if (!items || items.length === 0) return;

  const intestazioni = ['Titolo', 'Stato', 'Priorità', ...schema.map((s) => s.label)];
  const righe = items
    .map(
      (item) => `<tr>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.status || '')}</td>
      <td>${escapeHtml(item.priority || '')}</td>
      ${schema.map((s) => `<td>${escapeHtml(String(item.properties?.[s.key] ?? ''))}</td>`).join('')}
    </tr>`,
    )
    .join('');

  const foglio = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8">
<style>
  th { background-color: #4263eb; color: #ffffff; font-weight: bold; padding: 8px; border: 1px solid #ccc; }
  td { padding: 6px; border: 1px solid #eee; }
</style>
</head>
<body><table>
<thead><tr>${intestazioni.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
<tbody>${righe}</tbody>
</table></body></html>`;

  await salvaFile(foglio, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8', 'xls', 'Foglio Excel');
}
