// -----------------------------------------------------------------------------
// Economia di SpotLex: MONETE (partite da solo, ingresso online).
// Va salvato in:  app/src/economia/economia.ts
//
// I PUNTI online restano quelli del sistema esistente (game_settings + matches,
// sommati in user_stats.punti_totali): qui li leggiamo solo per mostrarli.
// Tutti i calcoli delle monete avvengono su Supabase (supabase_economia_v2.sql):
// le costanti qui sotto sono solo una COPIA per la tabella del menu e per il
// costo mostrato sui pulsanti. Se cambi i valori sul server, aggiornale qui.
// I punti della classifica, invece, li legge SchermataGiocoOnline da
// game_settings e usa PUNTI_ONLINE solo come ripiego.
// -----------------------------------------------------------------------------
import { useCallback, useEffect, useState } from 'react';
import type { Modalita } from '@SpotLex/core';
import { supabase } from '../lib/supabase';

// --- Valori dell'economia (copia del server) ---------------------------------
// Ingresso a ogni sfida online (funzione paga_ingresso_online).
export const COSTO_ONLINE = 200;

// Partita da solo vinta al tentativo 1..6 (funzione registra_partita_solo).
export const MONETE_VITTORIA: Record<Modalita, number[]> = {
  principiante: [2000, 700, 500, 300, 100, 0],
  esperto: [3000, 1500, 1000, 600, 200, 0],
};

// Partita da solo non indovinata (funzione registra_partita_solo).
export const MONETE_SCONFITTA: Record<Modalita, number> = {
  principiante: -200,
  esperto: -400,
};

// Sfida online: monete a fine partita, in aggiunta all'ingresso
// (trigger monete_esito_online sulla tabella matches).
export const MONETE_SFIDA = { vinta: 250, persa: -250, pareggio: 100 } as const;

// Sfida online: punti in classifica (game_settings.points_win/lose/draw).
export const PUNTI_ONLINE = { vinta: 10, persa: -10, pareggio: 0 } as const;

type Esito<T> = { ok: true; valore: T } | { ok: false; errore: string };

// Estrae il codice d'errore lanciato dalla funzione SQL (es. 'MONETE_INSUFFICIENTI').
function codiceErrore(msg: string | undefined): string {
  const noti = [
    'MONETE_INSUFFICIENTI',
    'TROPPO_VELOCE',
    'NON_AUTENTICATO',
    'NON_PARTECIPANTE',
    'TENTATIVI_NON_VALIDI',
    'MODALITA_NON_VALIDA',
  ];
  return noti.find((c) => msg?.includes(c)) ?? 'ERRORE_RETE';
}

// --- Partita da solo: chiamala UNA volta a fine partita (vinta o persa). ------
export async function registraPartitaSolo(
  modalita: Modalita,
  vinta: boolean,
  tentativi: number,
): Promise<Esito<{ premio: number; saldo: number }>> {
  const { data, error } = await supabase.rpc('registra_partita_solo', {
    p_modalita: modalita,
    p_vinta: vinta,
    p_tentativi: tentativi,
  });
  if (error) return { ok: false, errore: codiceErrore(error.message) };
  return { ok: true, valore: data as { premio: number; saldo: number } };
}

// --- Online: paga le monete d'ingresso (ripetere non fa ripagare). -----------
export async function pagaIngressoOnline(matchId: string): Promise<Esito<number>> {
  const { data, error } = await supabase.rpc('paga_ingresso_online', { p_match_id: matchId });
  if (error) return { ok: false, errore: codiceErrore(error.message) };
  return { ok: true, valore: data as number };
}

// --- Hook: monete (profiles) + punti online (user_stats) del giocatore. ------
export function useSaldo() {
  const [monete, setMonete] = useState<number | null>(null);
  const [punti, setPunti] = useState<number | null>(null);

  const aggiorna = useCallback(async () => {
    const { data: u } = await supabase.auth.getUser();
    const id = u?.user?.id;
    if (!id) return;

    const [prof, stats] = await Promise.all([
      supabase.from('profiles').select('monete').eq('id', id).single(),
      supabase.from('user_stats').select('punti_totali').eq('user_id', id).maybeSingle(),
    ]);
    if (!prof.error && prof.data) setMonete(prof.data.monete as number);
    // Chi non ha ancora giocato online può non avere una riga in user_stats → 0.
    if (!stats.error) setPunti((stats.data?.punti_totali as number | undefined) ?? 0);
  }, []);

  useEffect(() => {
    aggiorna();
  }, [aggiorna]);

  return { monete, punti, aggiorna };
}
