import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  type PreferenzeAspetto,
  ASPETTO_PREDEFINITO,
  leggiAspetto,
  salvaAspetto,
  applicaAspetto,
} from '../lib/aspetto';

interface AspettoContextType {
  aspetto: PreferenzeAspetto;
  /** Aggiorna una o più preferenze: applica, salva e ridisegna in un colpo solo. */
  aggiornaAspetto: (modifiche: Partial<PreferenzeAspetto>) => void;
  /** Riporta tutto all'aspetto originale di NutNote. */
  ripristinaAspetto: () => void;
}

const AspettoContext = createContext<AspettoContextType | undefined>(undefined);

/**
 * Rende disponibili le preferenze di aspetto a tutta l'app.
 *
 * Il valore iniziale si legge una sola volta all'avvio: lo script in index.html
 * ha già applicato tema e corpo del testo, qui si completa il resto dei token.
 */
export function AspettoProvider({ children }: { children: React.ReactNode }) {
  const [aspetto, setAspetto] = useState<PreferenzeAspetto>(() => leggiAspetto());

  // Prima applicazione completa al montaggio, e a ogni cambio successivo.
  useEffect(() => {
    applicaAspetto(aspetto);
  }, [aspetto]);

  // Con il tema 'auto' l'app deve seguire il sistema anche mentre è aperta.
  useEffect(() => {
    if (aspetto.tema !== 'auto') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const alCambioTema = () => applicaAspetto(aspetto);
    query.addEventListener('change', alCambioTema);
    return () => query.removeEventListener('change', alCambioTema);
  }, [aspetto]);

  const aggiornaAspetto = useCallback((modifiche: Partial<PreferenzeAspetto>) => {
    setAspetto((precedente) => {
      const aggiornato = { ...precedente, ...modifiche };
      salvaAspetto(aggiornato);
      return aggiornato;
    });
  }, []);

  const ripristinaAspetto = useCallback(() => {
    const iniziale = { ...ASPETTO_PREDEFINITO };
    salvaAspetto(iniziale);
    setAspetto(iniziale);
  }, []);

  return (
    <AspettoContext.Provider value={{ aspetto, aggiornaAspetto, ripristinaAspetto }}>
      {children}
    </AspettoContext.Provider>
  );
}

export function useAspetto() {
  const contesto = useContext(AspettoContext);
  if (contesto === undefined) {
    throw new Error('useAspetto deve essere usato dentro AspettoProvider');
  }
  return contesto;
}
