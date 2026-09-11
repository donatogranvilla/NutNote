import type { Page, Block, PropertyDefinition } from './types';

// Helper to trigger browser download of a blob
function downloadFile(content: BlobPart, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 1. Export Page to Markdown (.md)
export function exportPageToMarkdown(page: Page, blocks: Block[] = []) {
  let md = `# ${page.icon ? page.icon + ' ' : ''}${page.title}\n\n`;

  if (page.properties && Object.keys(page.properties).length > 0) {
    md += `> **Stato**: ${page.status || 'N/D'} | **Priorità**: ${page.priority}\n`;
    for (const [k, v] of Object.entries(page.properties)) {
      if (v !== undefined && v !== null && v !== '') {
        md += `> **${k}**: ${typeof v === 'object' ? JSON.stringify(v) : v}\n`;
      }
    }
    md += `\n---\n\n`;
  }

  // Convert blocks to Markdown
  for (const block of blocks) {
    const content = block.content || {};
    switch (block.type as any) {
      case 'heading': {
        const level = (content.attrs as any)?.level || 1;
        const text = extractTextFromTipTap(content);
        md += `${'#'.repeat(level)} ${text}\n\n`;
        break;
      }
      case 'paragraph': {
        const text = extractTextFromTipTap(content);
        if (text) md += `${text}\n\n`;
        break;
      }
      case 'bulletList': {
        const items = extractListItems(content);
        items.forEach(it => { md += `- ${it}\n`; });
        md += `\n`;
        break;
      }
      case 'orderedList': {
        const items = extractListItems(content);
        items.forEach((it, idx) => { md += `${idx + 1}. ${it}\n`; });
        md += `\n`;
        break;
      }
      case 'taskList': {
        const taskItems = (content.content as any[]) || [];
        taskItems.forEach(it => {
          const checked = it.attrs?.checked ? '[x]' : '[ ]';
          const text = extractTextFromTipTap(it);
          md += `- ${checked} ${text}\n`;
        });
        md += `\n`;
        break;
      }
      case 'blockquote': {
        const text = extractTextFromTipTap(content);
        md += `> ${text}\n\n`;
        break;
      }
      case 'codeBlock': {
        const lang = (content.attrs as any)?.language || '';
        const text = extractTextFromTipTap(content);
        md += `\`\`\`${lang}\n${text}\n\`\`\`\n\n`;
        break;
      }
      default: {
        const text = extractTextFromTipTap(content);
        if (text) md += `${text}\n\n`;
      }
    }
  }

  const safeTitle = page.title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'pagina';
  downloadFile(md, `${safeTitle}.md`, 'text/markdown;charset=utf-8');
}

// 2. Export Page to DOCX / Word compatible HTML (.doc)
export function exportPageToDocx(page: Page, blocks: Block[] = []) {
  let bodyHtml = `<h1>${page.icon ? page.icon + ' ' : ''}${escapeHtml(page.title)}</h1>`;

  if (page.properties && Object.keys(page.properties).length > 0) {
    bodyHtml += `<div style="background-color: #f1f3f5; padding: 12px; border-left: 4px solid #4263eb; margin-bottom: 20px;">`;
    bodyHtml += `<p><strong>Stato:</strong> ${escapeHtml(page.status || 'N/D')} | <strong>Priorità:</strong> ${escapeHtml(page.priority)}</p>`;
    for (const [k, v] of Object.entries(page.properties)) {
      if (v !== undefined && v !== null && v !== '') {
        bodyHtml += `<p><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</p>`;
      }
    }
    bodyHtml += `</div><hr/>`;
  }

  for (const block of blocks) {
    const content = block.content || {};
    switch (block.type as any) {
      case 'heading': {
        const level = (content.attrs as any)?.level || 1;
        const text = extractTextFromTipTap(content);
        bodyHtml += `<h${level}>${escapeHtml(text)}</h${level}>`;
        break;
      }
      case 'paragraph': {
        const text = extractTextFromTipTap(content);
        if (text) bodyHtml += `<p>${escapeHtml(text)}</p>`;
        break;
      }
      case 'bulletList': {
        const items = extractListItems(content);
        bodyHtml += `<ul>${items.map(it => `<li>${escapeHtml(it)}</li>`).join('')}</ul>`;
        break;
      }
      case 'orderedList': {
        const items = extractListItems(content);
        bodyHtml += `<ol>${items.map(it => `<li>${escapeHtml(it)}</li>`).join('')}</ol>`;
        break;
      }
      case 'taskList': {
        const taskItems = (content.content as any[]) || [];
        bodyHtml += `<ul style="list-style-type: none; padding-left: 0;">${taskItems.map(it => {
          const checked = it.attrs?.checked ? '☑' : '☐';
          return `<li>${checked} ${escapeHtml(extractTextFromTipTap(it))}</li>`;
        }).join('')}</ul>`;
        break;
      }
      case 'blockquote': {
        const text = extractTextFromTipTap(content);
        bodyHtml += `<blockquote style="border-left: 3px solid #ccc; padding-left: 10px; color: #555;">${escapeHtml(text)}</blockquote>`;
        break;
      }
      case 'codeBlock': {
        const text = extractTextFromTipTap(content);
        bodyHtml += `<pre style="background: #f8f9fa; padding: 10px; border-radius: 4px;"><code>${escapeHtml(text)}</code></pre>`;
        break;
      }
      default: {
        const text = extractTextFromTipTap(content);
        if (text) bodyHtml += `<p>${escapeHtml(text)}</p>`;
      }
    }
  }

  const docHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${escapeHtml(page.title)}</title>
    <style>
      body { font-family: 'Calibri', 'Arial', sans-serif; line-height: 1.5; color: #222; margin: 40px; }
      h1 { font-size: 24pt; color: #111; }
      h2 { font-size: 18pt; color: #333; }
      p { font-size: 11pt; margin-bottom: 8pt; }
    </style>
    </head>
    <body>${bodyHtml}</body>
    </html>
  `;

  const safeTitle = page.title.replace(/[^a-z0-9_-]/gi, '_').toLowerCase() || 'documento';
  downloadFile(docHtml, `${safeTitle}.doc`, 'application/msword;charset=utf-8');
}

// 3. Export Page to PDF (via browser print dialog with styled template)
export function exportPageToPdf(page: Page, blocks: Block[] = []) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  let bodyHtml = `<h1>${page.icon ? page.icon + ' ' : ''}${escapeHtml(page.title)}</h1>`;

  if (page.properties && Object.keys(page.properties).length > 0) {
    bodyHtml += `<div style="background-color: #f8f9fa; border: 1px solid #e9ecef; border-radius: 6px; padding: 12px 16px; margin: 16px 0 24px 0;">`;
    bodyHtml += `<p style="margin: 0 0 6px 0;"><strong>Stato:</strong> ${escapeHtml(page.status || 'N/D')} &nbsp;|&nbsp; <strong>Priorità:</strong> ${escapeHtml(page.priority)}</p>`;
    for (const [k, v] of Object.entries(page.properties)) {
      if (v !== undefined && v !== null && v !== '') {
        bodyHtml += `<p style="margin: 4px 0;"><strong>${escapeHtml(k)}:</strong> ${escapeHtml(String(v))}</p>`;
      }
    }
    bodyHtml += `</div>`;
  }

  for (const block of blocks) {
    const content = block.content || {};
    switch (block.type as any) {
      case 'heading': {
        const level = (content.attrs as any)?.level || 1;
        bodyHtml += `<h${level}>${escapeHtml(extractTextFromTipTap(content))}</h${level}>`;
        break;
      }
      case 'paragraph': {
        const text = extractTextFromTipTap(content);
        if (text) bodyHtml += `<p>${escapeHtml(text)}</p>`;
        break;
      }
      case 'bulletList': {
        const items = extractListItems(content);
        bodyHtml += `<ul>${items.map(it => `<li>${escapeHtml(it)}</li>`).join('')}</ul>`;
        break;
      }
      case 'orderedList': {
        const items = extractListItems(content);
        bodyHtml += `<ol>${items.map(it => `<li>${escapeHtml(it)}</li>`).join('')}</ol>`;
        break;
      }
      case 'taskList': {
        const taskItems = (content.content as any[]) || [];
        bodyHtml += `<ul style="list-style-type: none; padding-left: 0;">${taskItems.map(it => {
          const checked = it.attrs?.checked ? '☑' : '☐';
          return `<li style="margin: 4px 0;">${checked} ${escapeHtml(extractTextFromTipTap(it))}</li>`;
        }).join('')}</ul>`;
        break;
      }
      case 'blockquote': {
        bodyHtml += `<blockquote style="border-left: 3px solid #4263eb; padding-left: 12px; margin: 12px 0; color: #495057;">${escapeHtml(extractTextFromTipTap(content))}</blockquote>`;
        break;
      }
      case 'codeBlock': {
        bodyHtml += `<pre style="background: #f1f3f5; padding: 12px; border-radius: 6px; font-size: 13px;"><code>${escapeHtml(extractTextFromTipTap(content))}</code></pre>`;
        break;
      }
      default: {
        const text = extractTextFromTipTap(content);
        if (text) bodyHtml += `<p>${escapeHtml(text)}</p>`;
      }
    }
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${escapeHtml(page.title)}</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #111; max-width: 800px; margin: 0 auto; padding: 40px 20px; }
          h1 { font-size: 28px; font-weight: 700; margin-bottom: 8px; border-bottom: 2px solid #eee; padding-bottom: 12px; }
          h2 { font-size: 20px; font-weight: 600; margin-top: 24px; margin-bottom: 8px; }
          p { margin: 8px 0; font-size: 15px; }
          ul, ol { margin: 8px 0; padding-left: 24px; }
          li { margin: 4px 0; }
          @media print {
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        ${bodyHtml}
        <script>
          window.onload = function() {
            window.print();
            setTimeout(function() { window.close(); }, 500);
          };
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// 4. Export Table data to CSV (.csv)
export function exportTableToCsv(items: Page[], schema: PropertyDefinition[], filename = 'export') {
  if (!items || items.length === 0) return;

  const headers = ['Titolo', 'Stato', 'Priorità', ...schema.map(s => s.label)];
  const rows = items.map(item => {
    const row = [
      escapeCsv(item.title),
      escapeCsv(item.status || ''),
      escapeCsv(item.priority || ''),
      ...schema.map(s => escapeCsv(String(item.properties?.[s.key] ?? '')))
    ];
    return row.join(',');
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  downloadFile(csvContent, `${filename}.csv`, 'text/csv;charset=utf-8');
}

// 5. Export Table data to Excel (.xls HTML table)
export function exportTableToExcel(items: Page[], schema: PropertyDefinition[], filename = 'export') {
  if (!items || items.length === 0) return;

  const headers = ['Titolo', 'Stato', 'Priorità', ...schema.map(s => s.label)];
  const tableRows = items.map(item => `
    <tr>
      <td>${escapeHtml(item.title)}</td>
      <td>${escapeHtml(item.status || '')}</td>
      <td>${escapeHtml(item.priority || '')}</td>
      ${schema.map(s => `<td>${escapeHtml(String(item.properties?.[s.key] ?? ''))}</td>`).join('')}
    </tr>
  `).join('');

  const xlsHtml = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8">
    <style>
      th { background-color: #4263eb; color: #ffffff; font-weight: bold; padding: 8px; border: 1px solid #ccc; }
      td { padding: 6px; border: 1px solid #eee; }
    </style>
    </head>
    <body>
      <table>
        <thead><tr>${headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')}</tr></thead>
        <tbody>${tableRows}</tbody>
      </table>
    </body>
    </html>
  `;

  downloadFile(xlsHtml, `${filename}.xls`, 'application/vnd.ms-excel;charset=utf-8');
}

// Helpers
function escapeHtml(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeCsv(str: string): string {
  const s = String(str || '').replace(/"/g, '""');
  return `"${s}"`;
}

function extractTextFromTipTap(node: any): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (node.type === 'text') return node.text || '';
  if (Array.isArray(node.content)) {
    return node.content.map(extractTextFromTipTap).join('');
  }
  return '';
}

function extractListItems(node: any): string[] {
  if (!node || !Array.isArray(node.content)) return [];
  return node.content.map((item: any) => extractTextFromTipTap(item));
}
