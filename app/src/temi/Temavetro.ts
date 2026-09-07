import { C, GRAD, FONT, RAGGIO } from '../theme';
import type { Tema } from './tipi';

// -----------------------------------------------------------------------------
// Tema "vetro" = lo stile ATTUALE dell'app, impacchettato come oggetto `Tema`.
// Riusa direttamente i valori del `theme.ts` (non li ricopia), quindi è identico
// a prima: montarlo non cambia nulla a vista.
//
// Quando aggiungeremo altri temi (es. "flat", "chiaro"), saranno altri file
// come questo, con gli stessi campi ma valori diversi.
// -----------------------------------------------------------------------------

export const temaVetro: Tema = {
  nome: 'vetro',
  palette: C,
  gradienti: GRAD,
  font: FONT,
  misure: {
    raggio: RAGGIO,
  },
};
