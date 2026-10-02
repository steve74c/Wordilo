import React, { useEffect, useState } from 'react';
import type { LunghezzaParola, Modalita } from '@SpotLex/core';
import { supabase } from '../lib/supabase';
import { SchermataMenu } from './SchermataMenu';
import { SchermataGioco } from './SchermataGioco';
import { SchermataClassifiche } from './SchermataClassifiche';
import { SchermataLobby } from './SchermataLobby';
import { SchermataCodaCasuale } from './SchermataCodaCasuale'; // 🎲 coda casuale (Gioca online)
import { SchermataImpostazioni } from './SchermataImpostazioni'; // NEW (Lotto 2)
import { SchermataGiocoOnline } from '../online/SchermataGiocoOnline';
import type { Sfida } from '../online/stanze';
import { pagaIngressoOnline } from '../economia/economia';
import { useT } from '../i18n/LinguaUIContext';

type Config = { modalita: Modalita; lunghezza: LunghezzaParola };

export function SpotLex() {
  const t = useT();
  const [config, setConfig] = useState<Config | null>(null);
  const [lobby, setLobby] = useState<Config | null>(null);            // (1b): lobby online (col codice)
  const [codaCasuale, setCodaCasuale] = useState<Config | null>(null);  // 🎲 coda casuale (Gioca online)
  const [sfidaOnline, setSfidaOnline] = useState<Sfida | null>(null); // (D3)
  const [vediClassifiche, setVediClassifiche] = useState(false);      // (C6)
  const [mostraImpostazioni, setMostraImpostazioni] = useState(false); // NEW (Lotto 2)
  const [mioUserId, setMioUserId] = useState<string | null>(null);    // (C6): evidenzia la mia riga
  const [avviso, setAvviso] = useState<string | null>(null);          // messaggio mostrato nel menu

  // Chi sono (serve solo per evidenziare la propria riga in classifica).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMioUserId(data?.user?.id ?? null));
  }, []);

  // Ingresso in una partita online (lobby o coda casuale): prima si pagano le
  // 20 monete. Se il pagamento fallisce si torna al menu con un avviso.
  const entraInPartitaOnline = async (sfida: Sfida, chiudi: () => void) => {
    const r = await pagaIngressoOnline(sfida.id);
    chiudi();
    if (!r.ok) {
      setAvviso(r.errore === 'MONETE_INSUFFICIENTI' ? t('moneteInsufficienti') : t('erroreIngressoOnline'));
      return;
    }
    setAvviso(null);
    setSfidaOnline(sfida);
  };

  // NEW (Lotto 2): schermata Impostazioni (scelta tema) a tutto schermo.
  if (mostraImpostazioni) {
    return <SchermataImpostazioni onIndietro={() => setMostraImpostazioni(false)} />;
  }

  // (C6): schermata classifiche a tutto schermo.
  if (vediClassifiche) {
    return (
      <SchermataClassifiche
        mioUserId={mioUserId}
        onIndietro={() => setVediClassifiche(false)}
      />
    );
  }

  // (D3): se c'è una sfida online attiva, mostra la partita online a tutto schermo.
  if (sfidaOnline) {
    return (
      <SchermataGiocoOnline
        sfida={sfidaOnline}
        onIndietro={() => setSfidaOnline(null)}
      />
    );
  }

  // (1b): lobby online (crea/entra + attesa avversario). Quando la stretta di
  // mano è completa, si pagano le monete e parte SchermataGiocoOnline.
  if (lobby) {
    return (
      <SchermataLobby
        modalita={lobby.modalita}
        lunghezza={lobby.lunghezza}
        onEntraInPartita={(sfida) => entraInPartitaOnline(sfida, () => setLobby(null))}
        onIndietro={() => setLobby(null)}
      />
    );
  }

  // 🎲 Coda casuale (Gioca online): matchmaking senza codice. Come la lobby.
  if (codaCasuale) {
    return (
      <SchermataCodaCasuale
        modalita={codaCasuale.modalita}
        lunghezza={codaCasuale.lunghezza}
        onEntraInPartita={(sfida) => entraInPartitaOnline(sfida, () => setCodaCasuale(null))}
        onIndietro={() => setCodaCasuale(null)}
      />
    );
  }

  if (!config) {
    return (
      <SchermataMenu
        avviso={avviso}
        onGioca={(modalita, lunghezza) => {
          setAvviso(null);
          setConfig({ modalita, lunghezza });
        }}
        onGiocaOnline={(modalita, lunghezza) => {
          setAvviso(null);
          setCodaCasuale({ modalita, lunghezza }); // 🎲 coda casuale
        }}
        onSfidaAmico={(modalita, lunghezza) => {
          setAvviso(null);
          setLobby({ modalita, lunghezza }); // (1b) col codice
        }}
        onClassifiche={() => setVediClassifiche(true)}         // (C6)
        onApriImpostazioni={() => setMostraImpostazioni(true)} // NEW (Lotto 2)
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
