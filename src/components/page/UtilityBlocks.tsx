import React, { useState, useEffect } from 'react';
import {
  Folder, FolderOpen, Calendar, Clock, ExternalLink, Globe,
  ShieldCheck, Eye, EyeOff, Download, Search, FileText,
  FileSpreadsheet, FileCode, FileImage, FileArchive, File,
  RefreshCw, Edit3, Check, Copy, MapPin
} from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { filesApi, type FolderFileInfo } from '../../lib/api';

// ── Shared Types ──
export interface UtilityBlockData {
  id: string;
  type: string;
  text: string;
  folderPath?: string;
  folderName?: string;
  cachedFiles?: FolderFileInfo[];
  eventDate?: string;
  eventTime?: string;
  eventEndDate?: string;
  eventEndTime?: string;
  eventLocation?: string;
  eventDesc?: string;
  url?: string;
  bookmarkTitle?: string;
  bookmarkDesc?: string;
  bookmarkCategory?: string;
  vaultService?: string;
  vaultUsername?: string;
  vaultPassword?: string;
  vaultUrl?: string;
  vaultNotes?: string;
}

// ─────────────────────────────────────────────────────────────
// 1. BLOCCO ESPLORA RISORSE / CARTELLA LOCALE O SERVER
// ─────────────────────────────────────────────────────────────

const SAMPLE_DEMO_FILES: FolderFileInfo[] = [
  { name: 'Contratto_Quadro_2026.pdf', path: 'C:\\Progetti\\Contratto_Quadro_2026.pdf', is_dir: false, size_bytes: 1450000, extension: 'pdf', modified_str: '11/09/2026 10:30' },
  { name: 'Specifiche_Tecniche_v2.docx', path: 'C:\\Progetti\\Specifiche_Tecniche_v2.docx', is_dir: false, size_bytes: 524000, extension: 'docx', modified_str: '10/09/2026 17:15' },
  { name: 'Preventivo_Computo_Metrico.xlsx', path: 'C:\\Progetti\\Preventivo_Computo_Metrico.xlsx', is_dir: false, size_bytes: 840000, extension: 'xlsx', modified_str: '08/09/2026 09:00' },
  { name: 'Allegati_Disegni_CAD', path: 'C:\\Progetti\\Allegati_Disegni_CAD', is_dir: true, size_bytes: 0, extension: '', modified_str: '05/09/2026 14:20' },
  { name: 'Archivio_Fatture_StatoAvanzamento.zip', path: 'C:\\Progetti\\Archivio_Fatture_StatoAvanzamento.zip', is_dir: false, size_bytes: 12400000, extension: 'zip', modified_str: '01/09/2026 11:45' },
];

export function FolderBlock({
  item,
  editable,
  onUpdate,
}: {
  item: UtilityBlockData;
  editable: boolean;
  onUpdate: (u: Partial<UtilityBlockData>) => void;
}) {
  const [files, setFiles] = useState<FolderFileInfo[]>(item.cachedFiles || []);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [isConfiguring, setIsConfiguring] = useState(!item.folderPath);
  const [pathInput, setPathInput] = useState(item.folderPath || '');
  const [nameInput, setNameInput] = useState(item.folderName || '');
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (item.folderPath) {
      loadDirectory(item.folderPath);
    }
  }, [item.folderPath]);

  const loadDirectory = async (targetPath: string) => {
    setLoading(true);
    setFeedback(null);
    try {
      const result = await filesApi.listDirectory(targetPath);
      if (result && result.length > 0) {
        setFiles(result);
        onUpdate({ cachedFiles: result });
      } else {
        // Fallback per ambiente browser mock o cartella vuota
        const demo = SAMPLE_DEMO_FILES.map(f => ({
          ...f,
          path: `${targetPath}\\${f.name}`,
        }));
        setFiles(demo);
        onUpdate({ cachedFiles: demo });
      }
    } catch {
      const demo = SAMPLE_DEMO_FILES.map(f => ({
        ...f,
        path: `${targetPath}\\${f.name}`,
      }));
      setFiles(demo);
      onUpdate({ cachedFiles: demo });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = () => {
    if (!pathInput.trim()) return;
    const finalName = nameInput.trim() || pathInput.split(/[\\/]/).filter(Boolean).pop() || 'Cartella Documenti';
    onUpdate({
      folderPath: pathInput.trim(),
      folderName: finalName,
      text: finalName,
    });
    setIsConfiguring(false);
    loadDirectory(pathInput.trim());
  };

  const handleOpenFolder = async () => {
    if (!item.folderPath) return;
    const ok = await filesApi.openPath(item.folderPath);
    if (!ok) {
      setFeedback('Apertura cartella non supportata in modalità web browser.');
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const handleOpenFile = async (filePath: string) => {
    const ok = await filesApi.openPath(filePath);
    if (!ok) {
      setFeedback(`Apertura file non supportata in anteprima web: ${filePath}`);
      setTimeout(() => setFeedback(null), 3000);
    }
  };

  const filteredFiles = files.filter(f =>
    !search || f.name.toLowerCase().includes(search.toLowerCase())
  );

  const getFileIcon = (ext: string, isDir: boolean) => {
    if (isDir) return <Folder size={16} color="var(--warning, #f59f00)" />;
    switch (ext) {
      case 'pdf': return <FileText size={16} color="var(--danger, #e03131)" />;
      case 'doc':
      case 'docx':
      case 'odt': return <FileText size={16} color="var(--accent, #4263eb)" />;
      case 'xls':
      case 'xlsx':
      case 'csv': return <FileSpreadsheet size={16} color="var(--success, #2f9e44)" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'svg':
      case 'webp': return <FileImage size={16} color="#ae3ec9" />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar': return <FileArchive size={16} color="#d9480f" />;
      case 'rs':
      case 'ts':
      case 'js':
      case 'sql':
      case 'py':
      case 'json': return <FileCode size={16} color="#0ca678" />;
      default: return <File size={16} color="var(--text-secondary)" />;
    }
  };

  const formatSize = (bytes: number, isDir: boolean) => {
    if (isDir) return 'Cartella';
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg, 10px)',
      padding: '14px 16px',
      margin: '6px 0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    }}>
      {/* Header Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '8px',
            backgroundColor: 'rgba(245, 159, 0, 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <FolderOpen size={18} color="var(--warning, #f59f00)" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                {item.folderName || 'Esplora Risorse / Cartella Collegata'}
              </span>
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '10px',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}>
                {files.length} elementi
              </span>
            </div>
            {item.folderPath && (
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)', marginTop: '2px' }}>
                📁 {item.folderPath}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {item.folderPath && (
            <button
              type="button"
              onClick={handleOpenFolder}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '6px',
                backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)',
                color: 'var(--accent)', fontSize: '12px', fontWeight: 500, cursor: 'pointer',
              }}
              title="Apri percorso in Esplora Risorse di Windows"
            >
              <ExternalLink size={13} />
              <span>Apri Cartella</span>
            </button>
          )}

          {item.folderPath && (
            <button
              type="button"
              onClick={() => loadDirectory(item.folderPath!)}
              disabled={loading}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 30, height: 30, borderRadius: '6px',
                backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', cursor: 'pointer',
              }}
              title="Aggiorna contenuti cartella"
            >
              <RefreshCw size={13} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            </button>
          )}

          {editable && (
            <button
              type="button"
              onClick={() => setIsConfiguring(!isConfiguring)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 10px', borderRadius: '6px',
                backgroundColor: isConfiguring ? 'var(--bg-surface-active)' : 'var(--bg-app)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer',
              }}
              title="Modifica percorso o etichetta"
            >
              <Edit3 size={13} />
              <span>{isConfiguring ? 'Chiudi' : 'Percorso'}</span>
            </button>
          )}
        </div>
      </div>

      {feedback && (
        <div style={{ marginTop: '10px', padding: '6px 10px', backgroundColor: 'rgba(66, 99, 235, 0.08)', borderRadius: '6px', fontSize: '12px', color: 'var(--accent)' }}>
          ℹ️ {feedback}
        </div>
      )}

      {/* Configuration Form */}
      {isConfiguring && editable && (
        <div style={{
          marginTop: '12px', padding: '12px', borderRadius: '8px',
          backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Configura Collegamento a Cartella Locale o di Rete:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              placeholder="Percorso cartella (es. C:\Progetti\Cliente o \\Server\Condivisa)"
              value={pathInput}
              onChange={e => setPathInput(e.target.value)}
              style={{
                flex: 2, minWidth: '220px', padding: '7px 10px', fontSize: '13px',
                borderRadius: '6px', border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)',
              }}
            />
            <input
              type="text"
              placeholder="Nome visualizzato (opzionale)"
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              style={{
                flex: 1, minWidth: '150px', padding: '7px 10px', fontSize: '13px',
                borderRadius: '6px', border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)',
              }}
            />
            <button
              type="button"
              onClick={handleSaveConfig}
              style={{
                padding: '7px 16px', borderRadius: '6px',
                backgroundColor: 'var(--accent)', color: '#fff',
                fontSize: '13px', fontWeight: 600, border: 'none', cursor: 'pointer',
              }}
            >
              Collega Cartella
            </button>
          </div>
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Percorsi rapidi:</span>
            {[
              { label: 'NutNote Root', path: 'C:\\Dev\\NutNote' },
              { label: 'Progetti', path: 'C:\\Dev\\Progetti' },
              { label: 'Server Condiviso', path: '\\\\server-nas\\archivio' },
            ].map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => { setPathInput(p.path); setNameInput(p.label); }}
                style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '4px',
                  backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', cursor: 'pointer',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Files List / Explorer Table */}
      {item.folderPath && (
        <div style={{ marginTop: '12px' }}>
          {files.length > 3 && (
            <div style={{ position: 'relative', marginBottom: '8px' }}>
              <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: 10, top: 9 }} />
              <input
                type="text"
                placeholder="Filtra file in questa cartella..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px 6px 30px', fontSize: '12px',
                  borderRadius: '6px', border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-app)', color: 'var(--text-primary)',
                }}
              />
            </div>
          )}

          <div style={{
            maxHeight: '260px', overflowY: 'auto',
            border: '1px solid var(--border)', borderRadius: '6px',
            backgroundColor: 'var(--bg-app)',
          }}>
            {filteredFiles.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
                Nessun file trovato nella cartella specificata.
              </div>
            ) : (
              filteredFiles.map((file, idx) => (
                <div
                  key={file.name + idx}
                  onClick={() => handleOpenFile(file.path)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '7px 12px',
                    borderBottom: idx < filteredFiles.length - 1 ? '1px solid var(--border)' : 'none',
                    fontSize: '12px', cursor: 'pointer',
                    transition: 'background-color 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                  onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                  title={`Clicca per aprire: ${file.path}`}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                    {getFileIcon(file.extension, file.is_dir)}
                    <span style={{
                      fontWeight: file.is_dir ? 600 : 400,
                      color: 'var(--text-primary)',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {file.name}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0, color: 'var(--text-muted)', fontSize: '11px' }}>
                    <span>{file.modified_str}</span>
                    <span style={{ minWidth: '60px', textAlign: 'right' }}>{formatSize(file.size_bytes, file.is_dir)}</span>
                    <ExternalLink size={12} color="var(--text-muted)" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. BLOCCO EVENTO & CALENDARIO CON ESPORTAZIONE .ICS
// ─────────────────────────────────────────────────────────────

export function downloadIcsFile(
  title: string,
  date: string,
  time?: string,
  endDate?: string,
  endTime?: string,
  location?: string,
  description?: string
) {
  const d = date || new Date().toISOString().slice(0, 10);
  const startStr = d.replace(/-/g, '') + (time ? 'T' + time.replace(/:/g, '') + '00' : 'T090000');
  const ed = endDate || d;
  const endStr = ed.replace(/-/g, '') + (endTime ? 'T' + endTime.replace(/:/g, '') + '00' : 'T100000');

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//NutNote//NutNote Calendar//IT',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uuidv4()}@nutnote.app`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
    `DTSTART:${startStr}`,
    `DTEND:${endStr}`,
    `SUMMARY:${title || 'Evento NutNote'}`,
    location ? `LOCATION:${location}` : '',
    description ? `DESCRIPTION:${description.replace(/\n/g, '\\n')}` : '',
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');

  const blob = new Blob([icsLines], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(title || 'evento').replace(/[^a-zA-Z0-9_-]/g, '_')}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function EventBlock({
  item,
  editable,
  onUpdate,
}: {
  item: UtilityBlockData;
  editable: boolean;
  onUpdate: (u: Partial<UtilityBlockData>) => void;
}) {
  const [isEditing, setIsEditing] = useState(!item.eventDate && !item.text);
  const [eventTitle, setEventTitle] = useState(item.text || 'Nuovo Evento / Scadenza');
  const [date, setDate] = useState(item.eventDate || new Date().toISOString().slice(0, 10));
  const [time, setTime] = useState(item.eventTime || '10:00');
  const [endDate, setEndDate] = useState(item.eventEndDate || '');
  const [endTime, setEndTime] = useState(item.eventEndTime || '11:30');
  const [location, setLocation] = useState(item.eventLocation || '');
  const [desc, setDesc] = useState(item.eventDesc || '');
  const [downloaded, setDownloaded] = useState(false);

  const handleSave = () => {
    onUpdate({
      text: eventTitle,
      eventDate: date,
      eventTime: time,
      eventEndDate: endDate,
      eventEndTime: endTime,
      eventLocation: location,
      eventDesc: desc,
    });
    setIsEditing(false);
  };

  const handleDownload = () => {
    downloadIcsFile(eventTitle, date, time, endDate, endTime, location, desc);
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 2500);
  };

  // Calcolo badge conto alla rovescia
  const computeCountdown = () => {
    if (!date) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(date);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { label: 'Oggi!', bg: 'rgba(66, 99, 235, 0.15)', color: 'var(--accent)' };
    }
    if (diffDays === 1) {
      return { label: 'Domani', bg: 'rgba(47, 158, 68, 0.15)', color: 'var(--success, #2f9e44)' };
    }
    if (diffDays > 1) {
      return { label: `Tra ${diffDays} giorni`, bg: 'rgba(47, 158, 68, 0.12)', color: 'var(--success, #2f9e44)' };
    }
    return { label: `Scaduto da ${Math.abs(diffDays)} giorni`, bg: 'rgba(224, 49, 49, 0.12)', color: 'var(--danger, #e03131)' };
  };

  const countdown = computeCountdown();

  // Parse Month and Day for card badge
  const parsedDate = date ? new Date(date) : new Date();
  const monthName = parsedDate.toLocaleDateString('it-IT', { month: 'short' }).toUpperCase();
  const dayNum = parsedDate.getDate();
  const weekDay = parsedDate.toLocaleDateString('it-IT', { weekday: 'short' });

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg, 10px)',
      padding: '14px 16px',
      margin: '6px 0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '14px', flexWrap: 'wrap' }}>
        {/* Calendar visual icon */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: 48, height: 52, borderRadius: '8px',
            border: '1px solid var(--border)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            overflow: 'hidden', backgroundColor: 'var(--bg-app)', flexShrink: 0,
          }}>
            <div style={{
              width: '100%', backgroundColor: 'var(--accent)', color: '#fff',
              fontSize: '9px', fontWeight: 700, textAlign: 'center', padding: '2px 0', letterSpacing: '0.5px',
            }}>
              {monthName}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
              {dayNum}
            </div>
            <div style={{ fontSize: '9px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
              {weekDay}
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>
                {eventTitle}
              </span>
              {countdown && (
                <span style={{
                  fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '10px',
                  backgroundColor: countdown.bg, color: countdown.color,
                }}>
                  {countdown.label}
                </span>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', fontSize: '12px', color: 'var(--text-secondary)', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Clock size={13} color="var(--text-muted)" />
                {time ? `${time}${endTime ? ` - ${endTime}` : ''}` : 'Tutto il giorno'}
              </span>
              {location && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={13} color="var(--text-muted)" />
                  {location}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button
            type="button"
            onClick={handleDownload}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '6px 12px', borderRadius: '6px',
              backgroundColor: 'var(--accent)', color: '#fff',
              fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer',
              transition: 'opacity 0.2s',
            }}
            title="Scarica file .ics compatibile con Outlook, Google Calendar e Apple Calendar"
          >
            <Download size={13} />
            <span>{downloaded ? 'Aggiunto (.ics) ✓' : 'Aggiungi a Calendario (.ics)'}</span>
          </button>

          {editable && (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 10px', borderRadius: '6px',
                backgroundColor: isEditing ? 'var(--bg-surface-active)' : 'var(--bg-app)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer',
              }}
            >
              <Edit3 size={13} />
              <span>{isEditing ? 'Chiudi' : 'Modifica'}</span>
            </button>
          )}
        </div>
      </div>

      {desc && !isEditing && (
        <div style={{
          marginTop: '10px', paddingTop: '8px', borderTop: '1px solid var(--border)',
          fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5,
        }}>
          {desc}
        </div>
      )}

      {/* Edit Form */}
      {isEditing && editable && (
        <div style={{
          marginTop: '12px', padding: '12px', borderRadius: '8px',
          backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Dettagli Evento / Scadenza:
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Titolo Evento</label>
            <input
              type="text"
              value={eventTitle}
              onChange={e => setEventTitle(e.target.value)}
              placeholder="Titolo evento o meeting..."
              style={{
                width: '100%', padding: '6px 10px', fontSize: '13px',
                borderRadius: '6px', border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', marginTop: '2px',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Data Inizio</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: '12px',
                  borderRadius: '6px', border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', marginTop: '2px',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ora Inizio</label>
              <input
                type="time"
                value={time}
                onChange={e => setTime(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: '12px',
                  borderRadius: '6px', border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', marginTop: '2px',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Ora Fine</label>
              <input
                type="time"
                value={endTime}
                onChange={e => setEndTime(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: '12px',
                  borderRadius: '6px', border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', marginTop: '2px',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Luogo / Link Meeting</label>
            <input
              type="text"
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="es. Sede Cliente, Teams, Google Meet, Sala Riunioni 1"
              style={{
                width: '100%', padding: '6px 10px', fontSize: '12px',
                borderRadius: '6px', border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', marginTop: '2px',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Note / Ordine del Giorno</label>
            <textarea
              rows={2}
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="Punti da discutere, partecipanti convocati, note..."
              style={{
                width: '100%', padding: '6px 10px', fontSize: '12px',
                borderRadius: '6px', border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', marginTop: '2px',
                resize: 'vertical',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: '6px 16px', borderRadius: '6px',
                backgroundColor: 'var(--accent)', color: '#fff',
                fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer',
              }}
            >
              Salva Evento
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. BLOCCO SEGNALIBRO WEB & LINK DOCUMENTAZIONE
// ─────────────────────────────────────────────────────────────

export function BookmarkBlock({
  item,
  editable,
  onUpdate,
}: {
  item: UtilityBlockData;
  editable: boolean;
  onUpdate: (u: Partial<UtilityBlockData>) => void;
}) {
  const [isEditing, setIsEditing] = useState(!item.url);
  const [urlInput, setUrlInput] = useState(item.url || '');
  const [titleInput, setTitleInput] = useState(item.bookmarkTitle || item.text || '');
  const [descInput, setDescInput] = useState(item.bookmarkDesc || '');
  const [categoryInput, setCategoryInput] = useState(item.bookmarkCategory || 'Documentazione');
  const [copied, setCopied] = useState(false);

  let domain = '';
  try {
    if (item.url) {
      domain = new URL(item.url.startsWith('http') ? item.url : `https://${item.url}`).hostname;
    }
  } catch {
    domain = item.url || '';
  }

  const handleSave = () => {
    let cleanUrl = urlInput.trim();
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = `https://${cleanUrl}`;
    }
    let defaultTitle = titleInput.trim();
    if (!defaultTitle && cleanUrl) {
      try {
        defaultTitle = new URL(cleanUrl).hostname;
      } catch {
        defaultTitle = cleanUrl;
      }
    }

    onUpdate({
      url: cleanUrl,
      bookmarkTitle: defaultTitle,
      text: defaultTitle,
      bookmarkDesc: descInput.trim(),
      bookmarkCategory: categoryInput.trim(),
    });
    setIsEditing(false);
  };

  const handleCopyUrl = () => {
    if (!item.url) return;
    navigator.clipboard.writeText(item.url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-lg, 10px)',
      padding: '14px 16px',
      margin: '6px 0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      transition: 'border-color 0.2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        {/* Bookmark Icon & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '8px',
            backgroundColor: 'rgba(32, 201, 151, 0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {domain ? (
              <img
                src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
                alt=""
                style={{ width: 20, height: 20, borderRadius: '4px' }}
                onError={(e) => { (e.currentTarget as any).style.display = 'none'; }}
              />
            ) : (
              <Globe size={18} color="#20c997" />
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                {item.bookmarkTitle || item.text || 'Segnalibro Web'}
              </span>
              {item.bookmarkCategory && (
                <span style={{
                  fontSize: '11px', padding: '2px 8px', borderRadius: '10px',
                  backgroundColor: 'rgba(32, 201, 151, 0.12)', color: '#20c997', fontWeight: 500,
                }}>
                  {item.bookmarkCategory}
                </span>
              )}
              {domain && (
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  ({domain})
                </span>
              )}
            </div>

            {item.bookmarkDesc && (
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '3px' }}>
                {item.bookmarkDesc}
              </div>
            )}

            {item.url && (
              <div style={{
                fontSize: '11px', fontFamily: 'var(--font-mono, monospace)',
                color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '3px',
              }}>
                🔗 {item.url}
              </div>
            )}
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                padding: '6px 12px', borderRadius: '6px',
                backgroundColor: 'var(--accent)', color: '#fff',
                fontSize: '12px', fontWeight: 600, textDecoration: 'none',
              }}
            >
              <ExternalLink size={13} />
              <span>Apri Link</span>
            </a>
          )}

          {item.url && (
            <button
              type="button"
              onClick={handleCopyUrl}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 10px', borderRadius: '6px',
                backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer',
              }}
              title="Copia URL negli appunti"
            >
              {copied ? <Check size={13} color="var(--success)" /> : <Copy size={13} />}
              <span>{copied ? 'Copiato!' : 'Copia'}</span>
            </button>
          )}

          {editable && (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 10px', borderRadius: '6px',
                backgroundColor: isEditing ? 'var(--bg-surface-active)' : 'var(--bg-app)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer',
              }}
            >
              <Edit3 size={13} />
              <span>{isEditing ? 'Chiudi' : 'Modifica'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && editable && (
        <div style={{
          marginTop: '12px', padding: '12px', borderRadius: '8px',
          backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Configura Segnalibro / Link a Documentazione Esterna:
          </div>
          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>URL Destinazione</label>
            <input
              type="text"
              placeholder="https://docs.example.com o https://github.com/..."
              value={urlInput}
              onChange={e => setUrlInput(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px', fontSize: '13px',
                borderRadius: '6px', border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', marginTop: '2px',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Titolo Segnalibro</label>
              <input
                type="text"
                placeholder="es. Documentazione API, Repository GitHub..."
                value={titleInput}
                onChange={e => setTitleInput(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: '12px',
                  borderRadius: '6px', border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', marginTop: '2px',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Categoria</label>
              <input
                type="text"
                placeholder="es. Documentazione, Portale, Tool..."
                value={categoryInput}
                onChange={e => setCategoryInput(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: '12px',
                  borderRadius: '6px', border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', marginTop: '2px',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Descrizione / Note</label>
            <input
              type="text"
              placeholder="Breve nota descrittiva o istruzioni d'uso..."
              value={descInput}
              onChange={e => setDescInput(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px', fontSize: '12px',
                borderRadius: '6px', border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', marginTop: '2px',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: '6px 16px', borderRadius: '6px',
                backgroundColor: 'var(--accent)', color: '#fff',
                fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer',
              }}
            >
              Salva Segnalibro
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. BLOCCO CASSAFORTE PASSWORD & CREDENZIALI (MINI PASSWORD MANAGER)
// ─────────────────────────────────────────────────────────────

export function VaultBlock({
  item,
  editable,
  onUpdate,
}: {
  item: UtilityBlockData;
  editable: boolean;
  onUpdate: (u: Partial<UtilityBlockData>) => void;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [isEditing, setIsEditing] = useState(!item.vaultPassword && !item.vaultService);
  const [service, setService] = useState(item.vaultService || item.text || 'Credenziali Server / Servizio');
  const [username, setUsername] = useState(item.vaultUsername || '');
  const [password, setPassword] = useState(item.vaultPassword || '');
  const [url, setUrl] = useState(item.vaultUrl || '');
  const [notes, setNotes] = useState(item.vaultNotes || '');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleSave = () => {
    onUpdate({
      text: service,
      vaultService: service,
      vaultUsername: username,
      vaultPassword: password,
      vaultUrl: url,
      vaultNotes: notes,
    });
    setIsEditing(false);
  };

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    });
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      border: '1px solid rgba(250, 176, 5, 0.4)',
      borderRadius: 'var(--radius-lg, 10px)',
      padding: '14px 16px',
      margin: '6px 0',
      boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
      position: 'relative',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: 32, height: 32, borderRadius: '8px',
            backgroundColor: 'rgba(250, 176, 5, 0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <ShieldCheck size={18} color="#fab005" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                {service}
              </span>
              <span style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                backgroundColor: 'rgba(250, 176, 5, 0.15)', color: '#fab005', fontWeight: 700, letterSpacing: '0.3px',
              }}>
                🔒 CASSAFORTE NOTA
              </span>
            </div>
            {url && (
              <div style={{ fontSize: '11px', fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-muted)', marginTop: '2px' }}>
                🌐 {url}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {editable && (
            <button
              type="button"
              onClick={() => setIsEditing(!isEditing)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '6px 10px', borderRadius: '6px',
                backgroundColor: isEditing ? 'var(--bg-surface-active)' : 'var(--bg-app)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)', fontSize: '12px', cursor: 'pointer',
              }}
            >
              <Edit3 size={13} />
              <span>{isEditing ? 'Chiudi' : 'Modifica'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Credential Data Display */}
      {!isEditing && (
        <div style={{
          marginTop: '12px', padding: '10px 12px', borderRadius: '8px',
          backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          {username && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '80px' }}>Username:</span>
                <span style={{ fontSize: '13px', fontWeight: 500, fontFamily: 'var(--font-mono, monospace)', color: 'var(--text-primary)' }}>
                  {username}
                </span>
              </div>
              <button
                type="button"
                onClick={() => copyToClipboard(username, 'user')}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px',
                  padding: '3px 8px', borderRadius: '4px',
                  backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
                  color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer',
                }}
                title="Copia Username"
              >
                {copiedField === 'user' ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
                <span>{copiedField === 'user' ? 'Copiato!' : 'Copia'}</span>
              </button>
            </div>
          )}

          {password ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', width: '80px' }}>Password:</span>
                <span style={{
                  fontSize: '13px', fontWeight: 600, fontFamily: 'var(--font-mono, monospace)',
                  color: showPassword ? 'var(--text-primary)' : 'var(--text-muted)',
                  letterSpacing: showPassword ? 'normal' : '2px',
                }}>
                  {showPassword ? password : '••••••••••••••••'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '3px 8px', borderRadius: '4px',
                    backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
                    color: 'var(--text-secondary)', fontSize: '11px', cursor: 'pointer',
                  }}
                  title={showPassword ? 'Nascondi password' : 'Mostra password'}
                >
                  {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                  <span>{showPassword ? 'Nascondi' : 'Mostra'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => copyToClipboard(password, 'pwd')}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '4px',
                    padding: '3px 8px', borderRadius: '4px',
                    backgroundColor: 'var(--accent)', color: '#fff',
                    border: 'none', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                  }}
                  title="Copia Password negli appunti"
                >
                  {copiedField === 'pwd' ? <Check size={12} /> : <Copy size={12} />}
                  <span>{copiedField === 'pwd' ? 'Copiata!' : 'Copia Password'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Nessuna password salvata. Clicca su Modifica per aggiungerla.
            </div>
          )}

          {notes && (
            <div style={{ paddingTop: '6px', borderTop: '1px dashed var(--border)', fontSize: '11px', color: 'var(--text-muted)' }}>
              📝 Note: {notes}
            </div>
          )}
        </div>
      )}

      {/* Edit Form */}
      {isEditing && editable && (
        <div style={{
          marginTop: '12px', padding: '12px', borderRadius: '8px',
          backgroundColor: 'var(--bg-app)', border: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
            Modifica Credenziali Protette:
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Nome Servizio / Sistema</label>
              <input
                type="text"
                placeholder="es. Server Staging SSH, Pannello Aruba, API Stripe..."
                value={service}
                onChange={e => setService(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: '12px',
                  borderRadius: '6px', border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', marginTop: '2px',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Host / Porta / URL</label>
              <input
                type="text"
                placeholder="es. 192.168.1.100:22"
                value={url}
                onChange={e => setUrl(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: '12px',
                  borderRadius: '6px', border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', marginTop: '2px',
                }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Username / Email / Login</label>
              <input
                type="text"
                placeholder="Username o email..."
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: '12px',
                  borderRadius: '6px', border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', marginTop: '2px',
                }}
              />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Password / Secret Key / Token</label>
              <input
                type="text"
                placeholder="Password o chiave segreta..."
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{
                  width: '100%', padding: '6px 10px', fontSize: '12px',
                  borderRadius: '6px', border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', marginTop: '2px',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Note / Scadenza / Istruzioni</label>
            <input
              type="text"
              placeholder="es. Rinnovo annuale a dicembre, accesso consentito solo da VPN..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px', fontSize: '12px',
                borderRadius: '6px', border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', marginTop: '2px',
              }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSave}
              style={{
                padding: '6px 16px', borderRadius: '6px',
                backgroundColor: 'var(--accent)', color: '#fff',
                fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer',
              }}
            >
              Salva Credenziali
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
