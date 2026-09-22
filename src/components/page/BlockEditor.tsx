import React, { useState, useEffect, useRef } from 'react';
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext, sortableKeyboardCoordinates,
  verticalListSortingStrategy, useSortable, arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { v4 as uuidv4 } from 'uuid';
import type { Block } from '../../lib/types';
import {
  GripVertical, Plus, Trash2, Copy,
  Heading1, Heading2, Heading3, List, ListOrdered,
  CheckSquare, Quote, Code, Minus, Image as ImageIcon,
  Lightbulb, CheckCircle2, CornerDownLeft, Hash, MoreHorizontal,
  FolderOpen, Calendar, Globe, ShieldCheck, GitBranch, Calculator, Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderBlock, EventBlock, BookmarkBlock, VaultBlock,
  type UtilityBlockData
} from './UtilityBlocks';
import {
  MermaidBlock, CalcTableBlock, DatabaseQueryBlock,
  type MermaidBlockData, type CalcTableBlockData, type DatabaseQueryBlockData,
} from './AdvancedBlocks';

// ── Types ──
interface NotionBlock extends UtilityBlockData, MermaidBlockData, CalcTableBlockData, DatabaseQueryBlockData {
  id: string;
  type: string;
  text: string;
  checked?: boolean;
  level?: number;
  language?: string;
  src?: string;
  calloutIcon?: string;
}

interface BlockEditorProps {
  pageId: string;
  initialBlocks: Block[];
  onSave: (blocks: Block[], plainText?: string) => void;
  editable?: boolean;
}

// ── Conversion helpers ──
function blocksToNotion(blocks: Block[]): NotionBlock[] {
  if (!blocks || blocks.length === 0) return [{ id: uuidv4(), type: 'paragraph', text: '' }];

  return blocks.map(b => {
    const c = (b.content || {}) as Record<string, any>;
    let text = '';
    let level = 1;
    let checked = false;
    let src = '';
    let language = '';
    let calloutIcon = '💡';

    if (typeof c === 'string') text = c;
    else if (c.text) text = String(c.text);
    else if (c.content && Array.isArray(c.content)) text = flatText(c.content);

    if (c.attrs) {
      const a = c.attrs as any;
      if (a.level) level = a.level;
      if (a.checked !== undefined) checked = a.checked;
      if (a.src) src = a.src;
      if (a.language) language = a.language;
      if (a.calloutIcon) calloutIcon = a.calloutIcon;
    }

    let type = b.type as string;
    if (type === 'heading') type = level === 1 ? 'heading1' : level === 2 ? 'heading2' : 'heading3';
    else if (type === 'bulletList' || type === 'bullet_list') type = 'bullet';
    else if (type === 'orderedList' || type === 'numbered_list') type = 'numbered';
    else if (type === 'taskList' || type === 'taskItem') type = 'todo';
    else if (type === 'codeBlock') type = 'code';
    else if (type === 'blockquote') type = 'quote';

    // Utility blocks fields extraction
    const folderPath = c.folderPath || (c.attrs && c.attrs.folderPath) || '';
    const folderName = c.folderName || (c.attrs && c.attrs.folderName) || '';
    const cachedFiles = c.cachedFiles || (c.attrs && c.attrs.cachedFiles) || [];
    const eventDate = c.eventDate || (c.attrs && c.attrs.eventDate) || '';
    const eventTime = c.eventTime || (c.attrs && c.attrs.eventTime) || '';
    const eventEndDate = c.eventEndDate || (c.attrs && c.attrs.eventEndDate) || '';
    const eventEndTime = c.eventEndTime || (c.attrs && c.attrs.eventEndTime) || '';
    const eventLocation = c.eventLocation || (c.attrs && c.attrs.eventLocation) || '';
    const eventDesc = c.eventDesc || (c.attrs && c.attrs.eventDesc) || '';
    const url = c.url || (c.attrs && c.attrs.url) || '';
    const bookmarkTitle = c.bookmarkTitle || (c.attrs && c.attrs.bookmarkTitle) || '';
    const bookmarkDesc = c.bookmarkDesc || (c.attrs && c.attrs.bookmarkDesc) || '';
    const bookmarkCategory = c.bookmarkCategory || (c.attrs && c.attrs.bookmarkCategory) || '';
    const vaultService = c.vaultService || (c.attrs && c.attrs.vaultService) || '';
    const vaultUsername = c.vaultUsername || (c.attrs && c.attrs.vaultUsername) || '';
    const vaultPassword = c.vaultPassword || (c.attrs && c.attrs.vaultPassword) || '';
    const vaultUrl = c.vaultUrl || (c.attrs && c.attrs.vaultUrl) || '';
    const vaultNotes = c.vaultNotes || (c.attrs && c.attrs.vaultNotes) || '';

    // Advanced blocks fields extraction
    const mermaidCode = c.mermaidCode || (c.attrs && c.attrs.mermaidCode) || '';
    const mermaidTitle = c.mermaidTitle || (c.attrs && c.attrs.mermaidTitle) || '';
    const calcTitle = c.calcTitle || (c.attrs && c.attrs.calcTitle) || '';
    const columns = c.columns || (c.attrs && c.attrs.columns) || [];
    const rows = c.rows || (c.attrs && c.attrs.rows) || [];
    const showTotalRow = c.showTotalRow !== undefined ? c.showTotalRow : (c.attrs && c.attrs.showTotalRow);
    const queryTypeId = c.queryTypeId || (c.attrs && c.attrs.queryTypeId) || '';
    const queryStatus = c.queryStatus || (c.attrs && c.attrs.queryStatus) || '';
    const queryLimit = c.queryLimit || (c.attrs && c.attrs.queryLimit) || 20;
    const queryTitle = c.queryTitle || (c.attrs && c.attrs.queryTitle) || '';

    return {
      id: b.id || uuidv4(), type, text, level, checked, src, language, calloutIcon,
      folderPath, folderName, cachedFiles,
      eventDate, eventTime, eventEndDate, eventEndTime, eventLocation, eventDesc,
      url, bookmarkTitle, bookmarkDesc, bookmarkCategory,
      vaultService, vaultUsername, vaultPassword, vaultUrl, vaultNotes,
      mermaidCode, mermaidTitle,
      calcTitle, columns, rows, showTotalRow,
      queryTypeId, queryStatus, queryLimit, queryTitle,
    };
  });
}

function flatText(nodes: any[]): string {
  return nodes.map(n => n.text ? n.text : n.content ? flatText(n.content) : '').join(' ');
}

function notionToBlocks(items: NotionBlock[], pageId: string): { blocks: Block[], plainText: string } {
  const blocks: Block[] = items.map((item, i) => {
    let type = item.type;
    let content: Record<string, unknown> = { text: item.text };

    if (type === 'heading1' || type === 'heading2' || type === 'heading3') {
      const lvl = type === 'heading1' ? 1 : type === 'heading2' ? 2 : 3;
      type = 'heading';
      content = { attrs: { level: lvl }, content: [{ type: 'text', text: item.text }] };
    } else if (type === 'todo') {
      type = 'taskList';
      content = { attrs: { checked: !!item.checked }, content: [{ type: 'text', text: item.text }] };
    } else if (type === 'bullet') {
      type = 'bulletList';
      content = { content: [{ type: 'text', text: item.text }] };
    } else if (type === 'numbered') {
      type = 'orderedList';
      content = { content: [{ type: 'text', text: item.text }] };
    } else if (type === 'quote') {
      type = 'blockquote';
      content = { content: [{ type: 'text', text: item.text }] };
    } else if (type === 'code') {
      type = 'codeBlock';
      content = { attrs: { language: item.language || '' }, content: [{ type: 'text', text: item.text }] };
    } else if (type === 'callout') {
      content = { attrs: { calloutIcon: item.calloutIcon || '💡' }, text: item.text };
    } else if (type === 'image') {
      content = { attrs: { src: item.src || '' }, caption: item.text };
    } else if (type === 'divider') {
      content = {};
    } else if (type === 'folder') {
      content = {
        text: item.text || item.folderName || 'Cartella Collegata',
        folderPath: item.folderPath || '',
        folderName: item.folderName || '',
        cachedFiles: item.cachedFiles || [],
      };
    } else if (type === 'event') {
      content = {
        text: item.text || 'Evento',
        eventDate: item.eventDate || '',
        eventTime: item.eventTime || '',
        eventEndDate: item.eventEndDate || '',
        eventEndTime: item.eventEndTime || '',
        eventLocation: item.eventLocation || '',
        eventDesc: item.eventDesc || '',
      };
    } else if (type === 'bookmark') {
      content = {
        text: item.text || item.bookmarkTitle || item.url || 'Segnalibro Web',
        url: item.url || '',
        bookmarkTitle: item.bookmarkTitle || '',
        bookmarkDesc: item.bookmarkDesc || '',
        bookmarkCategory: item.bookmarkCategory || '',
      };
    } else if (type === 'vault') {
      content = {
        text: item.text || item.vaultService || 'Credenziali Protette',
        vaultService: item.vaultService || '',
        vaultUsername: item.vaultUsername || '',
        vaultPassword: item.vaultPassword || '',
        vaultUrl: item.vaultUrl || '',
        vaultNotes: item.vaultNotes || '',
      };
    } else if (type === 'mermaid') {
      content = {
        text: item.text || item.mermaidTitle || 'Diagramma Mermaid',
        mermaidCode: item.mermaidCode || '',
        mermaidTitle: item.mermaidTitle || '',
      };
    } else if (type === 'calcTable') {
      content = {
        text: item.text || item.calcTitle || 'Tabella Calcolata',
        calcTitle: item.calcTitle || '',
        columns: item.columns || [],
        rows: item.rows || [],
        showTotalRow: item.showTotalRow !== undefined ? item.showTotalRow : true,
      };
    } else if (type === 'database_view') {
      content = {
        text: item.text || item.queryTitle || 'Vista Database Dinamica',
        queryTitle: item.queryTitle || '',
        queryTypeId: item.queryTypeId || '',
        queryStatus: item.queryStatus || '',
        queryLimit: item.queryLimit || 20,
      };
    } else {
      type = 'paragraph';
      content = { content: [{ type: 'text', text: item.text }] };
    }

    return {
      id: item.id, pageId, parentBlockId: null,
      type: type as any, content, position: i,
      createdAt: '', updatedAt: '',
    };
  });

  return { blocks, plainText: items.map(i => i.text).filter(Boolean).join(' ') };
}

// ── Slash commands ──
const SLASH_CMDS = [
  { type: 'paragraph', label: 'Testo Normale', icon: <span style={{ fontWeight: 700 }}>¶</span>, keys: ['testo', 'text', 'p'] },
  { type: 'heading1', label: 'Titolo Grande (H1)', icon: <Heading1 size={16} />, keys: ['h1', 'titolo'] },
  { type: 'heading2', label: 'Titolo Medio (H2)', icon: <Heading2 size={16} />, keys: ['h2'] },
  { type: 'heading3', label: 'Titolo Piccolo (H3)', icon: <Heading3 size={16} />, keys: ['h3'] },
  { type: 'todo', label: 'Attività (To-do)', icon: <CheckSquare size={16} />, keys: ['todo', 'task', 'check'] },
  { type: 'bullet', label: 'Elenco Puntato', icon: <List size={16} />, keys: ['bullet', 'lista'] },
  { type: 'numbered', label: 'Elenco Numerato', icon: <ListOrdered size={16} />, keys: ['numbered', 'numerato'] },
  { type: 'callout', label: 'Riquadro Callout', icon: <Lightbulb size={16} />, keys: ['callout', 'box', 'nota'] },
  { type: 'quote', label: 'Citazione', icon: <Quote size={16} />, keys: ['quote', 'citazione'] },
  { type: 'code', label: 'Blocco di Codice', icon: <Code size={16} />, keys: ['code', 'codice'] },
  { type: 'divider', label: 'Linea Divisoria', icon: <Minus size={16} />, keys: ['divider', 'linea'] },
  { type: 'image', label: 'Immagine', icon: <ImageIcon size={16} />, keys: ['image', 'immagine'] },
  { type: 'folder', label: 'Cartella / Esplora Risorse', icon: <FolderOpen size={16} color="var(--warning, #f59f00)" />, keys: ['cartella', 'folder', 'esplora', 'file', 'disco', 'explorer'] },
  { type: 'event', label: 'Evento & Calendario (.ics)', icon: <Calendar size={16} color="var(--accent)" />, keys: ['evento', 'event', 'calendario', 'data', 'scadenza', 'ics', 'meeting'] },
  { type: 'bookmark', label: 'Segnalibro & Link Web', icon: <Globe size={16} color="#20c997" />, keys: ['link', 'segnalibro', 'bookmark', 'url', 'web', 'sito', 'doc'] },
  { type: 'vault', label: 'Cassaforte Password & Secret', icon: <ShieldCheck size={16} color="#fab005" />, keys: ['vault', 'password', 'credenziali', 'secret', 'chiave', 'login', 'token'] },
  { type: 'mermaid', label: 'Diagramma Mermaid (Flowchart & Schemi)', icon: <GitBranch size={16} color="#6366f1" />, keys: ['mermaid', 'diagram', 'flowchart', 'schema', 'albero', 'grafo'] },
  { type: 'calcTable', label: 'Tabella Calcolata (Preventivi & Formule)', icon: <Calculator size={16} color="#10b981" />, keys: ['calc', 'tabella', 'preventivo', 'computo', 'formule', 'somma', 'foglio'] },
  { type: 'database_view', label: 'Vista Database Incorporata (Filtra Pagine)', icon: <Database size={16} color="#f59f00" />, keys: ['query', 'database', 'vista', 'filtro', 'pagine', 'task'] },
];

// ── Editor Component ──
export function BlockEditor({ pageId, initialBlocks, onSave, editable = true }: BlockEditorProps) {
  const [items, setItems] = useState<NotionBlock[]>(() => blocksToNotion(initialBlocks));
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving'>('saved');
  const [focusId, setFocusId] = useState<string | null>(null);
  const skipSave = useRef(true);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSaveRef = useRef(onSave);
  onSaveRef.current = onSave;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // Re-sync when page changes
  useEffect(() => {
    setItems(blocksToNotion(initialBlocks));
    skipSave.current = true;
  }, [pageId]);

  // Debounced save via ref to avoid stale closures
  useEffect(() => {
    if (skipSave.current) { skipSave.current = false; return; }
    setSaveStatus('saving');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const { blocks, plainText } = notionToBlocks(items, pageId);
      onSaveRef.current(blocks, plainText);
      setSaveStatus('saved');
    }, 1200);
    return () => { if (saveTimer.current) clearTimeout(saveTimer.current); };
  }, [items, pageId]);

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) {
      setItems(c => arrayMove(c, c.findIndex(i => i.id === active.id), c.findIndex(i => i.id === over.id)));
    }
  };

  const update = (id: string, u: Partial<NotionBlock>) => setItems(c => c.map(i => i.id === id ? { ...i, ...u } : i));

  const insertAfter = (id: string, type = 'paragraph') => {
    const newId = uuidv4();
    setItems(c => {
      const idx = c.findIndex(i => i.id === id);
      const copy = [...c];
      if (idx === -1) {
        copy.push({ id: newId, type, text: '' });
      } else {
        copy.splice(idx + 1, 0, { id: newId, type, text: '' });
      }
      return copy;
    });
    setFocusId(newId);
  };

  const remove = (id: string) => {
    setItems(c => c.length <= 1 ? [{ id: uuidv4(), type: 'paragraph', text: '' }] : c.filter(i => i.id !== id));
  };

  const duplicate = (id: string) => {
    setItems(c => {
      const idx = c.findIndex(i => i.id === id);
      if (idx === -1) return c;
      const copy = [...c];
      copy.splice(idx + 1, 0, { ...c[idx], id: uuidv4() });
      return copy;
    });
  };

  return (
    <div style={{ marginTop: '8px' }}>
      {/* Status bar */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '6px 12px', marginBottom: '12px',
        fontSize: '12px', color: 'var(--text-muted)',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '8px',
        border: '1px solid var(--border)',
      }}>
        <span>{items.length} blocchi · Digita <kbd style={{ padding: '1px 5px', border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--bg-app)', fontSize: '11px', fontWeight: 600 }}>/</kbd> per formattare</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          {saveStatus === 'saving' ? (
            <span style={{ color: 'var(--warning)', fontWeight: 500 }}>Salvataggio...</span>
          ) : (
            <><CheckCircle2 size={13} color="var(--success)" /><span style={{ color: 'var(--text-secondary)' }}>Salvato</span></>
          )}
        </span>
      </div>

      {/* Blocks canvas */}
      <div style={{ padding: '0 0 60px' }}>
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
            {items.map((item, idx) => (
              <BlockRow
                key={item.id}
                item={item}
                index={idx}
                editable={editable}
                shouldFocus={focusId === item.id}
                onFocused={() => setFocusId(null)}
                onUpdate={u => update(item.id, u)}
                onInsert={() => insertAfter(item.id)}
                onDelete={() => remove(item.id)}
                onDuplicate={() => duplicate(item.id)}
                pageId={pageId}
              />
            ))}
          </SortableContext>
        </DndContext>

        {editable && (
          <div
            onClick={() => insertAfter(items[items.length - 1]?.id || '')}
            style={{
              padding: '14px 16px',
              marginTop: '12px',
              color: 'var(--text-muted)',
              fontSize: '14px',
              cursor: 'text',
              borderRadius: '8px',
              border: '1px dashed var(--border)',
              backgroundColor: 'transparent',
              transition: 'background-color 0.15s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            + Clicca qui per aggiungere un nuovo paragrafo...
          </div>
        )}
      </div>
    </div>
  );
}

// ── Block Row ──
interface BlockRowProps {
  item: NotionBlock; index: number; editable: boolean;
  shouldFocus: boolean; onFocused: () => void;
  onUpdate: (u: Partial<NotionBlock>) => void;
  onInsert: () => void; onDelete: () => void; onDuplicate: () => void;
  pageId: string;
}

function BlockRow({ item, index, editable, shouldFocus, onFocused, onUpdate, onInsert, onDelete, onDuplicate, pageId }: BlockRowProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });
  const [hovered, setHovered] = useState(false);
  const [slash, setSlash] = useState<string | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when created
  useEffect(() => {
    if (shouldFocus && textRef.current) {
      textRef.current.focus();
      onFocused();
    }
  }, [shouldFocus, onFocused]);

  // Auto-resize
  useEffect(() => {
    if (textRef.current) {
      textRef.current.style.height = 'auto';
      textRef.current.style.height = textRef.current.scrollHeight + 'px';
    }
  }, [item.text, item.type]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!editable) return;

    if (e.key === '/' && (!item.text || item.text === '')) {
      setSlash('');
      return;
    }

    if (slash !== null && e.key === 'Escape') { setSlash(null); return; }

    if (e.key === 'Enter' && !e.shiftKey && slash === null && item.type !== 'code') {
      e.preventDefault();
      onInsert();
    }

    if (e.key === 'Backspace' && item.text === '' && slash === null) {
      e.preventDefault();
      if (item.type !== 'paragraph') onUpdate({ type: 'paragraph' });
      else onDelete();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onUpdate({ text: val });

    // Track slash query
    if (val.includes('/')) {
      const after = val.split('/').pop() || '';
      if (!after.includes(' ')) setSlash(after.toLowerCase());
      else setSlash(null);
    } else {
      setSlash(null);
    }
  };

  const selectSlash = (type: string) => {
    onUpdate({ type, text: item.text.replace(/\/[^\s]*$/, '').trim() });
    setSlash(null);
    setTimeout(() => textRef.current?.focus(), 30);
  };

  const copyBlockLink = () => {
    const link = `nutnote://block/${pageId}/${item.id}`;
    navigator.clipboard.writeText(link).catch(err => {
      console.error('Failed to copy text: ', err);
    });
    setShowMenu(false);
  };

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    position: 'relative',
    zIndex: isDragging ? 100 : showMenu ? 50 : 1,
    margin: '6px 0',
  };

  const textStyle: React.CSSProperties = {
    width: '100%', resize: 'none', border: 'none', outline: 'none',
    backgroundColor: 'transparent', color: 'var(--text-primary)',
    fontFamily: 'inherit', fontSize: '15px', lineHeight: 1.7,
    padding: '4px 0', overflow: 'hidden', display: 'block',
  };

  return (
    <motion.div
      id={`block-${item.id}`}
      ref={setNodeRef}
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowMenu(false); }}
      animate={{ 
        scale: isDragging ? 0.98 : 1, 
        opacity: isDragging ? 0.8 : 1,
        boxShadow: isDragging ? 'var(--shadow-drag)' : 'none',
        backgroundColor: isDragging ? 'var(--bg-surface)' : hovered ? 'var(--bg-surface-hover)' : 'transparent',
        borderRadius: '8px'
      }}
      transition={{ duration: 0.15 }}
    >
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        padding: isDragging ? '8px' : '4px 10px',
        borderRadius: '8px',
      }}>
        {/* Content (Left) */}
        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {item.type === 'paragraph' && (
            <textarea
              ref={textRef}
              rows={1}
              value={item.text}
              onChange={handleChange}
              onKeyDown={handleKey}
              disabled={!editable}
              placeholder="Scrivi qualcosa o digita / per i comandi..."
              style={textStyle}
            />
          )}

          {item.type === 'heading1' && (
            <textarea
              ref={textRef}
              rows={1}
              value={item.text}
              onChange={handleChange}
              onKeyDown={handleKey}
              disabled={!editable}
              placeholder="Titolo Principale (H1)"
              style={{ ...textStyle, fontSize: '26px', fontWeight: 700, letterSpacing: '-0.02em' }}
            />
          )}

          {item.type === 'heading2' && (
            <textarea
              ref={textRef}
              rows={1}
              value={item.text}
              onChange={handleChange}
              onKeyDown={handleKey}
              disabled={!editable}
              placeholder="Titolo Medio (H2)"
              style={{ ...textStyle, fontSize: '21px', fontWeight: 600, letterSpacing: '-0.01em' }}
            />
          )}

          {item.type === 'heading3' && (
            <textarea
              ref={textRef}
              rows={1}
              value={item.text}
              onChange={handleChange}
              onKeyDown={handleKey}
              disabled={!editable}
              placeholder="Titolo Piccolo (H3)"
              style={{ ...textStyle, fontSize: '17px', fontWeight: 600 }}
            />
          )}

          {item.type === 'todo' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '2px 0' }}>
              <input
                type="checkbox"
                checked={!!item.checked}
                onChange={e => onUpdate({ checked: e.target.checked })}
                style={{ width: 18, height: 18, marginTop: 4, accentColor: 'var(--accent)', cursor: 'pointer' }}
              />
              <textarea
                ref={textRef}
                rows={1}
                value={item.text}
                onChange={handleChange}
                onKeyDown={handleKey}
                disabled={!editable}
                placeholder="Nuova attività..."
                style={{ ...textStyle, textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? 'var(--text-muted)' : 'var(--text-primary)' }}
              />
            </div>
          )}

          {item.type === 'bullet' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ lineHeight: '28px', color: 'var(--accent)', fontSize: '18px', fontWeight: 'bold' }}>•</span>
              <textarea
                ref={textRef}
                rows={1}
                value={item.text}
                onChange={handleChange}
                onKeyDown={handleKey}
                disabled={!editable}
                placeholder="Elemento elenco..."
                style={textStyle}
              />
            </div>
          )}

          {item.type === 'numbered' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ lineHeight: '28px', color: 'var(--text-secondary)', fontWeight: 700, fontSize: '14px', minWidth: 18 }}>{index + 1}.</span>
              <textarea
                ref={textRef}
                rows={1}
                value={item.text}
                onChange={handleChange}
                onKeyDown={handleKey}
                disabled={!editable}
                placeholder="Elemento numerato..."
                style={textStyle}
              />
            </div>
          )}

          {item.type === 'callout' && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px 16px', backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '8px', margin: '4px 0' }}>
              <span style={{ fontSize: '20px' }}>{item.calloutIcon || '💡'}</span>
              <textarea
                ref={textRef}
                rows={1}
                value={item.text}
                onChange={handleChange}
                onKeyDown={handleKey}
                disabled={!editable}
                placeholder="Nota o avviso importante..."
                style={{ ...textStyle, backgroundColor: 'transparent' }}
              />
            </div>
          )}

          {item.type === 'quote' && (
            <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '14px', margin: '4px 0' }}>
              <textarea
                ref={textRef}
                rows={1}
                value={item.text}
                onChange={handleChange}
                onKeyDown={handleKey}
                disabled={!editable}
                placeholder="Citazione..."
                style={{ ...textStyle, fontStyle: 'italic', color: 'var(--text-secondary)' }}
              />
            </div>
          )}

          {item.type === 'code' && (
            <div style={{ backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)', borderRadius: '8px', padding: '12px 14px', margin: '4px 0' }}>
              <textarea
                ref={textRef}
                rows={2}
                value={item.text}
                onChange={handleChange}
                onKeyDown={handleKey}
                disabled={!editable}
                placeholder="// Scrivi codice qui..."
                style={{ ...textStyle, fontFamily: 'var(--font-mono)', fontSize: '13px' }}
              />
            </div>
          )}

          {item.type === 'divider' && <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '14px 0' }} />}

          {item.type === 'image' && (
            <div style={{ margin: '6px 0' }}>
              {item.src ? (
                <img src={item.src} alt="" style={{ maxWidth: '100%', borderRadius: '8px', border: '1px solid var(--border)' }} />
              ) : (
                <div style={{ padding: '20px', border: '1px dashed var(--border)', borderRadius: '8px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Inserisci l'URL dell'immagine nel campo sottostante
                </div>
              )}
              <input
                type="text"
                value={item.src || ''}
                onChange={e => onUpdate({ src: e.target.value })}
                placeholder="URL immagine (https://...)..."
                style={{ ...textStyle, fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}
              />
            </div>
          )}

          {item.type === 'folder' && (
            <FolderBlock
              item={item}
              editable={editable}
              onUpdate={onUpdate}
            />
          )}

          {item.type === 'event' && (
            <EventBlock
              item={item}
              editable={editable}
              onUpdate={onUpdate}
            />
          )}

          {item.type === 'bookmark' && (
            <BookmarkBlock
              item={item}
              editable={editable}
              onUpdate={onUpdate}
            />
          )}

          {item.type === 'vault' && (
            <VaultBlock
              item={item}
              editable={editable}
              onUpdate={onUpdate}
            />
          )}

          {item.type === 'mermaid' && (
            <MermaidBlock
              item={item}
              editable={editable}
              onUpdate={onUpdate}
            />
          )}

          {item.type === 'calcTable' && (
            <CalcTableBlock
              item={item}
              editable={editable}
              onUpdate={onUpdate}
            />
          )}

          {item.type === 'database_view' && (
            <DatabaseQueryBlock
              item={item}
              editable={editable}
              onUpdate={onUpdate}
            />
          )}

          {/* Slash Palette Popup */}
          {slash !== null && <SlashPalette query={slash} onSelect={selectSlash} onClose={() => setSlash(null)} />}
        </div>

        {/* Action Toolbar on the RIGHT (Placing buttons on the right side as requested) */}
        {editable && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            opacity: hovered || showMenu ? 1 : 0,
            transition: 'opacity 0.15s ease',
            marginTop: '2px',
            flexShrink: 0,
          }}>
            {/* Add Block Button */}
            <button
              type="button"
              onClick={onInsert}
              style={actionBtnStyle}
              title="Aggiungi blocco sotto"
            >
              <Plus size={15} />
            </button>

            {/* Options & Drag Menu */}
            <div style={{ position: 'relative' }}>
              <button
                type="button"
                {...attributes}
                {...listeners}
                onClick={() => setShowMenu(!showMenu)}
                style={{ ...actionBtnStyle, cursor: 'grab' }}
                title="Opzioni e trascina blocco"
              >
                <GripVertical size={15} />
              </button>

              {/* Popup Dropdown (Right-aligned) */}
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -5, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -5, scale: 0.96 }}
                    transition={{ duration: 0.12 }}
                    style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      width: 190,
                      zIndex: 500,
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '10px',
                      boxShadow: 'var(--shadow-xl)',
                      padding: '6px',
                    }}
                  >
                    <div style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', padding: '4px 8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Trasforma In
                    </div>
                    {SLASH_CMDS.slice(0, 8).map(c => (
                      <button
                        key={c.type}
                        onClick={() => { onUpdate({ type: c.type }); setShowMenu(false); }}
                        style={menuItem(item.type === c.type)}
                      >
                        <span style={{ width: 18, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>{c.icon}</span>
                        <span>{c.label}</span>
                      </button>
                    ))}
                    <div style={{ height: 1, backgroundColor: 'var(--border)', margin: '6px 0' }} />
                    <button onClick={copyBlockLink} style={menuItem(false)}>
                      <Hash size={14} /> Copia Link Blocco
                    </button>
                    <button onClick={() => { onDuplicate(); setShowMenu(false); }} style={menuItem(false)}>
                      <Copy size={14} /> Duplica Blocco
                    </button>
                    <button onClick={() => { onDelete(); setShowMenu(false); }} style={{ ...menuItem(false), color: 'var(--danger)' }}>
                      <Trash2 size={14} /> Elimina Blocco
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Slash Palette ──
function SlashPalette({ query, onSelect, onClose }: { query: string; onSelect: (t: string) => void; onClose: () => void }) {
  const [sel, setSel] = useState(0);
  const filtered = SLASH_CMDS.filter(c => !query || c.label.toLowerCase().includes(query) || c.keys.some(k => k.includes(query)));

  useEffect(() => { setSel(0); }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => (s + 1) % (filtered.length || 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => (s - 1 + filtered.length) % (filtered.length || 1)); }
      else if (e.key === 'Enter' && filtered[sel]) { e.preventDefault(); onSelect(filtered[sel].type); }
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, sel, onSelect, onClose]);

  if (!filtered.length) return null;

  return (
    <div style={{
      position: 'absolute', top: '100%', left: 0, width: 260,
      maxHeight: 240, overflowY: 'auto', zIndex: 1000,
      backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: '8px', boxShadow: 'var(--shadow-lg)', padding: '4px',
    }}>
      {filtered.map((c, i) => (
        <div key={c.type} onClick={() => onSelect(c.type)} onMouseEnter={() => setSel(i)}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '7px 10px', borderRadius: '6px', cursor: 'pointer',
            backgroundColor: i === sel ? 'var(--bg-surface-active)' : 'transparent',
            fontSize: '13px', color: 'var(--text-primary)',
          }}>
          <span style={{ display: 'flex', width: 20, justifyContent: 'center', color: 'var(--text-muted)' }}>{c.icon}</span>
          <span>{c.label}</span>
          {i === sel && <CornerDownLeft size={12} color="var(--text-muted)" style={{ marginLeft: 'auto' }} />}
        </div>
      ))}
    </div>
  );
}

// ── Styles ──
const actionBtnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 26,
  height: 26,
  borderRadius: '6px',
  border: '1px solid var(--border)',
  backgroundColor: 'var(--bg-surface)',
  color: 'var(--text-secondary)',
  cursor: 'pointer',
  padding: 0,
  transition: 'all 0.15s ease',
};

const menuItem = (active: boolean): React.CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  padding: '6px 8px',
  borderRadius: '6px',
  fontSize: '12px',
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  backgroundColor: active ? 'var(--bg-surface-active)' : 'transparent',
  color: active ? 'var(--accent)' : 'var(--text-primary)',
});
