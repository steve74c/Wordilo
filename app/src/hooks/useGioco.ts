import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  creaStato,
  digitaLettera,
  cancella as cancellaCore,
  svuotaRiga as svuotaRigaCore,
  confermaTentativo,
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
 * attorno alle funzioni pure. Il timer NON è qui (arriverà con la modalità
 * esperto, come effetto separato).
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

  return { stato, problema, scossa, tastiera, digita, cancella, svuotaRiga, conferma, nuovaPartita };
}
