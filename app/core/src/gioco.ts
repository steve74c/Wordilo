import type { Colore, ConfigGioco, LunghezzaParola, Modalita } from './types';
import { valutaTentativo } from './valutaTentativo';
import { normalizzaParola } from './normalizza';

// -----------------------------------------------------------------------------
// Motore di gioco PURO per il single player.
//
// Sono tutte funzioni pure (stato in → stato nuovo out): nessun timer, nessun
// React, niente effetti collaterali. Il timer (che è un effetto) vive nella UI:
// allo scadere, la UI chiama semplicemente `timeoutTentativo`. Così le tre
// modalità differiscono solo per CONFIGURAZIONE, non per codice.
// -----------------------------------------------------------------------------

// Esito di una partita single player.
export type Esito = 'in_corso' | 'won' | 'lost';

// Una riga già "chiusa": confermata dall'utente oppure persa per timeout.
export interface Riga {
  parola: string; // parola inserita; '' se la riga è stata persa per timeout
  colori: Colore[]; // valutazione; [] se persa per timeout (nessun colore)
  persaPerTimeout: boolean;
}

// Stato completo di una partita single player.
// NB: `target` è qui perché nel SINGLE PLAYER la valutazione è locale. Nell'online
// il target NON starà mai nel client: lì valuta il server (Edge Function).
export interface StatoGioco {
  modalita: Modalita;
  lunghezza: LunghezzaParola;
  maxTentativi: number;
  secondiPerTentativo: number | null; // dalla config: null = niente timer
  target: string; // già normalizzato
  righe: Riga[]; // righe chiuse, in ordine
  rigaCorrente: string; // input in digitazione (già normalizzato)
  esito: Esito;
}

// Cosa può impedire di confermare un tentativo.
export type ProblemaConferma = 'incompleta' | 'non_valida';

/** Crea lo stato iniziale di una partita, leggendo i parametri dalla config. */
export function creaStato(
  config: ConfigGioco,
  modalita: Modalita,
  target: string,
  lunghezza: LunghezzaParola,
): StatoGioco {
  const targetNorm = normalizzaParola(target);
  if (targetNorm.length !== lunghezza) {
    throw new Error(
      `creaStato: la parola "${targetNorm}" non ha lunghezza ${lunghezza}.`,
    );
  }
  const imp = config[modalita];
  return {
    modalita,
    lunghezza,
    maxTentativi: imp.maxTentativi,
    secondiPerTentativo: imp.secondiPerTentativo,
    target: targetNorm,
    righe: [],
    rigaCorrente: '',
    esito: 'in_corso',
  };
}

/** Aggiunge una lettera alla riga corrente (se c'è spazio e la partita è in corso). */
export function digitaLettera(stato: StatoGioco, lettera: string): StatoGioco {
  if (stato.esito !== 'in_corso') return stato;
  if (stato.rigaCorrente.length >= stato.lunghezza) return stato;

  const l = normalizzaParola(lettera);
  if (!/^[A-Z]$/.test(l)) return stato; // solo singole lettere (accenti già tolti)

  return { ...stato, rigaCorrente: stato.rigaCorrente + l };
}

/** Cancella l'ultima lettera della riga corrente. */
export function cancella(stato: StatoGioco): StatoGioco {
  if (stato.esito !== 'in_corso') return stato;
  if (stato.rigaCorrente.length === 0) return stato;
  return { ...stato, rigaCorrente: stato.rigaCorrente.slice(0, -1) };
}

/**
 * Svuota la riga in DIGITAZIONE (la parola non ancora confermata), senza toccare
 * le righe già chiuse né la parola target: la partita prosegue dallo stesso punto.
 * È l'azione del pulsante ↻ nella schermata di gioco.
 */
export function svuotaRiga(stato: StatoGioco): StatoGioco {
  if (stato.esito !== 'in_corso') return stato;
  if (stato.rigaCorrente.length === 0) return stato;
  return { ...stato, rigaCorrente: '' };
}

/**
 * Conferma la riga corrente.
 * - Se la riga non è piena → `{ problema: 'incompleta' }`, stato invariato.
 * - Se `isValida` boccia la parola → `{ problema: 'non_valida' }`, stato invariato.
 * - Altrimenti valuta, aggiunge la riga e aggiorna l'esito.
 *
 * `isValida` è INIETTABILE: default = sempre valido (validazione disattivata in
 * questa fase). Basterà passargli il lookup del dizionario quando ci sarà.
 */
export function confermaTentativo(
  stato: StatoGioco,
  isValida: (parola: string) => boolean = () => true,
): { stato: StatoGioco; problema?: ProblemaConferma } {
  if (stato.esito !== 'in_corso') return { stato };

  if (stato.rigaCorrente.length !== stato.lunghezza) {
    return { stato, problema: 'incompleta' };
  }
  if (!isValida(stato.rigaCorrente)) {
    return { stato, problema: 'non_valida' };
  }

  const colori = valutaTentativo(stato.rigaCorrente, stato.target);
  const nuovaRiga: Riga = {
    parola: stato.rigaCorrente,
    colori,
    persaPerTimeout: false,
  };
  const righe = [...stato.righe, nuovaRiga];

  const indovinata = colori.every((c) => c === 'green');
  const esito: Esito = indovinata
    ? 'won'
    : righe.length >= stato.maxTentativi
      ? 'lost'
      : 'in_corso';

  return { stato: { ...stato, righe, rigaCorrente: '', esito } };
}

/**
 * Scadenza del tempo in modalità esperto.
 * Decisione presa (opzione A): la riga è PERSA SENZA VALUTAZIONE — ciò che era
 * stato digitato si scarta e non riceve colori — ma il timeout CONSUMA un
 * tentativo. Se era l'ultimo → partita persa.
 */
export function timeoutTentativo(stato: StatoGioco): StatoGioco {
  if (stato.esito !== 'in_corso') return stato;

  const rigaPersa: Riga = { parola: '', colori: [], persaPerTimeout: true };
  const righe = [...stato.righe, rigaPersa];

  const esito: Esito = righe.length >= stato.maxTentativi ? 'lost' : 'in_corso';

  return { ...stato, righe, rigaCorrente: '', esito };
}

// Priorità colore per la tastiera: verde batte arancione, arancione batte grigio.
const PRIORITA: Record<Colore, number> = { grey: 0, orange: 1, green: 2 };

/**
 * Colore da mostrare su ogni tasto della tastiera a schermo: per ogni lettera si
 * tiene il colore "migliore" visto nei tentativi finora. Le righe perse per
 * timeout non hanno lettere, quindi non influenzano la tastiera.
 */
export function coloriTastiera(stato: StatoGioco): Record<string, Colore> {
  const mappa: Record<string, Colore> = {};
  for (const riga of stato.righe) {
    if (riga.persaPerTimeout) continue;
    for (let i = 0; i < riga.parola.length; i++) {
      const lettera = riga.parola[i];
      const colore = riga.colori[i];
      const attuale = mappa[lettera];
      if (attuale === undefined || PRIORITA[colore] > PRIORITA[attuale]) {
        mappa[lettera] = colore;
      }
    }
  }
  return mappa;
}


/**
 * Riepilogo di UNA riga per l'online: quante lettere verdi e quante arancioni.
 * Serve a comunicare all'avversario l'andamento SENZA rivelare le lettere
 * (regola v1/§5.3: si trasmettono solo i conteggi). Una riga persa per timeout
 * ha `colori: []` → 0 e 0.
 */
export function contaColori(riga: Riga): { verdi: number; arancioni: number } {
  let verdi = 0;
  let arancioni = 0;
  for (const c of riga.colori) {
    if (c === 'green') verdi++;
    else if (c === 'orange') arancioni++;
  }
  return { verdi, arancioni };
}