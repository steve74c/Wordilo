/**
 * Porta una parola nella forma "canonica" con cui la confrontiamo:
 *   - trim degli spazi ai bordi
 *   - rimozione degli accenti (gioco ACCENT-INSENSITIVE, decisione presa)
 *   - tutto MAIUSCOLO
 *
 * Esempi: 'perché' → 'PERCHE', '  città ' → 'CITTA'.
 * La rimozione accenti usa la scomposizione Unicode NFD (lettera + segno
 * diacritico separati) e poi toglie i segni diacritici.
 */
export function normalizzaParola(parola: string): string {
  return parola
    .trim()
    .normalize('NFD')                 // es. 'é' → 'e' + accento acuto
    .replace(/\p{Diacritic}/gu, '')   // rimuove i segni diacritici
    .toUpperCase();
}
