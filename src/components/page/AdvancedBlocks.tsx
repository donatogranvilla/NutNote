import React, { useState, useEffect, useRef } from 'react';
import {
  GitBranch, Table, Calculator, Database, Filter, Plus, Trash2,
  Code2, Eye, Download, Copy, Check, ExternalLink, RefreshCw,
  Search, ArrowRight, AlertCircle, Sparkles, FileSpreadsheet
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';
import { pagesApi, pageTypesApi } from '../../lib/api';
import type { Page, PageType } from '../../lib/types';

/** Promessa memorizzata: Mermaid si carica e si configura una volta sola per sessione. */
let mermaidPronto: Promise<typeof import('mermaid').default> | null = null;

/**
 * Carica Mermaid solo quando c'è davvero un diagramma da disegnare.
 *
 * Mermaid si porta dietro elk, cytoscape e katex: oltre 2 MB che, con un import
 * in cima al file, finivano nel pacchetto iniziale e venivano scaricati e
 * inizializzati anche da chi non apre mai un diagramma.
 */
function caricaMermaid() {
  if (!mermaidPronto) {
    mermaidPronto = import('mermaid').then((modulo) => {
      modulo.default.initialize({
        startOnLoad: false,
        theme: 'default',
        securityLevel: 'loose',
        flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
        sequence: { useMaxWidth: true },
      });
      return modulo.default;
    });
  }
  return mermaidPronto;
}

// ─────────────────────────────────────────────────────────────
// 1. BLOCCO DIAGRAMMI & FLOWCHART (MERMAID.JS)
// ─────────────────────────────────────────────────────────────

export interface MermaidBlockData {
  id: string;
  type: string;
  text: string;
  mermaidCode?: string;
  mermaidTitle?: string;
}

const MERMAID_PRESETS = [
  {
    name: 'Diagramma di Flusso (Flowchart)',
    code: `graph TD
    A[Inizio Commessa] --> B{Cliente Approvato?}
    B -->|Sì| C[Pianificazione Sprint]
    B -->|No| D[Revisione Preventivo]
    C --> E[Sviluppo & Test]
    E --> F[Collaudo Finale]
    F --> G([Chiusura & Consegna])`,
  },
  {
    name: 'Diagramma di Sequenza (API / Auth)',
    code: `sequenceDiagram
    autonumber
    actor Utente
    participant NutNote as Frontend (NutNote)
    participant Rust as Backend (Rust/Tauri)
    participant SQLite as Database Locale
    Utente->>NutNote: Modifica Blocco
    NutNote->>Rust: Invoke 'update_block' (debounced 600ms)
    Rust->>SQLite: Transazione WAL (Atomic Write)
    SQLite-->>Rust: OK (rows affected)
    Rust-->>NutNote: BlockSaved Event`,
  },
  {
    name: 'Architettura di Rete & Server',
    code: `graph LR
    Client1[Postazione Sviluppo] -->|Port 9700| ServerLAN[NutNote Server LAN]
    Client2[Postazione Amministrazione] -->|Port 9700| ServerLAN
    ServerLAN --> DB[(SQLite WAL Engine)]
    ServerLAN --> Backup[Archivio Giornaliero NAS]`,
  },
  {
    name: 'Gantt / Roadmap Rilascio',
    code: `gantt
    title Cronoprogramma Rilascio Piattaforma 2026
    dateFormat YYYY-MM-DD
    section Analisi
    Requisiti & Specifiche     :done, 2026-09-01, 2026-09-08
    section Sviluppo
    Architettura Database      :active, 2026-09-09, 2026-09-18
    Blocchi Avanzati & Editor  :active, 2026-09-15, 2026-09-25
    section Collaudo
    Test di Carico & LAN Sync  :2026-09-26, 2026-10-05
    Rilascio Produzione        :milestone, 2026-10-06, 0d`,
  },
];

export function MermaidBlock({
  item,
  editable,
  onUpdate,
}: {
  item: MermaidBlockData;
  editable: boolean;
  onUpdate: (u: Partial<MermaidBlockData>) => void;
}) {
  const [code, setCode] = useState(
    item.mermaidCode || MERMAID_PRESETS[0].code
  );
  const [title, setTitle] = useState(item.mermaidTitle || 'Schema di Flusso / Architettura');
  const [isEditing, setIsEditing] = useState(!item.mermaidCode);
  const [svgContent, setSvgContent] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderId = useRef(`mermaid-${item.id.replace(/[^a-zA-Z0-9_-]/g, '')}-${Math.floor(Math.random() * 10000)}`);

  const renderDiagram = async (sourceCode: string) => {
    setErrorMsg(null);
    try {
      // Clear any previous mermaid artifacts
      const id = `mermaid-render-${Date.now()}`;
      const mermaid = await caricaMermaid();
      const { svg } = await mermaid.render(id, sourceCode.trim());
      setSvgContent(svg);
    } catch (err: any) {
      console.warn('Mermaid syntax error:', err);
      setErrorMsg(err.message || 'Errore di sintassi nel diagramma Mermaid');
      setSvgContent('');
    }
  };

  useEffect(() => {
    renderDiagram(code);
  }, [code]);

  const handleSave = () => {
    onUpdate({
      mermaidCode: code,
      mermaidTitle: title,
      text: title,
    });
    setIsEditing(false);
    renderDiagram(code);
  };

  const handleCopySvg = () => {
    if (svgContent) {
      navigator.clipboard.writeText(svgContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadSvg = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'diagramma'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{
      margin: '14px 0',
      padding: '16px 20px',
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '10px',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#6366f1',
          }}>
            <GitBranch size={16} />
          </div>
          {isEditing ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titolo del Diagramma..."
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                background: 'var(--bg-app)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
              }}
            />
          ) : (
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </span>
          )}
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            color: '#6366f1',
          }}>
            Mermaid
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {editable && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                padding: '5px 10px',
                fontSize: '12px',
                fontWeight: 500,
                color: isEditing ? 'var(--accent)' : 'var(--text-secondary)',
                backgroundColor: isEditing ? 'rgba(66, 99, 235, 0.1)' : 'var(--bg-app)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              {isEditing ? <Eye size={13} /> : <Code2 size={13} />}
              <span>{isEditing ? 'Anteprima' : 'Modifica Codice'}</span>
            </button>
          )}

          {svgContent && (
            <>
              <button
                onClick={handleCopySvg}
                title="Copia SVG negli appunti"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                {copied ? <Check size={13} color="var(--success, #2b8a3e)" /> : <Copy size={13} />}
                <span>{copied ? 'Copiato!' : 'Copia SVG'}</span>
              </button>

              <button
                onClick={handleDownloadSvg}
                title="Scarica file .svg vettoriale"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                <Download size={13} />
                <span>Scarica</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Editor View */}
      {isEditing && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
          {/* Presets */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Modelli rapidi:</span>
            {MERMAID_PRESETS.map((p, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setCode(p.code);
                  setTitle(p.name);
                }}
                style={{
                  fontSize: '11px',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {p.name}
              </button>
            ))}
          </div>

          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            rows={8}
            placeholder="Scrivi qui la sintassi Mermaid (es. graph TD; A-->B;)"
            style={{
              width: '100%',
              fontFamily: 'monospace',
              fontSize: '13px',
              padding: '10px 12px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-app)',
              color: 'var(--text-primary)',
              lineHeight: 1.5,
              resize: 'vertical',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              onClick={handleSave}
              style={{
                padding: '6px 14px',
                backgroundColor: 'var(--accent)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Applica e Salva Diagramma
            </button>
          </div>
        </div>
      )}

      {/* Diagram Rendering View */}
      {errorMsg ? (
        <div style={{
          padding: '12px 14px',
          backgroundColor: 'rgba(239, 68, 68, 0.08)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          borderRadius: 'var(--radius-md)',
          color: '#ef4444',
          fontSize: '12px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}>
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      ) : svgContent ? (
        <div
          ref={containerRef}
          dangerouslySetInnerHTML={{ __html: svgContent }}
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '16px 8px',
            backgroundColor: 'var(--bg-app)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            overflowX: 'auto',
          }}
        />
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Elaborazione del diagramma in corso...
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. BLOCCO TABELLA CALCOLATA CON FORMULE (PREVENTIVI & COMPUTI)
// ─────────────────────────────────────────────────────────────

export interface CalcColumn {
  id: string;
  name: string;
  type: 'text' | 'number' | 'currency' | 'calc';
  formula?: string; // e.g. 'qty*unitPrice'
}

export interface CalcRow {
  id: string;
  values: Record<string, string | number>;
}

export interface CalcTableBlockData {
  id: string;
  type: string;
  text: string;
  calcTitle?: string;
  columns?: CalcColumn[];
  rows?: CalcRow[];
  showTotalRow?: boolean;
}

const DEFAULT_CALC_PRESET = {
  title: 'Preventivo & Computo Fornitura',
  columns: [
    { id: 'c1', name: 'Descrizione Voce', type: 'text' as const },
    { id: 'c2', name: 'Quantità', type: 'number' as const },
    { id: 'c3', name: 'Prezzo Unit. (€)', type: 'currency' as const },
    { id: 'c4', name: 'Totale (€)', type: 'currency' as const, formula: 'c2*c3' },
  ],
  rows: [
    { id: 'r1', values: { c1: 'Sviluppo Backend API Tauri/Rust', c2: 1, c3: 2400, c4: 2400 } },
    { id: 'r2', values: { c1: 'Interfaccia Utente React & TipTap Editor', c2: 1, c3: 1800, c4: 1800 } },
    { id: 'r3', values: { c1: 'Licenza Software & Supporto 12 Mesi', c2: 2, c3: 450, c4: 900 } },
  ],
};

export function CalcTableBlock({
  item,
  editable,
  onUpdate,
}: {
  item: CalcTableBlockData;
  editable: boolean;
  onUpdate: (u: Partial<CalcTableBlockData>) => void;
}) {
  const [title, setTitle] = useState(item.calcTitle || DEFAULT_CALC_PRESET.title);
  const [columns, setColumns] = useState<CalcColumn[]>(
    item.columns && item.columns.length > 0 ? item.columns : DEFAULT_CALC_PRESET.columns
  );
  const [rows, setRows] = useState<CalcRow[]>(
    item.rows && item.rows.length > 0 ? item.rows : DEFAULT_CALC_PRESET.rows
  );
  const [showTotalRow, setShowTotalRow] = useState(
    item.showTotalRow !== undefined ? item.showTotalRow : true
  );

  const persist = (newCols: CalcColumn[], newRows: CalcRow[], newTitle: string, newShowTotal: boolean) => {
    onUpdate({
      calcTitle: newTitle,
      columns: newCols,
      rows: newRows,
      showTotalRow: newShowTotal,
      text: newTitle,
    });
  };

  const handleCellChange = (rowId: string, colId: string, value: string) => {
    const updatedRows = rows.map((r) => {
      if (r.id !== rowId) return r;
      const newVals = { ...r.values, [colId]: value };

      // Re-evaluate auto formula columns
      columns.forEach((col) => {
        if (col.formula) {
          try {
            // formula like 'c2*c3'
            let expr = col.formula;
            columns.forEach((c) => {
              const numVal = parseFloat(String(newVals[c.id] || '0').replace(',', '.')) || 0;
              expr = expr.replaceAll(c.id, String(numVal));
            });
            // safe evaluation for basic math
            // eslint-disable-next-line no-eval
            const computed = Function(`"use strict"; return (${expr})`)();
            newVals[col.id] = isNaN(computed) ? 0 : Math.round(computed * 100) / 100;
          } catch {
            // ignore formula error
          }
        }
      });

      return { ...r, values: newVals };
    });

    setRows(updatedRows);
    persist(columns, updatedRows, title, showTotalRow);
  };

  const addRow = () => {
    const newRowId = `r_${Date.now()}`;
    const initialVals: Record<string, string | number> = {};
    columns.forEach((c) => {
      initialVals[c.id] = c.type === 'text' ? 'Nuova voce' : 0;
    });
    const updated = [...rows, { id: newRowId, values: initialVals }];
    setRows(updated);
    persist(columns, updated, title, showTotalRow);
  };

  const removeRow = (rowId: string) => {
    const updated = rows.filter((r) => r.id !== rowId);
    setRows(updated);
    persist(columns, updated, title, showTotalRow);
  };

  const addColumn = () => {
    const newColId = `c_${Date.now()}`;
    const newCol: CalcColumn = {
      id: newColId,
      name: `Colonna ${columns.length + 1}`,
      type: 'currency',
    };
    const updatedCols = [...columns, newCol];
    setColumns(updatedCols);
    persist(updatedCols, rows, title, showTotalRow);
  };

  const exportCsv = () => {
    const headerLine = columns.map((c) => `"${c.name}"`).join(';');
    const rowLines = rows.map((r) =>
      columns.map((c) => `"${r.values[c.id] || ''}"`).join(';')
    );
    const csvContent = [headerLine, ...rowLines].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_') || 'preventivo'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Compute column totals
  const getColTotal = (colId: string) => {
    let sum = 0;
    rows.forEach((r) => {
      const val = parseFloat(String(r.values[colId] || '0').replace(',', '.')) || 0;
      sum += val;
    });
    return Math.round(sum * 100) / 100;
  };

  return (
    <div style={{
      margin: '14px 0',
      padding: '16px 20px',
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      overflowX: 'auto',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '10px',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(16, 185, 129, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#10b981',
          }}>
            <Calculator size={16} />
          </div>
          {editable ? (
            <input
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                persist(columns, rows, e.target.value, showTotalRow);
              }}
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                background: 'var(--bg-app)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
              }}
            />
          ) : (
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </span>
          )}
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            color: '#10b981',
          }}>
            Calcolata
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={exportCsv}
            title="Esporta foglio in formato CSV per Excel"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '5px 10px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              cursor: 'pointer',
            }}
          >
            <FileSpreadsheet size={13} color="#10b981" />
            <span>Esporta CSV</span>
          </button>

          {editable && (
            <>
              <button
                onClick={addColumn}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  backgroundColor: 'var(--bg-app)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                <Plus size={13} />
                <span>Colonna</span>
              </button>
              <button
                onClick={addRow}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '5px 10px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: '#fff',
                  backgroundColor: 'var(--accent)',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                }}
              >
                <Plus size={13} />
                <span>Nuova Riga</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Spreadsheet Table */}
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '13px',
      }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--border)', backgroundColor: 'var(--bg-app)' }}>
            {columns.map((col, idx) => (
              <th
                key={col.id}
                style={{
                  padding: '10px 12px',
                  textAlign: col.type === 'text' ? 'left' : 'right',
                  color: 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '12px',
                  minWidth: idx === 0 ? '220px' : '110px',
                }}
              >
                {editable ? (
                  <input
                    type="text"
                    value={col.name}
                    onChange={(e) => {
                      const updated = columns.map((c) =>
                        c.id === col.id ? { ...c, name: e.target.value } : c
                      );
                      setColumns(updated);
                      persist(updated, rows, title, showTotalRow);
                    }}
                    style={{
                      width: '100%',
                      background: 'transparent',
                      border: 'none',
                      fontWeight: 600,
                      color: 'inherit',
                      textAlign: col.type === 'text' ? 'left' : 'right',
                      outline: 'none',
                    }}
                  />
                ) : (
                  col.name
                )}
              </th>
            ))}
            {editable && <th style={{ width: '40px' }} />}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              style={{
                borderBottom: '1px solid var(--border)',
                transition: 'background-color 0.15s',
              }}
            >
              {columns.map((col) => {
                const val = row.values[col.id] !== undefined ? row.values[col.id] : '';
                const isFormula = !!col.formula;

                return (
                  <td
                    key={col.id}
                    style={{
                      padding: '8px 12px',
                      textAlign: col.type === 'text' ? 'left' : 'right',
                      fontFamily: col.type === 'text' ? 'inherit' : 'var(--font-mono, monospace)',
                    }}
                  >
                    {editable && !isFormula ? (
                      <input
                        type={col.type === 'text' ? 'text' : 'number'}
                        step={col.type === 'number' ? '1' : '0.01'}
                        value={val}
                        onChange={(e) => handleCellChange(row.id, col.id, e.target.value)}
                        style={{
                          width: '100%',
                          background: 'transparent',
                          border: '1px solid transparent',
                          borderRadius: 'var(--radius-sm)',
                          padding: '4px 6px',
                          color: 'var(--text-primary)',
                          textAlign: col.type === 'text' ? 'left' : 'right',
                          fontFamily: 'inherit',
                          outline: 'none',
                        }}
                        onFocus={(e) => (e.target.style.borderColor = 'var(--accent)')}
                        onBlur={(e) => (e.target.style.borderColor = 'transparent')}
                      />
                    ) : (
                      <span style={{ fontWeight: isFormula ? 600 : 400, color: isFormula ? 'var(--accent)' : 'inherit' }}>
                        {col.type === 'currency'
                          ? `${Number(val || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                          : String(val)}
                      </span>
                    )}
                  </td>
                );
              })}
              {editable && (
                <td style={{ padding: '8px', textAlign: 'center' }}>
                  <button
                    onClick={() => removeRow(row.id)}
                    title="Elimina riga"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                  >
                    <Trash2 size={13} />
                  </button>
                </td>
              )}
            </tr>
          ))}

          {/* Totals Row */}
          {showTotalRow && (
            <tr style={{
              backgroundColor: 'rgba(16, 185, 129, 0.05)',
              borderTop: '2px solid var(--border)',
              fontWeight: 700,
            }}>
              {columns.map((col, idx) => {
                if (idx === 0) {
                  return (
                    <td key={col.id} style={{ padding: '10px 12px', color: 'var(--text-primary)' }}>
                      Totale Complessivo
                    </td>
                  );
                }
                if (col.type === 'number' || col.type === 'currency' || col.type === 'calc') {
                  const total = getColTotal(col.id);
                  return (
                    <td
                      key={col.id}
                      style={{
                        padding: '10px 12px',
                        textAlign: 'right',
                        fontFamily: 'var(--font-mono, monospace)',
                        color: 'var(--accent)',
                      }}
                    >
                      {col.type === 'currency'
                        ? `${total.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
                        : total}
                    </td>
                  );
                }
                return <td key={col.id} />;
              })}
              {editable && <td />}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. BLOCCO VISTA DATABASE INCORPORATA (INLINE DATABASE QUERY)
// ─────────────────────────────────────────────────────────────

export interface DatabaseQueryBlockData {
  id: string;
  type: string;
  text: string;
  queryTypeId?: string;
  queryStatus?: string;
  queryLimit?: number;
  queryTitle?: string;
}

export function DatabaseQueryBlock({
  item,
  editable,
  onUpdate,
}: {
  item: DatabaseQueryBlockData;
  editable: boolean;
  onUpdate: (u: Partial<DatabaseQueryBlockData>) => void;
}) {
  const [title, setTitle] = useState(item.queryTitle || 'Vista Database Dinamica');
  const [typeFilter, setTypeFilter] = useState(item.queryTypeId || '');
  const [statusFilter, setStatusFilter] = useState(item.queryStatus || '');
  const [isConfiguring, setIsConfiguring] = useState(!item.queryTypeId && !item.queryStatus);
  const [results, setResults] = useState<Page[]>([]);
  const [loading, setLoading] = useState(false);
  const [availableTypes, setAvailableTypes] = useState<PageType[]>([]);

  useEffect(() => {
    loadTypes();
  }, []);

  useEffect(() => {
    executeFilter();
  }, [typeFilter, statusFilter]);

  const loadTypes = async () => {
    try {
      const types = await pageTypesApi.getAll();
      setAvailableTypes(types);
    } catch {
      // ignore
    }
  };

  const executeFilter = async () => {
    setLoading(true);
    try {
      const res = await pagesApi.query({
        typeId: typeFilter || undefined,
        filters: statusFilter
          ? [{ property: 'status', operator: 'equals', value: statusFilter, conjunction: 'and' }]
          : undefined,
        limit: item.queryLimit || 20,
      });
      setResults(res.items);
    } catch (err) {
      console.warn('Query block failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = () => {
    onUpdate({
      queryTitle: title,
      queryTypeId: typeFilter,
      queryStatus: statusFilter,
      text: title,
    });
    setIsConfiguring(false);
    executeFilter();
  };

  return (
    <div style={{
      margin: '14px 0',
      padding: '16px 20px',
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg)',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
        paddingBottom: '10px',
        marginBottom: '12px',
        flexWrap: 'wrap',
        gap: '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(245, 159, 0, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#f59f00',
          }}>
            <Database size={16} />
          </div>
          {isConfiguring ? (
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titolo vista query..."
              style={{
                fontSize: '14px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                background: 'var(--bg-app)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px 8px',
              }}
            />
          ) : (
            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
              {title}
            </span>
          )}
          <span style={{
            fontSize: '10px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            padding: '2px 6px',
            borderRadius: '4px',
            backgroundColor: 'rgba(245, 159, 0, 0.1)',
            color: '#f59f00',
          }}>
            Vista Query ({results.length})
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            onClick={executeFilter}
            title="Ricarica risultati query"
            style={{
              padding: '5px 8px',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={13} className={loading ? 'spin' : ''} />
          </button>
          {editable && (
            <button
              onClick={() => setIsConfiguring(!isConfiguring)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '5px 10px',
                fontSize: '12px',
                color: isConfiguring ? 'var(--accent)' : 'var(--text-secondary)',
                backgroundColor: isConfiguring ? 'rgba(66, 99, 235, 0.1)' : 'var(--bg-app)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
              }}
            >
              <Filter size={13} />
              <span>{isConfiguring ? 'Chiudi Filtri' : 'Filtra Entità'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Configuration Panel */}
      {isConfiguring && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '12px 14px',
          backgroundColor: 'var(--bg-app)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          marginBottom: '14px',
          flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Tipologia Entità:</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              style={{
                fontSize: '12px',
                padding: '5px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">Tutti i Tipi</option>
              {availableTypes.map((t) => (
                <option key={t.id} value={t.name}>
                  {t.icon ? `${t.icon} ` : ''}{t.label}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)' }}>Stato:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                fontSize: '12px',
                padding: '5px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            >
              <option value="">Tutti gli Stati</option>
              <option value="draft">Bozza / Aperto</option>
              <option value="in_progress">In Corso / In Lavorazione</option>
              <option value="done">Completato / Chiuso</option>
              <option value="archived">Archiviato</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', marginLeft: 'auto' }}>
            <button
              onClick={handleSaveConfig}
              style={{
                padding: '6px 14px',
                backgroundColor: 'var(--accent)',
                color: '#fff',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Applica Filtro
            </button>
          </div>
        </div>
      )}

      {/* Results Table */}
      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Caricamento risultati...
        </div>
      ) : results.length === 0 ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
          Nessuna pagina trovata corrispondente ai filtri specificati.
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--bg-app)', color: 'var(--text-secondary)', fontSize: '12px' }}>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Entità</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Stato</th>
                <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: 600 }}>Priorità</th>
                <th style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 600 }}>Azione</th>
              </tr>
            </thead>
            <tbody>
              {results.slice(0, 10).map((p) => (
                <tr
                  key={p.id}
                  style={{
                    borderBottom: '1px solid var(--border)',
                    transition: 'background-color 0.15s',
                  }}
                >
                  <td style={{ padding: '8px 12px' }}>
                    <Link
                      to={`/page/${p.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                        color: 'var(--text-primary)',
                        fontWeight: 500,
                      }}
                    >
                      <span>{p.icon || '📄'}</span>
                      <span>{p.title}</span>
                    </Link>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '10px',
                      backgroundColor: 'rgba(0,0,0,0.05)',
                      color: 'var(--text-secondary)',
                    }}>
                      {p.status || 'Standard'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      color: p.priority === 'urgent' ? '#ef4444' : p.priority === 'high' ? '#f59f00' : 'var(--text-muted)',
                    }}>
                      {p.priority === 'urgent' ? '🔴 Urgente' : p.priority === 'high' ? '🟠 Alta' : 'Normale'}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <Link
                      to={`/page/${p.id}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '12px',
                        color: 'var(--accent)',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    >
                      <span>Apri</span>
                      <ArrowRight size={12} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
