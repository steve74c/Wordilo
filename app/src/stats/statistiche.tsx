import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import type { LunghezzaParola, Modalita } from '@wordilo/core';
import { supabase } from '../lib/supabase';
import { useAuth } from '../auth/AuthContext';

// -----------------------------------------------------------------------------
// Statistiche PER-UTENTE dal database (spec §8).
//
// - I conteggi (giocate/vinte/perse) arrivano dalla vista `user_stats`, che
//   aggrega la tabella `games` rispettando la RLS: ogni utente vede solo i suoi.
// - A fine partita `registra(...)` scrive una riga in `games` e aggiorna i
//   conteggi. Essendo su Supabase, le statistiche seguono l'utente su qualsiasi
//   dispositivo (non più per-dispositivo come la versione provvisoria).
// -----------------------------------------------------------------------------

// Riepilogo di una partita conclusa, prodotto da useGioco e salvato qui.
export type FinePartita = {
  esito: 'won' | 'lost';
  modalita: Modalita;
  lunghezza: LunghezzaParola;
  tentativiUsati: number;
};

export interface Statistiche {
  giocate: number;
  vinte: number;
  perse: number;
}

interface ContestoStatistiche extends Statistiche {
  registra: (fine: FinePartita) => Promise<void>;
  ricarica: () => Promise<void>;
  caricate: boolean; // true quando i conteggi sono stati letti dal DB
}

const INIZIALE: Statistiche = { giocate: 0, vinte: 0, perse: 0 };

const StatisticheContext = createContext<ContestoStatistiche | null>(null);

export function StatisticheProvider({ children }: { children: React.ReactNode }) {
  const { sessione } = useAuth();
  const userId = sessione?.user?.id ?? null;

  const [stat, setStat] = useState<Statistiche>(INIZIALE);
  const [caricate, setCaricate] = useState(false);

  // Legge i conteggi dalla vista. Senza utente, azzera e basta.
  const ricarica = useCallback(async () => {
    if (!userId) {
      setStat(INIZIALE);
      setCaricate(false);
      return;
    }
    const { data, error } = await supabase
      .from('user_stats')
      .select('giocate, vinte, perse')
      .maybeSingle(); // 0 o 1 riga (grazie alla RLS della vista)

    if (error) {
      console.warn('Statistiche non caricate dal DB:', error.message);
      return;
    }
    setStat(
      data
        ? { giocate: data.giocate, vinte: data.vinte, perse: data.perse }
        : INIZIALE, // nessuna partita ancora
    );
    setCaricate(true);
  }, [userId]);

  // Ricarica quando cambia l'utente (login/logout).
  useEffect(() => {
    ricarica();
  }, [ricarica]);

  // Scrive la partita finita in `games`, poi aggiorna i conteggi mostrati.
  const registra = useCallback(
    async (fine: FinePartita) => {
      if (!userId) return;
      const { error } = await supabase.from('games').insert({
        user_id: userId,
        mode: fine.modalita,
        word_length: fine.lunghezza,
        result: fine.esito,
        attempts_used: fine.tentativiUsati,
        points: 0, // single player: nessun punteggio (serve all'online)
      });
      if (error) {
        console.warn('Partita non salvata:', error.message);
        return;
      }
      // Aggiornamento ottimistico immediato (il dato vero resta comunque in DB).
      setStat((s) => ({
        giocate: s.giocate + 1,
        vinte: s.vinte + (fine.esito === 'won' ? 1 : 0),
        perse: s.perse + (fine.esito === 'lost' ? 1 : 0),
      }));
    },
    [userId],
  );

  const value = useMemo(
    () => ({ ...stat, registra, ricarica, caricate }),
    [stat, registra, ricarica, caricate],
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
