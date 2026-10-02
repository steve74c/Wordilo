// -----------------------------------------------------------------------------
// Versione dell'app installata + segnale "il server ha rifiutato la versione".
// Va salvato in:  app/src/aggiornamento/versioneApp.ts
//
// Il numero che conta è il versionCode (Android) / build number (iOS): un
// intero che EAS aumenta da solo a ogni build di produzione (autoIncrement in
// eas.json). NON è la "1.0.0" che vede l'utente.
// -----------------------------------------------------------------------------
import { Platform } from 'react-native';
import * as Application from 'expo-application';

export type PiattaformaApp = 'android' | 'ios' | 'web';

export const PIATTAFORMA: PiattaformaApp =
  Platform.OS === 'android' ? 'android' : Platform.OS === 'ios' ? 'ios' : 'web';

/** versionCode installato, o null sul web / se non leggibile. */
export const VERSION_CODE: number | null = (() => {
  if (PIATTAFORMA === 'web') return null;
  const n = Number.parseInt(Application.nativeBuildVersion ?? '', 10);
  return Number.isFinite(n) ? n : null;
})();

/** Header da mandare a Supabase su ogni richiesta (letti da is_client_version_allowed). */
export const HEADER_VERSIONE: Record<string, string> = {
  'x-app-platform': PIATTAFORMA,
  'x-app-version': VERSION_CODE != null ? String(VERSION_CODE) : '',
};

// -- Segnale dal server -------------------------------------------------------
// Quando una RPC risponde APP_VERSION_TOO_OLD, avvisiamo PortaAggiornamento,
// che ricontrolla e mostra la schermata di aggiornamento. Modulo senza import
// da supabase.ts, così non ci sono import circolari.
type Ascoltatore = () => void;
const ascoltatori = new Set<Ascoltatore>();

export function suVersioneRifiutata(fn: Ascoltatore): () => void {
  ascoltatori.add(fn);
  return () => {
    ascoltatori.delete(fn);
  };
}

export function segnalaVersioneRifiutata() {
  ascoltatori.forEach((fn) => fn());
}
