import type { LunghezzaParola } from './types';
import { SOLUZIONI_IT, VALIDE_IT } from './dizionarioDati.it';
import { SOLUZIONI_EN, VALIDE_EN } from './dizionarioDati.en';

// ============================================================================
// Indice dei dizionari, INDICIZZATO PER LINGUA.
// I dati veri stanno nei file per lingua (dizionarioDati.it.ts / .en.ts): qui
// li si mette insieme. Per AGGIUNGERE una lingua: crea il suo file dati e
// aggiungi una riga a `Lingua`, `SOLUZIONI` e `VALIDE` qui sotto.
// ============================================================================

/** Lingue supportate dal dizionario (deve combaciare con le lingue dell'app). */
export type Lingua = 'it' | 'en';

/** Parole-bersaglio: SOLUZIONI[lingua][lunghezza]. */
export const SOLUZIONI: Record<Lingua, Record<LunghezzaParola, string[]>> = {
  it: SOLUZIONI_IT,
  en: SOLUZIONI_EN,
};

/** Parole valide (tentativi): VALIDE[lingua][lunghezza]. */
export const VALIDE: Record<Lingua, Record<LunghezzaParola, Set<string>>> = {
  it: VALIDE_IT,
  en: VALIDE_EN,
};
