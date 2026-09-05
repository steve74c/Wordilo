import React, { useEffect, useState } from 'react';
import type { LunghezzaParola, Modalita } from '@wordilo/core';
import { supabase } from '../lib/supabase';
import { SchermataMenu } from './SchermataMenu';
import { SchermataGioco } from './SchermataGioco';
import { SchermataClassifiche } from './SchermataClassifiche';
import { SchermataGiocoOnline } from '../online/SchermataGiocoOnline';
import type { Sfida } from '../online/stanze';

type Config = { modalita: Modalita; lunghezza: LunghezzaParola };

export function Wordilo() {
  const [config, setConfig] = useState<Config | null>(null);
  const [sfidaOnline, setSfidaOnline] = useState<Sfida | null>(null); // NEW (D3)
  const [vediClassifiche, setVediClassifiche] = useState(false);      // NEW (C6)
  const [mioUserId, setMioUserId] = useState<string | null>(null);    // NEW (C6): evidenzia la mia riga

  // Chi sono (serve solo per evidenziare la propria riga in classifica).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMioUserId(data?.user?.id ?? null));
  }, []);

  // NEW (C6): schermata classifiche a tutto schermo.
  if (vediClassifiche) {
    return (
      <SchermataClassifiche
        mioUserId={mioUserId}
        onIndietro={() => setVediClassifiche(false)}
      />
    );
  }

  // NEW (D3): se c'è una sfida online attiva, mostra la partita online a tutto schermo.
  if (sfidaOnline) {
    return (
      <SchermataGiocoOnline
        sfida={sfidaOnline}
        onIndietro={() => setSfidaOnline(null)}
      />
    );
  }

  if (!config) {
    return (
      <SchermataMenu
        onGioca={(modalita, lunghezza) => setConfig({ modalita, lunghezza })}
        onEntraInPartita={(sfida) => setSfidaOnline(sfida)}   // NEW (D3)
        onClassifiche={() => setVediClassifiche(true)}         // NEW (C6)
      />
    );
  }

  return (
    <SchermataGioco
      key={`${config.modalita}-${config.lunghezza}`}
      modalita={config.modalita}
      lunghezza={config.lunghezza}
      onIndietro={() => setConfig(null)}
    />
  );
}