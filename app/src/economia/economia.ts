// -----------------------------------------------------------------------------
// Economia di SpotLex: MONETE (partite da solo, ingresso online).
// Va salvato in:  app/src/economia/economia.ts
//
// I PUNTI online restano quelli del sistema esistente (game_settings + matches,
// sommati in user_stats.punti_totali): qui li leggiamo solo per mostrarli.
// Tutti i calcoli delle monete avvengono su Supabase (supabase_monete_punti.sql).
// -----------------------------------------------------------------------------
import { useCallback, useEffect, useState } from 'react';
import type { Modalita } from '@SpotLex/core';
import { supabase } from '../lib/supabase';

export const COSTO_ONLINE = 20;

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

// --- Online: paga le 20 monete d'ingresso (ripetere non fa ripagare). --------
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
