import type { LunghezzaParola } from './types';
import { normalizzaParola } from './normalizza';
import { VALIDE } from './dizionarioDati';

/**
 * Validazione della parola inserita.
 *
 * `parolaValida` controlla che la parola digitata esista davvero nel dizionario
 * italiano (l'insieme `VALIDE` in `dizionarioDati.ts`, generato dai dati della
 * tabella `words` su Supabase). È accent-insensitive: normalizza l'input prima
 * del confronto, così "PERCHÉ" e "PERCHE" sono la stessa parola. Funziona anche
 * offline, perché l'elenco è dentro l'app.
 *
 * Si aggancia al motore puro tramite `confermaTentativo(stato, isValida)`:
 * basta passargli `(p) => parolaValida(p, stato.lunghezza)`.
 */
export function parolaValida(parola: string, lunghezza: LunghezzaParola): boolean {
  return VALIDE[lunghezza].has(normalizzaParola(parola));
}

/**
 * @deprecated Stub storico usato quando la validazione era disattivata: ritorna
 * sempre `true`. Sostituito da `parolaValida`. Lo teniamo solo per non rompere
 * eventuali import esistenti; può essere rimosso in futuro.
 */
export function isValidWordStub(_parola: string): boolean {
  return true;
}