import type { LunghezzaParola } from './types';
import { normalizzaParola } from './normalizza';

/**
 * PROVVISORIO — piccola lista di parole di prova per il single player, finché non
 * importiamo il dizionario italiano vero. Tutte reali, senza accenti, 5 o 6 lettere.
 * Quando arriverà il dizionario, questa sparisce e il target verrà pescato di lì.
 */
export const PAROLE_DEV: Record<LunghezzaParola, string[]> = {
  5: ['CANTO', 'PALLA', 'SEDIA', 'FIUME', 'LIBRO', 'MONTE', 'PORTA', 'VERDE', 'SUONO', 'NOTTE'],
  6: ['GELATO', 'FINALE', 'MONETA', 'SIRENA', 'TAVOLO', 'DOMANI', 'CAMBIO', 'MARINO', 'CAMINO', 'DENARO'],
};

/** Pesca a caso una parola (già normalizzata) della lunghezza richiesta. */
export function pescaParolaCasuale(lunghezza: LunghezzaParola): string {
  const lista = PAROLE_DEV[lunghezza];
  return normalizzaParola(lista[Math.floor(Math.random() * lista.length)]);
}
