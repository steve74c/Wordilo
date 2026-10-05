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
// AL MEGLIO DI 3 (sfida.formato === 3):
//   • Ogni partita della serie è un match a sé; finita una partita (e se la serie
//     non è decisa) l'HOST crea da solo la successiva dopo PAUSA_TRA_PARTITE e la
//     diffonde con lo stesso messaggio della rivincita (`rivincita-via`).
//   • Entrambi tengono il punteggio della serie dagli esiti ufficiali dell'host.
//   • Serie decisa = qualcuno arriva a 2 vittorie, oppure 3 partite giocate
//     (a parità di vittorie è pareggio), oppure un abbandono (chi lascia perde).
//   • A fine serie: UNA riga in games (punti e statistiche una volta sola) e la
//     "scheda" della serie (primo match) passa a serie_finita: il trigger del DB
//     accredita le monete una volta sola.
//
// NB tecnica: il canale Realtime resta aperto UNA volta sola per tutta la vita
// del contenitore (dipende solo da mioId + codice della PROP `sfida`, che non
// cambia). Gli handler del canale leggono sempre la versione più recente delle
// callback tramite `handlersRef`, così cambiare partita NON riapre il canale
// (che rifarebbe scattare presence/handshake).
// -----------------------------------------------------------------------------
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { PUNTI_ONLINE } from '../economia/economia';
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
import { useProfilo } from '../profilo/ProfiloContext';

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

// Stato della serie al meglio di 3 (per la singola resta inutilizzato).
export type InfoSerie = {
  partita: number;          // partita in corso: 1, 2 o 3
  vinteIo: number;
  vinteAvv: number;
  finita: boolean;
  esito: EsitoOnline | null; // esito della SERIE (solo quando finita)
  abbandono: boolean;       // finita perché uno dei due ha lasciato
};

const SERIE_NUOVA: InfoSerie = {
  partita: 1,
  vinteIo: 0,
  vinteAvv: 0,
  finita: false,
  esito: null,
  abbandono: false,
};

// Pausa fra una partita e la successiva della serie (il pop-up resta visibile).
const PAUSA_TRA_PARTITE = 4000;

// Punti di ripiego se game_settings non risponde: stessi valori della tabella del menu.
const PUNTI_FALLBACK: Record<EsitoOnline, number> = PUNTI_ONLINE;

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

  // [SERIE] Punteggio della serie (state per la UI + ref per gli handler) e guardie
  // che valgono per TUTTA la serie (non si azzerano fra una partita e l'altra).
  const [serie, setSerie] = useState<InfoSerie>(SERIE_NUOVA);
  const serieRef = useRef<InfoSerie>(SERIE_NUOVA);
  const scritturaSerie = useRef(false);   // riga games della serie già scritta
  const chiusuraSerie = useRef(false);    // scheda della serie già chiusa
  const tentativiSerie = useRef(0);       // somma dei tentativi delle partite
  const timerProssima = useRef<ReturnType<typeof setTimeout> | null>(null);

  const aggiornaSerie = useCallback((nuova: InfoSerie) => {
    serieRef.current = nuova;
    setSerie(nuova);
  }, []);

  const fermaTimerProssima = useCallback(() => {
    if (timerProssima.current) {
      clearTimeout(timerProssima.current);
      timerProssima.current = null;
    }
  }, []);

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

  /*
  useEffect(() => {
    console.log('[DEBUG parola] =', sfidaCorrente.parola);
  }, [sfidaCorrente.parola]);
  */
  useEffect(() => {
    esitoRef.current = esito;
  }, [esito]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMioId(data?.user?.id ?? null));
  }, []);

  // L'host non cambia tra un round e l'altro → lo derivo dalla PROP (stabile).
  const sonoHost = mioId != null && mioId === sfida.hostId;

  // Nick dei due giocatori, per la riga "Tu vs Avversario" in partita.
  // Il mio arriva dal profilo; quello dell'avversario lo leggo da `profiles`
  // (lettura pubblica). L'avversario è lo stesso anche nelle rivincite.
  const { nick: nickMio } = useProfilo();
  const [nickAvversario, setNickAvversario] = useState<string | null>(null);
  const idAvversario = mioId == null ? null : sonoHost ? sfida.guestId : sfida.hostId;
  useEffect(() => {
    if (!idAvversario) return;
    let annullato = false;
    supabase
      .from('profiles')
      .select('nick')
      .eq('id', idAvversario)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.warn('[VS] nick avversario non letto:', error.message);
        if (!annullato) setNickAvversario((data?.nick as string | null) ?? null);
      });
    return () => {
      annullato = true;
    };
  }, [idAvversario]);

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

  // [C5b] Inserisce la MIA riga in games. Punti da game_settings (con fallback
  // PUNTI_ONLINE). Le guardie "una volta sola" stanno nei due chiamanti qui sotto.
  const inserisciRigaGames = useCallback(
    async (mio: EsitoOnline, matchId: string, tentativi: number) => {
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

      const { error } = await supabase.from('games').insert({
        user_id: mioId,
        match_id: matchId,
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
    [mioId, sfidaCorrente.modalita, sfidaCorrente.lunghezza],
  );

  // Sfida SINGOLA: la mia riga del round (una volta sola per round).
  // `tentativiOverride` serve all'abbandono.
  const scriviRigaGioco = useCallback(
    async (mio: EsitoOnline, tentativiOverride?: number) => {
      if (scritturaFatta.current) return; // già scritta
      scritturaFatta.current = true;      // blocco sincrono immediato
      const tentativi = tentativiOverride ?? tentativiFinali.current ?? tentativiLive.current;
      await inserisciRigaGames(mio, sfidaCorrente.id, tentativi);
    },
    [inserisciRigaGames, sfidaCorrente.id],
  );

  // [SERIE] Chiude la serie (una volta sola): la MIA riga in games con l'esito
  // della serie (agganciata al primo match) e la "scheda" della serie su matches
  // → il trigger del DB accredita le monete. La scheda la scrive l'host; in caso
  // di abbandono anche chi resta e chi se ne va (`forza`): valori identici, e il
  // trigger accredita comunque una volta sola.
  const chiudiSerie = useCallback(
    (esitoSerie: EsitoOnline, forza = false) => {
      const idSerie = sfidaRef.current.serieId;
      if (!scritturaSerie.current) {
        scritturaSerie.current = true;
        const tentativi = tentativiSerie.current || tentativiLive.current;
        void inserisciRigaGames(esitoSerie, idSerie, tentativi);
      }
      if (chiusuraSerie.current) return;
      if (!sonoHost && !forza && !perAbbandono.current) return;
      chiusuraSerie.current = true;
      const vincitore =
        esitoSerie === 'vinta' ? mioId : esitoSerie === 'persa' ? idAvversario : null;
      void supabase
        .from('matches')
        .update({
          serie_finita: true,
          serie_vincitore: vincitore,
          serie_pareggio: esitoSerie === 'pareggio',
        })
        .eq('id', idSerie)
        .then(({ error }) => {
          if (error) console.warn('[SERIE] chiusura serie non riuscita:', error.message);
        });
    },
    [inserisciRigaGames, sonoHost, mioId, idAvversario],
  );

  // [SERIE] Riferimento alla funzione che crea la partita successiva (definita più
  // sotto, dopo avviaNuovoRound): così applicaEsito può programmarla.
  const avviaProssimaRef = useRef<() => Promise<void>>(async () => {});

  // Applica un verdetto e lo traduce dal MIO punto di vista.
  const applicaEsito = useCallback(
    (deciso: { winnerId: string | null; pareggio: boolean }) => {
      if (esitoRef.current) return; // già deciso: non sovrascrivo
      const mio: EsitoOnline = deciso.pareggio
        ? 'pareggio'
        : deciso.winnerId === mioId
          ? 'vinta'
          : 'persa';
      // Segno SUBITO l'esito (non aspetto il render): l'host può rimandare lo
      // stesso verdetto più volte e la serie non deve contarlo due volte.
      esitoRef.current = mio;
      setEsito(mio);
      fermaReinvio();
      void chiudiMatch(deciso);   // [C5b/C7] chiusura matches (guardia interna)

      if (sfidaRef.current.formato !== 3) {
        void scriviRigaGioco(mio);  // [C5b] scrittura esito (guardia interna)
        return;
      }

      // [SERIE] Aggiorno il punteggio e decido se la serie è finita.
      tentativiSerie.current += tentativiFinali.current ?? tentativiLive.current;
      const s = serieRef.current;
      if (s.finita) return;
      const vinteIo = s.vinteIo + (mio === 'vinta' ? 1 : 0);
      const vinteAvv = s.vinteAvv + (mio === 'persa' ? 1 : 0);
      const abbandono = perAbbandono.current;
      const finita = abbandono || vinteIo >= 2 || vinteAvv >= 2 || s.partita >= 3;
      const esitoSerie: EsitoOnline | null = !finita
        ? null
        : abbandono
          ? mio // chi resta ha vinto il round (e quindi la serie)
          : vinteIo > vinteAvv
            ? 'vinta'
            : vinteIo < vinteAvv
              ? 'persa'
              : 'pareggio';
      aggiornaSerie({ ...s, vinteIo, vinteAvv, finita, esito: esitoSerie, abbandono });

      if (esitoSerie) {
        chiudiSerie(esitoSerie);
      } else if (sonoHost) {
        // L'host prepara la partita successiva dopo una breve pausa.
        fermaTimerProssima();
        timerProssima.current = setTimeout(() => {
          timerProssima.current = null;
          void avviaProssimaRef.current();
        }, PAUSA_TRA_PARTITE);
      }
    },
    [mioId, sonoHost, fermaReinvio, scriviRigaGioco, chiudiMatch, aggiornaSerie, chiudiSerie, fermaTimerProssima],
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
      fermaTimerProssima();

      // [SERIE] Stessa serie → partita successiva; serie diversa (rivincita) →
      // si riparte da zero, guardie della serie comprese.
      if (nuova.serieId === sfidaRef.current.serieId) {
        aggiornaSerie({ ...serieRef.current, partita: serieRef.current.partita + 1 });
      } else {
        aggiornaSerie(SERIE_NUOVA);
        scritturaSerie.current = false;
        chiusuraSerie.current = false;
        tentativiSerie.current = 0;
      }

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
    [fermaReinvio, fermaTimerProssima, aggiornaSerie],
  );

  // [SERIE] Solo l'HOST: crea la partita successiva della serie e la diffonde
  // (stesso messaggio della rivincita). Qualche nuovo tentativo se la rete fa i capricci.
  avviaProssimaRef.current = async () => {
    for (let tentativo = 0; tentativo < 3; tentativo++) {
      if (serieRef.current.finita) return; // nel frattempo qualcuno ha lasciato
      const r = await creaRivincita(sfidaRef.current, true);
      if (r.ok) {
        connessione.current?.inviaRivincitaVia(r.sfida);
        avviaNuovoRound(r.sfida);
        return;
      }
      console.warn('[SERIE] creazione partita successiva fallita:', r.errore);
      await new Promise((ok) => setTimeout(ok, 1500));
    }
  };

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
    // [SERIE] L'avversario se ne va FRA due partite di una serie non ancora decisa:
    // ha abbandonato la serie → la vinco io.
    if (esitoRef.current && sfidaRef.current.formato === 3 && !serieRef.current.finita) {
      fermaTimerProssima();
      perAbbandono.current = true;
      aggiornaSerie({ ...serieRef.current, finita: true, esito: 'vinta', abbandono: true });
      chiudiSerie('vinta', true);
      return;
    }
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
      fermaTimerProssima();
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
    // [SERIE] Lasciare una serie non ancora decisa (anche fra due partite) = perderla.
    if (sfidaRef.current.formato === 3 && !serieRef.current.finita) {
      fermaTimerProssima();
      connessione.current?.inviaAbbandono();
      aggiornaSerie({ ...serieRef.current, finita: true, esito: 'persa', abbandono: true });
      chiudiSerie('persa', true);
      onIndietro?.();
      return;
    }
    if (!esitoRef.current) {
      connessione.current?.inviaAbbandono();
      void scriviRigaGioco('persa'); // la mia riga "lost" (guardia interna)
    } else if (statoRivincitaRef.current !== 'idle' && statoRivincitaRef.current !== 'rifiutata') {
      connessione.current?.inviaRivincitaRisposta(false);
    }
    onIndietro?.();
  }, [onIndietro, scriviRigaGioco, fermaTimerProssima, aggiornaSerie, chiudiSerie]);

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
      nickMio={nickMio}
      nickAvversario={nickAvversario}
      matchId={sfidaCorrente.id}
      serie={sfidaCorrente.formato === 3 ? serie : undefined}
      onIndietro={gestisciIndietro}
      statoRivincita={statoRivincita}
      onRichiediRivincita={chiediRivincita}
      onAccettaRivincita={accettaRivincita}
      onRifiutaRivincita={rifiutaRivincita}
    />
  );
}
