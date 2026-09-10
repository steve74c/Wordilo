// -----------------------------------------------------------------------------
// Lettura delle classifiche online (C6).
// Va salvato in:  app/src/online/classifiche.ts
//
// Due classifiche, entrambe da viste PUBBLICHE (nick/avatar già pubblici +
// conteggi online aggregati, mai le partite altrui riga per riga):
//   • A PUNTI    → vista leaderboard_points  (leggiClassificaPunti)
//   • A BRAVURA  → vista leaderboard_skill    (leggiClassificaBravura)
//
// La vista bravura include solo chi ha superato una SOGLIA minima di partite
// (definita lato DB in app_config), così il win_rate non è falsato da chi ha
// giocato una partita sola.
// -----------------------------------------------------------------------------
import { supabase } from '../lib/supabase';

// --- Classifica A PUNTI --------------------------------------------------------

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

// --- Classifica A BRAVURA ------------------------------------------------------

// Una riga della classifica a bravura, pronta per la UI.
// `winRate` è preso COSÌ COM'È dalla vista: potrebbe essere una frazione (0..1)
// o già una percentuale (0..100). La schermata normalizza in fase di visualizzazione
// (se ≤ 1 → ×100), così funziona in entrambi i casi.
export type VoceClassificaBravura = {
  userId: string;
  nick: string;
  avatarUrl: string | null;
  partiteOnline: number;
  vinte: number;
  winRate: number;
};

export type RisultatoClassificaBravura =
  | { ok: true; voci: VoceClassificaBravura[] }
  | { ok: false; errore: string };

/**
 * Legge la classifica a bravura dal database (dalla vista leaderboard_skill).
 * Ordina dal win_rate più alto al più basso; a pari win_rate, prima chi ha più
 * vittorie. La vista include solo chi ha superato la soglia minima di partite.
 */
export async function leggiClassificaBravura(limite = 50): Promise<RisultatoClassificaBravura> {
  const { data, error } = await supabase
    .from('leaderboard_skill')
    .select('user_id, nick, avatar_url, partite_online, vinte, win_rate')
    .order('win_rate', { ascending: false })
    .order('vinte', { ascending: false })
    .limit(limite);

  if (error) {
    return { ok: false, errore: error.message };
  }

  const voci: VoceClassificaBravura[] = (data ?? []).map((r) => ({
    userId: r.user_id,
    nick: r.nick,
    avatarUrl: r.avatar_url ?? null,
    partiteOnline: r.partite_online,
    vinte: r.vinte,
    winRate: Number(r.win_rate) || 0, // numeric dal DB può arrivare come stringa → normalizzo a number
  }));

  return { ok: true, voci };
}
