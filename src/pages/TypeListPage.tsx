import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { usePages, useCreatePage, useUpdatePage } from '../hooks/usePages';
import { usePageType } from '../hooks/usePageTypes';
import { TableView } from '../components/views/TableView';
import { BarraViste } from '../components/views/BarraViste';
import { KanbanView } from '../components/views/KanbanView';
import { exportTableToCsv, exportTableToExcel } from '../lib/export';
import { 
  LayoutGrid, List, Plus, FileDown, Search, 
  Filter, Sparkles, AlertCircle, BookOpen 
} from 'lucide-react';
import { DynamicIcon } from '../components/DynamicIcon';
import type { StatusDefinition } from '../lib/types';

interface TypeListPageProps {
  type?: string;
}

export default function TypeListPage({ type: propType }: TypeListPageProps) {
  const { typeName: urlTypeName } = useParams<{ typeName: string }>();
  const navigate = useNavigate();

  const typeName = urlTypeName || propType || 'todo';
  const { data: pageType, isLoading: typeLoading } = usePageType(typeName);

  const [viewType, setViewType] = useState<'table' | 'kanban'>('table');
  const [filterQuery, setFilterQuery] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const { data, isLoading } = usePages({ typeName });
  const createPage = useCreatePage();
  const updatePage = useUpdatePage();

  const schema = pageType?.propertiesSchema || [];
  const statusFlow: StatusDefinition[] = pageType?.statusFlow || [
    { value: 'active', label: 'Attivo', color: '#2b8a3e', isInitial: true, isTerminal: false, transitionsTo: [] },
    { value: 'archived', label: 'Archiviato', color: '#868e96', isInitial: false, isTerminal: true, transitionsTo: [] }
  ];

  const handleCreate = () => {
    if (!pageType) return;
    const initialStatus = pageType.statusFlow?.find(s => s.isInitial)?.value || '';

    createPage.mutate({
      request: {
        typeId: pageType.id,
        title: `Nuovo ${pageType.label}`,
        status: initialStatus,
        priority: 'none',
        icon: pageType.icon || '📄',
        properties: {}
      }
    }, {
      onSuccess: (newPage) => {
        navigate(`/page/${newPage.id}`);
      }
    });
  };

  const handleReorder = (activeId: string, overId: string) => {
    if (!data?.items) return;
    const oldIndex = data.items.findIndex(i => i.id === activeId);
    const newIndex = data.items.findIndex(i => i.id === overId);
    if (oldIndex !== -1 && newIndex !== -1) {
      updatePage.mutate({ request: { id: activeId, position: newIndex } });
    }
  };

  const handleStatusChange = (pageId: string, newStatus: string) => {
    updatePage.mutate({ request: { id: pageId, status: newStatus } });
  };

  const handlePropertyChange = (pageId: string, propertyKey: string, value: unknown) => {
    const page = data?.items.find(i => i.id === pageId);
    if (page) {
      const newProps = { ...page.properties, [propertyKey]: value };
      updatePage.mutate({ request: { id: pageId, properties: newProps } });
    }
  };

  // Filter items by search query if present
  const filteredItems = (data?.items || []).filter(item => {
    if (!filterQuery) return true;
    const q = filterQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.status && item.status.toLowerCase().includes(q)) ||
      Object.values(item.properties || {}).some(v => String(v).toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      
      {/* Type Page Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '12px',
        paddingBottom: 'var(--sp-4)',
        borderBottom: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: pageType?.color ? `${pageType.color}22` : 'var(--bg-surface)',
            border: `1px solid ${pageType?.color || 'var(--border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: pageType?.color || 'var(--text-primary)'
          }}>
            <DynamicIcon name={pageType?.icon || '📄'} size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 'bold', margin: '0 0 2px 0', letterSpacing: '-0.02em' }}>
              {pageType?.labelPlural || typeName}
            </h1>
            <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              {filteredItems.length} elementi totali
            </span>
          </div>
        </div>
        
        {/* Actions bar */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          
          {/* Search in list */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '4px 10px'
          }}>
            <Search size={14} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Filtra..."
              value={filterQuery}
              onChange={e => setFilterQuery(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '13px',
                width: '120px'
              }}
            />
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', padding: '2px', border: '1px solid var(--border)' }}>
            <button 
              onClick={() => setViewType('table')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: viewType === 'table' ? 'var(--bg-surface-active)' : 'transparent',
                color: viewType === 'table' ? 'var(--accent)' : 'var(--text-secondary)',
                border: 'none',
                fontSize: '12px',
                fontWeight: viewType === 'table' ? 'bold' : 'normal',
                cursor: 'pointer'
              }}
              title="Vista Tabella"
            >
              <List size={16} />
              <span>Tabella</span>
            </button>
            <button 
              onClick={() => setViewType('kanban')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: viewType === 'kanban' ? 'var(--bg-surface-active)' : 'transparent',
                color: viewType === 'kanban' ? 'var(--accent)' : 'var(--text-secondary)',
                border: 'none',
                fontSize: '12px',
                fontWeight: viewType === 'kanban' ? 'bold' : 'normal',
                cursor: 'pointer'
              }}
              title="Vista Kanban"
            >
              <LayoutGrid size={16} />
              <span>Kanban</span>
            </button>
          </div>

          {/* Export Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: '13px',
                cursor: 'pointer'
              }}
              title="Esporta dati"
            >
              <FileDown size={15} />
              <span>Esporta</span>
            </button>

            {showExportMenu && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '4px',
                width: '180px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 'var(--z-menu)',
                padding: '4px'
              }}>
                <button
                  onClick={() => {
                    exportTableToExcel(filteredItems as any, schema, `${typeName}_export`);
                    setShowExportMenu(false);
                  }}
                  style={exportMenuItemStyle}
                >
                  📊 Esporta Excel (.xls)
                </button>
                <button
                  onClick={() => {
                    exportTableToCsv(filteredItems as any, schema, `${typeName}_export`);
                    setShowExportMenu(false);
                  }}
                  style={exportMenuItemStyle}
                >
                  📄 Esporta CSV (.csv)
                </button>
              </div>
            )}
          </div>
          
          {/* New Entity Button */}
          <button 
            onClick={handleCreate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              fontWeight: 'bold',
              fontSize: '13px',
              cursor: 'pointer',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Plus size={16} />
            <span>Nuovo {pageType?.label || 'Elemento'}</span>
          </button>

        </div>
      </div>

      {/* Documentation Hub Banner for Wiki */}
      {typeName === 'wiki' && (
        <div style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '10px',
              backgroundColor: 'rgba(112, 72, 232, 0.12)',
              color: '#7048e8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px'
            }}>
              📚
            </div>
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: '15px', fontWeight: 600 }}>
                Manuale Ufficiale & Documentation Hub
              </h3>
              <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                Consulta la documentazione completa di NutNote strutturata in 9 capitoli monografici con navigazione sequenziale.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/page/wiki-hub')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent)',
              color: '#fff',
              border: 'none',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
            }}
          >
            <BookOpen size={15} />
            Apri Manuale Completo
          </button>
        </div>
      )}

      {/* Viste salvate del tipo corrente */}
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <BarraViste
          typeName={typeName}
          configurazioneCorrente={{ displayType: viewType, filtro: filterQuery }}
          onApplica={(configurazione) => {
            setViewType(configurazione.displayType);
            setFilterQuery(configurazione.filtro);
          }}
        />
      </div>

      {/* Main View Body */}
      {isLoading || typeLoading ? (
        <div style={{ padding: 'var(--sp-8)', color: 'var(--text-muted)', textAlign: 'center' }}>
          Caricamento dati...
        </div>
      ) : (
        <div>
          {viewType === 'table' ? (
            <TableView 
              items={filteredItems} 
              schema={schema} 
              onReorder={handleReorder}
              onPropertyChange={handlePropertyChange}
            />
          ) : (
            <KanbanView 
              items={filteredItems} 
              statusFlow={statusFlow}
              onStatusChange={handleStatusChange}
              onReorder={handleReorder}
            />
          )}
        </div>
      )}
    </div>
  );
}

const exportMenuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: '8px 10px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '13px',
  color: 'var(--text-primary)',
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
};
