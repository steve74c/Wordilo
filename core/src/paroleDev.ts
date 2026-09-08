import type { LunghezzaParola } from './types';
import type { Lingua } from './dizionarioDati';
import { normalizzaParola } from './normalizza';
import { SOLUZIONI } from './dizionarioDati';

/**
 * Sorgente delle parole-BERSAGLIO per il single player, PER LINGUA.
 *
 * Il target viene pescato da `SOLUZIONI[lingua][lunghezza]` (le parole con
 * is_solution = true nella tabella `words`). Offline-first: l'elenco e dentro
 * l'app, quindi la scelta e istantanea e funziona senza rete.
 */

// Alias di compatibilita (shape storica Record<lunghezza, string[]>): punta
// all'italiano. Serve solo a non rompere eventuali import di `PAROLE_DEV`.
export const PAROLE_DEV: Record<LunghezzaParola, string[]> = SOLUZIONI.it;

/** Pesca a caso una parola-bersaglio (gia normalizzata) della lingua+lunghezza richieste. */
export function pescaParolaCasuale(lingua: Lingua, lunghezza: LunghezzaParola): string {
  const lista = SOLUZIONI[lingua][lunghezza];
  return normalizzaParola(lista[Math.floor(Math.random() * lista.length)]);
}
