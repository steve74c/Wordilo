import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

// -----------------------------------------------------------------------------
// Statistiche di sessione (single player): partite giocate / vinte / perse.
//
// Stato tenuto SOPRA le schermate (Provider), così sopravvive quando passi dal
// gioco al menu e viceversa. Oggi è in memoria (si azzera alla chiusura dell'app);
// domani basterà cambiare QUI il caricamento/salvataggio (AsyncStorage o le
// viste `user_stats` di Supabase, spec §8) senza toccare menu e gioco.
//
// Persistenza locale (opzionale) — quando vuoi che sopravviva ai riavvii:
//   1) npx expo install @react-native-async-storage/async-storage
//   2) all'avvio: AsyncStorage.getItem('wordilo:stat') → setStat(...)
//   3) dentro `registra`/`azzera`: AsyncStorage.setItem('wordilo:stat', ...)
// -----------------------------------------------------------------------------

export type EsitoPartita = 'won' | 'lost';

export interface Statistiche {
  giocate: number;
  vinte: number;
  perse: number;
}

interface ContestoStatistiche extends Statistiche {
  registra: (esito: EsitoPartita) => void;
  azzera: () => void;
}

const INIZIALE: Statistiche = { giocate: 0, vinte: 0, perse: 0 };

const StatisticheContext = createContext<ContestoStatistiche | null>(null);

export function StatisticheProvider({ children }: { children: React.ReactNode }) {
  const [stat, setStat] = useState<Statistiche>(INIZIALE);

  // Registra l'esito di UNA partita conclusa. (Le partite abbandonate a metà
  // non arrivano qui: contano solo quelle finite in 'won' o 'lost'.)
  const registra = useCallback((esito: EsitoPartita) => {
    setStat((s) => ({
      giocate: s.giocate + 1,
      vinte: s.vinte + (esito === 'won' ? 1 : 0),
      perse: s.perse + (esito === 'lost' ? 1 : 0),
    }));
  }, []);

  const azzera = useCallback(() => setStat(INIZIALE), []);

  const value = useMemo(
    () => ({ ...stat, registra, azzera }),
    [stat, registra, azzera],
  );

  return <StatisticheContext.Provider value={value}>{children}</StatisticheContext.Provider>;
}

export function useStatistiche(): ContestoStatistiche {
  const ctx = useContext(StatisticheContext);
  if (!ctx) {
    throw new Error('useStatistiche deve essere usato dentro <StatisticheProvider>.');
  }
  return ctx;
}
