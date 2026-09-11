import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageTypes } from '../../hooks/usePageTypes';
import { useCreatePage, usePages } from '../../hooks/usePages';
import { X, Plus, Sparkles, ChevronRight, ChevronLeft, Search, Box } from 'lucide-react';
import type { Priority, Page } from '../../lib/types';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTypeId?: string;
  defaultParentId?: string;
}

export function QuickCreateModal({
  isOpen,
  onClose,
  defaultTypeId,
  defaultParentId
}: QuickCreateModalProps) {
  const navigate = useNavigate();
  const { data: pageTypes } = usePageTypes();
  const createPage = useCreatePage();
  
  // Fetch a good chunk of pages for hierarchy selection
  const { data: allPagesData } = usePages({ limit: 200, sortBy: [{ property: 'updatedAt', direction: 'desc' }] });
  
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(defaultParentId || null);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedTypeId, setSelectedTypeId] = useState(defaultTypeId || 'base_type_id');
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Priority>('none');

  React.useEffect(() => {
    if (defaultTypeId) setSelectedTypeId(defaultTypeId);
  }, [defaultTypeId]);

  // Group pages for step 1
  const groupedPages = useMemo(() => {
    if (!allPagesData?.items) return { clients: [], projects: [], others: [] };
    const items = allPagesData.items.filter(p => p.status !== 'archived' && p.status !== 'cancelled' && p.status !== 'closed');
    const filtered = items.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return {
      clients: filtered.filter(p => p.typeName === 'client'),
      projects: filtered.filter(p => p.typeName === 'project'),
      others: filtered.filter(p => p.typeName !== 'client' && p.typeName !== 'project')
    };
  }, [allPagesData, searchQuery]);

  if (!isOpen) return null;

  const currentType = pageTypes?.find(t => t.id === selectedTypeId || t.name === selectedTypeId) || pageTypes?.find(t => t.name === 'base');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const typeId = currentType?.id || selectedTypeId;
    const initialStatus = currentType?.statusFlow?.find(s => s.isInitial)?.value || 'draft';

    createPage.mutate({
      request: {
        typeId,
        parentId: selectedParentId,
        title: title.trim(),
        status: initialStatus,
        priority,
        icon: currentType?.icon || 'Box',
        properties: {}
      }
    }, {
      onSuccess: (newPage) => {
        onClose();
        navigate(`/page/${newPage.id}`);
      }
    });
  };

  const modalVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 20 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { type: 'spring' as const, damping: 25, stiffness: 300 } },
    exit: { opacity: 0, scale: 0.95, y: 20, transition: { duration: 0.15 } }
  };

  const stepVariants = {
    enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
    center: { x: 0, opacity: 1, transition: { type: 'spring' as const, damping: 25, stiffness: 300 } },
    exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0, transition: { duration: 0.2 } })
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'var(--glass-blur)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
    }} onClick={onClose}>
      <motion.div 
        variants={modalVariants} initial="hidden" animate="visible" exit="exit"
        style={{
          backgroundColor: 'var(--glass-bg)', width: '100%', maxWidth: '600px',
          borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--glass-border)', overflow: 'hidden',
          display: 'flex', flexDirection: 'column', minHeight: '480px'
        }} 
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--accent)" />
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', margin: 0 }}>
              {step === 1 ? 'Dove vuoi posizionarlo?' : 'Definisci il nuovo blocco'}
            </h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}><X size={18} /></button>
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <AnimatePresence mode="wait" initial={false} custom={step === 1 ? -1 : 1}>
            {step === 1 ? (
              <motion.div key="step1" custom={-1} variants={stepVariants} initial="enter" animate="center" exit="exit"
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: '20px', overflowY: 'auto' }}>
                
                {/* Search / Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', backgroundColor: 'var(--bg-input)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', marginBottom: '20px' }}>
                  <Search size={16} color="var(--text-muted)" />
                  <input 
                    type="text" placeholder="Cerca progetto, cliente o nota..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                    style={{ border: 'none', background: 'transparent', outline: 'none', flex: 1, fontSize: '14px' }} 
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <ParentOption 
                    page={null} isSelected={selectedParentId === null} 
                    onClick={() => { setSelectedParentId(null); setStep(2); }} 
                  />
                  
                  {groupedPages.clients.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Clienti Attivi</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {groupedPages.clients.slice(0, 4).map(p => (
                          <ParentOption key={p.id} page={p} isSelected={selectedParentId === p.id} onClick={() => { setSelectedParentId(p.id); setStep(2); }} />
                        ))}
                      </div>
                    </div>
                  )}

                  {groupedPages.projects.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '0.05em' }}>Progetti in corso</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        {groupedPages.projects.slice(0, 4).map(p => (
                          <ParentOption key={p.id} page={p} isSelected={selectedParentId === p.id} onClick={() => { setSelectedParentId(p.id); setStep(2); }} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div key="step2" custom={1} variants={stepVariants} initial="enter" animate="center" exit="exit"
                style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, padding: '20px', display: 'flex', flexDirection: 'column' }}>
                
                <form id="create-form" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px', flex: 1 }}>
                  
                  {/* Title */}
                  <div>
                    <input
                      type="text" required autoFocus value={title} onChange={e => setTitle(e.target.value)}
                      placeholder="Dai un nome a questo blocco..."
                      style={{
                        width: '100%', padding: '16px 20px', borderRadius: 'var(--radius-lg)',
                        border: '2px solid var(--accent-light)', backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)', fontSize: '20px', fontWeight: 600, outline: 'none',
                        boxShadow: 'var(--shadow-sm)'
                      }}
                    />
                  </div>

                  {/* Type Selection (Fluid) */}
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>
                      Assegna una caratteristica (Opzionale)
                    </label>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                      {(pageTypes || []).map(t => {
                        const isSelected = t.id === selectedTypeId || t.name === selectedTypeId;
                        return (
                          <button
                            key={t.id} type="button" onClick={() => setSelectedTypeId(t.id)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px',
                              borderRadius: 'var(--radius-full)',
                              backgroundColor: isSelected ? t.color : 'var(--bg-surface)',
                              color: isSelected ? '#fff' : 'var(--text-primary)',
                              border: `1px solid ${isSelected ? t.color : 'var(--border)'}`,
                              boxShadow: isSelected ? 'var(--shadow-md)' : 'none',
                              transition: 'all var(--transition-fast)'
                            }}
                          >
                            <span style={{ fontSize: '16px', opacity: isSelected ? 1 : 0.7 }}>{t.icon}</span>
                            <span style={{ fontSize: '13px', fontWeight: isSelected ? 600 : 500 }}>{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div style={{ flex: 1 }} />
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', backgroundColor: 'var(--bg-app)' }}>
          {step === 2 ? (
            <button type="button" onClick={() => setStep(1)} style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '8px 12px', color: 'var(--text-secondary)' }}>
              <ChevronLeft size={16} /> Indietro
            </button>
          ) : <div />}

          {step === 2 && (
            <button
              form="create-form" type="submit" disabled={!title.trim()}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 24px',
                borderRadius: 'var(--radius-full)', backgroundColor: 'var(--accent)', color: '#fff',
                fontWeight: 600, opacity: title.trim() ? 1 : 0.6, transition: 'all 0.2s',
                boxShadow: title.trim() ? 'var(--shadow-md)' : 'none'
              }}
            >
              <Plus size={16} /> Crea Blocco
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function ParentOption({ page, isSelected, onClick }: { page: Page | null, isSelected: boolean, onClick: () => void }) {
  return (
    <motion.button
      whileHover={{ y: -2, boxShadow: 'var(--shadow-md)' }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
        backgroundColor: isSelected ? 'var(--accent-light)' : 'var(--bg-surface)',
        border: `1px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)', textAlign: 'left', cursor: 'pointer',
        boxShadow: isSelected ? 'var(--shadow-sm)' : 'none'
      }}
    >
      <div style={{ 
        width: '32px', height: '32px', borderRadius: '8px', 
        backgroundColor: page ? ((page as any).typeColor ? `${(page as any).typeColor}20` : 'var(--bg-app)') : 'var(--bg-app)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px'
      }}>
        {page ? page.icon || '📄' : <Box size={16} color="var(--text-muted)" />}
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <div style={{ fontSize: '14px', fontWeight: 600, color: isSelected ? 'var(--accent-text)' : 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
          {page ? page.title : 'Spazio Principale (Root)'}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {page ? (page as any).typeName : 'Nessun genitore'}
        </div>
      </div>
      <ChevronRight size={16} color={isSelected ? 'var(--accent)' : 'var(--text-muted)'} />
    </motion.button>
  );
}
