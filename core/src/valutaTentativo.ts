import type { Colore } from './types';

/**
 * Valuta un tentativo confrontandolo con la parola target e restituisce, per ogni
 * lettera, il colore:
 *   - 'green'  → lettera giusta al posto giusto
 *   - 'orange' → lettera presente nella parola ma in posizione sbagliata
 *   - 'grey'   → lettera non presente (o già "esaurita" da match migliori)
 *
 * Le due parole devono avere la STESSA lunghezza e arrivare già normalizzate
 * (stesso maiuscolo/minuscolo, eventuali accenti già gestiti a monte).
 * La normalizzazione sta apposta in una funzione separata: `normalizzaParola`.
 *
 * --- Gestione dei duplicati (regola di Wordle) ---
 * I verdi "consumano" per primi le occorrenze della lettera nel target; un
 * arancione si assegna solo se restano occorrenze non ancora abbinate. Quindi, se
 * scrivo due volte una lettera che nel target compare una sola volta (e una delle
 * due è verde), l'altra risulta GRIGIA, non arancione.
 */
export function valutaTentativo(guess: string, target: string): Colore[] {
  if (guess.length !== target.length) {
    throw new Error(
      `valutaTentativo: lunghezze diverse (guess=${guess.length}, target=${target.length}).`,
    );
  }

  const n = guess.length;
  const risultato: Colore[] = new Array<Colore>(n).fill('grey');

  // Quante volte ogni lettera del target è ancora "disponibile" per un arancione.
  // Ci mettiamo SOLO le lettere del target che NON sono già state prese da un verde:
  // così i verdi non vengono mai "contati due volte".
  const disponibili = new Map<string, number>();

  // --- 1° passaggio: assegna i verdi ---
  for (let i = 0; i < n; i++) {
    if (guess[i] === target[i]) {
      risultato[i] = 'green';
    } else {
      const lettera = target[i];
      disponibili.set(lettera, (disponibili.get(lettera) ?? 0) + 1);
    }
  }

  // --- 2° passaggio: assegna gli arancioni (i restanti rimangono grigi) ---
  for (let i = 0; i < n; i++) {
    if (risultato[i] === 'green') continue;

    const lettera = guess[i];
    const restanti = disponibili.get(lettera) ?? 0;
    if (restanti > 0) {
      risultato[i] = 'orange';
      disponibili.set(lettera, restanti - 1);
    }
    // se restanti === 0 la lettera resta 'grey'
  }

  return risultato;
}
