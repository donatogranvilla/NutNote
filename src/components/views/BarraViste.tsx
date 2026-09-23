import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bookmark, BookmarkPlus, X, Check } from 'lucide-react';
import { viewsApi, type SavedView } from '../../lib/api';
import { queryKeys } from '../../lib/queryKeys';

/** Configurazione di elenco che una vista salva e ripristina. */
export interface ConfigurazioneElenco {
  displayType: 'table' | 'kanban';
  filtro: string;
}

/**
 * Barra delle viste salvate di un tipo di pagina.
 *
 * La tabella `views` esisteva nello schema dall'inizio ma nessuno la
 * interrogava: la scelta fra tabella e kanban e il testo di ricerca vivevano
 * nello stato del componente e si perdevano appena si cambiava schermata.
 * Qui quella configurazione prende un nome e resta.
 */
export function BarraViste({
  typeName,
  configurazioneCorrente,
  onApplica,
}: {
  typeName: string;
  configurazioneCorrente: ConfigurazioneElenco;
  onApplica: (configurazione: ConfigurazioneElenco) => void;
}) {
  const client = useQueryClient();
  const [inSalvataggio, setInSalvataggio] = useState(false);
  const [nomeNuova, setNomeNuova] = useState('');
  const [vistaAttiva, setVistaAttiva] = useState<string | null>(null);

  const { data: viste = [] } = useQuery({
    queryKey: [...queryKeys.views.all, 'type', typeName],
    queryFn: () => viewsApi.getForScope('type', typeName),
  });

  const ricarica = () => client.invalidateQueries({ queryKey: queryKeys.views.all });

  const applica = (vista: SavedView) => {
    setVistaAttiva(vista.id);
    // I filtri sono JSON deciso dall'interfaccia: un salvataggio di una versione
    // futura con una forma diversa non deve far cadere la schermata.
    let filtro = '';
    try {
      const letti = JSON.parse(vista.filters);
      if (Array.isArray(letti) && typeof letti[0] === 'string') filtro = letti[0];
    } catch {
      /* filtri illeggibili: si applica solo il tipo di visualizzazione */
    }
    onApplica({
      displayType: vista.displayType === 'kanban' ? 'kanban' : 'table',
      filtro,
    });
  };

  const salva = async () => {
    const nome = nomeNuova.trim();
    if (!nome) return;

    await viewsApi.create({
      name: nome,
      displayType: configurazioneCorrente.displayType,
      filters: JSON.stringify(configurazioneCorrente.filtro ? [configurazioneCorrente.filtro] : []),
      scopeType: 'type',
      scopeId: typeName,
    });

    setNomeNuova('');
    setInSalvataggio(false);
    ricarica();
  };

  const elimina = async (id: string) => {
    await viewsApi.remove(id);
    if (vistaAttiva === id) setVistaAttiva(null);
    ricarica();
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
      {viste.map((vista) => {
        const attiva = vista.id === vistaAttiva;
        return (
          <span
            key={vista.id}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-full)',
              border: attiva ? '1px solid var(--accent)' : '1px solid var(--border)',
              backgroundColor: attiva ? 'var(--accent-light)' : 'var(--bg-surface)',
              fontSize: 'var(--text-xs)',
              transition: 'var(--transition-interactive)',
            }}
          >
            <button
              onClick={() => applica(vista)}
              title={`Applica la vista "${vista.name}"`}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: 'var(--text-primary)' }}
            >
              <Bookmark size={11} color={attiva ? 'var(--accent)' : 'var(--text-muted)'} />
              {vista.name}
            </button>
            <button
              onClick={() => elimina(vista.id)}
              title="Elimina la vista"
              style={{ display: 'inline-flex', color: 'var(--text-muted)' }}
            >
              <X size={11} />
            </button>
          </span>
        );
      })}

      {inSalvataggio ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <input
            autoFocus
            value={nomeNuova}
            onChange={(e) => setNomeNuova(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') salva();
              if (e.key === 'Escape') setInSalvataggio(false);
            }}
            placeholder="Nome della vista..."
            style={{
              width: '150px',
              padding: '4px 8px',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--accent)',
              backgroundColor: 'var(--bg-input)',
              fontSize: 'var(--text-xs)',
              color: 'var(--text-primary)',
            }}
          />
          <button onClick={salva} title="Salva" style={{ display: 'inline-flex', color: 'var(--success)' }}>
            <Check size={14} />
          </button>
          <button onClick={() => setInSalvataggio(false)} title="Annulla" style={{ display: 'inline-flex', color: 'var(--text-muted)' }}>
            <X size={14} />
          </button>
        </span>
      ) : (
        <button
          onClick={() => setInSalvataggio(true)}
          title="Salva la configurazione attuale come vista"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            padding: '4px 8px',
            borderRadius: 'var(--radius-full)',
            border: '1px dashed var(--border-strong)',
            color: 'var(--text-secondary)',
            fontSize: 'var(--text-xs)',
            transition: 'var(--transition-interactive)',
          }}
        >
          <BookmarkPlus size={11} /> Salva vista
        </button>
      )}
    </div>
  );
}
