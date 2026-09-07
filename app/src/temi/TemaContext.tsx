import React, { createContext, useContext, useMemo, useState } from 'react';
import type { Tema } from './tipi';
import { temaVetro } from './Temavetro';
import { temaGiallo } from './TemaGiallo'; // ← import del nuovo tema

// -----------------------------------------------------------------------------
// Provider del tema, nello stesso stile di ConfigProvider/AuthProvider.
// Tiene il tema attivo e permette di cambiarlo. I componenti leggeranno i
// colori/font/misure con l'hook `useTema()` invece di importare il `C` statico.
// -----------------------------------------------------------------------------

// Elenco dei temi disponibili. Ora abbiamo "vetro" e "giallo".
const TEMI: Record<string, Tema> = {
  giallo: temaGiallo,
  vetro: temaVetro,
};

type ControlliTema = {
  tema: Tema;
  nomeTema: string;
  temiDisponibili: string[];
  cambiaTema: (nome: string) => void;
};

const TemaContext = createContext<ControlliTema>({
  tema: temaGiallo,
  nomeTema: 'giallo',
  temiDisponibili: Object.keys(TEMI),
  cambiaTema: () => {},
});

export function TemaProvider({ children }: { children: React.ReactNode }) {
  const [nomeTema, setNomeTema] = useState('giallo');

  const valore = useMemo<ControlliTema>(() => {
    const tema = TEMI[nomeTema] ?? temaGiallo;
    return {
      tema,
      nomeTema,
      temiDisponibili: Object.keys(TEMI),
      cambiaTema: (nome: string) => {
        if (TEMI[nome]) setNomeTema(nome);
      },
    };
  }, [nomeTema]);

  return <TemaContext.Provider value={valore}>{children}</TemaContext.Provider>;
}

/** Il tema attivo (colori, font, misure). Usa QUESTO nei componenti. */
export function useTema(): Tema {
  return useContext(TemaContext).tema;
}

/** Controlli del tema (nome attivo, elenco, cambio): per il selettore */
export function useControlliTema(): ControlliTema {
  return useContext(TemaContext);
}
