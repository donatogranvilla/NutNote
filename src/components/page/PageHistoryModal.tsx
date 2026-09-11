import React, { useState, useEffect } from 'react';
import { History, X, RotateCcw, Check, Clock, User, ArrowRight, ShieldAlert } from 'lucide-react';
import { changelogApi } from '../../lib/api';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '../../lib/queryKeys';
import { useUser } from '../../contexts/UserContext';
import type { ChangeLogEntry } from '../../lib/types';

interface PageHistoryModalProps {
  pageId: string;
  pageTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

export function PageHistoryModal({ pageId, pageTitle, isOpen, onClose }: PageHistoryModalProps) {
  const [history, setHistory] = useState<ChangeLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [restoredSuccessId, setRestoredSuccessId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { activeUser } = useUser();

  const loadHistory = async () => {
    setIsLoading(true);
    try {
      const items = await changelogApi.getHistory('page', pageId);
      setHistory(items);
    } catch (err) {
      console.error('Failed to load page history:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && pageId) {
      loadHistory();
      setRestoredSuccessId(null);
    }
  }, [isOpen, pageId]);

  if (!isOpen) return null;

  const handleRestore = async (entry: ChangeLogEntry) => {
    if (!entry.fieldName) return;
    const confirmMsg = `Vuoi davvero ripristinare il valore del campo "${entry.fieldName}" a "${entry.oldValue || '(vuoto)'}"?`;
    if (!window.confirm(confirmMsg)) return;

    setRestoringId(entry.id);
    try {
      await changelogApi.restoreField(entry.id, activeUser?.id);
      setRestoredSuccessId(entry.id);
      
      // Invalida cache React Query per ricaricare la pagina aggiornata
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.detail(pageId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.withAncestors(pageId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.pages.all });

      // Ricarica la history
      await loadHistory();
      setTimeout(() => setRestoredSuccessId(null), 3000);
    } catch (err: any) {
      alert(`Errore durante il ripristino: ${err}`);
    } finally {
      setRestoringId(null);
    }
  };

  const formatAction = (action: string) => {
    switch (action) {
      case 'create': return { label: 'Creata', color: '#2b8a3e', bg: 'rgba(43, 138, 62, 0.12)' };
      case 'update': return { label: 'Modifica', color: '#1971c2', bg: 'rgba(25, 113, 194, 0.12)' };
      case 'move': return { label: 'Spostata', color: '#e67700', bg: 'rgba(230, 119, 0, 0.12)' };
      case 'delete': return { label: 'Eliminata', color: '#c92a2a', bg: 'rgba(201, 42, 42, 0.12)' };
      default: return { label: action, color: '#868e96', bg: 'rgba(134, 142, 150, 0.12)' };
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '640px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.2))',
        display: 'flex', flexDirection: 'column',
        maxHeight: '85vh',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px',
              backgroundColor: 'rgba(25, 113, 194, 0.12)',
              color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <History size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: 600, margin: 0 }}>
                Cronologia Modifiche & Revisioni
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                {pageTitle}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '6px', borderRadius: '8px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Timeline Content */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)', fontSize: '13px' }}>
              Caricamento cronologia...
            </div>
          ) : history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              <Clock size={32} style={{ margin: '0 auto 10px', opacity: 0.5 }} />
              <div style={{ fontSize: '14px', fontWeight: 500 }}>Nessuna revisione registrata</div>
              <div style={{ fontSize: '12px', marginTop: '4px' }}>
                Le modifiche a titolo, stato, priorità e campi verranno tracciate qui automaticamente.
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', position: 'relative' }}>
              {history.map((entry, idx) => {
                const act = formatAction(entry.action);
                const canRestore = entry.action === 'update' && entry.fieldName && entry.oldValue !== undefined;

                return (
                  <div
                    key={entry.id}
                    style={{
                      padding: '14px 16px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border)',
                      display: 'flex', flexDirection: 'column', gap: '8px',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '11px', fontWeight: 700,
                          padding: '2px 8px', borderRadius: '6px',
                          backgroundColor: act.bg, color: act.color,
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                          {act.label}
                        </span>
                        {entry.fieldName && (
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            Campo: <code>{entry.fieldName}</code>
                          </span>
                        )}
                      </div>

                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        {entry.createdAt}
                      </span>
                    </div>

                    {/* Diff old vs new */}
                    {entry.action === 'update' && (
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        fontSize: '12px', padding: '6px 10px', borderRadius: '6px',
                        backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
                      }}>
                        <span style={{ color: 'var(--danger, #c92a2a)', textDecoration: 'line-through' }}>
                          {entry.oldValue ? (entry.oldValue.length > 50 ? entry.oldValue.substring(0, 50) + '...' : entry.oldValue) : '(vuoto)'}
                        </span>
                        <ArrowRight size={12} color="var(--text-muted)" />
                        <span style={{ color: 'var(--success, #2b8a3e)', fontWeight: 500 }}>
                          {entry.newValue ? (entry.newValue.length > 50 ? entry.newValue.substring(0, 50) + '...' : entry.newValue) : '(vuoto)'}
                        </span>
                      </div>
                    )}

                    {/* User info & restore action */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                        <User size={12} />
                        <span>{entry.userName || 'Utente'}</span>
                        {entry.deviceId && (
                          <span style={{ color: 'var(--text-muted)' }}>• {entry.deviceId}</span>
                        )}
                      </div>

                      {canRestore && (
                        <button
                          onClick={() => handleRestore(entry)}
                          disabled={restoringId === entry.id}
                          style={{
                            padding: '4px 10px',
                            borderRadius: '6px',
                            border: '1px solid var(--border)',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-primary)',
                            fontSize: '11px', fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '4px',
                          }}
                        >
                          {restoredSuccessId === entry.id ? (
                            <>
                              <Check size={12} color="#2b8a3e" />
                              <span style={{ color: '#2b8a3e' }}>Ripristinato</span>
                            </>
                          ) : (
                            <>
                              <RotateCcw size={12} />
                              <span>Ripristina</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
