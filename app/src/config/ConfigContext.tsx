// -----------------------------------------------------------------------------
// Provider della configurazione di gioco.
// Va salvato in:  app/src/config/ConfigContext.tsx
//
// All'avvio parte dai CONFIG_DEFAULT (l'app è subito giocabile), poi in
// background carica i valori veri da Supabase e li sostituisce. Tutta l'app
// legge la config da qui con l'hook `useConfig()`.
// -----------------------------------------------------------------------------
import React, { createContext, useContext, useEffect, useState } from 'react';
import { CONFIG_DEFAULT } from '@wordilo/core';
import type { ConfigGioco } from '@wordilo/core';
import { caricaConfigDaDB } from './configService';

type ValoreConfig = {
  config: ConfigGioco;
  caricata: boolean; // true quando la config dal DB è arrivata (o è fallita sul default)
};

// Default del context = CONFIG_DEFAULT: così `useConfig()` funziona anche fuori
// dal provider (es. nei test), senza mai rompersi.
const ConfigContext = createContext<ValoreConfig>({ config: CONFIG_DEFAULT, caricata: false });

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<ConfigGioco>(CONFIG_DEFAULT);
  const [caricata, setCaricata] = useState(false);

  useEffect(() => {
    let vivo = true;
    caricaConfigDaDB().then((c) => {
      if (!vivo) return;
      setConfig(c);
      setCaricata(true);
    });
    return () => {
      vivo = false;
    };
  }, []);

  return <ConfigContext.Provider value={{ config, caricata }}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ValoreConfig {
  return useContext(ConfigContext);
}
