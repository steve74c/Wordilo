// -----------------------------------------------------------------------------
// Confronta la versione installata con quella richiesta su Supabase.
// Va salvato in:  app/src/aggiornamento/controlloVersione.ts
//
// Regola d'oro: se la rete non risponde, si GIOCA. Un problema di connessione
// non deve mai trasformarsi in un blocco (il server blocca comunque le
// versioni vecchie quando la rete torna).
// -----------------------------------------------------------------------------
import { Linking, Platform } from 'react-native';
import * as Application from 'expo-application';
import { supabase } from '../lib/supabase';
import { PIATTAFORMA, VERSION_CODE } from './versioneApp';

export type EsitoVersione =
  | { stato: 'ok' }
  | { stato: 'consigliato'; urlStore: string | null } // c'è una versione nuova, facoltativa
  | { stato: 'obbligatorio'; urlStore: string | null }; // sotto la minima: non si gioca

const TIMEOUT_MS = 5000;

export async function controllaVersione(): Promise<EsitoVersione> {
  // Web (sempre aggiornato) o versione non leggibile (es. Expo Go): nessun controllo.
  if (PIATTAFORMA === 'web' || VERSION_CODE == null) return { stato: 'ok' };

  try {
    const richiesta = supabase
      .from('app_versions')
      .select('min_version_code, latest_version_code, store_url')
      .eq('platform', PIATTAFORMA)
      .maybeSingle();

    const timeout = new Promise<null>((ok) => setTimeout(() => ok(null), TIMEOUT_MS));
    const risposta = await Promise.race([richiesta, timeout]);

    if (!risposta || risposta.error || !risposta.data) return { stato: 'ok' };

    const { min_version_code, latest_version_code, store_url } = risposta.data;
    const urlStore = store_url ?? urlStoreDiDefault();

    if (VERSION_CODE < min_version_code) return { stato: 'obbligatorio', urlStore };
    if (VERSION_CODE < latest_version_code) return { stato: 'consigliato', urlStore };
    return { stato: 'ok' };
  } catch (e) {
    console.warn('Controllo versione non riuscito, si gioca lo stesso.', e);
    return { stato: 'ok' };
  }
}

function urlStoreDiDefault(): string | null {
  if (PIATTAFORMA === 'android' && Application.applicationId) {
    return `market://details?id=${Application.applicationId}`;
  }
  return null; // iOS: serve store_url nella tabella app_versions
}

/**
 * Avvia l'aggiornamento.
 *  - Android: aggiornamento in-app di Google Play (schermata a tutto schermo).
 *    Se non è disponibile (es. app non installata dallo Store) apre la pagina Play.
 *  - iOS: apre l'App Store.
 */
export async function avviaAggiornamento(
  tipo: 'immediato' | 'flessibile',
  urlStore: string | null,
): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      // require dinamico: il modulo nativo esiste solo su Android (non su web).
      const { default: SpInAppUpdates, IAUUpdateKind } = require('sp-react-native-in-app-updates');
      const inAppUpdates = new SpInAppUpdates(false);
      const verifica = await inAppUpdates.checkNeedsUpdate();
      if (verifica.shouldUpdate) {
        await inAppUpdates.startUpdate({
          updateType: tipo === 'immediato' ? IAUUpdateKind.IMMEDIATE : IAUUpdateKind.FLEXIBLE,
        });
        return;
      }
    } catch (e) {
      console.warn('Aggiornamento in-app non disponibile, apro lo Store.', e);
    }
  }
  if (urlStore) await apriStore(urlStore);
}

async function apriStore(url: string) {
  try {
    await Linking.openURL(url);
  } catch {
    // market:// non gestito (nessun Play Store): ripiega sul sito
    const id = Application.applicationId;
    if (id) await Linking.openURL(`https://play.google.com/store/apps/details?id=${id}`);
  }
}
