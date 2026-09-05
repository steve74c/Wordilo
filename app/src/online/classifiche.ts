// -----------------------------------------------------------------------------
// Lettura delle classifiche online (C6).
// Va salvato in:  app/src/online/classifiche.ts
//
// Per ora solo la classifica A PUNTI (vista leaderboard_points). La vista è
// pubblica: espone nick/avatar (già pubblici) e conteggi online aggregati,
// mai le partite altrui riga per riga.
// -----------------------------------------------------------------------------
import { supabase } from '../lib/supabase';

// Una riga della classifica a punti, pronta per la UI.
export type VoceClassificaPunti = {
  userId: string;
  nick: string;
  avatarUrl: string | null;
  partiteOnline: number;
  vinte: number;
  perse: number;
  pareggiate: number;
  puntiTotali: number;
};

export type RisultatoClassifica =
  | { ok: true; voci: VoceClassificaPunti[] }
  | { ok: false; errore: string };

/**
 * Legge la classifica a punti dal database (dalla vista leaderboard_points).
 * Ordina dai più punti ai meno; a pari punti, prima chi ha più vittorie.
 */
export async function leggiClassificaPunti(limite = 50): Promise<RisultatoClassifica> {
  const { data, error } = await supabase
    .from('leaderboard_points')
    .select('user_id, nick, avatar_url, partite_online, vinte, perse, pareggiate, punti_totali')
    .order('punti_totali', { ascending: false })
    .order('vinte', { ascending: false })
    .limit(limite);

  if (error) {
    return { ok: false, errore: error.message };
  }

  const voci: VoceClassificaPunti[] = (data ?? []).map((r) => ({
    userId: r.user_id,
    nick: r.nick,
    avatarUrl: r.avatar_url ?? null,
    partiteOnline: r.partite_online,
    vinte: r.vinte,
    perse: r.perse,
    pareggiate: r.pareggiate,
    puntiTotali: r.punti_totali,
  }));

  return { ok: true, voci };
}