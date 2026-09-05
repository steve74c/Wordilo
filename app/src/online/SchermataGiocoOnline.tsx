// -----------------------------------------------------------------------------
// Contenitore della sfida online (D3/D4 + esito C5a + scrittura C5b
//  + abbandono/disconnessione C7).
// Va salvato in:  app/src/online/SchermataGiocoOnline.tsx
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
import type { Sfida } from './stanze';

type EsitoOnline = 'vinta' | 'persa' | 'pareggio';

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

  const connessione = useRef<ConnessioneStanza | null>(null);
  const esitoRef = useRef<EsitoOnline | null>(null);
  const reinvio = useRef<ReturnType<typeof setInterval> | null>(null);

  // [C5b] Guardia SINCRONA: la riga in games si scrive una volta sola,
  // anche se l'esito rimbalza più volte (ribattute).
  const scritturaFatta = useRef(false);
  // [C5b] Guardia SINCRONA per la chiusura di matches (una volta sola).
  const chiusuraFatta = useRef(false);
  // [C5b] Conteggio tentativi: quello "vero" quando la mia partita finisce da sola;
  // in mancanza (l'avversario indovina prima e l'esito mi ferma) uso il contatore live.
  const tentativiFinali = useRef<number | null>(null);
  const tentativiLive = useRef(0);
  // [C7] true quando la partita è finita per abbandono/disconnessione dell'altro:
  // in quel caso a chiudere matches può essere anche il guest (non solo l'host).
  const perAbbandono = useRef(false);

  // Stato dell'arbitrato (lo usa solo l'HOST).
  const arbitro = useRef<{
    ioNonIndovinato: boolean;
    avvNonIndovinato: boolean;
    deciso: { winnerId: string | null; pareggio: boolean } | null;
  }>({ ioNonIndovinato: false, avvNonIndovinato: false, deciso: null });

  useEffect(() => {
    esitoRef.current = esito;
  }, [esito]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMioId(data?.user?.id ?? null));
  }, []);

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
        .eq('id', sfida.id);
      if (error) {
        console.warn('[C7] chiusura match non riuscita:', error.message);
      }
    },
    [sonoHost, sfida.id],
  );

  // [C5b] Scrive la MIA riga in games (una sola volta). Punti da game_settings
  // (con fallback 10/0/5). `tentativiOverride` serve al percorso abbandono.
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
          .eq('mode', sfida.modalita)
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
        match_id: sfida.id,
        mode: 'online',
        word_length: sfida.lunghezza,
        result: RESULT_DB[mio],
        attempts_used: tentativi,
        points: punti,
      });
      if (error) {
        console.warn('[C5b] riga games non salvata:', error.message);
      }
    },
    [mioId, sfida.id, sfida.modalita, sfida.lunghezza],
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

  // [C7] L'avversario è assente (uscito o caduto) → IO vinco.
  // Chi resta si auto-dichiara vincitore e scrive/chiude (niente arbitro qui:
  // l'altro non c'è più da avvisare).
  const gestisciAvversarioAssente = useCallback(
    (_motivo: MotivoAssenza) => {
      if (esitoRef.current) return;      // partita già decisa: ignoro
      perAbbandono.current = true;       // abilita la chiusura anche se sono guest
      // Fermo eventuali ribattute del mio "finito" (se avevo già finito, ho vinto lo stesso).
      fermaReinvio();
      applicaEsito({ winnerId: mioId ?? null, pareggio: false });
    },
    [mioId, fermaReinvio, applicaEsito],
  );

  // Apertura canale (una volta noto il mio id).
  useEffect(() => {
    if (!mioId) return;
    const conn = apriCanaleStanza(
      sfida.codice,
      mioId,
      (r: RiepilogoRiga) => {
        setRigheAvversario((prec) => ({ ...prec, [r.riga]: { verdi: r.verdi, arancioni: r.arancioni } }));
      },
      undefined, // onGuestEntrato: gestito nel banco/lobby
      (f: FinitoMsg) => {
        if (sonoHost) registraFinale('avv', f.indovinato, f.mittente);
      },
      (e: EsitoMsg) => {
        applicaEsito({ winnerId: e.winnerId ?? null, pareggio: !!e.pareggio });
      },
      (motivo: MotivoAssenza) => gestisciAvversarioAssente(motivo), // [C7]
    );
    connessione.current = conn;
    return () => {
      fermaReinvio();
      conn.chiudi();
      connessione.current = null;
    };
  }, [mioId, sfida.codice, sonoHost, registraFinale, applicaEsito, gestisciAvversarioAssente, fermaReinvio]);

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

  // [C7] Uscita: se la partita NON è ancora decisa, "Indietro" = ABBANDONO
  // (avviso l'avversario e scrivo la mia riga come persa); poi torno al menu.
  const gestisciIndietro = useCallback(() => {
    if (!esitoRef.current) {
      connessione.current?.inviaAbbandono();
      void scriviRigaGioco('persa'); // la mia riga "lost" (guardia interna)
    }
    onIndietro?.();
  }, [onIndietro, scriviRigaGioco]);

  return (
    <SchermataGioco
      modalita={sfida.modalita}
      lunghezza={sfida.lunghezza}
      parolaForzata={sfida.parola}
      online
      onRigaConfermata={inviaRiga}
      righeAvversario={righeAvversario}
      onPartitaFinita={gestisciMioFine}
      esitoOnline={esito}
      onIndietro={gestisciIndietro}
    />
  );
}