import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabase';
import { scegliEcaricaAvatar } from './avatarStorage';

// -----------------------------------------------------------------------------
// Provider del profilo. Va salvato in:  app/src/profilo/ProfiloContext.tsx
//
// Tiene i dati del profilo dell'utente loggato (nick, nome, cognome, avatar_url,
// letti dalla tabella profiles) e offre cambiaAvatar(): apre il selettore foto,
// carica su Storage, aggiorna il profilo e il valore in memoria. Come per gli
// altri provider (config/auth/statistiche), deve stare DENTRO <AuthProvider>
// perché usa useAuth() per sapere chi è loggato.
// -----------------------------------------------------------------------------

type ValoreProfilo = {
  nick: string | null;
  avatarUrl: string | null;
  nome: string | null;
  cognome: string | null;
  caricando: boolean; // true mentre si sceglie/carica la foto
  cambiaAvatar: () => Promise<void>;
};

const ProfiloContext = createContext<ValoreProfilo | null>(null);

export function ProfiloProvider({ children }: { children: React.ReactNode }) {
  const { sessione } = useAuth();
  const userId = sessione?.user?.id ?? null;

  const [nick, setNick] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [cognome, setCognome] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(false);

  // Quando cambia l'utente loggato, leggiamo il suo profilo.
  useEffect(() => {
    let vivo = true;
    if (!userId) {
      setNick(null);
      setAvatarUrl(null);
      setNome(null);
      setCognome(null);
      return;
    }
    supabase
      .from('profiles')
      .select('nick, avatar_url, nome, cognome')
      .eq('id', userId)
      .single()
      .then(({ data, error }) => {
        if (!vivo) return;
        if (error) {
          console.warn('Profilo: lettura profilo fallita', error.message);
          setNick(null);
          setAvatarUrl(null);
          setNome(null);
          setCognome(null);
        } else {
          setNick((data?.nick as string | null) ?? null);
          setAvatarUrl((data?.avatar_url as string | null) ?? null);
          setNome((data?.nome as string | null) ?? null);
          setCognome((data?.cognome as string | null) ?? null);
        }
      });
    return () => {
      vivo = false;
    };
  }, [userId]);

  const cambiaAvatar = useCallback(async () => {
    if (!userId || caricando) return;
    setCaricando(true);
    try {
      const nuovoUrl = await scegliEcaricaAvatar(userId);
      if (nuovoUrl) setAvatarUrl(nuovoUrl); // null = utente ha annullato
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('Avatar: caricamento non riuscito —', msg);
    } finally {
      setCaricando(false);
    }
  }, [userId, caricando]);

  return (
    <ProfiloContext.Provider value={{ nick, avatarUrl, nome, cognome, caricando, cambiaAvatar }}>
      {children}
    </ProfiloContext.Provider>
  );
}

export function useProfilo(): ValoreProfilo {
  const ctx = useContext(ProfiloContext);
  if (!ctx) throw new Error('useProfilo deve stare dentro <ProfiloProvider>');
  return ctx;
}
