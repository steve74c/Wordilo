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
  linguaUI: string;       // lingua dell'interfaccia salvata sul profilo (default 'it')
  linguaGioco: string;    // lingua del gioco salvata sul profilo (default 'it')
  tema: string;           // tema salvato sul profilo (default 'giallo')
  caricando: boolean;
  cambiaAvatar: () => Promise<void>;
  aggiornaLingue: (linguaUI: string, linguaGioco: string) => Promise<void>;
  aggiornaTema: (tema: string) => Promise<void>;
};

const ProfiloContext = createContext<ValoreProfilo | null>(null);

export function ProfiloProvider({ children }: { children: React.ReactNode }) {
  const { sessione } = useAuth();
  const userId = sessione?.user?.id ?? null;

  const [nick, setNick] = useState<string | null>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [nome, setNome] = useState<string | null>(null);
  const [cognome, setCognome] = useState<string | null>(null);
  const [linguaUI, setLinguaUI] = useState<string>('it');
  const [linguaGioco, setLinguaGioco] = useState<string>('it');
  const [tema, setTema] = useState<string>('giallo');
  const [caricando, setCaricando] = useState(false);

  // Quando cambia l'utente loggato, leggiamo il suo profilo.
  useEffect(() => {
    let vivo = true;
    if (!userId) {
      setNick(null);
      setAvatarUrl(null);
      setNome(null);
      setCognome(null);
      setLinguaUI('it');
      setLinguaGioco('it');
      setTema('giallo');
      return;
    }
    supabase
      .from('profiles')
      .select('nick, avatar_url, nome, cognome, lingua_ui, lingua_gioco, tema')
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
          setLinguaUI('it');
          setLinguaGioco('it');
          setTema('giallo');
        } else {
          setNick((data?.nick as string | null) ?? null);
          setAvatarUrl((data?.avatar_url as string | null) ?? null);
          setNome((data?.nome as string | null) ?? null);
          setCognome((data?.cognome as string | null) ?? null);
          setLinguaUI((data?.lingua_ui as string | null) ?? 'it');
          setLinguaGioco((data?.lingua_gioco as string | null) ?? 'it');
          setTema((data?.tema as string | null) ?? 'giallo');
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

  // Salva le preferenze di lingua sul profilo (chiamato da SchermataImpostazioni).
  const aggiornaLingue = useCallback(async (nuovaLinguaUI: string, nuovaLinguaGioco: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from('profiles')
      .update({ lingua_ui: nuovaLinguaUI, lingua_gioco: nuovaLinguaGioco })
      .eq('id', userId);
    if (error) {
      console.warn('Profilo: aggiornamento lingue fallito —', error.message);
      return;
    }
    setLinguaUI(nuovaLinguaUI);
    setLinguaGioco(nuovaLinguaGioco);
  }, [userId]);

  // Salva la preferenza di tema sul profilo (chiamato da SchermataImpostazioni).
  const aggiornaTema = useCallback(async (nuovoTema: string) => {
    if (!userId) return;
    const { error } = await supabase
      .from('profiles')
      .update({ tema: nuovoTema })
      .eq('id', userId);
    if (error) {
      console.warn('Profilo: aggiornamento tema fallito —', error.message);
      return;
    }
    setTema(nuovoTema);
  }, [userId]);

  return (
    <ProfiloContext.Provider value={{
      nick, avatarUrl, nome, cognome,
      linguaUI, linguaGioco, tema,
      caricando,
      cambiaAvatar,
      aggiornaLingue,
      aggiornaTema,
    }}>
      {children}
    </ProfiloContext.Provider>
  );
}

export function useProfilo(): ValoreProfilo {
  const ctx = useContext(ProfiloContext);
  if (!ctx) throw new Error('useProfilo deve stare dentro <ProfiloProvider>');
  return ctx;
}