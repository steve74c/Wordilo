// -----------------------------------------------------------------------------
// Canale Realtime della stanza (C3 + ingresso guest + fine partita C5a
//  + abbandono/disconnessione C7 + RIVINCITA).
// Va salvato in:  app/src/online/canaleStanza.ts
// -----------------------------------------------------------------------------
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';
import type { Sfida } from './stanze'; // solo TIPO (import erased a compile-time)

export type RiepilogoRiga = {
  riga: number;
  verdi: number;
  arancioni: number;
  mittente: string;
};

// "Ho finito la mia partita" (indovinato o tentativi esauriti). Solo conteggi.
export type FinitoMsg = {
  mittente: string;
  indovinato: boolean;
  tentativi: number;
};

// "Verdetto ufficiale" deciso dall'HOST e uguale per entrambi.
export type EsitoMsg = {
  winnerId: string | null; // chi ha vinto; null se pareggio
  pareggio: boolean;
  mittente: string;
};

// [C7] Perché l'avversario è considerato "assente".
export type MotivoAssenza = 'uscito' | 'caduto';

// [RIVINCITA] Risposta a una richiesta di rivincita.
export type RivincitaRispostaMsg = {
  mittente: string;
  accetta: boolean;
};

// [RIVINCITA] "Nuova partita pronta": l'HOST ha creato il match della rivincita e
// lo diffonde ai due giocatori (stessa lingua/modalità/lunghezza, parola nuova).
export type RivincitaViaMsg = {
  mittente: string;
  sfida: Sfida;
};

export type ConnessioneStanza = {
  inviaRiga: (riga: number, verdi: number, arancioni: number) => void;
  annunciaIngresso: (mioId: string, onConfermato?: () => void) => void;
  inviaFinito: (indovinato: boolean, tentativi: number) => void; // "ho finito"
  inviaEsito: (winnerId: string | null, pareggio: boolean) => void; // solo l'HOST
  inviaAbbandono: () => void; // [C7] "me ne vado" (uscita esplicita)
  // [RIVINCITA]
  inviaRivincitaRichiesta: () => void;          // "voglio la rivincita"
  inviaRivincitaRisposta: (accetta: boolean) => void; // "accetto / rifiuto"
  inviaRivincitaVia: (sfida: Sfida) => void;    // solo l'HOST: "nuova partita pronta"
  chiudi: () => Promise<void>;
};

function nomeCanale(codiceStanza: string): string {
  return `stanza:${codiceStanza.trim().toUpperCase()}`;
}

// [C7] Attesa prima di dichiarare "caduto" un avversario sparito dalla presenza:
// copre i blip di rete brevi (se rientra entro questo tempo, si annulla).
const GRAZIA_MS = 6000;

/**
 * Apre il canale della stanza.
 *
 * @param onRiga               riepilogo-riga ricevuto DALL'AVVERSARIO (pallini)
 * @param onGuestEntrato       (opzionale) lo usa l'HOST: scatta quando il guest entra
 * @param onFinito             (opzionale) lo usa l'HOST: l'avversario ha finito
 * @param onEsito              (opzionale) il verdetto ufficiale è arrivato
 * @param onAvversarioAssente  (opzionale) [C7] l'avversario è uscito o è caduto
 * @param onRivincitaRichiesta (opzionale) [RIVINCITA] l'avversario chiede la rivincita
 * @param onRivincitaRisposta  (opzionale) [RIVINCITA] l'avversario ha accettato/rifiutato
 * @param onRivincitaVia       (opzionale) [RIVINCITA] la nuova partita è pronta (dall'host)
 */
export function apriCanaleStanza(
  codiceStanza: string,
  mioId: string,
  onRiga: (r: RiepilogoRiga) => void,
  onGuestEntrato?: (guestId: string) => void,
  onFinito?: (f: FinitoMsg) => void,
  onEsito?: (e: EsitoMsg) => void,
  onAvversarioAssente?: (motivo: MotivoAssenza) => void, // [C7]
  onRivincitaRichiesta?: () => void,                     // [RIVINCITA]
  onRivincitaRisposta?: (accetta: boolean) => void,      // [RIVINCITA]
  onRivincitaVia?: (sfida: Sfida) => void,               // [RIVINCITA]
): ConnessioneStanza {
  const canale: RealtimeChannel = supabase.channel(nomeCanale(codiceStanza), {
    config: {
      broadcast: { self: false },
      presence: { key: mioId }, // [C7] ognuno si "traccia" con il proprio id
    },
  });

  // 1) Riepiloghi-riga (C3).
  canale.on('broadcast', { event: 'riga' }, ({ payload }) => {
    const r = payload as RiepilogoRiga;
    if (r?.mittente && r.mittente !== mioId) onRiga(r);
  });

  // 2) Ingresso guest → l'host reagisce e CONFERMA.
  canale.on('broadcast', { event: 'guest-entrato' }, ({ payload }) => {
    const guestId = (payload as { guestId: string })?.guestId;
    if (!guestId || guestId === mioId) return;
    onGuestEntrato?.(guestId);
    canale.send({ type: 'broadcast', event: 'host-ok', payload: { versoGuest: guestId } });
  });

  // 3) L'avversario ha finito (lo ascolta l'host per decidere l'esito).
  canale.on('broadcast', { event: 'finito' }, ({ payload }) => {
    const f = payload as FinitoMsg;
    if (f?.mittente && f.mittente !== mioId) onFinito?.(f);
  });

  // 4) Verdetto ufficiale (arriva dall'host; self:false → non ricevo il mio).
  canale.on('broadcast', { event: 'esito' }, ({ payload }) => {
    onEsito?.(payload as EsitoMsg);
  });

  // 5) [C7] Abbandono esplicito dell'avversario (ha premuto "Indietro").
  canale.on('broadcast', { event: 'abbandono' }, ({ payload }) => {
    const m = (payload as { mittente: string })?.mittente;
    if (m && m !== mioId) onAvversarioAssente?.('uscito');
  });

  // 6) [RIVINCITA] L'avversario chiede la rivincita.
  canale.on('broadcast', { event: 'rivincita-richiesta' }, ({ payload }) => {
    const m = (payload as { mittente: string })?.mittente;
    if (m && m !== mioId) onRivincitaRichiesta?.();
  });

  // 7) [RIVINCITA] L'avversario ha accettato o rifiutato la rivincita.
  canale.on('broadcast', { event: 'rivincita-risposta' }, ({ payload }) => {
    const r = payload as RivincitaRispostaMsg;
    if (r?.mittente && r.mittente !== mioId) onRivincitaRisposta?.(!!r.accetta);
  });

  // 8) [RIVINCITA] La nuova partita è pronta (la manda solo l'HOST).
  canale.on('broadcast', { event: 'rivincita-via' }, ({ payload }) => {
    const v = payload as RivincitaViaMsg;
    if (v?.mittente && v.mittente !== mioId && v.sfida) onRivincitaVia?.(v.sfida);
  });

  // 9) [C7] Presenza: se l'avversario "cade", parte un'attesa di grazia; se
  //    rientra entro GRAZIA_MS si annulla, altrimenti lo dichiariamo "caduto".
  let graceTimer: ReturnType<typeof setTimeout> | null = null;
  const annullaGrace = () => {
    if (graceTimer) {
      clearTimeout(graceTimer);
      graceTimer = null;
    }
  };
  // Vero se, guardando lo stato di presenza REALE del canale, c'è ancora una
  // chiave diversa dalla mia (= l'avversario è presente).
  const avversarioAncoraPresente = (): boolean => {
    try {
      const stato = canale.presenceState() as Record<string, unknown>;
      return Object.keys(stato).some((k) => k !== mioId);
    } catch {
      return false;
    }
  };
  canale.on('presence', { event: 'leave' }, ({ key }) => {
    if (!key || key === mioId) return; // non me stesso
    if (graceTimer) return; // già in attesa
    graceTimer = setTimeout(() => {
      graceTimer = null;
      // IMPORTANTE: prima di dichiarare "caduto", ricontrollo la presenza reale.
      // Durante il passaggio lobby→partita ognuno CHIUDE il canale-lobby e ne
      // APRE uno nuovo sulla stessa stanza: la chiusura del lobby emette un
      // 'leave' "fantasma" mentre l'avversario è in realtà presente (col suo
      // canale-partita). Senza questo controllo scattava una vittoria automatica
      // "in 0 tentativi" pochi secondi dopo l'inizio. Se l'avversario risulta
      // ancora presente, il leave era un fantasma → non dichiaro nulla.
      if (!avversarioAncoraPresente()) onAvversarioAssente?.('caduto');
    }, GRAZIA_MS);
  });
  canale.on('presence', { event: 'join' }, ({ key }) => {
    if (key && key !== mioId) annullaGrace(); // l'avversario è (ri)comparso
  });

  // Alla sottoscrizione, mi "traccio" nella presenza del canale.
  canale.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      canale.track({ id: mioId });
    }
  });

  const inviaRiga = (riga: number, verdi: number, arancioni: number) => {
    canale.send({
      type: 'broadcast',
      event: 'riga',
      payload: { riga, verdi, arancioni, mittente: mioId } as RiepilogoRiga,
    });
  };

  const inviaFinito = (indovinato: boolean, tentativi: number) => {
    canale.send({
      type: 'broadcast',
      event: 'finito',
      payload: { mittente: mioId, indovinato, tentativi } as FinitoMsg,
    });
  };

  const inviaEsito = (winnerId: string | null, pareggio: boolean) => {
    canale.send({
      type: 'broadcast',
      event: 'esito',
      payload: { winnerId, pareggio, mittente: mioId } as EsitoMsg,
    });
  };

  // [C7] Uscita esplicita: avviso l'avversario che me ne vado.
  const inviaAbbandono = () => {
    canale.send({ type: 'broadcast', event: 'abbandono', payload: { mittente: mioId } });
  };

  // [RIVINCITA] "Voglio la rivincita".
  const inviaRivincitaRichiesta = () => {
    canale.send({ type: 'broadcast', event: 'rivincita-richiesta', payload: { mittente: mioId } });
  };

  // [RIVINCITA] "Accetto / rifiuto".
  const inviaRivincitaRisposta = (accetta: boolean) => {
    canale.send({
      type: 'broadcast',
      event: 'rivincita-risposta',
      payload: { mittente: mioId, accetta } as RivincitaRispostaMsg,
    });
  };

  // [RIVINCITA] "Nuova partita pronta" (la manda solo l'HOST).
  const inviaRivincitaVia = (sfida: Sfida) => {
    canale.send({
      type: 'broadcast',
      event: 'rivincita-via',
      payload: { mittente: mioId, sfida } as RivincitaViaMsg,
    });
  };

  // Il GUEST: annuncia l'ingresso e RIBATTE finché l'host non conferma.
  const annunciaIngresso = (idGuest: string, onConfermato?: () => void) => {
    let confermato = false;
    let tentativi = 0;

    canale.on('broadcast', { event: 'host-ok' }, ({ payload }) => {
      if ((payload as { versoGuest: string })?.versoGuest === idGuest && !confermato) {
        confermato = true;
        onConfermato?.();
      }
    });

    const invia = () => {
      canale.send({ type: 'broadcast', event: 'guest-entrato', payload: { guestId: idGuest } });
    };

    invia();
    const timer = setInterval(() => {
      tentativi += 1;
      if (confermato || tentativi >= 5) {
        clearInterval(timer);
        return;
      }
      invia();
    }, 800);
  };

  const chiudi = async () => {
    annullaGrace(); // [C7] non lasciare timer pendenti
    await supabase.removeChannel(canale);
  };

  return {
    inviaRiga,
    annunciaIngresso,
    inviaFinito,
    inviaEsito,
    inviaAbbandono,
    inviaRivincitaRichiesta,
    inviaRivincitaRisposta,
    inviaRivincitaVia,
    chiudi,
  };
}
