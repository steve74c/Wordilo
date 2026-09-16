import type { LunghezzaParola } from './types';
import type { Lingua } from './dizionarioDati';
import { normalizzaParola } from './normalizza';
import { VALIDE } from './dizionarioDati';

/**
 * Validazione della parola inserita, PER LINGUA.
 *
 * `parolaValida` controlla che la parola digitata esista nel dizionario della
 * lingua scelta (l'insieme `VALIDE[lingua][lunghezza]`). E accent-insensitive:
 * normalizza l'input prima del confronto. Funziona offline (elenco nell'app).
 *
 * Si aggancia al motore puro tramite `confermaTentativo(stato, isValida)`:
 * basta passargli `(p) => parolaValida(p, lingua, stato.lunghezza)`.
 */
export function parolaValida(parola: string, lingua: Lingua, lunghezza: LunghezzaParola): boolean {
  return VALIDE[lingua][lunghezza].has(normalizzaParola(parola));
}

/**
 * @deprecated Stub storico: ritorna sempre `true`. Sostituito da `parolaValida`.
 */
export function isValidWordStub(_parola: string): boolean {
  return true;
}
