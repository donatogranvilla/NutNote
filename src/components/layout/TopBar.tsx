import React, { useEffect, useState, useRef } from 'react';
import { Search, Moon, Sun, Plus, Shield, LogOut, Settings, Users, Server, Palette } from 'lucide-react';
import { QuickCreateModal } from './QuickCreateModal';
import { useUser } from '../../contexts/UserContext';
import { AdminManagementModal } from '../admin/AdminManagementModal';
import { DeploymentSettingsModal } from '../settings/DeploymentSettingsModal';
import { AspettoModal } from '../settings/AspettoModal';
import { useAspetto } from '../../contexts/AspettoContext';

export default function TopBar() {
  const { activeUser, logout } = useUser();
  const { aspetto, aggiornaAspetto } = useAspetto();
  const temaChiaro = aspetto.tema !== 'dark';
  const [isAspettoModalOpen, setIsAspettoModalOpen] = useState(false);
  const [isQuickCreateOpen, setIsQuickCreateOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);
  const [isDeploymentModalOpen, setIsDeploymentModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <>
      <header style={{
        height: 'var(--topbar-height)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        backgroundColor: 'var(--bg-topbar)',
        flexShrink: 0,
      }}>
        {/* Search trigger */}
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('open-search-modal'))}
          style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            color: 'var(--text-muted)',
            backgroundColor: 'var(--bg-surface)',
            padding: '5px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border)',
            cursor: 'pointer',
            fontSize: '13px',
            minWidth: 220,
          }}
        >
          <Search size={14} />
          <span>Cerca...</span>
          <kbd style={{ marginLeft: 'auto', fontSize: '11px', padding: '1px 4px', backgroundColor: 'var(--bg-app)', borderRadius: '3px', border: '1px solid var(--border)' }}>
            ⌘K
          </kbd>
        </button>

        {/* Right Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setIsQuickCreateOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 10px',
              backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '6px', color: 'var(--text-primary)',
              fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            }}
          >
            <Plus size={14} color="var(--accent)" /> Crea
          </button>

          <button
            onClick={() => setIsDeploymentModalOpen(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px',
              padding: '5px 9px',
              backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
              borderRadius: '6px', color: 'var(--text-secondary)',
              fontSize: '12px', fontWeight: 500, cursor: 'pointer',
            }}
            title="Impostazioni Archiviazione, Rete e Server NutNote"
          >
            <Server size={14} color="var(--accent)" />
            <span>Rete & Server</span>
          </button>

          <button 
            onClick={() => aggiornaAspetto({ tema: temaChiaro ? 'dark' : 'light' })} 
            style={{
              padding: '5px', borderRadius: '6px', border: 'none',
              background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer',
              display: 'flex', alignItems: 'center',
            }}
            title={temaChiaro ? 'Tema scuro' : 'Tema chiaro'}
          >
            {temaChiaro ? <Moon size={16} /> : <Sun size={16} />}
          </button>

          {/* User Profile Avatar & Dropdown */}
          <div ref={userMenuRef} style={{ position: 'relative' }}>
            <div
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              style={{ 
                width: 30, height: 30, borderRadius: '50%', 
                backgroundColor: activeUser?.avatarColor || 'var(--accent)', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '13px',
                cursor: 'pointer',
                border: isUserMenuOpen ? '2px solid var(--accent)' : '2px solid transparent',
                transition: 'border 0.2s',
              }}
              title={`${activeUser?.displayName || 'Utente'}`}
            >
              {activeUser?.displayName?.charAt(0).toUpperCase() || 'U'}
            </div>

            {/* Dropdown Menu */}
            {isUserMenuOpen && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '100%',
                marginTop: '8px',
                width: '240px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 'var(--z-menu)',
                padding: '8px',
              }}>
                {/* User Info Header */}
                <div style={{
                  padding: '8px',
                  borderBottom: '1px solid var(--border)',
                  marginBottom: '6px',
                }}>
                  <div style={{ fontWeight: 600, fontSize: '14px', color: 'var(--text-primary)' }}>
                    {activeUser?.displayName}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                    {activeUser?.role === 'admin' && (
                      <span style={{
                        fontSize: '10px',
                        padding: '1px 5px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(245, 159, 0, 0.15)',
                        color: 'var(--warning)',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                      }}>
                        Admin
                      </span>
                    )}
                    {activeUser?.teamName ? (
                      <span style={{
                        fontSize: '11px',
                        color: activeUser.teamColor || 'var(--text-secondary)',
                        fontWeight: 500,
                      }}>
                        {activeUser.teamName}
                      </span>
                    ) : (
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Nessun team
                      </span>
                    )}
                  </div>
                </div>

                {/* Admin Menu Item */}
                {activeUser?.role === 'admin' && (
                  <button
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      setIsAdminModalOpen(true);
                    }}
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 10px',
                      border: 'none',
                      borderRadius: '6px',
                      backgroundColor: 'transparent',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <Shield size={15} color="var(--warning)" />
                    <span>Pannello Amministrazione</span>
                  </button>
                )}

                {/* Aspetto Menu Item */}
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsAspettoModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Palette size={15} />
                  <span>Aspetto</span>
                </button>

                {/* Deployment Settings Menu Item */}
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsDeploymentModalOpen(true);
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <Server size={15} color="var(--accent)" />
                  <span>Impostazioni & Server</span>
                </button>

                {/* Logout Item */}
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    logout();
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 10px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    color: 'var(--danger)',
                    fontSize: '13px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  <LogOut size={15} />
                  <span>Cambia Profilo / Esci</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <QuickCreateModal isOpen={isQuickCreateOpen} onClose={() => setIsQuickCreateOpen(false)} />
      <AdminManagementModal isOpen={isAdminModalOpen} onClose={() => setIsAdminModalOpen(false)} />
      <DeploymentSettingsModal isOpen={isDeploymentModalOpen} onClose={() => setIsDeploymentModalOpen(false)} />
      <AspettoModal isOpen={isAspettoModalOpen} onClose={() => setIsAspettoModalOpen(false)} />
    </>
  );
}
