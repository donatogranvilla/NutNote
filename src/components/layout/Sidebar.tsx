import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { usePageTypes } from '../../hooks/usePageTypes';
import { usePinnedPages, useCreatePage } from '../../hooks/usePages';
import { QuickCreateModal } from './QuickCreateModal';
import { 
  Home, Star, Plus, ChevronDown, ChevronRight,
  FolderOpen, CheckSquare, FileText, BookOpen, Bug, 
  Users, Briefcase, Paperclip, Network
} from 'lucide-react';
import { DynamicIcon } from '../DynamicIcon';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  client: <Users size={15} />,
  project: <FolderOpen size={15} />,
  commessa: <Briefcase size={15} />,
  note: <FileText size={15} />,
  wiki: <BookOpen size={15} />,
  bug: <Bug size={15} />,
  todo: <CheckSquare size={15} />,
  file: <Paperclip size={15} />,
};

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: pageTypes } = usePageTypes();
  const { data: pinnedPages } = usePinnedPages();
  const createPage = useCreatePage();
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [typesExpanded, setTypesExpanded] = useState(true);

  const handleQuickAdd = (pt: any) => {
    const initialStatus = pt.statusFlow?.find((s: any) => s.isInitial)?.value || '';
    createPage.mutate({
      request: {
        typeId: pt.id,
        title: `Nuovo ${pt.label}`,
        status: initialStatus,
        priority: 'none',
        icon: pt.icon || '📄',
        properties: {}
      }
    }, {
      onSuccess: (newPage) => navigate(`/page/${newPage.id}`),
    });
  };

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      height: '100%',
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{
          width: 24, height: 24, borderRadius: '6px',
          backgroundColor: 'var(--accent)',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: '14px',
          boxShadow: '0 2px 6px rgba(66, 99, 235, 0.3)',
        }}>🥜</div>
        <span style={{ fontWeight: 600, fontSize: '14px', letterSpacing: '-0.2px' }}>NutNote</span>
      </div>

      {/* New Page button */}
      <div style={{ padding: '8px 12px 0' }}>
        <button
          onClick={() => setIsQuickCreateOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
            width: '100%', padding: '7px 0',
            backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '6px', fontSize: '13px', fontWeight: 500,
            color: 'var(--text-primary)', cursor: 'pointer',
          }}
        >
          <Plus size={14} color="var(--accent)" />
          Nuova Pagina
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '8px 8px' }}>
        <NavLink to="/" icon={<Home size={15} />} label="Dashboard" active={location.pathname === '/'} />
        <NavLink to="/map" icon={<Network size={15} />} label="Mappa a Nuvola" active={location.pathname === '/map'} />

        {/* Pinned */}
        {pinnedPages && pinnedPages.length > 0 && (
          <section style={{ marginTop: '16px' }}>
            <SectionLabel icon={<Star size={11} />} label="Preferiti" />
            {pinnedPages.map(p => (
              <NavLink
                key={p.id}
                to={`/page/${p.id}`}
                icon={<DynamicIcon name={p.icon || undefined} size={14} />}
                label={p.title}
                active={location.pathname === `/page/${p.id}`}
              />
            ))}
          </section>
        )}

        {/* Types */}
        <section style={{ marginTop: '16px' }}>
          <div
            onClick={() => setTypesExpanded(!typesExpanded)}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '4px 8px', fontSize: '11px', fontWeight: 600,
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '0.04em', cursor: 'pointer', userSelect: 'none',
            }}
          >
            <span>Database</span>
            {typesExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </div>

          {typesExpanded && (pageTypes || []).map(pt => {
            const path = `/type/${pt.name || pt.id}`;
            const isActive = location.pathname === path || location.pathname === `/type/${pt.id}`;
            const icon = TYPE_ICONS[pt.name] || TYPE_ICONS[pt.id] || <DynamicIcon name={pt.icon || undefined} size={14} />;

            return (
              <div
                key={pt.id}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 8px', borderRadius: '6px',
                  backgroundColor: isActive ? 'var(--bg-surface-active)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                  fontSize: '13px',
                }}
              >
                <Link to={path} style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', color: 'inherit', flex: 1, minWidth: 0 }}>
                  {icon}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: isActive ? 600 : 400 }}>
                    {pt.labelPlural || pt.label}
                  </span>
                </Link>
                <button
                  onClick={(e) => { e.stopPropagation(); handleQuickAdd(pt); }}
                  title={`Crea ${pt.label}`}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 20, height: 20, borderRadius: '4px', border: 'none',
                    backgroundColor: 'transparent', color: 'var(--text-muted)',
                    cursor: 'pointer', opacity: 0.5,
                  }}
                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.color = 'var(--accent)'; }}
                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.5'; e.currentTarget.style.color = 'var(--text-muted)'; }}
                >
                  <Plus size={13} />
                </button>
              </div>
            );
          })}
        </section>
      </nav>

      <QuickCreateModal isOpen={isQuickCreateOpen} onClose={() => setIsQuickCreateOpen(false)} />
    </aside>
  );
}

function NavLink({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '6px 8px', borderRadius: '6px',
        backgroundColor: active ? 'var(--bg-surface-active)' : 'transparent',
        color: active ? 'var(--accent)' : 'var(--text-primary)',
        textDecoration: 'none', fontSize: '13px',
        fontWeight: active ? 600 : 400,
      }}
    >
      {icon}
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
    </Link>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '5px',
      padding: '4px 8px', fontSize: '11px', fontWeight: 600,
      color: 'var(--text-muted)', textTransform: 'uppercase',
      letterSpacing: '0.04em', marginBottom: '2px',
    }}>
      {icon}
      <span>{label}</span>
    </div>
  );
}
