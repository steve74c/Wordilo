// -----------------------------------------------------------------------------
// Catalogo dei testi in INGLESE.
// Va salvato in:  app/src/i18n/fr.ts
//
// Per ora è VUOTO di proposito: ogni chiave mancante ripiega automaticamente
// sull'italiano (vedi `t()` in LinguaUIContext). Quindi finché non lo riempi,
// scegliere "Franch" salva la preferenza ma i testi restano in italiano — niente
// si rompe.
//
// Per tradurre: togli il commento a una riga e scrivi la versione inglese, usando
// la STESSA chiave che vedi in it.ts. `Partial` permette di procedere poco per
// volta; TypeScript segnala se sbagli il nome di una chiave.
// -----------------------------------------------------------------------------
import type { ChiaveTesto } from './it';

export const fr: Partial<Record<ChiaveTesto, string>> = {
  // esci: 'Log out',
  // gioca: '▶  Play',
  // lunghezzaParola: 'Word length',
  // nLettere: '{n} letters',
  // impostaPartita: 'SET UP THE GAME',
};