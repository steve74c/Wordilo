// -----------------------------------------------------------------------------
// AIUTI a pagamento (monete): lettera arancione, lettera verde, tempo extra.
// Va salvato in:  app/src/economia/aiuti.ts
//
// COSA si vende, a QUANTO e DOVE lo decide la tabella `aiuti` su Supabase
// (Table Editor): niente valori cablati qui. Il pagamento lo fa il server
// (RPC `compra_aiuto`), che controlla anche il limite per partita.
// File puro: ritorna codici d'errore, non testi tradotti.
// -----------------------------------------------------------------------------
import { useEffect, useState } from 'react';
import type { Modalita } from '@SpotLex/core';
import { supabase } from '../lib/supabase';

export type TipoAiuto = 'lettera_arancione' | 'lettera_verde' | 'tempo';

export type ConfigAiuto = {
  tipo: TipoAiuto;
  modalita: Modalita;
  costo: number;
  attivo: boolean;
  inSolo: boolean;
  inOnline: boolean;
  maxPerPartita: number;
  valore: number | null; // 'tempo': secondi in più
  ordine: number;
};

type RigaAiuto = {
  tipo: TipoAiuto;
  modalita: Modalita;
  costo: number;
  attivo: boolean;
  in_solo: boolean;
  in_online: boolean;
  max_per_partita: number;
  valore: number | null;
  ordine: number;
};

// Cache di modulo: la tabella si legge una volta per avvio dell'app.
let cache: ConfigAiuto[] | null = null;
let inCorso: Promise<ConfigAiuto[]> | null = null;

export function caricaAiuti(): Promise<ConfigAiuto[]> {
  if (cache) return Promise.resolve(cache);
  if (inCorso) return inCorso;
  inCorso = (async () => {
    try {
      const { data, error } = await supabase
        .from('aiuti')
        .select('tipo, modalita, costo, attivo, in_solo, in_online, max_per_partita, valore, ordine');
      // Errore o tabella mancante → nessun aiuto (l'app resta giocabile).
      if (error || !data) return [];
      cache = (data as RigaAiuto[]).map((r) => ({
        tipo: r.tipo,
        modalita: r.modalita,
        costo: r.costo,
        attivo: r.attivo,
        inSolo: r.in_solo,
        inOnline: r.in_online,
        maxPerPartita: r.max_per_partita,
        valore: r.valore,
        ordine: r.ordine,
      }));
      return cache;
    } catch {
      return [];
    } finally {
      inCorso = null;
    }
  })();
  return inCorso;
}

/** Aiuti acquistabili in questa partita (modalità + da solo/online), già ordinati. */
export function useAiutiDisponibili(modalita: Modalita, online: boolean): ConfigAiuto[] {
  const [tutti, setTutti] = useState<ConfigAiuto[]>(cache ?? []);
  useEffect(() => {
    let vivo = true;
    caricaAiuti().then((a) => vivo && setTutti(a));
    return () => {
      vivo = false;
    };
  }, []);
  return tutti
    .filter((a) => a.modalita === modalita && a.attivo && a.maxPerPartita > 0 && (online ? a.inOnline : a.inSolo))
    .sort((a, b) => a.ordine - b.ordine);
}

type Esito<T> = { ok: true; valore: T } | { ok: false; errore: string };

function codiceErrore(msg: string | undefined): string {
  const noti = ['MONETE_INSUFFICIENTI', 'LIMITE_AIUTO', 'AIUTO_NON_DISPONIBILE', 'NON_PARTECIPANTE', 'NON_AUTENTICATO'];
  return noti.find((c) => msg?.includes(c)) ?? 'ERRORE_RETE';
}

/** Paga un aiuto. `partita` = id della partita (per il limite "per partita"). */
export async function compraAiuto(
  tipo: TipoAiuto,
  modalita: Modalita,
  partita: string,
  matchId?: string | null,
): Promise<Esito<{ saldo: number; costo: number; valore: number | null }>> {
  const { data, error } = await supabase.rpc('compra_aiuto', {
    p_tipo: tipo,
    p_modalita: modalita,
    p_partita: partita,
    p_match_id: matchId ?? null,
  });
  if (error) return { ok: false, errore: codiceErrore(error.message) };
  return { ok: true, valore: data as { saldo: number; costo: number; valore: number | null } };
}

/** Id casuale per una partita da solo (non serve che sia un vero uuid). */
export function nuovoIdPartita(): string {
  return `solo-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}
