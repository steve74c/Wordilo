import { C, GRAD, FONT } from '../theme';

// -----------------------------------------------------------------------------
// Forma di un "Tema". Ogni tema ha gli STESSI campi (stesse chiavi), ma può
// avere valori diversi: è questo che permette di crearne più d'uno e sceglierli.
//
// Le chiavi di palette/gradienti/font sono derivate da quelle attuali del
// `theme.ts` (`keyof typeof ...`), così un nuovo tema è OBBLIGATO a fornire
// esattamente gli stessi campi: niente colori dimenticati.
// -----------------------------------------------------------------------------

/** Colori: stesse chiavi dell'attuale `C`, valori liberi (string). */
export type Palette = Record<keyof typeof C, string>;

/** Un gradiente = almeno due colori (come li vuole LinearGradient). */
export type Gradiente = readonly [string, string, ...string[]];

/** Gradienti: stesse chiavi dell'attuale `GRAD`. */
export type Gradienti = Record<keyof typeof GRAD, Gradiente>;

/** Font: stesse chiavi dell'attuale `FONT`. */
export type FontSet = Record<keyof typeof FONT, string>;

/**
 * Misure condivise (spaziature, raggi, forme). Per ora c'è solo il raggio di
 * base; crescerà man mano che migriamo i componenti e portiamo qui i loro
 * "numeri magici" (raggi delle celle/tasti, gap, padding, ecc.).
 */
export type Misure = {
  raggio: number; // raggio di base (era la costante RAGGIO)
};

/** Un tema completo. */
export type Tema = {
  nome: string;
  palette: Palette;
  gradienti: Gradienti;
  font: FontSet;
  misure: Misure;
};
