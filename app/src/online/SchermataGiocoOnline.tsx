// -----------------------------------------------------------------------------
// Contenitore della sfida online (D3/D4 + esito C5a + scrittura C5b
//  + abbandono/disconnessione C7 + RIVINCITA).
// Va salvato in:  app/src/online/SchermataGiocoOnline.tsx
//
// RIVINCITA (novità):
//   • A fine partita, il pop-up offre "🔁 Rivincita". Chi la chiede manda
//     `rivincita-richiesta` sul canale; l'altro vede "Accetta / Rifiuta".
//   • Rifiuto → il richiedente vede "Rivincita rifiutata".
//   • Accordo → l'HOST (chiunque abbia chiesto) crea un NUOVO match con parola
//     nuova (stessa lingua/modalità/lunghezza, guest già noto, status 'playing')
//     e lo diffonde con `rivincita-via`. Entrambi ripartono con una partita
//     fresca SULLO STESSO CANALE (nessun nuovo handshake).
//   • Solo l'host può creare (lo impone la RLS: insert se host_id = auth.uid()),
//     perciò la creazione è sempre instradata a lui.
//
// NB tecnica: il canale Realtime resta aperto UNA volta sola per tutta la vita
// del contenitore (dipende solo da mioId + codice della PROP `sfida`, che non
// cambia). Gli handler del canale leggono sempre la versione più recente delle
// callback tramite `handlersRef`, così cambiare partita NON riapre il canale
// (che rifarebbe scattare presence/handshake).
// -----------------------------------------------------------------------------
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { SchermataGioco } from '../screens/SchermataGioco';
import {
  apriCanaleStanza,
  type ConnessioneStanza,
  type RiepilogoRiga,
  type FinitoMsg,
  type EsitoMsg,
  type MotivoAssenza,
} from './canaleStanza';
import { creaRivincita, type Sfida } from './stanze';

type EsitoOnline = 'vinta' | 'persa' | 'pareggio';

// Stato del "negoziato" di rivincita, guida la UI del pop-up:
//   idle      → nessuna richiesta in ballo (mostra il bottone "Rivincita")
//   inviata   → ho chiesto io, aspetto la risposta
//   ricevuta  → l'avversario ha chiesto, mostro Accetta/Rifiuta
//   in-avvio  → accordo raggiunto, sto preparando/attendendo la nuova partita
//   rifiutata → la mia richiesta è stata rifiutata
type StatoRivincita = 'idle' | 'inviata' | 'ricevuta' | 'in-avvio' | 'rifiutata';

type Props = {
  sfida: Sfida;
  onIndietro?: () => void;
};

// Punti di ripiego se game_settings non risponde (spec §6: 10 / 0 / 5).
const PUNTI_FALLBACK: Record<EsitoOnline, number> = { vinta: 10, persa: 0, pareggio: 5 };

// Traduce l'esito "mio" nei valori della colonna games.result.
const RESULT_DB: Record<EsitoOnline, 'won' | 'lost' | 'draw'> = {
  vinta: 'won',
  persa: 'lost',
  pareggio: 'draw',
};

export function SchermataGiocoOnline({ sfida, onIndietro }: Props) {
  const [mioId, setMioId] = useState<string | null>(null);
  const [righeAvversario, setRigheAvversario] = useState<Record<number, { verdi: number; arancioni: number }>>({});
  const [esito, setEsito] = useState<EsitoOnline | null>(null);

  // [RIVINCITA] La sfida "corrente": parte dalla prop e cambia a ogni rivincita.
  // La PROP `sfida` non cambia mai (il contenitore possiede lo stato del rematch):
  // così il suo `codice` resta stabile e lo usiamo come chiave fissa del canale.
  const [sfidaCorrente, setSfidaCorrente] = useState<Sfida>(sfida);
  const [statoRivincita, setStatoRivincita] = useState<StatoRivincita>('idle');
  const [roundKey, setRoundKey] = useState(0); // rimonta SchermataGioco a ogni round

  const connessione = useRef<ConnessioneStanza | null>(null);
  const esitoRef = useRef<EsitoOnline | null>(null);
  const reinvio = useRef<ReturnType<typeof setInterval> | null>(null);

  // [C5b] Guardia SINCRONA: la riga in games si scrive una volta sola per round.
  const scritturaFatta = useRef(false);
  // [C5b] Guardia SINCRONA per la chiusura di matches (una volta sola per round).
  const chiusuraFatta = useRef(false);
  // [C5b] Conteggio tentativi del round corrente.
  const tentativiFinali = useRef<number | null>(null);
  const tentativiLive = useRef(0);
  // [C7] true quando il round è finito per abbandono/disconnessione dell'altro.
  const perAbbandono = useRef(false);

  // Stato dell'arbitrato (lo usa solo l'HOST), azzerato a ogni round.
  const arbitro = useRef<{
    ioNonIndovinato: boolean;
    avvNonIndovinato: boolean;
    deciso: { winnerId: string | null; pareggio: boolean } | null;
  }>({ ioNonIndovinato: false, avvNonIndovinato: false, deciso: null });

  // Specchi sincroni per gli handler del canale (che leggono fuori da React).
  const sfidaRef = useRef<Sfida>(sfidaCorrente);
  const statoRivincitaRef = useRef<StatoRivincita>(statoRivincita);

  useEffect(() => {
    sfidaRef.current = sfidaCorrente;
  }, [sfidaCorrente]);
  useEffect(() => {
    statoRivincitaRef.current = statoRivincita;
  }, [statoRivincita]);

  useEffect(() => {
    console.log('[DEBUG parola] =', sfidaCorrente.parola);
  }, [sfidaCorrente.parola]);

  useEffect(() => {
    esitoRef.current = esito;
  }, [esito]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMioId(data?.user?.id ?? null));
  }, []);

  // L'host non cambia tra un round e l'altro → lo derivo dalla PROP (stabile).
  const sonoHost = mioId != null && mioId === sfida.hostId;

  const fermaReinvio = useCallback(() => {
    if (reinvio.current) {
      clearInterval(reinvio.current);
      reinvio.current = null;
    }
  }, []);

  // [C5b] Solo l'HOST chiude la partita in matches (percorso normale).
  // [C7] In caso di abbandono, può chiudere anche il guest (RLS lo consente).
  const chiudiMatch = useCallback(
    async (deciso: { winnerId: string | null; pareggio: boolean }) => {
      if (!sonoHost && !perAbbandono.current) return; // normalmente solo host
      if (chiusuraFatta.current) return;
      chiusuraFatta.current = true; // blocco sincrono immediato

      const { error } = await supabase
        .from('matches')
        .update({
          status: 'finished',
          winner_id: deciso.pareggio ? null : deciso.winnerId,
          is_draw: deciso.pareggio,
          finished_at: new Date().toISOString(),
        })
        .eq('id', sfidaCorrente.id);
      if (error) {
        console.warn('[C7] chiusura match non riuscita:', error.message);
      }
    },
    [sonoHost, sfidaCorrente.id],
  );

  // [C5b] Scrive la MIA riga in games (una sola volta per round). Punti da
  // game_settings (con fallback 10/0/5). `tentativiOverride` serve all'abbandono.
  const scriviRigaGioco = useCallback(
    async (mio: EsitoOnline, tentativiOverride?: number) => {
      if (scritturaFatta.current) return; // già scritta
      scritturaFatta.current = true;      // blocco sincrono immediato
      if (!mioId) return;

      let punti = PUNTI_FALLBACK[mio];
      try {
        const { data } = await supabase
          .from('game_settings')
          .select('points_win, points_lose, points_draw')
          .eq('mode', sfidaCorrente.modalita)
          .maybeSingle();
        if (data) {
          punti =
            mio === 'vinta'
              ? data.points_win ?? PUNTI_FALLBACK.vinta
              : mio === 'persa'
                ? data.points_lose ?? PUNTI_FALLBACK.persa
                : data.points_draw ?? PUNTI_FALLBACK.pareggio;
        }
      } catch {
        // rete assente o vista non leggibile: resta il fallback
      }

      const tentativi = tentativiOverride ?? tentativiFinali.current ?? tentativiLive.current;

      const { error } = await supabase.from('games').insert({
        user_id: mioId,
        match_id: sfidaCorrente.id,
        mode: 'online',
        word_length: sfidaCorrente.lunghezza,
        result: RESULT_DB[mio],
        attempts_used: tentativi,
        points: punti,
      });
      if (error) {
        console.warn('[C5b] riga games non salvata:', error.message);
      }
    },
    [mioId, sfidaCorrente.id, sfidaCorrente.modalita, sfidaCorrente.lunghezza],
  );

  // Applica un verdetto e lo traduce dal MIO punto di vista.
  const applicaEsito = useCallback(
    (deciso: { winnerId: string | null; pareggio: boolean }) => {
      if (esitoRef.current) return; // già deciso: non sovrascrivo
      const mio: EsitoOnline = deciso.pareggio
        ? 'pareggio'
        : deciso.winnerId === mioId
          ? 'vinta'
          : 'persa';
      setEsito(mio);
      fermaReinvio();
      void scriviRigaGioco(mio);  // [C5b] scrittura esito (guardia interna)
      void chiudiMatch(deciso);   // [C5b/C7] chiusura matches (guardia interna)
    },
    [mioId, fermaReinvio, scriviRigaGioco, chiudiMatch],
  );

  // ARBITRO (solo host): registra un finale; se può, decide e annuncia l'esito.
  const registraFinale = useCallback(
    (chi: 'io' | 'avv', indovinato: boolean, idAvversario?: string) => {
      const a = arbitro.current;
      if (a.deciso) {
        connessione.current?.inviaEsito(a.deciso.winnerId, a.deciso.pareggio);
        return;
      }
      if (indovinato) {
        const winnerId = chi === 'io' ? mioId ?? null : idAvversario ?? null;
        a.deciso = { winnerId, pareggio: false };
        applicaEsito(a.deciso);
        connessione.current?.inviaEsito(a.deciso.winnerId, a.deciso.pareggio);
        return;
      }
      if (chi === 'io') a.ioNonIndovinato = true;
      else a.avvNonIndovinato = true;
      if (a.ioNonIndovinato && a.avvNonIndovinato) {
        a.deciso = { winnerId: null, pareggio: true };
        applicaEsito(a.deciso);
        connessione.current?.inviaEsito(null, true);
      }
    },
    [mioId, applicaEsito],
  );

  // -----------------------------------------------------------------------------
  // [RIVINCITA] Reset di tutto lo stato di round e avvio della partita nuova.
  // -----------------------------------------------------------------------------
  const avviaNuovoRound = useCallback(
    (nuova: Sfida) => {
      if (sfidaRef.current.id === nuova.id) return; // già su questo round

      fermaReinvio();

      // Azzero le guardie/stato del round precedente.
      esitoRef.current = null;
      arbitro.current = { ioNonIndovinato: false, avvNonIndovinato: false, deciso: null };
      scritturaFatta.current = false;
      chiusuraFatta.current = false;
      perAbbandono.current = false;
      tentativiFinali.current = null;
      tentativiLive.current = 0;

      // Nuovo stato visibile.
      setEsito(null);
      setRigheAvversario({});
      setStatoRivincita('idle');
      sfidaRef.current = nuova;
      setSfidaCorrente(nuova);
      setRoundKey((k) => k + 1); // rimonta SchermataGioco → useGioco con la parola nuova
    },
    [fermaReinvio],
  );

  // [RIVINCITA] Solo l'HOST: crea il match della rivincita e lo diffonde.
  const creaEAvviaRivincita = useCallback(async () => {
    const r = await creaRivincita(sfidaRef.current);
    if (!r.ok) {
      console.warn('[RIVINCITA] creazione fallita:', r.errore);
      // Sblocco l'avversario e torno a idle: si può riprovare.
      connessione.current?.inviaRivincitaRisposta(false);
      setStatoRivincita('idle');
      return;
    }
    connessione.current?.inviaRivincitaVia(r.sfida); // avvisa il guest
    avviaNuovoRound(r.sfida);                          // riparto anch'io
  }, [avviaNuovoRound]);

  // -----------------------------------------------------------------------------
  // Handler del canale, sempre "freschi": riletti tramite handlersRef, così il
  // canale non va riaperto quando cambiano (a ogni round o cambio di stato).
  // -----------------------------------------------------------------------------
  const handlersRef = useRef({
    onRiga: (_r: RiepilogoRiga) => {},
    onFinito: (_f: FinitoMsg) => {},
    onEsito: (_e: EsitoMsg) => {},
    onAssente: (_m: MotivoAssenza) => {},
    onRivRichiesta: () => {},
    onRivRisposta: (_a: boolean) => {},
    onRivVia: (_s: Sfida) => {},
  });

  handlersRef.current.onRiga = (r) => {
    setRigheAvversario((prec) => ({ ...prec, [r.riga]: { verdi: r.verdi, arancioni: r.arancioni } }));
  };
  handlersRef.current.onFinito = (f) => {
    if (sonoHost) registraFinale('avv', f.indovinato, f.mittente);
  };
  handlersRef.current.onEsito = (e) => {
    applicaEsito({ winnerId: e.winnerId ?? null, pareggio: !!e.pareggio });
  };
  handlersRef.current.onAssente = (_motivo) => {
    // Se il round è già deciso e c'era un negoziato di rivincita aperto,
    // l'uscita dell'avversario equivale a un rifiuto/annullamento.
    if (esitoRef.current) {
      const s = statoRivincitaRef.current;
      if (s === 'inviata' || s === 'ricevuta' || s === 'in-avvio') {
        setStatoRivincita('rifiutata');
      }
      return;
    }
    // Round ancora in corso: chi resta vince (C7).
    perAbbandono.current = true;
    fermaReinvio();
    applicaEsito({ winnerId: mioId ?? null, pareggio: false });
  };
  handlersRef.current.onRivRichiesta = () => {
    const s = statoRivincitaRef.current;
    if (s === 'inviata') {
      // Richieste incrociate → accordo: l'host prepara la partita.
      setStatoRivincita('in-avvio');
      if (sonoHost) void creaEAvviaRivincita();
    } else if (s === 'idle') {
      setStatoRivincita('ricevuta');
    }
    // negli altri stati (in-avvio/rifiutata/ricevuta) ignoro la richiesta doppia
  };
  handlersRef.current.onRivRisposta = (accetta) => {
    if (accetta) {
      // L'avversario ha accettato: l'host crea la partita, il guest attende.
      setStatoRivincita('in-avvio');
      if (sonoHost) void creaEAvviaRivincita();
    } else {
      const s = statoRivincitaRef.current;
      // Se avevo chiesto io → "rifiutata"; se ero in altro stato → torno idle.
      setStatoRivincita(s === 'inviata' ? 'rifiutata' : 'idle');
    }
  };
  handlersRef.current.onRivVia = (nuova) => {
    avviaNuovoRound(nuova); // arriva dall'host: entrambi ripartono
  };

  // Apertura canale (UNA volta, alla comparsa di mioId). Chiave = codice della
  // PROP `sfida` (stabile tra i round). Gli handler passano per handlersRef.
  useEffect(() => {
    if (!mioId) return;
    const conn = apriCanaleStanza(
      sfida.codice,
      mioId,
      (r) => handlersRef.current.onRiga(r),
      undefined, // onGuestEntrato: gestito nella lobby
      (f) => handlersRef.current.onFinito(f),
      (e) => handlersRef.current.onEsito(e),
      (m) => handlersRef.current.onAssente(m),
      () => handlersRef.current.onRivRichiesta(),
      (a) => handlersRef.current.onRivRisposta(a),
      (s) => handlersRef.current.onRivVia(s),
    );
    connessione.current = conn;
    return () => {
      fermaReinvio();
      conn.chiudi();
      connessione.current = null;
    };
    // Volutamente NON dipende da sfidaCorrente/handler: il canale resta lo stesso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mioId, sfida.codice]);

  const inviaRiga = (riga: number, verdi: number, arancioni: number) => {
    tentativiLive.current += 1; // [C5b] conta le righe confermate (fallback tentativi)
    connessione.current?.inviaRiga(riga, verdi, arancioni);
  };

  // Chiamato da SchermataGioco quando la MIA partita finisce.
  const gestisciMioFine = (indovinato: boolean, tentativi: number) => {
    tentativiFinali.current = tentativi;
    if (sonoHost) {
      registraFinale('io', indovinato, mioId ?? undefined);
    } else {
      fermaReinvio();
      let tentativiInvio = 0;
      const invia = () => connessione.current?.inviaFinito(indovinato, tentativi);
      invia();
      reinvio.current = setInterval(() => {
        tentativiInvio += 1;
        if (esitoRef.current || tentativiInvio >= 12) {
          fermaReinvio();
          return;
        }
        invia();
      }, 800);
    }
  };

  // [C7] Uscita: se il round NON è ancora deciso, "Indietro" = ABBANDONO
  // (avviso l'avversario e scrivo la mia riga come persa); poi torno al menu.
  // Se il round è deciso ma c'era un negoziato di rivincita aperto, avviso
  // l'avversario che la rivincita è saltata.
  const gestisciIndietro = useCallback(() => {
    if (!esitoRef.current) {
      connessione.current?.inviaAbbandono();
      void scriviRigaGioco('persa'); // la mia riga "lost" (guardia interna)
    } else if (statoRivincitaRef.current !== 'idle' && statoRivincitaRef.current !== 'rifiutata') {
      connessione.current?.inviaRivincitaRisposta(false);
    }
    onIndietro?.();
  }, [onIndietro, scriviRigaGioco]);

  // [RIVINCITA] Azioni del pop-up (passate a SchermataGioco).
  const chiediRivincita = useCallback(() => {
    setStatoRivincita('inviata');
    connessione.current?.inviaRivincitaRichiesta();
  }, []);

  const accettaRivincita = useCallback(() => {
    setStatoRivincita('in-avvio');
    if (sonoHost) {
      void creaEAvviaRivincita(); // l'host crea subito e diffonde
    } else {
      connessione.current?.inviaRivincitaRisposta(true); // chiede all'host di creare
    }
  }, [sonoHost, creaEAvviaRivincita]);

  const rifiutaRivincita = useCallback(() => {
    connessione.current?.inviaRivincitaRisposta(false);
    setStatoRivincita('idle');
  }, []);

  return (
    <SchermataGioco
      key={roundKey}
      modalita={sfidaCorrente.modalita}
      lunghezza={sfidaCorrente.lunghezza}
      parolaForzata={sfidaCorrente.parola}
      linguaForzata={sfidaCorrente.lingua}
      online
      onRigaConfermata={inviaRiga}
      righeAvversario={righeAvversario}
      onPartitaFinita={gestisciMioFine}
      esitoOnline={esito}
      onIndietro={gestisciIndietro}
      statoRivincita={statoRivincita}
      onRichiediRivincita={chiediRivincita}
      onAccettaRivincita={accettaRivincita}
      onRifiutaRivincita={rifiutaRivincita}
    />
  );
}
