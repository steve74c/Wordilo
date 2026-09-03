import type { LunghezzaParola } from './types';
import { normalizzaParola } from './normalizza';
import { SOLUZIONI } from './dizionarioDati';

/**
 * Sorgente delle parole-BERSAGLIO per il single player.
 *
 * Storicamente questo file conteneva una listina di prova; ora il target viene
 * pescato dal DIZIONARIO ITALIANO VERO (generato in `dizionarioDati.ts` a partire
 * dai dati della tabella `words` su Supabase). Manteniamo qui `pescaParolaCasuale`
 * con la stessa identica firma di prima, così nulla a valle cambia (index, useGioco).
 *
 * Offline-first: il dizionario è dentro l'app, quindi la scelta della parola è
 * istantanea e funziona anche senza rete.
 */

// Alias di compatibilità: prima erano le parole di prova, ora sono i bersagli veri.
// (Serve solo a non rompere chi eventualmente importava `PAROLE_DEV`.)
export const PAROLE_DEV: Record<LunghezzaParola, string[]> = SOLUZIONI;

/** Pesca a caso una parola-bersaglio (già normalizzata) della lunghezza richiesta. */
export function pescaParolaCasuale(lunghezza: LunghezzaParola): string {
  const lista = SOLUZIONI[lunghezza];
  return normalizzaParola(lista[Math.floor(Math.random() * lista.length)]);
}
