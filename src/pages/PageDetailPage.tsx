import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { usePageWithAncestors, useUpdatePage, useDeletePage, useTogglePin, useCreatePage } from '../hooks/usePages';
import { usePageType, usePageTypes } from '../hooks/usePageTypes';
import { useBlocks, useSaveBlocks } from '../hooks/useBlocks';
import { BlockEditor } from '../components/page/BlockEditor';
import { PropertiesPanel } from '../components/page/PropertiesPanel';
import { RelationsPanel } from '../components/page/RelationsPanel';
import { exportPageToPdf, exportPageToDocx, exportPageToMarkdown } from '../lib/export';
import { SelettoreEmoji } from '../components/page/SelettoreEmoji';
import { SFUMATURE, riferimentoSfumatura, isSfumatura, sfondoCopertina } from '../lib/copertine';
import { readMarkdownFile } from '../lib/importMarkdown';
import { 
  Star, MoreHorizontal, ChevronRight, ChevronLeft, ChevronDown, Plus, Trash2, 
  Archive, FileDown, FileUp, Image as ImageIcon, Smile, 
  FolderPlus, AlertCircle, ArrowLeft, Eye, EyeOff, MessageSquare, History,
  Copy, Check, Sliders, Link as LinkIcon, BookOpen
} from 'lucide-react';
import { useUser } from '../contexts/UserContext';
import { DynamicIcon } from '../components/DynamicIcon';
import { ProjectChat } from '../components/chat/ProjectChat';
import { PageHistoryModal } from '../components/page/PageHistoryModal';
import type { Priority } from '../lib/types';

const WIKI_CHAPTERS = [
  { id: 'wiki-ch1-architettura', num: 1, title: "Capitolo 1: Architettura & Data Model", icon: '🏛️' },
  { id: 'wiki-ch2-editor', num: 2, title: "Capitolo 2: Editor a Blocchi & Markdown", icon: '✍️' },
  { id: 'wiki-ch3-relazioni', num: 3, title: "Capitolo 3: Relazioni Intelligenti & Backlink", icon: '🔗' },
  { id: 'wiki-ch4-database-viste', num: 4, title: "Capitolo 4: Viste Database, Tabelle & Kanban", icon: '📊' },
  { id: 'wiki-ch5-collaborazione', num: 5, title: "Capitolo 5: Collaborazione, Team & Chat", icon: '👥' },
  { id: 'wiki-ch6-networking-lan', num: 6, title: "Capitolo 6: Networking, Server LAN & Sync", icon: '🌐' },
  { id: 'wiki-ch7-export-backup', num: 7, title: "Capitolo 7: Esportazione Documenti & Backup", icon: '💾' },
  { id: 'wiki-ch8-casi-uso', num: 8, title: "Capitolo 8: Casi d'Uso & Workflow Operativi", icon: '💼' },
  { id: 'wiki-ch9-faq-riferimento', num: 9, title: "Capitolo 9: Riferimento Rapido & FAQ", icon: '⚡' },
];


export default function PageDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { activeUser } = useUser();

  const { data: pageData, isLoading: pageLoading, error: pageError } = usePageWithAncestors(id || '');
  const page = pageData?.page;
  const ancestors = pageData?.ancestors || [];
  const children = pageData?.children || [];

  const { data: parentData } = usePageWithAncestors(page?.parentId || '');

  const { data: pageType } = usePageType(page?.typeId);
  const { data: allTypes } = usePageTypes();
  const { data: blocks, isLoading: blocksLoading } = useBlocks(id || '');

  const updatePage = useUpdatePage();
  const deletePage = useDeletePage();
  const togglePin = useTogglePin();
  const createPage = useCreatePage();
  const saveBlocks = useSaveBlocks();

  // Local state for interactive editing
  const [title, setTitle] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showCoverPicker, setShowCoverPicker] = useState(false);
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPriorityMenu, setShowPriorityMenu] = useState(false);
  const [showActionsMenu, setShowActionsMenu] = useState(false);
  const [showAddChildMenu, setShowAddChildMenu] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Accordion collapsible states for bottom sections
  const [isPropertiesOpen, setIsPropertiesOpen] = useState(false);
  const [isChildrenOpen, setIsChildrenOpen] = useState(false);
  const [isRelationsOpen, setIsRelationsOpen] = useState(false);
  const [copiedPageId, setCopiedPageId] = useState(false);

  const handleCopyPageId = (idToCopy: string) => {
    navigator.clipboard.writeText(idToCopy).then(() => {
      setCopiedPageId(true);
      setTimeout(() => setCopiedPageId(false), 2000);
    }).catch(err => {
      console.error('Clipboard error:', err);
    });
  };

  const isCurrentClient = pageType?.name === 'client';
  const clientType = allTypes?.find(t => t.name === 'client');
  const clientAncestor = ancestors.find(a => (clientType && a.typeId === clientType.id) || a.id === page?.rootClientId);
  const effectiveClientId = isCurrentClient ? page?.id : (page?.rootClientId || clientAncestor?.id);
  const effectiveClientTitle = isCurrentClient ? page?.title : clientAncestor?.title;

  const titleTimeoutRef = useRef<any>(null);
  // Deve stare qui insieme agli altri hook: più in basso finirebbe dopo le uscite
  // anticipate di caricamento ed errore, e React vedrebbe un hook in più quando
  // la pagina finisce di caricare.
  const markdownInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (page?.title) {
      setTitle(page.title);
    }
  }, [page?.id, page?.title]);

  useEffect(() => {
    if (!blocksLoading && blocks) {
      const queryParams = new URLSearchParams(location.search);
      const blockId = queryParams.get('block');
      if (blockId) {
        setTimeout(() => {
          const el = document.getElementById(`block-${blockId}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.transition = 'background-color 0.5s ease';
            el.style.backgroundColor = 'var(--bg-surface-hover)';
            setTimeout(() => {
              el.style.backgroundColor = 'transparent';
            }, 2000);
          }
        }, 300);
      }
    }
  }, [blocksLoading, blocks, location.search]);

  if (pageLoading || blocksLoading) {
    return <div style={{ padding: 'var(--sp-8)', color: 'var(--text-muted)', textAlign: 'center' }}>Caricamento pagina...</div>;
  }

  if (pageError || !page) {
    return (
      <div style={{ padding: 'var(--sp-8)', textAlign: 'center' }}>
        <AlertCircle size={40} color="var(--danger)" style={{ margin: '0 auto var(--sp-4)' }} />
        <h2 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--sp-2)' }}>Pagina non trovata</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--sp-4)' }}>La pagina richiesta potrebbe essere stata eliminata o non esistere.</p>
        <button onClick={() => navigate('/')} style={{ padding: '8px 16px', backgroundColor: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-md)' }}>
          Torna alla Dashboard
        </button>
      </div>
    );
  }

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    if (titleTimeoutRef.current) clearTimeout(titleTimeoutRef.current);
    titleTimeoutRef.current = setTimeout(() => {
      updatePage.mutate({ request: { id: page.id, title: newTitle } });
    }, 600);
  };

  const handlePropertyChange = (key: string, value: unknown) => {
    const newProps = { ...(page.properties || {}), [key]: value };
    updatePage.mutate({ request: { id: page.id, properties: newProps } });
  };

  const handleStatusChange = (newStatus: string) => {
    updatePage.mutate({ request: { id: page.id, status: newStatus } });
    setShowStatusMenu(false);
  };

  const handlePriorityChange = (newPriority: Priority) => {
    updatePage.mutate({ request: { id: page.id, priority: newPriority } });
    setShowPriorityMenu(false);
  };

  const handleVisibilityToggle = () => {
    const newVisibility = page.visibility === 'private' ? 'public' : 'private';
    updatePage.mutate({ request: { id: page.id, visibility: newVisibility } });
  };

  /** `null` toglie l'icona e lascia la pagina con quella del suo tipo. */
  const handleIconSelect = (icon: string | null) => {
    updatePage.mutate({ request: { id: page.id, icon } });
    setShowEmojiPicker(false);
  };

  const handleCoverSelect = (coverUrl: string | null) => {
    updatePage.mutate({ request: { id: page.id, coverUrl } });
    setShowCoverPicker(false);
  };

  const handleBlocksSave = (newBlocks: any[], plainText?: string) => {
    if (!id) return;
    saveBlocks.mutate({ pageId: id, blocks: newBlocks, userId: '123e4567-e89b-12d3-a456-426614174000', plainText });
  };

  const handleDelete = () => {
    deletePage.mutate(page.id, {
      onSuccess: () => {
        navigate(page.parentId ? `/page/${page.parentId}` : '/');
      }
    });
  };

  const handleCreateChild = (typeId: string, typeLabel: string) => {
    createPage.mutate({
      request: {
        typeId,
        parentId: page.id,
        title: `Nuovo ${typeLabel}`,
        status: '',
        properties: {}
      }
    }, {
      onSuccess: (newChild) => {
        navigate(`/page/${newChild.id}`);
        setShowAddChildMenu(false);
      }
    });
  };

  // Filter allowed child types
  const allowedChildTypes = (allTypes || []).filter(t => {
    if (!pageType?.allowedChildren || !Array.isArray(pageType.allowedChildren) || pageType.allowedChildren.length === 0) return true;
    return pageType.allowedChildren.includes(t.name) || pageType.allowedChildren.includes(t.id);
  });

  const currentStatusDef = Array.isArray(pageType?.statusFlow)
    ? pageType.statusFlow.find(s => s.value === page.status)
    : undefined;

  // 1. Official Wiki Manual Chapters
  const isOfficialWikiHub = page?.id === 'wiki-hub';
  const officialChapterIndex = WIKI_CHAPTERS.findIndex(c => c.id === page?.id);
  const isOfficialChapter = officialChapterIndex !== -1;

  // 2. Dynamic Collection / Sibling Navigation for ANY parent-child note hierarchy
  const siblings = (parentData?.children || []).filter(s => !s.isArchived);
  const parentPage = parentData?.page;
  const currentSiblingIndex = siblings.findIndex(s => s.id === page?.id);
  const hasSiblings = !!page?.parentId && siblings.length > 1 && currentSiblingIndex !== -1;

  // 3. Collection Hub with Children (Parent Note)
  const validChildren = children.filter(c => !c.isArchived);
  const hasChildren = validChildren.length > 0;

  const handleImportMarkdown = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !id) return;
    try {
      const parsed = await readMarkdownFile(file);
      const newBlocks = parsed.blocks.map((pb, idx) => {
        let type = pb.type;
        let content: Record<string, unknown> = { text: pb.text };
        if (type === 'heading1' || type === 'heading2' || type === 'heading3') {
          type = 'heading';
          content = { attrs: { level: pb.level || 1 }, content: [{ type: 'text', text: pb.text }] };
        } else if (type === 'todo') {
          type = 'taskList';
          content = { attrs: { checked: !!pb.checked }, content: [{ type: 'text', text: pb.text }] };
        } else if (type === 'bullet') {
          type = 'bulletList';
          content = { content: [{ type: 'text', text: pb.text }] };
        } else if (type === 'numbered') {
          type = 'orderedList';
          content = { content: [{ type: 'text', text: pb.text }] };
        } else if (type === 'quote') {
          type = 'blockquote';
          content = { content: [{ type: 'text', text: pb.text }] };
        } else if (type === 'code') {
          type = 'codeBlock';
          content = { attrs: { language: pb.language || 'text' }, content: [{ type: 'text', text: pb.text }] };
        } else if (type === 'callout') {
          content = { attrs: { calloutIcon: pb.calloutIcon || '💡' }, text: pb.text };
        } else if (type === 'mermaid') {
          content = { text: pb.text, mermaidCode: pb.mermaidCode || '', mermaidTitle: pb.mermaidTitle || '' };
        } else if (type === 'divider') {
          content = {};
        } else {
          type = 'paragraph';
          content = { content: [{ type: 'text', text: pb.text }] };
        }

        return {
          id: pb.id,
          pageId: id,
          parentBlockId: null,
          type: type as any,
          content,
          position: idx,
          createdAt: '',
          updatedAt: '',
        };
      });

      saveBlocks.mutate({
        pageId: id,
        blocks: newBlocks,
        userId: '123e4567-e89b-12d3-a456-426614174000',
        plainText: parsed.blocks.map(b => b.text).join(' ')
      });

      if (parsed.title && page && (page.title.startsWith('Nuov') || page.title === 'Senza Titolo')) {
        updatePage.mutate({ request: { id, title: parsed.title } });
      }

      alert(`Importati con successo ${newBlocks.length} blocchi dal file "${file.name}"!`);
    } catch (err: any) {
      console.error('Failed to import markdown:', err);
      alert('Errore importazione Markdown: ' + (err.message || 'File non valido'));
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  return (
    <div style={{ paddingBottom: 'var(--sp-12)' }}>
      
      {/* Cover Image Banner */}
      {page.coverUrl && (
        <div style={{
          position: 'relative',
          height: '180px',
          width: '100%',
          background: sfondoCopertina(page.coverUrl),
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: 'var(--radius-lg)',
          marginBottom: 'var(--sp-4)',
          overflow: 'hidden'
        }}>
          <button
            onClick={() => setShowCoverPicker(true)}
            style={{
              position: 'absolute',
              bottom: '12px',
              right: '12px',
              backgroundColor: 'rgba(0,0,0,0.6)',
              color: '#ffffff',
              padding: '4px 10px',
              borderRadius: 'var(--radius-md)',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <ImageIcon size={14} />
            Cambia Copertina
          </button>
        </div>
      )}

      {/* Main Container */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 var(--sp-4)' }}>
        
        {/* Navigation Breadcrumbs & Top Quick Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            <Link to="/" style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>Workspace</Link>
            <ChevronRight size={14} />
            {pageType && (
              <>
                <Link to={`/type/${pageType.name || pageType.id}`} style={{ color: 'var(--text-muted)', textDecoration: 'none' }}>
                  {pageType.labelPlural || pageType.label}
                </Link>
                <ChevronRight size={14} />
              </>
            )}
            {ancestors.map((anc) => (
              <React.Fragment key={anc.id}>
                <Link to={`/page/${anc.id}`} style={{ color: 'var(--text-secondary)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <DynamicIcon name={anc.icon || undefined} size={14} />
                  <span>{anc.title}</span>
                </Link>
                <ChevronRight size={14} />
              </React.Fragment>
            ))}
            <span style={{ color: 'var(--text-primary)', fontWeight: 'var(--weight-medium)' }}>
              {page.title}
            </span>
            <button
              type="button"
              onClick={() => handleCopyPageId(page.id)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '11px',
                fontFamily: 'monospace',
                padding: '2px 8px',
                borderRadius: '12px',
                border: '1px solid var(--border)',
                backgroundColor: copiedPageId ? 'rgba(43, 138, 62, 0.15)' : 'var(--bg-app)',
                color: copiedPageId ? 'var(--success)' : 'var(--text-muted)',
                cursor: 'pointer',
                transition: 'var(--transition-interactive)',
              }}
              title="Clicca per copiare l'ID univoco di questa pagina"
            >
              {copiedPageId ? <Check size={12} color="var(--success)" /> : <Copy size={12} />}
              <span>{copiedPageId ? 'ID Copiato!' : `ID: ${page.id.length > 16 ? page.id.slice(0, 8) + '...' : page.id}`}</span>
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {!page.coverUrl && (
              <button 
                onClick={() => setShowCoverPicker(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--text-muted)', padding: '4px 8px', borderRadius: 'var(--radius-sm)' }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <ImageIcon size={14} />
                + Copertina
              </button>
            )}
            <button
              onClick={() => {
                const el = document.getElementById('page-chat-section');
                el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                color: 'var(--text-primary)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)',
                cursor: 'pointer'
              }}
              title="Apri Chat e commenti di questa pagina"
            >
              <MessageSquare size={14} color="var(--accent)" />
              <span>Chat</span>
            </button>
            <button
              onClick={() => setShowHistoryModal(true)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                color: 'var(--text-primary)',
                padding: '4px 8px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-surface)',
                cursor: 'pointer'
              }}
              title="Visualizza cronologia modifiche e revisioni di questa pagina"
            >
              <History size={14} color="var(--accent)" />
              <span>Cronologia</span>
              {page.version && page.version > 1 && (
                <span style={{
                  fontSize: '10px',
                  padding: '1px 5px',
                  borderRadius: '4px',
                  backgroundColor: 'rgba(66, 99, 235, 0.12)',
                  color: 'var(--accent)',
                  fontWeight: 700,
                }}>
                  v{page.version}
                </span>
              )}
            </button>
            <button
              onClick={() => togglePin.mutate(page.id)}
              style={{
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: page.isPinned ? 'var(--warning-light, rgba(245, 159, 0, 0.15))' : 'transparent',
                color: page.isPinned ? 'var(--warning)' : 'var(--text-secondary)',
                border: 'none',
                cursor: 'pointer'
              }}
              title={page.isPinned ? 'Rimuovi dai Preferiti' : 'Aggiungi ai Preferiti'}
            >
              <Star size={18} fill={page.isPinned ? 'currentColor' : 'none'} />
            </button>

            {/* Actions Menu Trigger */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                style={{ padding: '6px', borderRadius: 'var(--radius-sm)', backgroundColor: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer' }}
                title="Altre Opzioni"
              >
                <MoreHorizontal size={18} />
              </button>

              {showActionsMenu && (
                <div style={{
                  position: 'absolute',
                  right: 0,
                  top: '100%',
                  marginTop: '4px',
                  width: '220px',
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  boxShadow: 'var(--shadow-lg)',
                  zIndex: 'var(--z-menu)',
                  padding: '4px'
                }}>
                  <div style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Esporta Pagina
                  </div>
                  <button 
                    onClick={() => { exportPageToPdf(page, blocks); setShowActionsMenu(false); }}
                    style={menuItemStyle}
                  >
                    <FileDown size={15} /> Esporta come PDF
                  </button>
                  <button 
                    onClick={() => { exportPageToDocx(page, blocks); setShowActionsMenu(false); }}
                    style={menuItemStyle}
                  >
                    <FileDown size={15} /> Esporta come Word (.doc)
                  </button>
                  <button 
                    onClick={() => { exportPageToMarkdown(page, blocks); setShowActionsMenu(false); }}
                    style={menuItemStyle}
                  >
                    <FileDown size={15} /> Esporta come Markdown (.md)
                  </button>

                  <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }} />
                  <div style={{ padding: '4px 8px', fontSize: '11px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Importa Documento
                  </div>
                  <button 
                    onClick={() => { markdownInputRef.current?.click(); setShowActionsMenu(false); }}
                    style={menuItemStyle}
                  >
                    <FileUp size={15} color="var(--accent)" /> Importa File Markdown (.md)
                  </button>
                  <input
                    type="file"
                    ref={markdownInputRef}
                    accept=".md,.markdown,.txt"
                    style={{ display: 'none' }}
                    onChange={handleImportMarkdown}
                  />

                  <div style={{ height: '1px', backgroundColor: 'var(--border)', margin: '4px 0' }} />

                  <button 
                    onClick={() => { handleCopyPageId(page.id); setShowActionsMenu(false); }}
                    style={menuItemStyle}
                  >
                    <Copy size={15} /> Copia ID Pagina
                  </button>

                  <button 
                    onClick={() => { setShowHistoryModal(true); setShowActionsMenu(false); }}
                    style={menuItemStyle}
                  >
                    <History size={15} color="var(--accent)" /> Cronologia & Revisioni
                  </button>

                  <button 
                    onClick={() => {
                      updatePage.mutate({ request: { id: page.id, isArchived: !page.isArchived } });
                      setShowActionsMenu(false);
                    }}
                    style={menuItemStyle}
                  >
                    <Archive size={15} /> {page.isArchived ? 'Ripristina' : 'Archivia'}
                  </button>
                  <button 
                    onClick={() => { setShowDeleteConfirm(true); setShowActionsMenu(false); }}
                    style={{ ...menuItemStyle, color: 'var(--danger)' }}
                  >
                    <Trash2 size={15} /> Elimina Pagina
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Cover Picker Modal */}
        {showCoverPicker && (
          <div style={{
            padding: 'var(--sp-3)',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--sp-4)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ fontSize: '13px', fontWeight: 'bold' }}>Copertina</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(104px, 1fr))', gap: '8px' }}>
              {SFUMATURE.map((sfumatura) => {
                const riferimento = riferimentoSfumatura(sfumatura.id);
                const scelta = page.coverUrl === riferimento;
                return (
                  <button
                    key={sfumatura.id}
                    onClick={() => handleCoverSelect(riferimento)}
                    title={sfumatura.nome}
                    style={{
                      height: '52px',
                      background: sfumatura.css,
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      border: scelta ? '2px solid var(--text-primary)' : '1px solid var(--border)',
                      outline: scelta ? '2px solid var(--accent)' : 'none',
                    }}
                  />
                );
              })}
            </div>

            {/* Una foto vera resta possibile, ma è una scelta esplicita: se il
                file è remoto, senza rete l'intestazione resterà vuota. */}
            <input
              type="text"
              defaultValue={isSfumatura(page.coverUrl) ? '' : (page.coverUrl || '')}
              placeholder="Oppure incolla l'indirizzo di un'immagine..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const valore = (e.target as HTMLInputElement).value.trim();
                  handleCoverSelect(valore || null);
                }
              }}
              style={{
                padding: '7px 10px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg-input)',
                fontSize: '12px',
                color: 'var(--text-primary)',
              }}
            />
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              {page.coverUrl && (
                <button onClick={() => handleCoverSelect(null)} style={{ fontSize: '12px', color: 'var(--danger)', padding: '4px 8px' }}>
                  Rimuovi Copertina
                </button>
              )}
              <button onClick={() => setShowCoverPicker(false)} style={{ fontSize: '12px', padding: '4px 8px' }}>
                Chiudi
              </button>
            </div>
          </div>
        )}

        {/* Book / Collection Context Indicator Badge */}
        {(isOfficialChapter || (hasSiblings && parentPage)) && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'rgba(66, 99, 235, 0.08)',
            border: '1px solid rgba(66, 99, 235, 0.2)',
            color: 'var(--accent)',
            fontSize: '12px',
            fontWeight: 600,
            marginBottom: 'var(--sp-3)',
          }}>
            <BookOpen size={13} />
            <span>
              {isOfficialChapter
                ? `Manuale Ufficiale NutNote • Capitolo ${WIKI_CHAPTERS[officialChapterIndex].num} di ${WIKI_CHAPTERS.length}`
                : `Raccolta Documentale: ${parentPage ? parentPage.title : ''} • Capitolo ${currentSiblingIndex + 1} di ${siblings.length}`}
            </span>
          </div>
        )}

        {/* Page Icon & Title Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
          {/* Emoji / Icon Selector */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              style={{
                fontSize: '36px',
                lineHeight: 1,
                padding: '4px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'transparent',
                border: 'none',
                cursor: 'pointer',
                transition: 'transform 0.15s'
              }}
              title="Cambia Icona"
            >
              <DynamicIcon name={page.icon || undefined} size={36} />
            </button>

            {showEmojiPicker && (
              <SelettoreEmoji
                valoreCorrente={page.icon}
                onSeleziona={(simbolo) => handleIconSelect(simbolo)}
                onChiudi={() => setShowEmojiPicker(false)}
              />
            )}
          </div>

          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={e => handleTitleChange(e.target.value)}
            placeholder="Senza Titolo..."
            style={{
              flex: 1,
              fontSize: 'var(--text-3xl)',
              fontWeight: 'var(--weight-bold)',
              color: 'var(--text-primary)',
              backgroundColor: 'transparent',
              border: 'none',
              outline: 'none',
              padding: '4px 0',
              lineHeight: 1.2
            }}
          />
        </div>

        {/* Status & Priority Interactive Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-6)' }}>
          {/* Status Badge Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: currentStatusDef?.color ? `${currentStatusDef.color}22` : 'var(--bg-surface-active)',
                color: currentStatusDef?.color || 'var(--text-primary)',
                border: `1px solid ${currentStatusDef?.color || 'var(--border)'}`,
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-medium)',
                cursor: 'pointer'
              }}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: currentStatusDef?.color || 'var(--text-muted)' }} />
              <span>{currentStatusDef?.label || page.status || 'Imposta Stato'}</span>
            </button>

            {showStatusMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                width: '180px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 'var(--z-menu)',
                padding: '4px'
              }}>
                {(Array.isArray(pageType?.statusFlow) ? pageType.statusFlow : []).map(st => (
                  <button
                    key={st.value}
                    onClick={() => handleStatusChange(st.value)}
                    style={{
                      ...menuItemStyle,
                      color: st.value === page.status ? 'var(--accent)' : 'var(--text-primary)',
                      fontWeight: st.value === page.status ? 'bold' : 'normal'
                    }}
                  >
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: st.color, marginRight: '6px' }} />
                    {st.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Priority Badge Dropdown */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: getPriorityBg(page.priority),
                color: getPriorityColor(page.priority),
                border: '1px solid var(--border)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-medium)',
                cursor: 'pointer'
              }}
            >
              <span>Priorità: {getPriorityLabel(page.priority)}</span>
            </button>

            {showPriorityMenu && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                width: '160px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 'var(--z-menu)',
                padding: '4px'
              }}>
                {(['urgent', 'high', 'medium', 'low', 'none'] as Priority[]).map(p => (
                  <button
                    key={p}
                    onClick={() => handlePriorityChange(p)}
                    style={{
                      ...menuItemStyle,
                      color: getPriorityColor(p),
                      fontWeight: p === page.priority ? 'bold' : 'normal'
                    }}
                  >
                    {getPriorityLabel(p)}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Visibility Toggle (only for creator) */}
          {activeUser?.id === page.createdBy && (
            <button
              onClick={handleVisibilityToggle}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: page.visibility === 'private' ? 'rgba(224, 49, 49, 0.1)' : 'var(--bg-surface)',
                color: page.visibility === 'private' ? 'var(--danger)' : 'var(--text-secondary)',
                border: '1px solid var(--border)',
                fontSize: 'var(--text-xs)',
                fontWeight: 'var(--weight-medium)',
                cursor: 'pointer'
              }}
              title={page.visibility === 'private' ? 'Nota Privata (clicca per rendere pubblica)' : 'Nota Pubblica (clicca per rendere privata)'}
            >
              {page.visibility === 'private' ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{page.visibility === 'private' ? 'Privata' : 'Pubblica'}</span>
            </button>
          )}
        </div>

        {/* Main Document / Block Editor (CENTRAL BODY) */}
        <div style={{ marginTop: 'var(--sp-6)', marginBottom: 'var(--sp-8)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
            <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', margin: 0 }}>
              Documento & Note
            </h3>
          </div>
          <BlockEditor
            pageId={page.id}
            initialBlocks={blocks || []}
            onSave={handleBlocksSave}
          />
        </div>

        {/* Page Chat Panel */}
        <div id="page-chat-section" style={{ marginTop: 'var(--sp-8)', marginBottom: 'var(--sp-8)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: 'var(--sp-3)' }}>
            <MessageSquare size={16} color="var(--accent)" />
            <h3 style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', margin: 0 }}>
              Discussione & Chat ({pageType?.label || 'Pagina'})
            </h3>
          </div>
          <ProjectChat pageId={page.id} />
        </div>

        {/* Menù a Scomparsa (Collapsible Sections at Bottom) */}
        <div style={{ marginTop: 'var(--sp-8)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', borderTop: '1px solid var(--border)', paddingTop: 'var(--sp-6)' }}>
          
          {/* 1. Dati Anagrafici & Proprietà */}
          {pageType?.propertiesSchema && Array.isArray(pageType.propertiesSchema) && pageType.propertiesSchema.length > 0 && (
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)', overflow: 'hidden' }}>
              <button
                type="button"
                onClick={() => setIsPropertiesOpen(!isPropertiesOpen)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 16px',
                  backgroundColor: 'var(--bg-app)',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sliders size={16} color="var(--accent)" />
                  <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
                    Dati Anagrafici & Proprietà
                  </span>
                  <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-muted)' }}>
                    {pageType.propertiesSchema.length} campi
                  </span>
                </div>
                {isPropertiesOpen ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
              </button>

              {isPropertiesOpen && (
                <div style={{ padding: 'var(--sp-4)', borderTop: '1px solid var(--border)' }}>
                  <PropertiesPanel
                    page={page}
                    schema={pageType.propertiesSchema}
                    onPropertyChange={handlePropertyChange}
                  />
                </div>
              )}
            </div>
          )}

          {/* 2. Sotto-pagine & Elementi Figli */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)', overflow: 'hidden' }}>
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                backgroundColor: 'var(--bg-app)',
              }}
            >
              <button
                type="button"
                onClick={() => setIsChildrenOpen(!isChildrenOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  flex: 1,
                  textAlign: 'left',
                  padding: 0,
                }}
              >
                <FolderPlus size={16} color="var(--accent)" />
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
                  Sotto-pagine & Elementi Figli
                </span>
                <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '10px', backgroundColor: 'var(--bg-surface-hover)', color: 'var(--text-muted)' }}>
                  {children.length}
                </span>
                {isChildrenOpen ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
              </button>

              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsChildrenOpen(true);
                    setShowAddChildMenu(!showAddChildMenu);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--accent)',
                    padding: '4px 8px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-surface)',
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} /> Nuova Sotto-pagina
                </button>

                {showAddChildMenu && (
                  <div style={{
                    position: 'absolute',
                    right: 0,
                    top: '100%',
                    marginTop: '4px',
                    width: '200px',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 'var(--z-menu)',
                    padding: '4px',
                  }}>
                    {allowedChildTypes.map(t => (
                      <button
                        key={t.id}
                        onClick={() => handleCreateChild(t.id, t.label)}
                        style={menuItemStyle}
                      >
                        <DynamicIcon name={t.icon || undefined} size={14} style={{ marginRight: '6px' }} />
                        Nuova {t.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {isChildrenOpen && (
              <div style={{ padding: 'var(--sp-4)', borderTop: '1px solid var(--border)' }}>
                {children.length > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 'var(--sp-2)' }}>
                    {children.map(child => (
                      <Link
                        key={child.id}
                        to={`/page/${child.id}`}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '8px 12px',
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-md)',
                          textDecoration: 'none',
                          color: 'var(--text-primary)',
                          fontSize: 'var(--text-sm)',
                          transition: 'border-color 0.15s, transform 0.15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        <DynamicIcon name={child.icon || undefined} size={18} />
                        <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 'var(--weight-medium)' }}>
                          {child.title}
                        </span>
                        {child.status && (
                          <span style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', backgroundColor: 'var(--bg-surface-active)', color: 'var(--text-secondary)' }}>
                            {child.status}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0, textAlign: 'center' }}>
                    Nessuna sotto-pagina presente. Clicca su "+ Nuova Sotto-pagina" per crearne una.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 3. Relazioni & Collegamenti */}
          <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-surface)', overflow: 'hidden' }}>
            <button
              type="button"
              onClick={() => setIsRelationsOpen(!isRelationsOpen)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                backgroundColor: 'var(--bg-app)',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <LinkIcon size={16} color="var(--accent)" />
                <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
                  Relazioni & Collegamenti
                </span>
                {effectiveClientTitle && (
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    (Cliente: {effectiveClientTitle})
                  </span>
                )}
              </div>
              {isRelationsOpen ? <ChevronDown size={16} color="var(--text-muted)" /> : <ChevronRight size={16} color="var(--text-muted)" />}
            </button>

            {isRelationsOpen && (
              <div style={{ borderTop: '1px solid var(--border)' }}>
                <RelationsPanel 
                  pageId={page.id} 
                  rootClientId={effectiveClientId} 
                  clientTitle={effectiveClientTitle} 
                />
              </div>
            )}
          </div>

        </div>

        {/* Wiki & Book Sequential Navigation Bar */}
        {(() => {
          if (!page) return null;

          // 1. Official Wiki Manual Chapters
          const isOfficialWikiHub = page.id === 'wiki-hub';
          const officialChapterIndex = WIKI_CHAPTERS.findIndex(c => c.id === page.id);
          const isOfficialChapter = officialChapterIndex !== -1;

          // 2. Dynamic Collection / Sibling Navigation for ANY parent-child note hierarchy
          const siblings = (parentData?.children || []).filter(s => !s.isArchived);
          const parentPage = parentData?.page;
          const currentSiblingIndex = siblings.findIndex(s => s.id === page.id);
          const hasSiblings = !!page.parentId && siblings.length > 1 && currentSiblingIndex !== -1;

          // 3. Collection Hub with Children (Parent Note)
          const validChildren = children.filter(c => !c.isArchived);
          const hasChildren = validChildren.length > 0;

          // If none of the conditions apply, do not render navigation
          if (!isOfficialWikiHub && !isOfficialChapter && !hasSiblings && !hasChildren) {
            return null;
          }

          // Case A: Official Wiki Chapter
          if (isOfficialChapter) {
            const prevChapter = officialChapterIndex > 0 ? WIKI_CHAPTERS[officialChapterIndex - 1] : null;
            const nextChapter = officialChapterIndex < WIKI_CHAPTERS.length - 1 ? WIKI_CHAPTERS[officialChapterIndex + 1] : null;

            return (
              <div style={{
                marginTop: 'var(--sp-6)',
                padding: '16px 20px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={16} color="var(--accent)" />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Manuale & Documentazione Ufficiale NutNote
                    </span>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(66, 99, 235, 0.1)',
                    color: 'var(--accent)',
                  }}>
                    Capitolo {WIKI_CHAPTERS[officialChapterIndex].num} di {WIKI_CHAPTERS.length}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  {prevChapter ? (
                    <Link
                      to={`/page/${prevChapter.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        backgroundColor: 'var(--bg-app)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 500,
                        maxWidth: '42%',
                      }}
                    >
                      <ChevronLeft size={16} color="var(--text-muted)" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prevChapter.icon} Cap. {prevChapter.num}
                      </span>
                    </Link>
                  ) : (
                    <div />
                  )}

                  <Link
                    to="/page/wiki-hub"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                    title="Torna all'Indice del Manuale"
                  >
                    <BookOpen size={14} />
                    <span>Indice Manuale</span>
                  </Link>

                  {nextChapter ? (
                    <Link
                      to={`/page/${nextChapter.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        backgroundColor: 'var(--bg-app)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        color: 'var(--accent)',
                        fontSize: '13px',
                        fontWeight: 600,
                        maxWidth: '42%',
                      }}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nextChapter.icon} Cap. {nextChapter.num}
                      </span>
                      <ChevronRight size={16} />
                    </Link>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Fine Manuale 🎉
                    </span>
                  )}
                </div>
              </div>
            );
          }

          // Case B: Official Wiki Hub
          if (isOfficialWikiHub) {
            return (
              <div style={{
                marginTop: 'var(--sp-6)',
                padding: '16px 20px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={16} color="var(--accent)" />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Guida & Manuale Ufficiale NutNote (9 Capitoli)
                    </span>
                  </div>
                </div>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Inizia la lettura sequenziale del manuale dal primo capitolo:
                  </span>
                  <Link
                    to="/page/wiki-ch1-architettura"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      backgroundColor: 'var(--accent)',
                      color: '#fff',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <span>Inizia: Capitolo 1</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          }

          // Case C: User Sibling Collection Navigation (Child note of any parent)
          if (hasSiblings && parentPage) {
            const prevSibling = currentSiblingIndex > 0 ? siblings[currentSiblingIndex - 1] : null;
            const nextSibling = currentSiblingIndex < siblings.length - 1 ? siblings[currentSiblingIndex + 1] : null;
            const isWikiType = pageType?.name === 'wiki' || parentPage?.typeId === 'wiki_type_id';
            const itemLabel = isWikiType ? 'Capitolo' : 'Nota';

            return (
              <div style={{
                marginTop: 'var(--sp-6)',
                padding: '16px 20px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={16} color="var(--accent)" />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Raccolta: {parentPage.icon ? `${parentPage.icon} ` : ''}{parentPage.title}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(66, 99, 235, 0.1)',
                    color: 'var(--accent)',
                  }}>
                    {itemLabel} {currentSiblingIndex + 1} di {siblings.length}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  {prevSibling ? (
                    <Link
                      to={`/page/${prevSibling.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        backgroundColor: 'var(--bg-app)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                        fontWeight: 500,
                        maxWidth: '42%',
                      }}
                      title={prevSibling.title}
                    >
                      <ChevronLeft size={16} color="var(--text-muted)" />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {prevSibling.icon || '📄'} {prevSibling.title}
                      </span>
                    </Link>
                  ) : (
                    <div />
                  )}

                  <Link
                    to={`/page/${parentPage.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 14px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      fontWeight: 500,
                    }}
                    title={`Torna all'Indice: ${parentPage.title}`}
                  >
                    <BookOpen size={14} />
                    <span>Indice Raccolta</span>
                  </Link>

                  {nextSibling ? (
                    <Link
                      to={`/page/${nextSibling.id}`}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 14px',
                        backgroundColor: 'var(--bg-app)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-md)',
                        textDecoration: 'none',
                        color: 'var(--accent)',
                        fontSize: '13px',
                        fontWeight: 600,
                        maxWidth: '42%',
                      }}
                      title={nextSibling.title}
                    >
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {nextSibling.icon || '📄'} {nextSibling.title}
                      </span>
                      <ChevronRight size={16} />
                    </Link>
                  ) : (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontWeight: 500 }}>
                      Fine Raccolta 🎉
                    </span>
                  )}
                </div>
              </div>
            );
          }

          // Case D: Parent Hub Note (Has sub-pages / children)
          if (hasChildren) {
            const firstChild = validChildren[0];
            return (
              <div style={{
                marginTop: 'var(--sp-6)',
                padding: '16px 20px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BookOpen size={16} color="var(--accent)" />
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      Raccolta Documentale ({validChildren.length} sotto-pagine)
                    </span>
                  </div>
                </div>
                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                  <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    Inizia la lettura sequenziale di questa raccolta:
                  </span>
                  <Link
                    to={`/page/${firstChild.id}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      backgroundColor: 'var(--accent)',
                      color: '#fff',
                      borderRadius: 'var(--radius-md)',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 600,
                      transition: 'opacity 0.2s',
                    }}
                  >
                    <span>Inizia: {firstChild.icon || '📄'} {firstChild.title}</span>
                    <ChevronRight size={14} />
                  </Link>
                </div>
              </div>
            );
          }

          return null;
        })()}

      </div>

      {/* Delete Confirmation Dialog */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 'var(--z-modal)'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '24px',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '400px',
            width: '100%',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border)'
          }}>
            <h3 style={{ fontSize: 'var(--text-lg)', fontWeight: 'bold', marginBottom: '8px' }}>Eliminare questa pagina?</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: '20px' }}>
              Sei sicuro di voler eliminare <strong>{page.title}</strong>? L'azione è irreversibile e rimuoverà anche tutte le sotto-pagine associate.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}
              >
                Annulla
              </button>
              <button 
                onClick={handleDelete}
                style={{ padding: '6px 12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--danger)', color: '#fff', border: 'none' }}
              >
                Elimina Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page History & Revisions Modal */}
      <PageHistoryModal
        pageId={page.id}
        pageTitle={page.title}
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />

    </div>
  );
}

const menuItemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  padding: '6px 10px',
  borderRadius: 'var(--radius-sm)',
  fontSize: '13px',
  color: 'var(--text-primary)',
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
};

function getPriorityLabel(p: Priority): string {
  switch (p) {
    case 'urgent': return 'Urgente';
    case 'high': return 'Alta';
    case 'medium': return 'Media';
    case 'low': return 'Bassa';
    default: return 'Nessuna';
  }
}

function getPriorityColor(p: Priority): string {
  switch (p) {
    case 'urgent': return 'var(--danger, #e03131)';
    case 'high': return 'var(--warning, #f59f00)';
    case 'medium': return 'var(--accent, #4263eb)';
    case 'low': return 'var(--success, #2f9e44)';
    default: return 'var(--text-secondary, #868e96)';
  }
}

function getPriorityBg(p: Priority): string {
  switch (p) {
    case 'urgent': return 'rgba(224, 49, 49, 0.1)';
    case 'high': return 'rgba(245, 159, 0, 0.1)';
    case 'medium': return 'rgba(66, 99, 235, 0.1)';
    case 'low': return 'rgba(47, 158, 68, 0.1)';
    default: return 'var(--bg-surface)';
  }
}
