import React, { useEffect, useState, useRef } from 'react';
import { usersApi, teamsApi } from '../lib/api';
import { useUser, UserData } from '../contexts/UserContext';
import { Team } from '../lib/types';
import { Plus, Shield, Users, KeyRound, Lock, Eye, EyeOff, AlertCircle, Check, Server } from 'lucide-react';
import { DeploymentSettingsModal } from '../components/settings/DeploymentSettingsModal';

const PRESET_COLORS = [
  '#4263eb', // Blue
  '#1971c2', // Darker Blue
  '#2b8a3e', // Green
  '#099268', // Teal
  '#e67700', // Orange
  '#e03131', // Red
  '#d6336c', // Pink
  '#7048e8', // Purple
  '#495057', // Slate
];

export default function UserSelectPage() {
  const { login } = useUser();
  const [users, setUsers] = useState<UserData[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Password Login Modal State
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  // Create User Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPassword, setNewPassword] = useState('1234');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');
  const [newTeamId, setNewTeamId] = useState<string>('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [createError, setCreateError] = useState('');
  const [isSubmittingCreate, setIsSubmittingCreate] = useState(false);
  const [isDeploymentModalOpen, setIsDeploymentModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedUser && passwordInputRef.current) {
      setPassword('');
      setLoginError('');
      setTimeout(() => passwordInputRef.current?.focus(), 50);
    }
  }, [selectedUser]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [usersData, teamsData] = await Promise.all([
        usersApi.getAll(),
        teamsApi.getAll(),
      ]);
      setUsers(usersData);
      setTeams(teamsData);
    } catch (err) {
      console.error('Failed to load users/teams:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUserClick = (u: UserData) => {
    setSelectedUser(u);
  };

  const handleLoginSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedUser) return;
    setIsSubmittingLogin(true);
    setLoginError('');

    try {
      await login(selectedUser.id, password);
      // login in context will set active user and update local state
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || 'Password errata. Riprova.';
      setLoginError(msg);
      setIsSubmittingLogin(false);
      setTimeout(() => passwordInputRef.current?.focus(), 50);
    }
  };

  const handleCreateSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newName.trim()) {
      setCreateError('Inserisci un nome per il profilo');
      return;
    }
    setIsSubmittingCreate(true);
    setCreateError('');

    try {
      const user = await usersApi.create({
        displayName: newName.trim(),
        avatarColor: newColor,
        password: newPassword.trim() || '1234',
        role: newRole,
        teamId: newTeamId ? newTeamId : null,
      });

      // Login directly with the new user
      await login(user.id, newPassword.trim() || '1234');
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || 'Errore nella creazione utente';
      setCreateError(msg);
      setIsSubmittingCreate(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-app)',
      color: 'var(--text-primary)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
      position: 'relative',
    }}>
      {/* Top-right Actions */}
      <div style={{ position: 'absolute', top: '20px', right: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <button
          id="btn-open-deployment-login"
          onClick={() => setIsDeploymentModalOpen(true)}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 12px',
            backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '8px', color: 'var(--text-secondary)',
            fontSize: '13px', fontWeight: 500, cursor: 'pointer',
            boxShadow: 'var(--shadow-sm)',
            transition: 'var(--transition-interactive)',
          }}
          title="Configura Rete, Archiviazione o Server NutNote"
        >
          <Server size={15} color="var(--accent)" />
          <span>Rete & Server</span>
        </button>
      </div>

      {/* Header / Brand */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <div style={{
          width: 54,
          height: 54,
          borderRadius: '14px',
          backgroundColor: 'var(--accent)',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: 800,
          fontSize: '28px',
          margin: '0 auto 1rem',
          boxShadow: 'var(--shadow-md)',
        }}>
          🥜
        </div>
        <h1 style={{ fontSize: '28px', fontWeight: 700, margin: '0 0 8px', letterSpacing: '-0.02em' }}>
          Chi sta usando NutNote?
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', margin: 0 }}>
          Seleziona il tuo account aziendale o creane uno nuovo per iniziare
        </p>
      </div>

      {/* Profile Grid */}
      <div style={{
        display: 'flex',
        gap: '1.5rem',
        flexWrap: 'wrap',
        justifyContent: 'center',
        maxWidth: '900px',
        width: '100%',
      }}>
        {users.map(u => (
          <div
            key={u.id}
            onClick={() => handleUserClick(u)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              width: '150px',
              padding: '1.25rem 1rem',
              borderRadius: '16px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'var(--transition-interactive)',
              position: 'relative',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.borderColor = 'var(--accent)';
              e.currentTarget.style.boxShadow = 'var(--shadow-md)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {/* Role indicator */}
            {u.role === 'admin' && (
              <div
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  backgroundColor: 'rgba(245, 159, 0, 0.15)',
                  color: 'var(--warning)',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
                title="Account Amministratore"
              >
                <Shield size={10} />
                Admin
              </div>
            )}

            {/* Avatar */}
            <div style={{
              width: '74px',
              height: '74px',
              borderRadius: '50%',
              backgroundColor: u.avatarColor || '#4263eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontSize: '28px',
              fontWeight: 700,
              marginBottom: '0.75rem',
              boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
            }}>
              {u.displayName.charAt(0).toUpperCase()}
            </div>

            {/* Name */}
            <span style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              textAlign: 'center',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              width: '100%',
              marginBottom: '4px',
            }}>
              {u.displayName}
            </span>

            {/* Team Badge */}
            {u.teamName ? (
              <span style={{
                fontSize: '11px',
                padding: '2px 8px',
                borderRadius: '12px',
                backgroundColor: u.teamColor ? `${u.teamColor}22` : 'var(--bg-surface-active)',
                color: u.teamColor || 'var(--text-secondary)',
                border: `1px solid ${u.teamColor ? `${u.teamColor}55` : 'var(--border)'}`,
                fontWeight: 500,
                marginTop: '4px',
              }}>
                {u.teamName}
              </span>
            ) : (
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Nessun team
              </span>
            )}
          </div>
        ))}

        {/* Create Profile Action Card */}
        <div
          onClick={() => setIsCreateModalOpen(true)}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '150px',
            minHeight: '170px',
            padding: '1.25rem 1rem',
            borderRadius: '16px',
            backgroundColor: 'transparent',
            border: '2px dashed var(--border)',
            cursor: 'pointer',
            transition: 'var(--transition-interactive)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.backgroundColor = 'transparent';
          }}
        >
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)',
            marginBottom: '0.75rem',
          }}>
            <Plus size={24} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Nuovo Profilo
          </span>
        </div>
      </div>

      {/* ── Modal Password Login ── */}
      {selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 'var(--z-modal)',
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '380px',
            padding: '24px',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border)',
          }}>
            <form onSubmit={handleLoginSubmit}>
              <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <div style={{
                  width: '64px',
                  height: '64px',
                  borderRadius: '50%',
                  backgroundColor: selectedUser.avatarColor,
                  color: '#fff',
                  fontSize: '26px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                }}>
                  {selectedUser.displayName.charAt(0).toUpperCase()}
                </div>
                <h3 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>
                  {selectedUser.displayName}
                </h3>
                {selectedUser.teamName && (
                  <span style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: selectedUser.teamColor ? `${selectedUser.teamColor}22` : 'var(--bg-surface-active)',
                    color: selectedUser.teamColor || 'var(--text-secondary)',
                    fontWeight: 500,
                  }}>
                    {selectedUser.teamName}
                  </span>
                )}
              </div>

              {loginError && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  backgroundColor: 'rgba(224, 49, 49, 0.1)',
                  color: 'var(--danger)',
                  fontSize: '13px',
                  marginBottom: '16px',
                }}>
                  <AlertCircle size={16} />
                  <span>{loginError}</span>
                </div>
              )}

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    ref={passwordInputRef}
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Inserisci la tua password..."
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 38px 10px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-app)',
                      color: 'var(--text-primary)',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '4px',
                    }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {selectedUser.role === 'admin' && (
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                    💡 Password iniziale Admin: <strong>admin</strong>
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '24px' }}>
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingLogin}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isSubmittingLogin ? 'not-allowed' : 'pointer',
                    opacity: isSubmittingLogin ? 0.7 : 1,
                  }}
                >
                  {isSubmittingLogin ? 'Accesso in corso...' : 'Accedi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Creazione Profilo ── */}
      {isCreateModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 'var(--z-modal)',
          padding: '1rem',
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '24px',
            boxShadow: 'var(--shadow-xl)',
            border: '1px solid var(--border)',
          }}>
            <h3 style={{ fontSize: '20px', fontWeight: 700, margin: '0 0 16px' }}>
              Crea Nuovo Profilo
            </h3>

            {createError && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: '8px',
                backgroundColor: 'rgba(224, 49, 49, 0.1)',
                color: 'var(--danger)',
                fontSize: '13px',
                marginBottom: '16px',
              }}>
                <AlertCircle size={16} />
                <span>{createError}</span>
              </div>
            )}

            <form onSubmit={handleCreateSubmit}>
              {/* Nome */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Nome e Cognome *
                </label>
                <input
                  type="text"
                  placeholder="Es. Mario Rossi"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                  required
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Password */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Password iniziale
                </label>
                <input
                  type="text"
                  placeholder="Es. 1234"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Team selection */}
              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Team / Reparto (Opzionale)
                </label>
                <select
                  value={newTeamId}
                  onChange={(e) => setNewTeamId(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    outline: 'none',
                  }}
                >
                  <option value="">-- Nessun team associato --</option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Role selection */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px' }}>
                  Ruolo Utente
                </label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <label style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${newRole === 'user' ? 'var(--accent)' : 'var(--border)'}`,
                    backgroundColor: newRole === 'user' ? 'var(--bg-surface-active)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}>
                    <input
                      type="radio"
                      name="role"
                      checked={newRole === 'user'}
                      onChange={() => setNewRole('user')}
                      style={{ accentColor: 'var(--accent)' }}
                    />
                    Utente Standard
                  </label>

                  <label style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: `1px solid ${newRole === 'admin' ? 'var(--warning)' : 'var(--border)'}`,
                    backgroundColor: newRole === 'admin' ? 'rgba(245, 159, 0, 0.1)' : 'transparent',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}>
                    <input
                      type="radio"
                      name="role"
                      checked={newRole === 'admin'}
                      onChange={() => setNewRole('admin')}
                      style={{ accentColor: 'var(--warning)' }}
                    />
                    Admin
                  </label>
                </div>
              </div>

              {/* Color Selection */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px' }}>
                  Colore Avatar
                </label>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {PRESET_COLORS.map((c) => (
                    <div
                      key={c}
                      onClick={() => setNewColor(c)}
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        backgroundColor: c,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        border: newColor === c ? '2px solid #fff' : 'none',
                        boxShadow: newColor === c ? `0 0 0 2px ${c}` : 'none',
                        transition: 'transform 0.1s',
                        transform: newColor === c ? 'scale(1.15)' : 'scale(1)',
                      }}
                    >
                      {newColor === c && <Check size={14} />}
                    </div>
                  ))}
                </div>
              </div>

              {/* Confirm / Cancel Buttons */}
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCreate}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isSubmittingCreate ? 'not-allowed' : 'pointer',
                    opacity: isSubmittingCreate ? 0.7 : 1,
                  }}
                >
                  {isSubmittingCreate ? 'Creazione in corso...' : 'Crea Profilo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deployment & Server Settings Modal */}
      <DeploymentSettingsModal
        isOpen={isDeploymentModalOpen}
        onClose={() => {
          setIsDeploymentModalOpen(false);
          loadData();
        }}
      />
    </div>
  );
}
