// -----------------------------------------------------------------------------
// Client Supabase — punto UNICO da cui tutta l'app parla col database.
// Va salvato in:  app/src/lib/supabase.ts
//
// Le chiavi arrivano dal file app/.env (variabili EXPO_PUBLIC_*), quindi non
// stanno nel codice né in Git. La chiave "anon" è pubblica per progetto: da sola
// non dà accesso a nulla, perché i dati sono protetti dalle regole RLS create
// nel passo 2.
// -----------------------------------------------------------------------------
import 'react-native-url-polyfill/auto'; // richiesto da supabase-js su React Native
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Ripuliamo i valori del .env da spazi/a-capo copiati per sbaglio e da eventuali
// slash finali: sono la causa più comune dell'errore "Invalid path in request URL".
const url = process.env.EXPO_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, '');
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY?.trim();

// Messaggio chiaro se il .env non è configurato, invece di un errore oscuro.
if (!url || !anonKey) {
  throw new Error(
    'Config Supabase mancante: crea il file app/.env con EXPO_PUBLIC_SUPABASE_URL e ' +
      'EXPO_PUBLIC_SUPABASE_ANON_KEY, poi riavvia Expo.',
  );
}

// L'URL deve essere del tipo https://<progetto>.supabase.co, SENZA percorso dopo.
if (!/^https:\/\/[a-z0-9-]+\.supabase\.(co|in)$/i.test(url)) {
  throw new Error(
    `EXPO_PUBLIC_SUPABASE_URL ha un formato inatteso: "${url}". ` +
      'Deve essere solo "https://IL-TUO-PROGETTO.supabase.co" (niente slash finale, ' +
      'niente "/rest/v1"). Correggi il .env e riavvia Expo.',
  );
}

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: AsyncStorage,        // ricorda la sessione tra un avvio e l'altro
    autoRefreshToken: true,       // rinnova il token da solo
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web', // servirà per il login OAuth su web
  },
});
