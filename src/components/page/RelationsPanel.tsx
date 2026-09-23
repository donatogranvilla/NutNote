import React, { useState, useMemo, useEffect } from 'react';
import { useRelations, useDeleteRelation, useCreateRelation } from '../../hooks/useRelations';
import { usePages } from '../../hooks/usePages';
import { usePageTypes } from '../../hooks/usePageTypes';
import { searchApi } from '../../lib/api';
import { Link } from 'react-router-dom';
import { 
  Link as LinkIcon, Trash2, ArrowRight, ArrowLeft, Plus, 
  Search, Copy, Check, Building2, Globe, AlertCircle, X, ExternalLink
} from 'lucide-react';
import { DynamicIcon } from '../DynamicIcon';

interface RelationsPanelProps {
  pageId: string;
  rootClientId?: string | null;
  clientTitle?: string;
}

const RELATION_TYPE_LABELS: Record<string, string> = {
  related: 'Correlato a',
  depends_on: 'Dipende da',
  blocks: 'Blocca',
  reference: 'Referenzia',
};

export function RelationsPanel({ pageId, rootClientId, clientTitle }: RelationsPanelProps) {
  const { data: relations, isLoading } = useRelations(pageId);
  const deleteRelation = useDeleteRelation();
  const createRelation = useCreateRelation();
  const { data: allTypes } = usePageTypes();

  // Fetch client pages when rootClientId is present
  const { data: clientPagesData, isLoading: clientPagesLoading } = usePages({
    rootClientId: rootClientId || undefined,
    limit: 100,
  });

  const [isAdding, setIsAdding] = useState(false);
  const [mode, setMode] = useState<'client' | 'external'>('client');
  const [targetId, setTargetId] = useState('');
  const [selectedPagePreview, setSelectedPagePreview] = useState<{ id: string; title: string; icon?: string; typeLabel?: string } | null>(null);
  const [relationType, setRelationType] = useState('related');
  const [description, setDescription] = useState('');
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [externalSearchQuery, setExternalSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Default to external if page has no client
  useEffect(() => {
    if (!rootClientId) {
      setMode('external');
    } else {
      setMode('client');
    }
  }, [rootClientId]);

  // Set of IDs already connected to avoid duplicate links
  const connectedIds = useMemo(() => {
    const ids = new Set<string>();
    if (relations) {
      for (const rel of relations) {
        const other = rel.otherPage || (rel as any).linkedPage;
        if (other?.id) ids.add(other.id);
        if (rel.sourceId) ids.add(rel.sourceId);
        if (rel.targetId) ids.add(rel.targetId);
      }
    }
    return ids;
  }, [relations]);

  // Filter client pages excluding the current page
  const availableClientPages = useMemo(() => {
    const items = clientPagesData?.items || [];
    return items.filter(p => {
      if (p.id === pageId) return false;
      if (clientSearchQuery.trim()) {
        const q = clientSearchQuery.toLowerCase();
        const matchesTitle = p.title?.toLowerCase().includes(q);
        const pType = allTypes?.find(t => t.id === p.typeId);
        const matchesType = pType?.label?.toLowerCase().includes(q) || pType?.name?.toLowerCase().includes(q);
        return matchesTitle || matchesType;
      }
      return true;
    });
  }, [clientPagesData?.items, pageId, clientSearchQuery, allTypes]);

  // Debounced search for external pages
  useEffect(() => {
    if (mode !== 'external' || !externalSearchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchApi.search(externalSearchQuery.trim(), 10);
        // Exclude current page
        setSearchResults((res || []).filter(item => (item.pageId || item.id) !== pageId));
      } catch (err) {
        console.error('Search error in RelationsPanel:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [externalSearchQuery, mode, pageId]);

  const handleCopyId = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    navigator.clipboard.writeText(id).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1800);
    });
  };

  const handleDelete = (id: string) => {
    if (confirm('Vuoi davvero rimuovere questo collegamento?')) {
      deleteRelation.mutate({ id });
    }
  };

  const handleSelectClientPage = (p: any) => {
    const pType = allTypes?.find(t => t.id === p.typeId);
    setTargetId(p.id);
    setSelectedPagePreview({
      id: p.id,
      title: p.title,
      icon: p.icon,
      typeLabel: pType?.label || 'Pagina',
    });
    setErrorMsg(null);
  };

  const handleSelectExternalPage = (item: any) => {
    const id = item.pageId || item.id;
    setTargetId(id);
    setSelectedPagePreview({
      id,
      title: item.title,
      icon: item.icon,
      typeLabel: item.typeLabel || item.typeName || 'Pagina',
    });
    setErrorMsg(null);
  };

  const handleClearSelection = () => {
    setTargetId('');
    setSelectedPagePreview(null);
  };

  const handleAdd = () => {
    const cleanTargetId = targetId.trim();
    if (!cleanTargetId) {
      setErrorMsg('Seleziona una pagina dal selettore o inserisci un ID valido.');
      return;
    }
    if (cleanTargetId === pageId) {
      setErrorMsg('Non è possibile collegare una pagina a se stessa.');
      return;
    }

    setErrorMsg(null);
    createRelation.mutate({
      sourceId: pageId,
      targetId: cleanTargetId,
      type: relationType,
      description: description.trim() || undefined,
      userId: '123e4567-e89b-12d3-a456-426614174000',
    }, {
      onSuccess: () => {
        setIsAdding(false);
        setTargetId('');
        setSelectedPagePreview(null);
        setDescription('');
        setClientSearchQuery('');
        setExternalSearchQuery('');
        setErrorMsg(null);
      },
      onError: (err: any) => {
        const message = err?.message || String(err);
        setErrorMsg(message || 'Errore durante la creazione del collegamento.');
      }
    });
  };

  if (isLoading) {
    return <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', padding: 'var(--sp-3)' }}>Caricamento relazioni...</div>;
  }

  return (
    <div style={{
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--bg-surface)',
      overflow: 'hidden',
    }}>
      {/* Panel Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 'var(--sp-3) var(--sp-4)',
        borderBottom: '1px solid var(--border)',
        backgroundColor: 'var(--bg-app)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LinkIcon size={16} color="var(--accent)" />
          <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', margin: 0 }}>
            Relazioni & Collegamenti ({relations?.length || 0})
          </h3>
        </div>
        <button 
          onClick={() => {
            setIsAdding(!isAdding);
            setErrorMsg(null);
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: 'var(--text-xs)',
            fontWeight: 'var(--weight-medium)',
            padding: '4px 10px',
            backgroundColor: isAdding ? 'var(--bg-surface)' : 'var(--accent)',
            color: isAdding ? 'var(--text-primary)' : '#ffffff',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            cursor: 'pointer',
            transition: 'var(--transition-interactive)',
          }}
        >
          {isAdding ? <X size={14} /> : <Plus size={14} />}
          <span>{isAdding ? 'Chiudi' : 'Aggiungi'}</span>
        </button>
      </div>

      {/* Adding Box Form */}
      {isAdding && (
        <div style={{
          padding: 'var(--sp-4)',
          backgroundColor: 'var(--bg-app)',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--sp-3)',
        }}>
          {/* Tabs: Pagine del cliente vs ID Esterno / Cerca */}
          <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
            {rootClientId && (
              <button
                type="button"
                onClick={() => { setMode('client'); setErrorMsg(null); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  fontSize: 'var(--text-xs)',
                  fontWeight: mode === 'client' ? 'var(--weight-semibold)' : 'normal',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: mode === 'client' ? 'var(--accent)' : 'var(--bg-surface)',
                  color: mode === 'client' ? '#ffffff' : 'var(--text-secondary)',
                  border: '1px solid var(--border)',
                  cursor: 'pointer',
                }}
              >
                <Building2 size={14} />
                <span>Pagine del Cliente {clientTitle ? `(${clientTitle})` : ''}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => { setMode('external'); setErrorMsg(null); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                fontSize: 'var(--text-xs)',
                fontWeight: mode === 'external' ? 'var(--weight-semibold)' : 'normal',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: mode === 'external' ? 'var(--accent)' : 'var(--bg-surface)',
                color: mode === 'external' ? '#ffffff' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
                cursor: 'pointer',
              }}
            >
              <Globe size={14} />
              <span>Cerca tra tutte / ID Esterno</span>
            </button>
          </div>

          {/* MODE 1: CLIENT PAGES SELECTOR */}
          {mode === 'client' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                  Seleziona una pagina appartenente allo stesso cliente:
                </span>
                {clientPagesLoading && (
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Caricamento...</span>
                )}
              </div>

              {/* Search filter within client pages */}
              <div style={{ position: 'relative', marginBottom: '8px' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Filtra tra le pagine del cliente per titolo..."
                  value={clientSearchQuery}
                  onChange={e => setClientSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px 6px 28px',
                    fontSize: 'var(--text-xs)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Client Pages List */}
              <div style={{
                maxHeight: '180px',
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '4px',
                backgroundColor: 'var(--bg-surface)',
              }}>
                {availableClientPages.length === 0 ? (
                  <div style={{ padding: '12px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
                    {clientPagesLoading ? 'Caricamento pagine del cliente...' : 'Nessuna pagina disponibile trovata per questo cliente.'}
                  </div>
                ) : (
                  availableClientPages.map(p => {
                    const isSelected = targetId === p.id;
                    const isAlreadyConnected = connectedIds.has(p.id);
                    const pType = allTypes?.find(t => t.id === p.typeId);

                    return (
                      <div
                        key={p.id}
                        onClick={() => !isAlreadyConnected && handleSelectClientPage(p)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: isAlreadyConnected ? 'not-allowed' : 'pointer',
                          backgroundColor: isSelected 
                            ? 'rgba(66, 99, 235, 0.15)' 
                            : isAlreadyConnected 
                              ? 'transparent' 
                              : 'var(--bg-app)',
                          border: isSelected 
                            ? '1px solid var(--accent)' 
                            : '1px solid transparent',
                          opacity: isAlreadyConnected ? 0.6 : 1,
                          transition: 'var(--transition-interactive)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <DynamicIcon name={p.icon || pType?.icon} size={15} />
                          <span style={{
                            fontSize: 'var(--text-xs)',
                            fontWeight: isSelected ? 'var(--weight-semibold)' : 'normal',
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}>
                            {p.title}
                          </span>
                          {pType && (
                            <span style={{
                              fontSize: '10px',
                              padding: '1px 6px',
                              borderRadius: '10px',
                              backgroundColor: 'var(--bg-surface-hover)',
                              color: pType.color || 'var(--text-secondary)',
                            }}>
                              {pType.label}
                            </span>
                          )}
                          {p.status && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                              • {p.status}
                            </span>
                          )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {p.id}
                          </span>
                          {isAlreadyConnected ? (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              (collegata)
                            </span>
                          ) : isSelected ? (
                            <Check size={14} color="var(--accent)" />
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* MODE 2: EXTERNAL PAGE / MANUAL ID / GLOBAL SEARCH */}
          {mode === 'external' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                Cerca tra tutte le pagine dell'applicazione o inserisci direttamente l'ID:
              </span>

              {/* Global search */}
              <div style={{ position: 'relative' }}>
                <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="text"
                  placeholder="Cerca per titolo in tutti i clienti e documenti..."
                  value={externalSearchQuery}
                  onChange={e => setExternalSearchQuery(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '6px 8px 6px 28px',
                    fontSize: 'var(--text-xs)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              {/* Search results dropdown */}
              {isSearching ? (
                <div style={{ padding: '8px', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', textAlign: 'center' }}>
                  Ricerca in corso...
                </div>
              ) : searchResults.length > 0 ? (
                <div style={{
                  maxHeight: '140px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '4px',
                  backgroundColor: 'var(--bg-surface)',
                }}>
                  {searchResults.map((item: any) => {
                    const id = item.pageId || item.id;
                    const isSelected = targetId === id;
                    const isConnected = connectedIds.has(id);

                    return (
                      <div
                        key={id}
                        onClick={() => !isConnected && handleSelectExternalPage(item)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 10px',
                          borderRadius: 'var(--radius-sm)',
                          cursor: isConnected ? 'not-allowed' : 'pointer',
                          backgroundColor: isSelected ? 'rgba(66, 99, 235, 0.15)' : 'var(--bg-app)',
                          border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                          opacity: isConnected ? 0.6 : 1,
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <DynamicIcon name={item.icon} size={14} />
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)', fontWeight: isSelected ? 'bold' : 'normal' }}>
                            {item.title}
                          </span>
                          {(item.typeLabel || item.typeName) && (
                            <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', backgroundColor: 'var(--bg-surface-hover)' }}>
                              {item.typeLabel || item.typeName}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {id}
                          </span>
                          {isConnected && <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>(collegata)</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : null}

              {/* Direct ID input */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  Oppure digita o incolla l'ID pagina target:
                </span>
                <input
                  type="text"
                  placeholder="ID Pagina target (es. client-2, page-xxx)..."
                  value={targetId}
                  onChange={e => {
                    setTargetId(e.target.value);
                    setSelectedPagePreview(null);
                    setErrorMsg(null);
                  }}
                  style={{
                    padding: '6px 8px',
                    fontSize: 'var(--text-xs)',
                    fontFamily: 'monospace',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-input)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          )}

          {/* Selected Page Preview badge */}
          {selectedPagePreview && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 10px',
              backgroundColor: 'rgba(43, 138, 62, 0.1)',
              border: '1px solid rgba(43, 138, 62, 0.3)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <DynamicIcon name={selectedPagePreview.icon} size={15} />
                <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
                  {selectedPagePreview.title}
                </span>
                <span style={{ fontSize: '10px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  ({selectedPagePreview.id})
                </span>
              </div>
              <button
                type="button"
                onClick={handleClearSelection}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                title="Deseleziona"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Relation Parameters: Type & Description */}
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <div style={{ flex: '0 0 160px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                Tipo di Relazione
              </label>
              <select
                value={relationType}
                onChange={e => setRelationType(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-xs)',
                }}
              >
                <option value="related">Correlato a</option>
                <option value="depends_on">Dipende da</option>
                <option value="blocks">Blocca</option>
                <option value="reference">Referenzia</option>
              </select>
            </div>

            <div style={{ flex: '1 1 200px' }}>
              <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-muted)', marginBottom: '3px' }}>
                Nota / Descrizione (opzionale)
              </label>
              <input
                type="text"
                placeholder="Es. Richiede completamento prima di procedere..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px 8px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-input)',
                  color: 'var(--text-primary)',
                  fontSize: 'var(--text-xs)',
                }}
              />
            </div>
          </div>

          {/* Error message */}
          {errorMsg && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: 'var(--danger)',
              fontSize: 'var(--text-xs)',
              padding: '6px 8px',
              backgroundColor: 'rgba(224, 49, 49, 0.1)',
              borderRadius: 'var(--radius-sm)',
            }}>
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Action buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false);
                setErrorMsg(null);
                setTargetId('');
                setSelectedPagePreview(null);
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
              }}
            >
              Annulla
            </button>
            <button
              type="button"
              onClick={handleAdd}
              disabled={!targetId.trim() || createRelation.isPending}
              style={{
                padding: '6px 14px',
                backgroundColor: 'var(--accent)',
                color: '#ffffff',
                border: 'none',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-medium)',
                cursor: !targetId.trim() || createRelation.isPending ? 'not-allowed' : 'pointer',
                opacity: !targetId.trim() || createRelation.isPending ? 0.6 : 1,
              }}
            >
              {createRelation.isPending ? 'Collegamento...' : 'Collega Pagina'}
            </button>
          </div>
        </div>
      )}

      {/* Relations List */}
      <div style={{ padding: 'var(--sp-3) var(--sp-4)' }}>
        {relations && relations.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {relations.map((rel: any) => {
              const linked = rel.otherPage || rel.linkedPage || {};
              const isOutgoing = rel.direction === 'outgoing' || rel.isOutgoing === true;
              if (!linked.id) return null;

              const label = RELATION_TYPE_LABELS[rel.relationType] || rel.relationType;

              return (
                <div
                  key={rel.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    backgroundColor: 'var(--bg-app)',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', minWidth: 0, flex: 1 }}>
                    <span title={isOutgoing ? 'Relazione in uscita' : 'Relazione in entrata'} style={{ display: 'flex', alignItems: 'center' }}>
                      {isOutgoing ? <ArrowRight size={14} color="var(--text-muted)" /> : <ArrowLeft size={14} color="var(--text-muted)" />}
                    </span>

                    <span style={{
                      fontSize: '11px',
                      padding: '2px 6px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      borderRadius: '4px',
                      color: 'var(--text-secondary)',
                      fontWeight: 'var(--weight-medium)',
                      whiteSpace: 'nowrap',
                    }}>
                      {label}
                    </span>

                    <Link
                      to={`/page/${linked.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        textDecoration: 'none',
                        color: 'var(--text-primary)',
                        minWidth: 0,
                      }}
                    >
                      <DynamicIcon name={linked.icon} size={15} />
                      <span style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 'var(--weight-medium)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {linked.title || 'Pagina collegata'}
                      </span>
                    </Link>

                    {(linked.typeLabel || linked.typeName) && (
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 6px',
                        borderRadius: '10px',
                        backgroundColor: 'var(--bg-surface-hover)',
                        color: linked.typeColor || 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                      }}>
                        {linked.typeLabel || linked.typeName}
                      </span>
                    )}

                    {linked.statusLabel && (
                      <span style={{ fontSize: '10px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                        • {linked.statusLabel}
                      </span>
                    )}

                    {rel.description && (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: '4px' }}>
                        — "{rel.description}"
                      </span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {/* Copy Target Page ID Button */}
                    <button
                      type="button"
                      onClick={(e) => handleCopyId(linked.id, e)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '10px',
                        fontFamily: 'monospace',
                        padding: '2px 6px',
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        color: copiedId === linked.id ? 'var(--success)' : 'var(--text-muted)',
                        cursor: 'pointer',
                      }}
                      title="Copia l'ID di questa pagina collegata"
                    >
                      {copiedId === linked.id ? <Check size={11} /> : <Copy size={11} />}
                      <span>{copiedId === linked.id ? 'Copiato!' : linked.id}</span>
                    </button>

                    {/* Delete Relation Button */}
                    <button
                      type="button"
                      onClick={() => handleDelete(rel.id)}
                      style={{
                        color: 'var(--text-muted)',
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        borderRadius: '4px',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = 'var(--danger)'}
                      onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                      title="Rimuovi collegamento"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ padding: 'var(--sp-4)', textAlign: 'center' }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
              Nessuna relazione per questa pagina. Clicca su "+ Aggiungi" per collegarla ad altre pagine di questo cliente o esterne.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
