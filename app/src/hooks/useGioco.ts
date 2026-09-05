import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  creaStato,
  digitaLettera,
  cancella as cancellaCore,
  svuotaRiga as svuotaRigaCore,
  confermaTentativo,
  timeoutTentativo as timeoutTentativoCore,
  coloriTastiera,
  pescaParolaCasuale,
  parolaValida,
} from '@wordilo/core';
import type {
  LunghezzaParola,
  Modalita,
  ProblemaConferma,
  StatoGioco,
} from '@wordilo/core';
import { useConfig } from '../config/ConfigContext';
import type { FinePartita } from '../stats/statistiche';

/**
 * Ponte fra il motore `core` (puro) e React: tiene lo stato della partita e
 * espone le azioni per la UI. Nessuna logica di gioco vive qui: solo `useState`
 * attorno alle funzioni pure. Fa eccezione il TIMER della modalità esperto: è un
 * effetto (non logica pura), quindi vive qui e allo scadere chiama semplicemente
 * il `timeoutTentativo` del core. Espone `secondiRimasti` per la UI.
 *
 * `onFine` (opzionale) viene chiamato UNA sola volta quando la partita finisce
 * (won/lost), con il riepilogo della partita (esito, modalità, lunghezza,
 * tentativi usati): serve a salvarla e ad aggiornare le statistiche. Si riarma a
 * ogni nuova partita.
 */
export function useGioco(
  modalita: Modalita,
  lunghezza: LunghezzaParola,
  onFine?: (fine: FinePartita) => void,
  parolaForzata?: string, // ← online: usa QUESTA parola invece di pescarne una a caso
) {
  // La config arriva dal provider (Supabase, con fallback ai default): il timer
  // di 25s e gli altri numeri vengono dal database, non più da CONFIG_DEFAULT.
  const { config } = useConfig();

  const nuovoStato = useCallback(
    () =>
      creaStato(
        config,
        modalita,
        // Online: la parola è fissata dalla stanza (uguale per i due giocatori).
        // Single player: nessuna parola forzata → si pesca a caso come sempre.
        parolaForzata ?? pescaParolaCasuale(lunghezza),
        lunghezza,
      ),
    [config, modalita, lunghezza, parolaForzata],
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
        onFine?.({
          esito: stato.esito,
          modalita,
          lunghezza,
          tentativiUsati: stato.righe.length,
        });
      }
    } else {
      registrato.current = false; // 'in_corso' → pronta la prossima partita
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      // Validazione attiva: la parola deve esistere nel dizionario italiano.
      const r = confermaTentativo(s, (parola) => parolaValida(parola, s.lunghezza));
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
