import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { UserWithPassword, Team } from '../../lib/types';
import { useUser } from '../../contexts/UserContext';
import { 
  X, Users, Shield, KeyRound, Plus, Trash2, Edit2, 
  Check, AlertCircle, Eye, EyeOff, FolderPlus
} from 'lucide-react';

interface AdminManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  '#4263eb', '#1971c2', '#2b8a3e', '#099268',
  '#e67700', '#e03131', '#d6336c', '#7048e8', '#495057'
];

export function AdminManagementModal({ isOpen, onClose }: AdminManagementModalProps) {
  const { activeUser, refreshActiveUser } = useUser();
  const [activeTab, setActiveTab] = useState<'users' | 'teams'>('users');
  const [users, setUsers] = useState<UserWithPassword[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Edit Password Modal State
  const [editingPasswordUser, setEditingPasswordUser] = useState<UserWithPassword | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState('');

  // Edit User State
  const [editingUser, setEditingUser] = useState<UserWithPassword | null>(null);
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editTeamId, setEditTeamId] = useState<string>('');
  const [editColor, setEditColor] = useState('#4263eb');

  // Create User State
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [createUserName, setCreateUserName] = useState('');
  const [createUserPwd, setCreateUserPwd] = useState('1234');
  const [createUserRole, setCreateUserRole] = useState<'admin' | 'user'>('user');
  const [createUserTeamId, setCreateUserTeamId] = useState('');
  const [createUserColor, setCreateUserColor] = useState(PRESET_COLORS[0]);

  // Create/Edit Team State
  const [isCreatingTeam, setIsCreatingTeam] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [teamName, setTeamName] = useState('');
  const [teamDesc, setTeamDesc] = useState('');
  const [teamColor, setTeamColor] = useState(PRESET_COLORS[0]);
  const [subModalError, setSubModalError] = useState('');
  const [isSubmittingSubModal, setIsSubmittingSubModal] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadAllData();
    }
  }, [isOpen]);

  const loadAllData = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const [usersData, teamsData] = await Promise.all([
        invoke<UserWithPassword[]>('get_all_users_admin'),
        invoke<Team[]>('get_teams'),
      ]);
      setUsers(usersData);
      setTeams(teamsData);
    } catch (err: any) {
      setErrorMessage(typeof err === 'string' ? err : 'Errore nel caricamento dati');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  // ── Handlers for Users ──
  const handleSavePassword = async () => {
    if (!editingPasswordUser || !newPasswordVal.trim()) return;
    try {
      await invoke('update_user_password', {
        payload: {
          userId: editingPasswordUser.id,
          newPassword: newPasswordVal.trim(),
        },
      });
      setEditingPasswordUser(null);
      setNewPasswordVal('');
      loadAllData();
    } catch (err: any) {
      setErrorMessage(typeof err === 'string' ? err : 'Errore aggiornamento password');
    }
  };

  const handleStartEditUser = (u: UserWithPassword) => {
    setEditingUser(u);
    setEditName(u.displayName);
    setEditRole(u.role);
    setEditTeamId(u.teamId || '');
    setEditColor(u.avatarColor);
  };

  const handleSaveUser = async () => {
    if (!editingUser || !editName.trim()) return;
    try {
      await invoke('update_user', {
        payload: {
          id: editingUser.id,
          displayName: editName.trim(),
          avatarColor: editColor,
          role: editRole,
          teamId: editTeamId ? editTeamId : null,
          password: null,
        },
      });
      setEditingUser(null);
      await refreshActiveUser();
      loadAllData();
    } catch (err: any) {
      setErrorMessage(typeof err === 'string' ? err : 'Errore salvataggio utente');
    }
  };

  const handleCreateUser = async () => {
    if (!createUserName.trim()) return;
    try {
      await invoke('create_user', {
        payload: {
          displayName: createUserName.trim(),
          avatarColor: createUserColor,
          password: createUserPwd.trim() || '1234',
          role: createUserRole,
          teamId: createUserTeamId ? createUserTeamId : null,
        },
      });
      setIsCreatingUser(false);
      setCreateUserName('');
      setCreateUserPwd('1234');
      loadAllData();
    } catch (err: any) {
      setErrorMessage(typeof err === 'string' ? err : 'Errore creazione utente');
    }
  };

  const handleDeleteUser = async (id: string, name: string) => {
    if (id === activeUser?.id) {
      alert('Non puoi eliminare il tuo stesso account attivo.');
      return;
    }
    if (!confirm(`Sei sicuro di voler eliminare l'utente "${name}"?`)) return;

    try {
      await invoke('delete_user', { id });
      loadAllData();
    } catch (err: any) {
      setErrorMessage(typeof err === 'string' ? err : 'Errore eliminazione utente');
    }
  };

  // ── Handlers for Teams ──
  const handleSaveTeam = async () => {
    if (!teamName.trim()) {
      setSubModalError('Inserisci un nome per il team');
      return;
    }
    setIsSubmittingSubModal(true);
    setSubModalError('');
    try {
      if (editingTeam) {
        await invoke('update_team', {
          payload: {
            id: editingTeam.id,
            name: teamName.trim(),
            description: teamDesc.trim(),
            color: teamColor,
          },
        });
      } else {
        await invoke('create_team', {
          payload: {
            name: teamName.trim(),
            description: teamDesc.trim(),
            color: teamColor,
          },
        });
      }
      setIsCreatingTeam(false);
      setEditingTeam(null);
      setTeamName('');
      setTeamDesc('');
      await refreshActiveUser();
      loadAllData();
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || 'Errore salvataggio team';
      setSubModalError(msg);
      setErrorMessage(msg);
    } finally {
      setIsSubmittingSubModal(false);
    }
  };

  const handleDeleteTeam = async (id: string, name: string) => {
    if (!confirm(`Sei sicuro di voler eliminare il team "${name}"? Gli utenti associati non verranno eliminati ma rimarranno senza team.`)) return;
    try {
      await invoke('delete_team', { id });
      await refreshActiveUser();
      loadAllData();
    } catch (err: any) {
      setErrorMessage(typeof err === 'string' ? err : 'Errore eliminazione team');
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0, left: 0, right: 0, bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1.5rem',
    }}>
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '850px',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Shield size={20} color="var(--accent)" />
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>
              Pannello di Amministrazione
            </h2>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '6px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-app)',
          padding: '0 16px',
        }}>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'users' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'users' ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'users' ? 600 : 500,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <Users size={16} />
            Utenti & Password ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('teams')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '12px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'teams' ? '2px solid var(--accent)' : '2px solid transparent',
              color: activeTab === 'teams' ? 'var(--accent)' : 'var(--text-secondary)',
              fontWeight: activeTab === 'teams' ? 600 : 500,
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            <FolderPlus size={16} />
            Team & Reparti ({teams.length})
          </button>
        </div>

        {/* Error Banner */}
        {errorMessage && (
          <div style={{
            margin: '12px 20px 0',
            padding: '8px 12px',
            borderRadius: '6px',
            backgroundColor: 'rgba(224, 49, 49, 0.1)',
            color: 'var(--danger)',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}>
            <AlertCircle size={15} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Content Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
              Caricamento in corso...
            </div>
          ) : activeTab === 'users' ? (
            /* ──────────────── TAB UTENTI ──────────────── */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Gestisci gli account aziendali, assegna team e modifica direttamente le password.
                </p>
                <button
                  onClick={() => setIsCreatingUser(true)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} /> Nuovo Utente
                </button>
              </div>

              {/* Users Table */}
              <div style={{ border: '1px solid var(--border)', borderRadius: '8px', overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-app)', borderBottom: '1px solid var(--border)' }}>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Utente</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Ruolo</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Team</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600 }}>Password Attuale</th>
                      <th style={{ padding: '10px 12px', fontWeight: 600, textAlign: 'right' }}>Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: u.avatarColor,
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '12px',
                            }}>
                              {u.displayName.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600 }}>{u.displayName}</span>
                          </div>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{
                            fontSize: '11px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: u.role === 'admin' ? 'rgba(245, 159, 0, 0.15)' : 'var(--bg-surface-active)',
                            color: u.role === 'admin' ? 'var(--warning)' : 'var(--text-secondary)',
                            fontWeight: 600,
                          }}>
                            {u.role === 'admin' ? 'Admin' : 'Utente'}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          {u.teamName ? (
                            <span style={{
                              fontSize: '11px',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              backgroundColor: u.teamColor ? `${u.teamColor}22` : 'var(--bg-surface-active)',
                              color: u.teamColor || 'var(--text-secondary)',
                              fontWeight: 500,
                            }}>
                              {u.teamName}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: '10px 12px', fontFamily: 'var(--font-mono)' }}>
                          <span style={{
                            backgroundColor: 'var(--bg-app)',
                            padding: '3px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border)',
                            color: 'var(--text-primary)',
                          }}>
                            {u.password}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end' }}>
                            <button
                              onClick={() => {
                                setEditingPasswordUser(u);
                                setNewPasswordVal(u.password);
                              }}
                              title="Modifica Password"
                              style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-primary)',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '11px',
                              }}
                            >
                              <KeyRound size={12} /> Password
                            </button>
                            <button
                              onClick={() => handleStartEditUser(u)}
                              title="Modifica Profilo"
                              style={{
                                padding: '4px 6px',
                                borderRadius: '4px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'transparent',
                                color: 'var(--text-secondary)',
                                cursor: 'pointer',
                              }}
                            >
                              <Edit2 size={13} />
                            </button>
                            {u.id !== activeUser?.id && (
                              <button
                                onClick={() => handleDeleteUser(u.id, u.displayName)}
                                title="Elimina Utente"
                                style={{
                                padding: '4px 6px',
                                borderRadius: '4px',
                                border: '1px solid var(--border)',
                                backgroundColor: 'transparent',
                                color: 'var(--danger)',
                                cursor: 'pointer',
                              }}
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ──────────────── TAB TEAM ──────────────── */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Organizza gli utenti in gruppi/reparti aziendali (es. Sviluppo, Design, Commerciale).
                </p>
                <button
                  id="btn-new-team"
                  onClick={() => {
                    setEditingTeam(null);
                    setTeamName('');
                    setTeamDesc('');
                    setTeamColor(PRESET_COLORS[0]);
                    setSubModalError('');
                    setIsCreatingTeam(true);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  <Plus size={14} /> Nuovo Team
                </button>
              </div>

              {/* Teams Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '12px' }}>
                {teams.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-app)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: t.color,
                        }} />
                        <span style={{ fontWeight: 700, fontSize: '15px' }}>{t.name}</span>
                      </div>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          onClick={() => {
                            setEditingTeam(t);
                            setTeamName(t.name);
                            setTeamDesc(t.description);
                            setTeamColor(t.color);
                            setIsCreatingTeam(true);
                          }}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '2px' }}
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => handleDeleteTeam(t.id, t.name)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '2px' }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '0 0 12px', flex: 1 }}>
                      {t.description || 'Nessuna descrizione specificata'}
                    </p>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                      color: 'var(--text-muted)',
                      borderTop: '1px solid var(--border)',
                      paddingTop: '8px',
                    }}>
                      <Users size={12} />
                      <span>{t.memberCount} membri associati</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Sub-modal Modifica Password ── */}
        {editingPasswordUser && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}>
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '20px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '340px',
              border: '1px solid var(--border)',
            }}>
              <h4 style={{ margin: '0 0 12px', fontSize: '15px', fontWeight: 700 }}>
                Modifica Password per {editingPasswordUser.displayName}
              </h4>
              <input
                type="text"
                placeholder="Nuova password"
                value={newPasswordVal}
                onChange={(e) => setNewPasswordVal(e.target.value)}
                autoFocus
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'var(--bg-app)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setEditingPasswordUser(null)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Annulla
                </button>
                <button
                  onClick={handleSavePassword}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Salva Password
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Sub-modal Modifica Dettagli Utente ── */}
        {editingUser && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}>
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '20px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '380px',
              border: '1px solid var(--border)',
            }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700 }}>
                Modifica Utente
              </h4>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Nome
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Team
                </label>
                <select
                  value={editTeamId}
                  onChange={(e) => setEditTeamId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                >
                  <option value="">-- Nessun team --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Ruolo
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="radio"
                      checked={editRole === 'user'}
                      onChange={() => setEditRole('user')}
                      name="editRole"
                    /> Utente
                  </label>
                  <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="radio"
                      checked={editRole === 'admin'}
                      onChange={() => setEditRole('admin')}
                      name="editRole"
                    /> Admin
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Colore
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map((c) => (
                    <div
                      key={c}
                      onClick={() => setEditColor(c)}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        cursor: 'pointer',
                        border: editColor === c ? '2px solid #fff' : 'none',
                        boxShadow: editColor === c ? `0 0 0 2px ${c}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setEditingUser(null)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Annulla
                </button>
                <button
                  onClick={handleSaveUser}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Salva Modifiche
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Sub-modal Crea Nuovo Utente (Admin) ── */}
        {isCreatingUser && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}>
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '20px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '380px',
              border: '1px solid var(--border)',
            }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700 }}>
                Crea Nuovo Utente
              </h4>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Nome *
                </label>
                <input
                  type="text"
                  placeholder="Es. Luca Neri"
                  value={createUserName}
                  onChange={(e) => setCreateUserName(e.target.value)}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Password
                </label>
                <input
                  type="text"
                  placeholder="Password (default: 1234)"
                  value={createUserPwd}
                  onChange={(e) => setCreateUserPwd(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Team
                </label>
                <select
                  value={createUserTeamId}
                  onChange={(e) => setCreateUserTeamId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                >
                  <option value="">-- Nessun team --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Ruolo
                </label>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="radio"
                      checked={createUserRole === 'user'}
                      onChange={() => setCreateUserRole('user')}
                      name="createUserRole"
                    /> Utente Standard
                  </label>
                  <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input
                      type="radio"
                      checked={createUserRole === 'admin'}
                      onChange={() => setCreateUserRole('admin')}
                      name="createUserRole"
                    /> Admin
                  </label>
                </div>
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Colore Avatar
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map((c) => (
                    <div
                      key={c}
                      onClick={() => setCreateUserColor(c)}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        cursor: 'pointer',
                        border: createUserColor === c ? '2px solid #fff' : 'none',
                        boxShadow: createUserColor === c ? `0 0 0 2px ${c}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setIsCreatingUser(false)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Annulla
                </button>
                <button
                  onClick={handleCreateUser}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  Crea Utente
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Sub-modal Crea / Modifica Team ── */}
        {isCreatingTeam && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1100,
          }}>
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              padding: '20px',
              borderRadius: '12px',
              width: '100%',
              maxWidth: '380px',
              border: '1px solid var(--border)',
            }}>
              <h4 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700 }}>
                {editingTeam ? 'Modifica Team' : 'Nuovo Team'}
              </h4>

              {subModalError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  backgroundColor: 'rgba(224, 49, 49, 0.1)',
                  color: 'var(--danger)',
                  fontSize: '12px',
                  marginBottom: '14px',
                }}>
                  <AlertCircle size={14} />
                  <span>{subModalError}</span>
                </div>
              )}

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Nome Team *
                </label>
                <input
                  id="input-team-name"
                  type="text"
                  placeholder="Es. Sviluppo Software"
                  value={teamName}
                  onChange={(e) => {
                    setTeamName(e.target.value);
                    setSubModalError('');
                  }}
                  autoFocus
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '4px' }}>
                  Descrizione
                </label>
                <textarea
                  placeholder="Breve descrizione del team..."
                  value={teamDesc}
                  onChange={(e) => setTeamDesc(e.target.value)}
                  rows={2}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    resize: 'none',
                  }}
                />
              </div>

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>
                  Colore Identificativo
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map((c) => (
                    <div
                      key={c}
                      onClick={() => setTeamColor(c)}
                      style={{
                        width: '22px',
                        height: '22px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        cursor: 'pointer',
                        border: teamColor === c ? '2px solid #fff' : 'none',
                        boxShadow: teamColor === c ? `0 0 0 2px ${c}` : 'none',
                      }}
                    />
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setIsCreatingTeam(false)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    fontSize: '12px',
                  }}
                >
                  Annulla
                </button>
                <button
                  id="btn-save-team"
                  onClick={handleSaveTeam}
                  disabled={isSubmittingSubModal}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    cursor: isSubmittingSubModal ? 'not-allowed' : 'pointer',
                    opacity: isSubmittingSubModal ? 0.7 : 1,
                    fontSize: '12px',
                    fontWeight: 600,
                  }}
                >
                  {isSubmittingSubModal ? 'Salvataggio...' : 'Salva Team'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
