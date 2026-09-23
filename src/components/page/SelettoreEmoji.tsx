import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { CATEGORIE_EMOJI, cercaEmoji, type VoceEmoji } from '../../lib/emoji';

/**
 * Selettore dell'icona di una pagina.
 *
 * Sostituisce la griglia fissa di diciotto emoji che era scritta dentro la
 * pagina di dettaglio: qui ci sono categorie, ricerca in italiano e la
 * possibilità di scrivere un carattere qualsiasi, comprese le emoji che il
 * catalogo non prevede.
 */
export function SelettoreEmoji({
  valoreCorrente,
  onSeleziona,
  onChiudi,
}: {
  valoreCorrente?: string | null;
  onSeleziona: (simbolo: string | null) => void;
  onChiudi: () => void;
}) {
  const [ricerca, setRicerca] = useState('');
  const [categoriaAttiva, setCategoriaAttiva] = useState<string>(CATEGORIE_EMOJI[0].id);
  const campoRicerca = useRef<HTMLInputElement>(null);

  // La ricerca parte subito: chi apre il selettore quasi sempre sa cosa cerca.
  useEffect(() => {
    campoRicerca.current?.focus();
  }, []);

  // Con la ricerca attiva le categorie non contano: si mostra ciò che combacia.
  const inRicerca = ricerca.trim().length > 0;
  const voci: VoceEmoji[] = useMemo(() => {
    if (inRicerca) return cercaEmoji(ricerca);
    return CATEGORIE_EMOJI.find((c) => c.id === categoriaAttiva)?.voci ?? [];
  }, [ricerca, inRicerca, categoriaAttiva]);

  return (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        marginTop: '4px',
        width: '296px',
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--shadow-lg)',
        zIndex: 'var(--z-menu)',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '8px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Search size={14} color="var(--text-muted)" />
        <input
          ref={campoRicerca}
          value={ricerca}
          onChange={(e) => setRicerca(e.target.value)}
          placeholder="Cerca: scadenza, cliente, bug..."
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-primary)',
          }}
        />
        {valoreCorrente && (
          <button
            onClick={() => onSeleziona(null)}
            title="Togli l'icona"
            style={{ display: 'flex', color: 'var(--text-muted)', padding: '2px' }}
          >
            <X size={14} />
          </button>
        )}
      </div>

      {!inRicerca && (
        <div style={{ display: 'flex', gap: '2px', padding: '6px 8px', overflowX: 'auto', borderBottom: '1px solid var(--divider)' }}>
          {CATEGORIE_EMOJI.map((categoria) => {
            const attiva = categoria.id === categoriaAttiva;
            return (
              <button
                key={categoria.id}
                onClick={() => setCategoriaAttiva(categoria.id)}
                style={{
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: 'var(--text-xs)',
                  whiteSpace: 'nowrap',
                  color: attiva ? 'var(--accent-text)' : 'var(--text-secondary)',
                  backgroundColor: attiva ? 'var(--accent)' : 'transparent',
                  transition: 'background-color var(--transition-fast), color var(--transition-fast)',
                }}
              >
                {categoria.nome}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ maxHeight: '196px', overflowY: 'auto', padding: '8px' }}>
        {voci.length === 0 ? (
          <div style={{ padding: 'var(--sp-4)', textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            Nessuna icona per "{ricerca}". Puoi incollarne una qui sotto.
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
            {voci.map((voce) => (
              <button
                key={voce.simbolo}
                onClick={() => onSeleziona(voce.simbolo)}
                title={voce.nome}
                style={{
                  fontSize: '19px',
                  lineHeight: 1,
                  padding: '6px 0',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: voce.simbolo === valoreCorrente ? 'var(--accent-light)' : 'transparent',
                  transition: 'background-color var(--transition-fast)',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor =
                    voce.simbolo === valoreCorrente ? 'var(--accent-light)' : 'transparent')
                }
              >
                {voce.simbolo}
              </button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '8px', borderTop: '1px solid var(--border)', display: 'flex', gap: '6px' }}>
        <input
          maxLength={8}
          placeholder="Altra emoji"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const scelta = (e.target as HTMLInputElement).value.trim();
              if (scelta) onSeleziona(scelta);
            }
          }}
          style={{
            flex: 1,
            padding: '5px 8px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-input)',
            fontSize: 'var(--text-xs)',
            color: 'var(--text-primary)',
          }}
        />
        <button
          onClick={onChiudi}
          style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', padding: '5px 10px' }}
        >
          Chiudi
        </button>
      </div>
    </div>
  );
}
