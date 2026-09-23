import React from 'react';
import { Link } from 'react-router-dom';
import { Hash, FileText } from 'lucide-react';
import { usePage } from '../../hooks/usePages';
import {
  estraiRiferimenti,
  percorsoInterno,
  type RiferimentoInterno,
} from '../../lib/deepLink';

/**
 * Una pastiglia cliccabile per un riferimento interno.
 *
 * Mostra il titolo vero della pagina invece di un'etichetta generica: un elenco
 * di "Referenza Blocco" tutti uguali non dice a cosa si sta rimandando. Il
 * titolo passa dalla cache delle richieste, quindi più riferimenti alla stessa
 * pagina non generano più di una interrogazione.
 */
export function PastigliaRiferimento({ riferimento }: { riferimento: RiferimentoInterno }) {
  const { data: pagina } = usePage(riferimento.pageId);

  const etichetta = pagina?.title || 'Pagina non trovata';
  const mancante = !pagina;

  return (
    <Link
      to={percorsoInterno(riferimento)}
      title={riferimento.blockId ? 'Vai al blocco' : 'Vai alla pagina'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        maxWidth: '260px',
        padding: '2px 7px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
        backgroundColor: 'var(--bg-surface)',
        color: mancante ? 'var(--text-muted)' : 'var(--accent)',
        fontSize: 'var(--text-xs)',
        fontWeight: 'var(--weight-medium)',
        textDecoration: 'none',
        transition: 'var(--transition-interactive)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)')}
      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface)')}
    >
      {riferimento.blockId ? <Hash size={11} /> : <FileText size={11} />}
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {pagina?.icon ? `${pagina.icon} ` : ''}
        {etichetta}
      </span>
    </Link>
  );
}

/**
 * Riga dei riferimenti contenuti in un testo.
 *
 * I blocchi di testo sono aree di testo modificabili, dentro cui un collegamento
 * cliccabile non può stare: i riferimenti compaiono quindi sotto al blocco,
 * senza intralciare la scrittura. Se non ce ne sono, non occupa spazio.
 */
export function RiferimentiInterni({ testo }: { testo: string }) {
  const riferimenti = React.useMemo(() => estraiRiferimenti(testo), [testo]);

  if (riferimenti.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '4px' }}>
      {riferimenti.map((riferimento) => (
        <PastigliaRiferimento key={riferimento.originale} riferimento={riferimento} />
      ))}
    </div>
  );
}
