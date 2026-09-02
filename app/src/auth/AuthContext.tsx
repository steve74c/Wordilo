// -----------------------------------------------------------------------------
// Provider dell'autenticazione. Va salvato in:  app/src/auth/AuthContext.tsx
//
// Tiene la "sessione" di Supabase (chi è loggato) e resta in ascolto dei cambi
// (login, logout, rinnovo token). Espone tre azioni: registrati, accedi, esci.
// Il nickname passato alla registrazione finisce nei metadati dell'utente: il
// trigger creato al passo 5a lo legge per creare in automatico la riga profiles.
// -----------------------------------------------------------------------------
import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type RisultatoAuth = { errore: string | null };

type ValoreAuth = {
  sessione: Session | null;
  caricata: boolean; // true quando lo stato iniziale è stato determinato
  registrati: (nick: string, email: string, password: string) => Promise<RisultatoAuth>;
  accedi: (email: string, password: string) => Promise<RisultatoAuth>;
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
    email: string,
    password: string,
  ): Promise<RisultatoAuth> => {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { nick: nick.trim() } }, // letto dal trigger per creare il profilo
    });
    return { errore: error ? traduciErrore(error.message) : null };
  };

  const accedi = async (email: string, password: string): Promise<RisultatoAuth> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    return { errore: error ? traduciErrore(error.message) : null };
  };

  const esci = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ sessione, caricata, registrati, accedi, esci }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): ValoreAuth {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve stare dentro <AuthProvider>');
  return ctx;
}
