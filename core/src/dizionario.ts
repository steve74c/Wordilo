/**
 * Validazione della parola inserita.
 *
 * Decisione presa: in questa fase la validazione è DISATTIVATA (lo stub ritorna
 * sempre `true`), così si possono provare le schermate senza un dizionario vero.
 * L'aggancio è già pronto: `confermaTentativo(stato, isValida)` accetta un
 * predicato, e quando importeremo il dizionario italiano basterà passargli la
 * funzione di lookup reale (nessun'altra modifica).
 */
export function isValidWordStub(_parola: string): boolean {
  return true;
}
