import React, { useState, useEffect } from 'react';
import { 
  Server, HardDrive, Globe, Check, AlertCircle, RefreshCw, 
  Copy, Play, Square, X, ShieldCheck, Wifi
} from 'lucide-react';
import { configApi, serverApi, getBackendMode, setBackendMode, getServerUrl } from '../../lib/api';
import type { NutNoteConfig, ServerStatus } from '../../lib/types';

interface DeploymentSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeploymentSettingsModal({ isOpen, onClose }: DeploymentSettingsModalProps) {
  const [activeTab, setActiveTab] = useState<'storage' | 'server' | 'remote'>('storage');
  
  // Storage config state
  const [config, setConfig] = useState<NutNoteConfig | null>(null);
  const [dbPathInput, setDbPathInput] = useState('');
  const [filesPathInput, setFilesPathInput] = useState('');
  const [pathTestStatus, setPathTestStatus] = useState<{ testing: boolean; success?: boolean; error?: string } | null>(null);
  const [isSavingStorage, setIsSavingStorage] = useState(false);
  const [storageSaveSuccess, setStorageSaveSuccess] = useState(false);

  // Embedded Server state
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [portInput, setPortInput] = useState('9700');
  const [isServerBusy, setIsServerBusy] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [copiedIp, setCopiedIp] = useState<string | null>(null);

  // Remote Client state
  const [remoteMode, setRemoteMode] = useState<'local' | 'remote'>('local');
  const [remoteUrlInput, setRemoteUrlInput] = useState('http://localhost:9700');
  const [remotePingStatus, setRemotePingStatus] = useState<{ testing: boolean; success?: boolean; latency?: number; error?: string } | null>(null);
  const [isSavingRemote, setIsSavingRemote] = useState(false);

  // Load configuration & server status
  const refreshData = async () => {
    try {
      const cfg = await configApi.get().catch(() => ({
        mode: 'local' as const,
        dbPath: null,
        filesPath: null,
        serverPort: 9700,
        serverUrl: null,
      }));
      setConfig(cfg);
      setDbPathInput(cfg?.dbPath || '');
      setFilesPathInput(cfg?.filesPath || '');
      setPortInput(String(cfg?.serverPort || 9700));

      const sStatus = await serverApi.getStatus().catch(() => ({
        isRunning: false,
        port: 9700,
        localIps: ['localhost'],
      }));
      setServerStatus(sStatus);

      setRemoteMode(getBackendMode());
      setRemoteUrlInput(getServerUrl());
    } catch (err) {
      console.error('Error loading deployment settings:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshData();
      setStorageSaveSuccess(false);
      setPathTestStatus(null);
      setRemotePingStatus(null);
      setServerError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // --- Handlers Tab Storage ---
  const handleTestPath = async () => {
    if (!dbPathInput.trim()) {
      setPathTestStatus({ testing: false, success: true });
      return;
    }
    setPathTestStatus({ testing: true });
    try {
      await configApi.testDbPath(dbPathInput.trim());
      setPathTestStatus({ testing: false, success: true });
    } catch (err: any) {
      setPathTestStatus({ testing: false, success: false, error: err?.toString() || 'Percorso non raggiungibile' });
    }
  };

  const handleSaveStorage = async () => {
    setIsSavingStorage(true);
    try {
      const currentConfig: NutNoteConfig = config || {
        mode: 'local',
        dbPath: null,
        filesPath: null,
        serverPort: 9700,
        serverUrl: null,
      };
      const newConfig: NutNoteConfig = {
        ...currentConfig,
        mode: dbPathInput.trim() ? 'shared' : 'local',
        dbPath: dbPathInput.trim() || null,
        filesPath: filesPathInput.trim() || null,
      };
      await configApi.save(newConfig);
      setConfig(newConfig);
      setStorageSaveSuccess(true);
      setTimeout(() => setStorageSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Errore salvataggio: ${err?.message || err}`);
    } finally {
      setIsSavingStorage(false);
    }
  };

  // --- Handlers Tab Server ---
  const handleStartServer = async () => {
    setIsServerBusy(true);
    setServerError(null);
    try {
      const port = parseInt(portInput, 10) || 9700;
      const status = await serverApi.start(port);
      setServerStatus(status);
    } catch (err: any) {
      setServerError(err?.toString() || 'Impossibile avviare il server');
    } finally {
      setIsServerBusy(false);
    }
  };

  const handleStopServer = async () => {
    setIsServerBusy(true);
    setServerError(null);
    try {
      const status = await serverApi.stop();
      setServerStatus(status);
    } catch (err: any) {
      setServerError(err?.toString() || 'Impossibile fermare il server');
    } finally {
      setIsServerBusy(false);
    }
  };

  const copyAddress = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedIp(url);
    setTimeout(() => setCopiedIp(null), 2500);
  };

  // --- Handlers Tab Remote Client ---
  const handleTestRemotePing = async () => {
    const url = remoteUrlInput.replace(/\/+$/, '');
    setRemotePingStatus({ testing: true });
    const start = performance.now();
    try {
      const res = await fetch(`${url}/api/health`, { method: 'GET' });
      const elapsed = Math.round(performance.now() - start);
      if (res.ok) {
        await res.json();
        setRemotePingStatus({ testing: false, success: true, latency: elapsed });
      } else {
        setRemotePingStatus({ testing: false, success: false, error: `Risposta HTTP ${res.status}` });
      }
    } catch (err: any) {
      setRemotePingStatus({ testing: false, success: false, error: 'Server non raggiungibile o offline' });
    }
  };

  const handleSaveRemoteMode = () => {
    setIsSavingRemote(true);
    setBackendMode(remoteMode, remoteUrlInput);
    setIsSavingRemote(false);
    // Notifica ricaricamento
    window.location.reload();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.55)',
      backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 'var(--z-modal)',
      padding: '20px',
    }}>
      <div style={{
        width: '100%', maxWidth: '680px',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '16px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-xl, 0 20px 25px -5px rgba(0,0,0,0.2))',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px',
              backgroundColor: 'rgba(66, 99, 235, 0.12)',
              color: 'var(--accent)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Server size={20} />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 600, margin: 0 }}>
                Impostazioni Deployment & Rete
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                NutNote • Configura archiviazione locale, condivisa o server integrato
              </p>
            </div>
          </div>
          <button
            id="btn-close-deployment"
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: '6px', borderRadius: '8px',
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex', gap: '4px',
          padding: '8px 24px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg-app)',
        }}>
          <button
            id="tab-storage"
            onClick={() => setActiveTab('storage')}
            style={{
              padding: '8px 14px', borderRadius: '8px',
              border: 'none',
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', fontWeight: activeTab === 'storage' ? 600 : 500,
              backgroundColor: activeTab === 'storage' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'storage' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: activeTab === 'storage' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <HardDrive size={15} />
            Archiviazione & NAS
          </button>

          <button
            id="tab-server"
            onClick={() => setActiveTab('server')}
            style={{
              padding: '8px 14px', borderRadius: '8px',
              border: 'none',
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', fontWeight: activeTab === 'server' ? 600 : 500,
              backgroundColor: activeTab === 'server' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'server' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: activeTab === 'server' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Server size={15} />
            Server Integrato
            {serverStatus?.isRunning && (
              <span style={{
                width: 7, height: 7, borderRadius: '50%',
                backgroundColor: 'var(--success, #2b8a3e)',
                display: 'inline-block',
              }} />
            )}
          </button>

          <button
            id="tab-remote"
            onClick={() => setActiveTab('remote')}
            style={{
              padding: '8px 14px', borderRadius: '8px',
              border: 'none',
              display: 'flex', alignItems: 'center', gap: '6px',
              fontSize: '13px', fontWeight: activeTab === 'remote' ? 600 : 500,
              backgroundColor: activeTab === 'remote' ? 'var(--bg-surface)' : 'transparent',
              color: activeTab === 'remote' ? 'var(--accent)' : 'var(--text-secondary)',
              cursor: 'pointer',
              boxShadow: activeTab === 'remote' ? 'var(--shadow-sm)' : 'none',
            }}
          >
            <Globe size={15} />
            Connetti a Remoto
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          
          {/* TAB 1: STORAGE & NAS */}
          {activeTab === 'storage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px' }}>
                  Posizione del Database NutNote
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Per singoli utenti lascia il percorso vuoto (salvataggio locale). Per piccoli uffici o team con cartella condivisa (NAS, Samba, Dropbox, OneDrive), inserisci il percorso assoluto o di rete.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Cartella o File Database (lascia vuoto per predefinito)
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input
                    type="text"
                    placeholder="Es. \\SERVER\Condivisa\NutNote o D:\OneDrive\NutNote"
                    value={dbPathInput}
                    onChange={(e) => {
                      setDbPathInput(e.target.value);
                      setPathTestStatus(null);
                    }}
                    style={{
                      flex: 1,
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-app)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  />
                  <button
                    id="btn-test-path"
                    onClick={handleTestPath}
                    disabled={pathTestStatus?.testing}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: '5px',
                    }}
                  >
                    {pathTestStatus?.testing ? <RefreshCw size={13} className="spin" /> : <ShieldCheck size={14} />}
                    Verifica
                  </button>
                </div>

                {pathTestStatus?.success && (
                  <div style={{
                    marginTop: '8px', padding: '6px 10px', borderRadius: '6px',
                    backgroundColor: 'rgba(43, 138, 62, 0.1)', color: 'var(--success, #2b8a3e)',
                    fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <Check size={14} />
                    Percorso accessibile e scrivibile con successo.
                  </div>
                )}

                {pathTestStatus?.error && (
                  <div style={{
                    marginTop: '8px', padding: '6px 10px', borderRadius: '6px',
                    backgroundColor: 'rgba(201, 42, 42, 0.1)', color: 'var(--danger, #c92a2a)',
                    fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <AlertCircle size={14} />
                    {pathTestStatus.error}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                  Cartella Allegati e File (opzionale)
                </label>
                <input
                  type="text"
                  placeholder="Predefinito: cartella 'files' affiancata al database"
                  value={filesPathInput}
                  onChange={(e) => setFilesPathInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border)',
                    backgroundColor: 'var(--bg-app)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{
                padding: '12px 16px', borderRadius: '10px',
                backgroundColor: 'var(--bg-app)',
                border: '1px solid var(--border)',
                fontSize: '12px', color: 'var(--text-secondary)',
                lineHeight: 1.5,
              }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '4px' }}>
                  💡 Come funziona la modalità condivisa
                </div>
                NutNote usa SQLite in modalità <strong>WAL</strong> (Write-Ahead-Logging) con timeout di blocco automatico a 5 secondi.
                Su una cartella di rete o sincronizzata in cloud, più postazioni possono leggere contemporaneamente e scrivere in modo sicuro.
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                {storageSaveSuccess && (
                  <span style={{ fontSize: '12px', color: 'var(--success, #2b8a3e)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Check size={14} /> Salvato! Riavvia l'app per applicare le modifiche al path.
                  </span>
                )}
                <button
                  id="btn-save-storage"
                  onClick={handleSaveStorage}
                  disabled={isSavingStorage}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  {isSavingStorage ? 'Salvataggio...' : 'Salva Impostazioni Archiviazione'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: EMBEDDED SERVER */}
          {activeTab === 'server' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px' }}>
                  Server HTTP Integrato NutNote
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Avvia un server leggero ad alte prestazioni all'interno di questa istanza. Nessun software o database esterno da installare: basta lasciare aperto NutNote su questo PC.
                </p>
              </div>

              {/* Status Card */}
              <div style={{
                padding: '16px 20px', borderRadius: '12px',
                border: serverStatus?.isRunning 
                  ? '1px solid rgba(43, 138, 62, 0.4)' 
                  : '1px solid var(--border)',
                backgroundColor: serverStatus?.isRunning 
                  ? 'rgba(43, 138, 62, 0.05)' 
                  : 'var(--bg-app)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: 12, height: 12, borderRadius: '50%',
                    backgroundColor: serverStatus?.isRunning ? '#2b8a3e' : '#868e96',
                    boxShadow: serverStatus?.isRunning ? '0 0 10px #2b8a3e' : 'none',
                  }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '14px' }}>
                      {serverStatus?.isRunning ? 'Server Attivo & In Ascolto' : 'Server Non Attivo'}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                      {serverStatus?.isRunning 
                        ? `Porta: ${serverStatus.port} • Pronto a ricevere richieste dai colleghi`
                        : 'Avvia il server per consentire la connessione di altri dispositivi'}
                    </div>
                  </div>
                </div>

                <div>
                  {serverStatus?.isRunning ? (
                    <button
                      id="btn-stop-server"
                      onClick={handleStopServer}
                      disabled={isServerBusy}
                      style={{
                        padding: '8px 16px', borderRadius: '8px',
                        backgroundColor: 'var(--danger, #c92a2a)',
                        color: '#fff', border: 'none',
                        fontSize: '13px', fontWeight: 600,
                        cursor: isServerBusy ? 'not-allowed' : 'pointer',
                        opacity: isServerBusy ? 0.7 : 1,
                        display: 'flex', alignItems: 'center', gap: '6px',
                      }}
                    >
                      {isServerBusy ? <RefreshCw size={14} className="spin" /> : <Square size={14} />}
                      {isServerBusy ? 'Arresto...' : 'Arresta Server'}
                    </button>
                  ) : (
                    <button
                      id="btn-start-server"
                      onClick={handleStartServer}
                      disabled={isServerBusy}
                      style={{
                        padding: '8px 16px', borderRadius: '8px',
                        backgroundColor: '#2b8a3e',
                        color: '#fff', border: 'none',
                        fontSize: '13px', fontWeight: 600,
                        cursor: isServerBusy ? 'not-allowed' : 'pointer',
                        opacity: isServerBusy ? 0.7 : 1,
                        display: 'flex', alignItems: 'center', gap: '6px',
                      }}
                    >
                      {isServerBusy ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
                      {isServerBusy ? 'Avvio in corso...' : 'Avvia Server Ora'}
                    </button>
                  )}
                </div>
              </div>

              {serverError && (
                <div style={{
                  padding: '10px 14px', borderRadius: '8px',
                  backgroundColor: 'rgba(201, 42, 42, 0.1)', color: 'var(--danger, #c92a2a)',
                  fontSize: '12px', display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <AlertCircle size={15} />
                  {serverError}
                </div>
              )}

              {/* Port Config */}
              {!serverStatus?.isRunning && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Porta di ascolto
                  </label>
                  <input
                    type="number"
                    value={portInput}
                    onChange={(e) => setPortInput(e.target.value)}
                    style={{
                      width: '140px',
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--bg-app)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                    }}
                  />
                </div>
              )}

              {/* Local IPs available */}
              {serverStatus?.isRunning && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                    Indirizzi di connessione per gli altri PC del team:
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {(serverStatus.localIps || []).map((ip: string) => {
                      const fullUrl = `http://${ip.split(' ')[0]}:${serverStatus.port}`;
                      return (
                        <div key={ip} style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          padding: '8px 12px', borderRadius: '8px',
                          backgroundColor: 'var(--bg-app)',
                          border: '1px solid var(--border)',
                          fontSize: '13px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Wifi size={14} color="var(--accent)" />
                            <code>{fullUrl}</code>
                            {ip.includes('(') && (
                              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                {ip.substring(ip.indexOf('('))}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => copyAddress(fullUrl)}
                            style={{
                              padding: '4px 8px', borderRadius: '6px',
                              border: '1px solid var(--border)',
                              backgroundColor: 'var(--bg-surface)',
                              fontSize: '11px', cursor: 'pointer',
                              display: 'flex', alignItems: 'center', gap: '4px',
                            }}
                          >
                            {copiedIp === fullUrl ? <Check size={12} color="#2b8a3e" /> : <Copy size={12} />}
                            {copiedIp === fullUrl ? 'Copiato!' : 'Copia'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REMOTE CLIENT */}
          {activeTab === 'remote' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div>
                <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '0 0 6px' }}>
                  Connetti a un Server NutNote Remoto
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  Usa questa istanza come client connesso a un server NutNote centrale (in ufficio o cloud) invece del database locale.
                </p>
              </div>

              {/* Mode Selector */}
              <div style={{ display: 'flex', gap: '12px' }}>
                <div 
                  onClick={() => setRemoteMode('local')}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '12px',
                    border: remoteMode === 'local' ? '2px solid var(--accent)' : '1px solid var(--border)',
                    backgroundColor: remoteMode === 'local' ? 'rgba(66, 99, 235, 0.04)' : 'var(--bg-app)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                    💻 Modalità Locale (Standard)
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Accede al database locale SQLite presente su questo computer
                  </div>
                </div>

                <div 
                  onClick={() => setRemoteMode('remote')}
                  style={{
                    flex: 1, padding: '14px', borderRadius: '12px',
                    border: remoteMode === 'remote' ? '2px solid var(--accent)' : '1px solid var(--border)',
                    backgroundColor: remoteMode === 'remote' ? 'rgba(66, 99, 235, 0.04)' : 'var(--bg-app)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                    🌐 Modalità Server Remoto
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Invia tutte le letture e scritture al server NutNote via rete
                  </div>
                </div>
              </div>

              {/* Server URL Input */}
              {remoteMode === 'remote' && (
                <div>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-secondary)' }}>
                    Indirizzo Server NutNote (IP o Hostname)
                  </label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                      type="text"
                      placeholder="http://192.168.1.50:9700"
                      value={remoteUrlInput}
                      onChange={(e) => {
                        setRemoteUrlInput(e.target.value);
                        setRemotePingStatus(null);
                      }}
                      style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-app)',
                        color: 'var(--text-primary)',
                        fontSize: '13px',
                      }}
                    />
                    <button
                      onClick={handleTestRemotePing}
                      disabled={remotePingStatus?.testing}
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid var(--border)',
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-primary)',
                        fontSize: '12px', fontWeight: 500,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: '5px',
                      }}
                    >
                      {remotePingStatus?.testing ? <RefreshCw size={13} className="spin" /> : <Wifi size={14} />}
                      Test Connessione
                    </button>
                  </div>

                  {remotePingStatus?.success && (
                    <div style={{
                      marginTop: '8px', padding: '6px 10px', borderRadius: '6px',
                      backgroundColor: 'rgba(43, 138, 62, 0.1)', color: 'var(--success, #2b8a3e)',
                      fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      <Check size={14} />
                      Connessione riuscita! Latenza: {remotePingStatus.latency}ms
                    </div>
                  )}

                  {remotePingStatus?.error && (
                    <div style={{
                      marginTop: '8px', padding: '6px 10px', borderRadius: '6px',
                      backgroundColor: 'rgba(201, 42, 42, 0.1)', color: 'var(--danger, #c92a2a)',
                      fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px',
                    }}>
                      <AlertCircle size={14} />
                      {remotePingStatus.error}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                <button
                  onClick={handleSaveRemoteMode}
                  disabled={isSavingRemote}
                  style={{
                    padding: '8px 18px',
                    borderRadius: '8px',
                    backgroundColor: 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  Applica e Ricarica
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
