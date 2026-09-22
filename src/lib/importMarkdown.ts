import { v4 as uuidv4 } from 'uuid';

export interface ParsedMarkdownBlock {
  id: string;
  type: string;
  text: string;
  level?: number;
  checked?: boolean;
  language?: string;
  calloutIcon?: string;
  mermaidCode?: string;
  mermaidTitle?: string;
}

export interface ParsedMarkdownDocument {
  title: string;
  blocks: ParsedMarkdownBlock[];
}

/**
 * Parses a raw Markdown string into structured NutNote blocks.
 */
export function parseMarkdown(md: string, defaultTitle?: string): ParsedMarkdownDocument {
  const lines = md.split(/\r?\n/);
  const blocks: ParsedMarkdownBlock[] = [];
  let extractedTitle = defaultTitle || 'Documento Importato';
  let titleFound = false;

  let inCodeBlock = false;
  let codeLang = '';
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // Handle fenced code blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        // Closing code block
        const codeText = codeBuffer.join('\n');
        if (codeLang === 'mermaid') {
          blocks.push({
            id: `blk-${uuidv4().slice(0, 8)}`,
            type: 'mermaid',
            text: 'Diagramma Mermaid Importato',
            mermaidCode: codeText,
            mermaidTitle: 'Diagramma Mermaid Importato',
          });
        } else {
          blocks.push({
            id: `blk-${uuidv4().slice(0, 8)}`,
            type: 'code',
            text: codeText,
            language: codeLang || 'text',
          });
        }
        inCodeBlock = false;
        codeBuffer = [];
        codeLang = '';
      } else {
        // Opening code block
        inCodeBlock = true;
        codeLang = trimmed.replace(/^```/, '').trim().toLowerCase();
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine);
      continue;
    }

    // Skip consecutive empty lines
    if (!trimmed) {
      continue;
    }

    // Horizontal Rule / Divider
    if (/^(---|___|\*\*\*)$/.test(trimmed)) {
      blocks.push({
        id: `blk-${uuidv4().slice(0, 8)}`,
        type: 'divider',
        text: '',
      });
      continue;
    }

    // Headings
    if (trimmed.startsWith('# ') && !titleFound) {
      extractedTitle = trimmed.replace(/^#\s+/, '').trim();
      titleFound = true;
      continue;
    }

    if (trimmed.startsWith('# ')) {
      blocks.push({
        id: `blk-${uuidv4().slice(0, 8)}`,
        type: 'heading1',
        text: trimmed.replace(/^#\s+/, '').trim(),
        level: 1,
      });
      continue;
    }

    if (trimmed.startsWith('## ')) {
      blocks.push({
        id: `blk-${uuidv4().slice(0, 8)}`,
        type: 'heading2',
        text: trimmed.replace(/^##\s+/, '').trim(),
        level: 2,
      });
      continue;
    }

    if (trimmed.startsWith('### ')) {
      blocks.push({
        id: `blk-${uuidv4().slice(0, 8)}`,
        type: 'heading3',
        text: trimmed.replace(/^###\s+/, '').trim(),
        level: 3,
      });
      continue;
    }

    // Task list / checkboxes
    if (/^-\s+\[([ xX])\]\s+/.test(trimmed)) {
      const match = trimmed.match(/^-\s+\[([ xX])\]\s+(.*)/);
      if (match) {
        blocks.push({
          id: `blk-${uuidv4().slice(0, 8)}`,
          type: 'todo',
          text: match[2].trim(),
          checked: match[1].toLowerCase() === 'x',
        });
        continue;
      }
    }

    // Bullet list
    if (/^[-*+]\s+/.test(trimmed)) {
      blocks.push({
        id: `blk-${uuidv4().slice(0, 8)}`,
        type: 'bullet',
        text: trimmed.replace(/^[-*+]\s+/, '').trim(),
      });
      continue;
    }

    // Numbered list
    if (/^\d+\.\s+/.test(trimmed)) {
      blocks.push({
        id: `blk-${uuidv4().slice(0, 8)}`,
        type: 'numbered',
        text: trimmed.replace(/^\d+\.\s+/, '').trim(),
      });
      continue;
    }

    // Callout / Blockquote
    if (trimmed.startsWith('> ')) {
      const quoteText = trimmed.replace(/^>\s*/, '').trim();
      if (quoteText.startsWith('[!NOTE]') || quoteText.startsWith('[!TIP]') || quoteText.startsWith('[!IMPORTANT]')) {
        blocks.push({
          id: `blk-${uuidv4().slice(0, 8)}`,
          type: 'callout',
          text: quoteText.replace(/^\[![A-Z]+\]\s*/, '').trim(),
          calloutIcon: quoteText.includes('TIP') ? '💡' : quoteText.includes('IMPORTANT') ? '⚠️' : 'ℹ️',
        });
      } else {
        blocks.push({
          id: `blk-${uuidv4().slice(0, 8)}`,
          type: 'quote',
          text: quoteText,
        });
      }
      continue;
    }

    // Default: regular paragraph
    blocks.push({
      id: `blk-${uuidv4().slice(0, 8)}`,
      type: 'paragraph',
      text: trimmed,
    });
  }

  // If unclosed code block remains at EOF
  if (inCodeBlock && codeBuffer.length > 0) {
    blocks.push({
      id: `blk-${uuidv4().slice(0, 8)}`,
      type: 'code',
      text: codeBuffer.join('\n'),
      language: codeLang || 'text',
    });
  }

  // Fallback: at least 1 paragraph
  if (blocks.length === 0) {
    blocks.push({
      id: `blk-${uuidv4().slice(0, 8)}`,
      type: 'paragraph',
      text: '',
    });
  }

  return {
    title: extractedTitle,
    blocks,
  };
}

/**
 * Reads a File object from an HTML <input type="file" /> and returns parsed markdown.
 */
export async function readMarkdownFile(file: File): Promise<ParsedMarkdownDocument> {
  const content = await file.text();
  const fallbackTitle = file.name.replace(/\.(md|markdown|txt)$/i, '');
  return parseMarkdown(content, fallbackTitle);
}
