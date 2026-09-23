import React from 'react';
import { X, Sun, Moon, Monitor, RotateCcw, Type, Code2, Palette, Gauge, BookOpen } from 'lucide-react';
import { useAspetto } from '../../contexts/AspettoContext';
import {
  FAMIGLIE_TESTO,
  FAMIGLIE_CODICE,
  ACCENTI_PROPOSTI,
  type PreferenzeAspetto,
  type LivelloEffetti,
} from '../../lib/aspetto';

/**
 * Pannello di personalizzazione dell'aspetto.
 *
 * Non ha un'anteprima separata: poiché le preferenze agiscono sui token CSS
 * globali, l'anteprima è l'applicazione stessa dietro al pannello, che si
 * aggiorna mentre si muovono i controlli.
 */
export function AspettoModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { aspetto, aggiornaAspetto, ripristinaAspetto } = useAspetto();

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 'var(--z-modal)',
        padding: 'var(--sp-4)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '560px',
          maxHeight: '86vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-xl)',
          overflow: 'hidden',
        }}
      >
        <Intestazione onClose={onClose} onRipristina={ripristinaAspetto} />

        <div style={{ overflowY: 'auto', padding: 'var(--sp-5)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-6)' }}>
          <Sezione icona={<Sun size={14} />} titolo="Tema">
            <ScelteAffiancate
              opzioni={[
                { valore: 'light', etichetta: 'Chiaro', icona: <Sun size={14} /> },
                { valore: 'dark', etichetta: 'Scuro', icona: <Moon size={14} /> },
                { valore: 'auto', etichetta: 'Sistema', icona: <Monitor size={14} /> },
              ]}
              selezionato={aspetto.tema}
              onSeleziona={(valore) => aggiornaAspetto({ tema: valore as PreferenzeAspetto['tema'] })}
            />
          </Sezione>

          <Sezione icona={<Type size={14} />} titolo="Testo dell'interfaccia">
            <Elenco
              opzioni={FAMIGLIE_TESTO.map((f) => ({ valore: f.id, etichetta: f.nome, anteprima: f.stack }))}
              selezionato={aspetto.fontTesto}
              onSeleziona={(valore) => aggiornaAspetto({ fontTesto: valore })}
            />
            <Cursore
              etichetta="Dimensione"
              valore={aspetto.dimensioneInterfaccia}
              minimo={11}
              massimo={20}
              passo={1}
              unita="px"
              onCambia={(valore) => aggiornaAspetto({ dimensioneInterfaccia: valore })}
            />
          </Sezione>

          <Sezione icona={<BookOpen size={14} />} titolo="Lettura e scrittura">
            <Cursore
              etichetta="Corpo del testo"
              valore={aspetto.dimensioneEditor}
              minimo={12}
              massimo={24}
              passo={1}
              unita="px"
              onCambia={(valore) => aggiornaAspetto({ dimensioneEditor: valore })}
            />
            <Cursore
              etichetta="Interlinea"
              valore={aspetto.interlineaEditor}
              minimo={1.2}
              massimo={2.2}
              passo={0.05}
              unita=""
              onCambia={(valore) => aggiornaAspetto({ interlineaEditor: valore })}
            />
            <Cursore
              etichetta="Larghezza colonna"
              valore={aspetto.larghezzaColonna}
              minimo={600}
              massimo={1400}
              passo={20}
              unita="px"
              onCambia={(valore) => aggiornaAspetto({ larghezzaColonna: valore })}
            />
            <Cursore
              etichetta="Larghezza immagini"
              valore={aspetto.larghezzaImmagini}
              minimo={40}
              massimo={100}
              passo={5}
              unita="%"
              onCambia={(valore) => aggiornaAspetto({ larghezzaImmagini: valore })}
            />
          </Sezione>

          <Sezione icona={<Code2 size={14} />} titolo="Codice">
            <Elenco
              opzioni={FAMIGLIE_CODICE.map((f) => ({ valore: f.id, etichetta: f.nome, anteprima: f.stack }))}
              selezionato={aspetto.fontCodice}
              onSeleziona={(valore) => aggiornaAspetto({ fontCodice: valore })}
            />
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '13px',
                backgroundColor: 'var(--bg-code)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--sp-3)',
                color: 'var(--text-primary)',
              }}
            >
              const commessa = ordini.filter(o =&gt; o.stato === 'aperto');
            </div>
          </Sezione>

          <Sezione icona={<Palette size={14} />} titolo="Colore e forma">
            <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
              {ACCENTI_PROPOSTI.map((tinta) => (
                <button
                  key={tinta.valore}
                  onClick={() => aggiornaAspetto({ accento: tinta.valore })}
                  title={tinta.nome}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: tinta.valore,
                    border: aspetto.accento === tinta.valore ? '2px solid var(--text-primary)' : '2px solid transparent',
                    outline: '1px solid var(--border)',
                    cursor: 'pointer',
                    transition: 'transform var(--transition-fast)',
                  }}
                />
              ))}
              <label
                title="Colore personalizzato"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-full)',
                  border: '1px dashed var(--border-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  fontSize: '16px',
                }}
              >
                +
                <input
                  type="color"
                  value={aspetto.accento}
                  onChange={(e) => aggiornaAspetto({ accento: e.target.value })}
                  style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
                />
              </label>
            </div>
            <Cursore
              etichetta="Arrotondamento angoli"
              valore={aspetto.scalaRaggio}
              minimo={0}
              massimo={2}
              passo={0.25}
              unita="×"
              onCambia={(valore) => aggiornaAspetto({ scalaRaggio: valore })}
            />
          </Sezione>

          <Sezione
            icona={<Gauge size={14} />}
            titolo="Effetti grafici"
            nota="Meno effetti significa meno lavoro per ogni fotogramma: utile su postazioni datate."
          >
            <ScelteAffiancate
              opzioni={[
                { valore: 'completi', etichetta: 'Completi' },
                { valore: 'ridotti', etichetta: 'Senza sfocature' },
                { valore: 'minimi', etichetta: 'Minimi' },
              ]}
              selezionato={aspetto.effetti}
              onSeleziona={(valore) => aggiornaAspetto({ effetti: valore as LivelloEffetti })}
            />
          </Sezione>
        </div>
      </div>
    </div>
  );
}

/** Barra superiore del pannello, con ripristino e chiusura. */
function Intestazione({ onClose, onRipristina }: { onClose: () => void; onRipristina: () => void }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'var(--sp-4) var(--sp-5)',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
      }}
    >
      <div>
        <div style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)' }}>
          Aspetto
        </div>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', marginTop: '2px' }}>
          Le modifiche si applicano subito e restano su questo computer
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <button
          onClick={onRipristina}
          title="Ripristina l'aspetto originale"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 10px',
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-secondary)',
            fontSize: 'var(--text-xs)',
            transition: 'background-color var(--transition-fast), color var(--transition-fast)',
          }}
        >
          <RotateCcw size={13} /> Ripristina
        </button>
        <button
          onClick={onClose}
          style={{ display: 'flex', padding: '6px', borderRadius: 'var(--radius-md)', color: 'var(--text-secondary)' }}
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
}

/** Gruppo di controlli con titolo e nota opzionale. */
function Sezione({
  icona,
  titolo,
  nota,
  children,
}: {
  icona: React.ReactNode;
  titolo: string;
  nota?: string;
  children: React.ReactNode;
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '7px', color: 'var(--text-secondary)' }}>
        {icona}
        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semibold)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {titolo}
        </span>
      </div>
      {nota && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: '-6px' }}>{nota}</div>}
      {children}
    </section>
  );
}

/** Scelta unica fra poche opzioni, disposte a segmenti affiancati. */
function ScelteAffiancate({
  opzioni,
  selezionato,
  onSeleziona,
}: {
  opzioni: { valore: string; etichetta: string; icona?: React.ReactNode }[];
  selezionato: string;
  onSeleziona: (valore: string) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: '3px',
        padding: '3px',
        backgroundColor: 'var(--bg-surface-hover)',
        borderRadius: 'var(--radius-lg)',
      }}
    >
      {opzioni.map((opzione) => {
        const attivo = opzione.valore === selezionato;
        return (
          <button
            key={opzione.valore}
            onClick={() => onSeleziona(opzione.valore)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              padding: '7px 8px',
              borderRadius: 'var(--radius-md)',
              fontSize: 'var(--text-sm)',
              fontWeight: attivo ? 'var(--weight-semibold)' : 'var(--weight-normal)',
              backgroundColor: attivo ? 'var(--bg-surface)' : 'transparent',
              color: attivo ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: attivo ? 'var(--shadow-sm)' : 'none',
              transition: 'background-color var(--transition-fast), color var(--transition-fast)',
            }}
          >
            {opzione.icona}
            {opzione.etichetta}
          </button>
        );
      })}
    </div>
  );
}

/** Elenco verticale di famiglie di caratteri, ognuna mostrata nel proprio font. */
function Elenco({
  opzioni,
  selezionato,
  onSeleziona,
}: {
  opzioni: { valore: string; etichetta: string; anteprima: string }[];
  selezionato: string;
  onSeleziona: (valore: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {opzioni.map((opzione) => {
        const attivo = opzione.valore === selezionato;
        return (
          <button
            key={opzione.valore}
            onClick={() => onSeleziona(opzione.valore)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '9px 12px',
              borderRadius: 'var(--radius-md)',
              border: attivo ? '1px solid var(--accent)' : '1px solid var(--border)',
              backgroundColor: attivo ? 'var(--accent-light)' : 'var(--bg-surface)',
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              fontFamily: opzione.anteprima,
              textAlign: 'left',
              transition: 'border-color var(--transition-fast), background-color var(--transition-fast)',
            }}
          >
            <span>{opzione.etichetta}</span>
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Aa Bb 123</span>
          </button>
        );
      })}
    </div>
  );
}

/** Cursore numerico con valore corrente a destra dell'etichetta. */
function Cursore({
  etichetta,
  valore,
  minimo,
  massimo,
  passo,
  unita,
  onCambia,
}: {
  etichetta: string;
  valore: number;
  minimo: number;
  massimo: number;
  passo: number;
  unita: string;
  onCambia: (valore: number) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{etichetta}</span>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
          {Number.isInteger(valore) ? valore : valore.toFixed(2)}
          {unita}
        </span>
      </div>
      <input
        type="range"
        min={minimo}
        max={massimo}
        step={passo}
        value={valore}
        onChange={(e) => onCambia(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)', cursor: 'pointer' }}
      />
    </div>
  );
}
