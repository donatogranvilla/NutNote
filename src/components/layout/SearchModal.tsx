import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSearch } from '../../hooks/useSearch';
import { Search, FileText, X, ArrowRight, CornerDownLeft } from 'lucide-react';

export function SearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { data: results, isLoading } = useSearch(query);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-search-modal', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-search-modal', handleCustomOpen);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  const handleSelectResult = (pageId: string) => {
    setIsOpen(false);
    navigate(`/page/${pageId}`);
  };

  const handleKeyNav = (e: React.KeyboardEvent) => {
    if (!results || results.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = results[selectedIndex];
      if (current) {
        handleSelectResult(current.pageId || current.page_id);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '12vh',
        zIndex: 'var(--z-modal)',
        backdropFilter: 'blur(3px)'
      }}
      onClick={() => setIsOpen(false)}
    >
      <div 
        style={{
          width: '100%',
          maxWidth: '620px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid var(--border)' }}>
          <Search size={20} color="var(--accent)" style={{ marginRight: '12px' }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Cerca pagine, note, task o allegati..."
            value={query}
            onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyNav}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: '16px',
              backgroundColor: 'transparent',
              color: 'var(--text-primary)'
            }}
          />
          <button 
            onClick={() => setIsOpen(false)} 
            style={{ padding: '4px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ maxHeight: '55vh', overflowY: 'auto', padding: '8px' }}>
          {isLoading && query.length > 1 && (
            <div style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px' }}>
              Ricerca in corso su database e testo...
            </div>
          )}
          
          {!isLoading && query.length > 1 && (!results || results.length === 0) && (
            <div style={{ padding: '24px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '14px' }}>
              Nessun risultato trovato per "<strong>{query}</strong>".
            </div>
          )}

          {!query && (
            <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center', fontSize: '13px' }}>
              Inizia a digitare per effettuare una ricerca full-text istantanea.
            </div>
          )}

          {!isLoading && results && results.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {results.map((res: any, idx: number) => {
                const isSelected = idx === selectedIndex;
                const pageId = res.pageId || res.page_id;
                const typeLabel = res.typeLabel || res.type_label || res.typeName || res.type_name;

                return (
                  <div 
                    key={pageId || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 14px',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      backgroundColor: isSelected ? 'var(--bg-surface-active)' : 'transparent',
                      border: isSelected ? '1px solid var(--accent)' : '1px solid transparent',
                      transition: 'var(--transition-interactive)'
                    }}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    onClick={() => handleSelectResult(pageId)}
                  >
                    <div style={{ fontSize: '22px', display: 'flex', alignItems: 'center' }}>
                      {res.icon || <FileText size={20} color="var(--accent)" />}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '14px' }}>
                          {res.title}
                        </span>
                        {typeLabel && (
                          <span style={{
                            fontSize: '11px',
                            padding: '1px 6px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--text-secondary)',
                            border: '1px solid var(--border)'
                          }}>
                            {typeLabel}
                          </span>
                        )}
                        {res.status && (
                          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            • {res.status}
                          </span>
                        )}
                      </div>

                      {res.snippet && (
                        <div 
                          style={{
                            fontSize: '12px',
                            color: 'var(--text-secondary)',
                            marginTop: '3px',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                          dangerouslySetInnerHTML={{ __html: res.snippet }} 
                        />
                      )}
                    </div>

                    {isSelected && (
                      <CornerDownLeft size={16} color="var(--accent)" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid var(--border)',
          fontSize: '12px',
          color: 'var(--text-muted)',
          display: 'flex',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-app)'
        }}>
          <span>Usa <kbd style={kbdStyle}>↑</kbd> <kbd style={kbdStyle}>↓</kbd> per navigare</span>
          <span><kbd style={kbdStyle}>Invio</kbd> per aprire &nbsp;•&nbsp; <kbd style={kbdStyle}>Esc</kbd> per chiudere</span>
        </div>
      </div>
    </div>
  );
}

const kbdStyle: React.CSSProperties = {
  padding: '2px 5px',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: '4px',
  fontSize: '11px'
};
