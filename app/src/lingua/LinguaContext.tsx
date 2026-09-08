import React, { createContext, useContext, useMemo, useState } from 'react';

// -----------------------------------------------------------------------------
// Provider della LINGUA, nello stesso stile di TemaContext.
// Va salvato in:  app/src/lingua/LinguaContext.tsx
//
// Tiene la lingua attiva e permette di cambiarla. La lingua decide da quale
// insieme di parole pesca il gioco (vedi dizionario del core, indicizzato per
// lingua). Per AGGIUNGERE una lingua in futuro basta aggiungere una riga a
// `LINGUE` qui sotto e i relativi elenchi di parole nel dizionario del core.
// -----------------------------------------------------------------------------

/** Codici delle lingue supportate. Estendi l'unione quando ne aggiungi una. */
export type CodiceLingua = 'it' | 'en';

type InfoLingua = { codice: CodiceLingua; nome: string; bandiera: string };

// Elenco delle lingue disponibili (ordine = ordine nel selettore).
const LINGUE: Record<CodiceLingua, InfoLingua> = {
  it: { codice: 'it', nome: 'Italiano', bandiera: '🇮🇹' },
  en: { codice: 'en', nome: 'English', bandiera: '🇬🇧' },
};

const LINGUA_DEFAULT: CodiceLingua = 'it';

type ControlliLingua = {
  lingua: CodiceLingua;                 // codice attivo (es. 'it')
  info: InfoLingua;                     // nome + bandiera della lingua attiva
  lingueDisponibili: InfoLingua[];      // per costruire il selettore
  cambiaLingua: (codice: CodiceLingua) => void;
};

const LinguaContext = createContext<ControlliLingua>({
  lingua: LINGUA_DEFAULT,
  info: LINGUE[LINGUA_DEFAULT],
  lingueDisponibili: Object.values(LINGUE),
  cambiaLingua: () => {},
});

export function LinguaProvider({ children }: { children: React.ReactNode }) {
  const [lingua, setLingua] = useState<CodiceLingua>(LINGUA_DEFAULT);

  const valore = useMemo<ControlliLingua>(
    () => ({
      lingua,
      info: LINGUE[lingua] ?? LINGUE[LINGUA_DEFAULT],
      lingueDisponibili: Object.values(LINGUE),
      cambiaLingua: (codice: CodiceLingua) => {
        if (LINGUE[codice]) setLingua(codice);
      },
    }),
    [lingua],
  );

  return <LinguaContext.Provider value={valore}>{children}</LinguaContext.Provider>;
}

/** La lingua attiva (codice). Usa QUESTO nei componenti/logica. */
export function useLingua(): CodiceLingua {
  return useContext(LinguaContext).lingua;
}

/** Controlli della lingua (attiva, elenco, cambio): per il selettore in Impostazioni. */
export function useControlliLingua(): ControlliLingua {
  return useContext(LinguaContext);
}
