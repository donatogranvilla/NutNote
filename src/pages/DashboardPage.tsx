import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePages, useUpdatePage } from '../hooks/usePages';
import { QuickCreateModal } from '../components/layout/QuickCreateModal';
import { 
  Users, FolderOpen, CheckSquare, FileText, Plus, 
  ChevronRight, CheckCircle2, Calendar, Bug
} from 'lucide-react';
import type { Page } from '../lib/types';
import { DynamicIcon } from '../components/DynamicIcon';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [quickCreateType, setQuickCreateType] = useState<string | null>(null);

  const { data: clientsData } = usePages({ typeName: 'client' });
  const { data: projectsData } = usePages({ typeName: 'project' });
  const { data: tasksData } = usePages({ typeName: 'todo' });
  const { data: notesData } = usePages({ typeName: 'note' });

  const updatePage = useUpdatePage();

  const handleToggleTaskDone = (task: Page) => {
    updatePage.mutate({ request: { id: task.id, status: task.status === 'done' ? 'todo' : 'done' } });
  };

  const openTasks = (tasksData?.items || []).filter(t => t.status !== 'done' && t.status !== 'cancelled');
  const activeProjects = (projectsData?.items || []).filter(p => p.status === 'active' || p.status === 'backlog');

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 4px' }}>Dashboard</h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '13px' }}>
          Panoramica di clienti, progetti, task e note.
        </p>
      </div>

      {/* KPI row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
        <KpiCard title="Clienti" count={clientsData?.total ?? 0} icon={<Users size={18} />} to="/type/client" />
        <KpiCard title="Progetti" count={activeProjects.length} icon={<FolderOpen size={18} />} to="/type/project" />
        <KpiCard title="Task aperti" count={openTasks.length} icon={<CheckSquare size={18} />} to="/type/todo" />
        <KpiCard title="Note" count={notesData?.total ?? 0} icon={<FileText size={18} />} to="/type/note" />
      </div>

      {/* Quick actions */}
      <div style={{
        display: 'flex', gap: '8px', flexWrap: 'wrap',
      }}>
        {[
          { type: 'client', label: 'Cliente', icon: <Users size={13} /> },
          { type: 'project', label: 'Progetto', icon: <FolderOpen size={13} /> },
          { type: 'todo', label: 'Task', icon: <CheckSquare size={13} /> },
          { type: 'note', label: 'Nota', icon: <FileText size={13} /> },
          { type: 'bug', label: 'Bug', icon: <Bug size={13} /> },
        ].map(a => (
          <button
            key={a.type}
            onClick={() => setQuickCreateType(a.type)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px', fontSize: '12px', fontWeight: 500,
              backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer',
            }}
          >
            <Plus size={12} color="var(--accent)" /> {a.label}
          </button>
        ))}
      </div>

      {/* Two-column content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
        
        {/* Tasks */}
        <Card title="Task aperti" count={openTasks.length} linkTo="/type/todo">
          {openTasks.length === 0 ? (
            <EmptyState>Nessun task in sospeso.</EmptyState>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {openTasks.slice(0, 8).map(task => (
                <div
                  key={task.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    padding: '8px 0',
                    borderBottom: '1px solid var(--divider)',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={task.status === 'done'}
                    onChange={() => handleToggleTaskDone(task)}
                    style={{ width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer', flexShrink: 0 }}
                  />
                  <Link
                    to={`/page/${task.id}`}
                    style={{
                      flex: 1, fontSize: '13px', color: 'var(--text-primary)',
                      textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {task.title}
                  </Link>
                  {task.priority && task.priority !== 'none' && (
                    <PriorityDot priority={task.priority} />
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Projects */}
          <Card title="Progetti in corso" count={activeProjects.length} linkTo="/type/project">
            {activeProjects.length === 0 ? (
              <EmptyState>Nessun progetto attivo.</EmptyState>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {activeProjects.slice(0, 4).map(p => (
                  <Link
                    key={p.id}
                    to={`/page/${p.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '7px 0', borderBottom: '1px solid var(--divider)',
                      textDecoration: 'none', color: 'var(--text-primary)', fontSize: '13px',
                    }}
                  >
                    <DynamicIcon name={p.icon || '🚀'} size={15} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Notes */}
          <Card title="Note recenti" count={notesData?.total ?? 0} linkTo="/type/note">
            {(!notesData?.items || notesData.items.length === 0) ? (
              <EmptyState>Nessuna nota.</EmptyState>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notesData.items.slice(0, 4).map(n => (
                  <Link
                    key={n.id}
                    to={`/page/${n.id}`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '7px 0', borderBottom: '1px solid var(--divider)',
                      textDecoration: 'none', color: 'var(--text-primary)', fontSize: '13px',
                    }}
                  >
                    <DynamicIcon name={n.icon || '📝'} size={15} />
                    <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      {quickCreateType && (
        <QuickCreateModal isOpen onClose={() => setQuickCreateType(null)} defaultTypeId={quickCreateType} />
      )}
    </div>
  );
}

function KpiCard({ title, count, icon, to }: { title: string; count: number; icon: React.ReactNode; to: string }) {
  return (
    <Link to={to} style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px', borderRadius: '8px',
      backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
      textDecoration: 'none', color: 'var(--text-primary)',
    }}>
      <div>
        <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{title}</div>
        <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '2px' }}>{count}</div>
      </div>
      <div style={{ color: 'var(--text-muted)' }}>{icon}</div>
    </Link>
  );
}

function Card({ title, count, linkTo, children }: { title: string; count?: number; linkTo: string; children: React.ReactNode }) {
  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: '8px', padding: '16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h2 style={{ fontSize: '14px', fontWeight: 600, margin: 0 }}>
          {title}{count !== undefined && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> ({count})</span>}
        </h2>
        <Link to={linkTo} style={{ fontSize: '12px', color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '2px' }}>
          Tutti <ChevronRight size={13} />
        </Link>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '20px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>{children}</div>;
}

function PriorityDot({ priority }: { priority: string }) {
  const colors: Record<string, string> = {
    urgent: '#e03131', high: '#f59f00', medium: '#4263eb', low: '#2f9e44',
  };
  return (
    <span
      title={priority}
      style={{
        width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
        backgroundColor: colors[priority] || 'var(--text-muted)',
        display: 'inline-block',
      }}
    />
  );
}
