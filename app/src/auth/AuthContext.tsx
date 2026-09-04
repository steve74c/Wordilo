// -----------------------------------------------------------------------------
// Provider dell'autenticazione. Va salvato in:  app/src/auth/AuthContext.tsx
//
// Tiene la "sessione" di Supabase (chi è loggato) e resta in ascolto dei cambi
// (login, logout, rinnovo token). Espone le azioni: registrati, accedi,
// accediConGoogle, esci.
// Nick, nome e cognome passati alla registrazione finiscono nei metadati
// dell'utente: il trigger handle_new_user li legge per creare la riga profiles.
// -----------------------------------------------------------------------------
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { supabase } from '../lib/supabase';

// Necessario per chiudere correttamente la finestra di login su alcune piattaforme.
WebBrowser.maybeCompleteAuthSession();

type RisultatoAuth = { errore: string | null };

type ValoreAuth = {
  sessione: Session | null;
  caricata: boolean; // true quando lo stato iniziale è stato determinato
  registrati: (
    nick: string,
    nome: string,
    cognome: string,
    email: string,
    password: string,
  ) => Promise<RisultatoAuth>;
  accedi: (email: string, password: string) => Promise<RisultatoAuth>;
  accediConGoogle: () => Promise<RisultatoAuth>;
  esci: () => Promise<void>;
};

const AuthContext = createContext<ValoreAuth | null>(null);

// Traduce i messaggi d'errore di Supabase (in inglese) in frasi chiare in italiano.
function traduciErrore(msg: string): string {
  const m = msg.toLowerCase();
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Esiste già un account con questa email.';
  if (m.includes('invalid login credentials')) return 'Email o password non corretti.';
  if (m.includes('password should be at least'))
    return 'La password è troppo corta (almeno 6 caratteri).';
  if (m.includes('invalid email') || m.includes('unable to validate email'))
    return 'Email non valida.';
  // Il fallimento del trigger (nick duplicato o mancante) arriva così:
  if (m.includes('duplicate') || m.includes('database error'))
    return 'Questo nickname è già in uso: scegline un altro.';
  return msg; // fallback: mostra l'originale
}

// Dall'URL di ritorno (dopo Google) ricava la sessione. Gestisce sia il flusso
// "PKCE" (torna un codice da scambiare) sia quello "implicit" (tornano i token).
async function creaSessioneDaUrl(url: string): Promise<RisultatoAuth> {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) return { errore: traduciErrore(errorCode) };

  const { access_token, refresh_token, code } = params as Record<string, string>;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    return { errore: error ? traduciErrore(error.message) : null };
  }
  if (access_token) {
    const { error } = await supabase.auth.setSession({ access_token, refresh_token });
    return { errore: error ? traduciErrore(error.message) : null };
  }
  return { errore: 'Login non completato: risposta inattesa.' };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [sessione, setSessione] = useState<Session | null>(null);
  const [caricata, setCaricata] = useState(false);

  useEffect(() => {
    // 1) Sessione iniziale (se l'utente era già loggato da un avvio precedente).
    supabase.auth.getSession().then(({ data }) => {
      setSessione(data.session);
      setCaricata(true);
    });
    // 2) Ascolto dei cambi: login/logout/refresh aggiornano la UI da soli.
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, s) => {
      setSessione(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const registrati = async (
    nick: string,
    nome: string,
    cognome: string,
    email: string,
    password: string,
  ): Promise<RisultatoAuth> => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        // Questi dati vengono letti dal trigger per creare la riga profiles.
        data: {
          nick: nick.trim(),
          nome: nome.trim(),
          cognome: cognome.trim(),
        },
      },
    });
    return { errore: error ? traduciErrore(error.message) : null };
  };

  const accedi = async (email: string, password: string): Promise<RisultatoAuth> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { errore: error ? traduciErrore(error.message) : null };
  };

  // Login con Google. Due comportamenti a seconda della piattaforma:
  //
  //  • WEB: reindirizza l'INTERA pagina a Google; al ritorno il client Supabase
  //    legge la sessione dall'indirizzo (detectSessionInUrl attivo su web).
  //
  //  • iOS/ANDROID: NON esiste una "pagina", quindi apriamo un browser interno
  //    (openAuthSessionAsync) e, al ritorno, rientriamo nell'app tramite un deep
  //    link (redirectTo = wordilo://auth-callback nel dev build). Poi ricaviamo
  //    la sessione dall'URL. ATTENZIONE: sul telefono funziona solo con un
  //    DEVELOPMENT BUILD (Expo Go non può registrare lo scheme "wordilo").
  const accediConGoogle = async (): Promise<RisultatoAuth> => {
    if (Platform.OS === 'web') {
      const redirectTo =
        typeof window !== 'undefined' && window.location ? window.location.origin : undefined;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo },
      });
      return { errore: error ? traduciErrore(error.message) : null };
    }

    // --- Telefono ---
    const redirectTo = makeRedirectUri({ path: 'auth-callback' });
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) return { errore: traduciErrore(error.message) };
    if (!data?.url) return { errore: 'Impossibile avviare il login con Google.' };

    const res = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (res.type === 'success' && res.url) {
      return await creaSessioneDaUrl(res.url);
    }
    // L'utente ha chiuso/annullato la finestra: nessun errore da mostrare.
    return { errore: null };
  };

  const esci = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{ sessione, caricata, registrati, accedi, accediConGoogle, esci }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): ValoreAuth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve stare dentro <AuthProvider>');
  return ctx;
}
