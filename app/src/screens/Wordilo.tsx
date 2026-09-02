import React, { useState } from 'react';
import type { LunghezzaParola, Modalita } from '@wordilo/core';
import { SchermataMenu } from './SchermataMenu';
import { SchermataGioco } from './SchermataGioco';

// -----------------------------------------------------------------------------
// Router minimale (senza dipendenze di navigazione): finché `config` è null
// mostra il menu; appena si preme "Gioca" si passa alla partita. Il tasto
// indietro nell'header della partita riporta `config` a null → torna al menu.
//
// Da usare al posto di <SchermataGioco/> nel tuo App.tsx, DOPO il caricamento
// dei font (dove oggi mostri la LoadingScreen).
// -----------------------------------------------------------------------------

type Config = { modalita: Modalita; lunghezza: LunghezzaParola };

export function Wordilo() {
  const [config, setConfig] = useState<Config | null>(null);

  if (!config) {
    return (
      <SchermataMenu
        onGioca={(modalita, lunghezza) => setConfig({ modalita, lunghezza })}
      />
    );
  }

  return (
    <SchermataGioco
      // `key` forza una partita pulita ogni volta che cambia la configurazione.
      key={`${config.modalita}-${config.lunghezza}`}
      modalita={config.modalita}
      lunghezza={config.lunghezza}
      onIndietro={() => setConfig(null)}
    />
  );
}
