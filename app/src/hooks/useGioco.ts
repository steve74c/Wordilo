import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  creaStato,
  digitaLettera,
  cancella as cancellaCore,
  svuotaRiga as svuotaRigaCore,
  confermaTentativo,
  timeoutTentativo as timeoutTentativoCore,
  coloriTastiera,
  CONFIG_DEFAULT,
  pescaParolaCasuale,
} from '@wordilo/core';
import type {
  LunghezzaParola,
  Modalita,
  ProblemaConferma,
  StatoGioco,
} from '@wordilo/core';

/**
 * Ponte fra il motore `core` (puro) e React: tiene lo stato della partita e
 * espone le azioni per la UI. Nessuna logica di gioco vive qui: solo `useState`
 * attorno alle funzioni pure. Fa eccezione il TIMER della modalità esperto: è un
 * effetto (non logica pura), quindi vive qui e allo scadere chiama semplicemente
 * il `timeoutTentativo` del core. Espone `secondiRimasti` per la UI.
 *
 * `onFine` (opzionale) viene chiamato UNA sola volta quando la partita finisce
 * (won/lost): serve, ad esempio, ad aggiornare le statistiche. Si riarma a ogni
 * nuova partita.
 */
export function useGioco(
  modalita: Modalita,
  lunghezza: LunghezzaParola,
  onFine?: (esito: 'won' | 'lost') => void,
) {
  const nuovoStato = useCallback(
    () => creaStato(CONFIG_DEFAULT, modalita, pescaParolaCasuale(lunghezza), lunghezza),
    [modalita, lunghezza],
  );

  const [stato, setStato] = useState<StatoGioco>(nuovoStato);
  const [problema, setProblema] = useState<ProblemaConferma | null>(null);
  const [scossa, setScossa] = useState(0); // incrementa a ogni tentativo rifiutato
  const [secondiRimasti, setSecondiRimasti] = useState<number | null>(null); // countdown esperto

  // Registra l'esito una volta sola per partita (guardia con ref).
  const registrato = useRef(false);
  useEffect(() => {
    if (stato.esito === 'won' || stato.esito === 'lost') {
      if (!registrato.current) {
        registrato.current = true;
        onFine?.(stato.esito);
      }
    } else {
      registrato.current = false; // 'in_corso' → pronta la prossima partita
    }
  }, [stato.esito, onFine]);

  // ---------------------------------------------------------------------------
  // Timer della modalità esperto (effetto: vive qui, non nel core puro).
  // Countdown per tentativo: parte pieno a ogni riga, riparte dopo ogni conferma
  // o timeout, si spegne in principiante (secondiPerTentativo === null) e a fine
  // partita. Digitare/cancellare NON lo resetta (non tocca le dipendenze).
  // Allo scadere chiama `timeoutTentativo` del core, che chiude la riga.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const totale = stato.secondiPerTentativo;
    if (totale == null || stato.esito !== 'in_corso') {
      setSecondiRimasti(null);
      return;
    }

    setSecondiRimasti(totale); // nuova riga → il countdown riparte da capo
    const scadenza = Date.now() + totale * 1000;
    let scattato = false;

    const id = setInterval(() => {
      const rimastiF = (scadenza - Date.now()) / 1000;
      const rimasti = Math.max(0, Math.ceil(rimastiF));
      // Aggiorna solo quando cambia il secondo intero: pochi re-render, conta 10→1.
      setSecondiRimasti((prev) => (prev === rimasti ? prev : rimasti));
      if (rimastiF <= 0 && !scattato) {
        scattato = true;
        clearInterval(id);
        setProblema(null);
        setStato((s) => timeoutTentativoCore(s));
      }
    }, 200);

    return () => clearInterval(id);
    // Reset a ogni nuova riga (righe.length), a fine partita (esito) o cambio config.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stato.righe.length, stato.esito, stato.secondiPerTentativo]);

  const digita = useCallback((lettera: string) => {
    setProblema(null);
    setStato((s) => digitaLettera(s, lettera));
  }, []);

  const cancella = useCallback(() => {
    setProblema(null);
    setStato((s) => cancellaCore(s));
  }, []);

  // Svuota SOLO la parola in digitazione (le righe già confermate restano).
  const svuotaRiga = useCallback(() => {
    setProblema(null);
    setStato((s) => svuotaRigaCore(s));
  }, []);

  const conferma = useCallback(() => {
    setStato((s) => {
      const r = confermaTentativo(s); // validazione disattivata in questa fase
      setProblema(r.problema ?? null);
      if (r.problema) setScossa((n) => n + 1);
      return r.stato;
    });
  }, []);

  const nuovaPartita = useCallback(() => {
    setProblema(null);
    setStato(nuovoStato());
  }, [nuovoStato]);

  const tastiera = useMemo(() => coloriTastiera(stato), [stato]);

  return { stato, problema, scossa, secondiRimasti, tastiera, digita, cancella, svuotaRiga, conferma, nuovaPartita };
}
