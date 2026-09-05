// -----------------------------------------------------------------------------
// Stanze online (C2) — creare ed entrare in una sfida col codice.
// Va salvato in:  app/src/online/stanze.ts
//
// Questo file NON tocca la UI né il Realtime (quello è C3). Sono solo le due
// operazioni sul database:
//   • creaStanza  → l'host apre una nuova sfida e riceve un codice da condividere.
//   • entraInStanza → il guest usa quel codice per unirsi.
//
// Regola d'oro della v1: host e guest devono avere la STESSA parola. Per questo
// la parola si sceglie dal DATABASE (funzione SQL parola_casuale), che ci dà
// l'id da salvare nella stanza; entrambi poi leggono quello stesso word_id.
// -----------------------------------------------------------------------------
import { supabase } from '../lib/supabase';
import { normalizzaParola } from '@wordilo/core';
import type { LunghezzaParola } from '@wordilo/core';

// Le modalità giocabili online (il single player "esperto/principiante" vale anche qui).
export type ModalitaOnline = 'principiante' | 'esperto';

// Cos'è una "sfida" dal punto di vista dell'app, una volta creata o entrati.
// La `parola` è già normalizzata (accenti rimossi, maiuscola) e pronta per il core.
export type Sfida = {
  id: string;
  codice: string;
  modalita: ModalitaOnline;
  lunghezza: LunghezzaParola;
  parola: string;        // il target, uguale per entrambi i giocatori
  hostId: string;
  guestId: string | null;
  stato: 'waiting' | 'playing' | 'finished';
};

export type RisultatoStanza =
  | { ok: true; sfida: Sfida }
  | { ok: false; errore: string };

// Codice-stanza breve e leggibile: 5 caratteri, niente lettere/numeri ambigui
// (via O/0, I/1, ecc.) per dettarlo a voce senza sbagliare.
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function generaCodice(lunghezza = 5): string {
  let out = '';
  for (let i = 0; i < lunghezza; i++) {
    out += ALFABETO[Math.floor(Math.random() * ALFABETO.length)];
  }
  return out;
}

// Chiede al database una parola-bersaglio della lunghezza richiesta.
// Ritorna { id, testo } oppure null se qualcosa va storto.
async function pescaParolaDalDb(
  lunghezza: LunghezzaParola,
): Promise<{ id: number; testo: string } | null> {
  const { data, error } = await supabase.rpc('parola_casuale', { lunghezza });
  if (error || !data || data.length === 0) return null;
  // La funzione restituisce una tabella: prendiamo la prima (unica) riga.
  const riga = Array.isArray(data) ? data[0] : data;
  if (!riga?.id || !riga?.word) return null;
  return { id: riga.id, testo: normalizzaParola(riga.word) };
}

/**
 * CREA STANZA (host).
 * Sceglie la parola dal DB, genera un codice unico e inserisce la riga in matches
 * con status='waiting'. Riprova con un nuovo codice se — raro — ne esce uno già preso.
 */
export async function creaStanza(
  modalita: ModalitaOnline,
  lunghezza: LunghezzaParola,
): Promise<RisultatoStanza> {
  // 1) Chi sono io? (serve host_id, e conferma che siamo loggati)
  const { data: auth } = await supabase.auth.getUser();
  const utente = auth?.user;
  if (!utente) return { ok: false, errore: 'Devi essere loggato per creare una stanza.' };

  // 2) Parola dal database (stessa per entrambi i giocatori).
  const parola = await pescaParolaDalDb(lunghezza);
  if (!parola) return { ok: false, errore: 'Nessuna parola disponibile per questa lunghezza.' };

  // 3) Inserimento, con qualche tentativo in caso di collisione del codice.
  for (let tentativo = 0; tentativo < 5; tentativo++) {
    const codice = generaCodice();
    const { data, error } = await supabase
      .from('matches')
      .insert({
        room_code: codice,
        mode: modalita,
        word_id: parola.id,
        word_length: lunghezza,
        host_id: utente.id,
        status: 'waiting',
      })
      .select()
      .single();

    if (!error && data) {
      return {
        ok: true,
        sfida: {
          id: data.id,
          codice: data.room_code,
          modalita: data.mode,
          lunghezza: data.word_length,
          parola: parola.testo,
          hostId: data.host_id,
          guestId: data.guest_id,
          stato: data.status,
        },
      };
    }
    // Codice duplicato (violazione unique) → riprova con un altro. Altri errori: esci.
    if (error && error.code !== '23505') {
      return { ok: false, errore: 'Non è stato possibile creare la stanza.' };
    }
  }
  return { ok: false, errore: 'Troppi tentativi di generare un codice. Riprova.' };
}

/**
 * ENTRA IN STANZA (guest).
 * Trova la stanza in attesa col codice dato, vi scrive il proprio guest_id e la
 * porta a status='playing'. Legge poi la parola (via word_id) per poter giocare.
 */
export async function entraInStanza(codiceGrezzo: string): Promise<RisultatoStanza> {
  const codice = codiceGrezzo.trim().toUpperCase();
  if (codice.length < 4) return { ok: false, errore: 'Codice non valido.' };

  const { data: auth } = await supabase.auth.getUser();
  const utente = auth?.user;
  if (!utente) return { ok: false, errore: 'Devi essere loggato per entrare in una stanza.' };

  // 1) Cerca la stanza in attesa con quel codice.
  const { data: stanza, error: errCerca } = await supabase
    .from('matches')
    .select('*')
    .eq('room_code', codice)
    .eq('status', 'waiting')
    .maybeSingle();

  if (errCerca) return { ok: false, errore: 'Errore nella ricerca della stanza.' };
  if (!stanza) return { ok: false, errore: 'Nessuna stanza in attesa con questo codice.' };
  if (stanza.host_id === utente.id)
    return { ok: false, errore: 'Non puoi entrare nella tua stessa stanza.' };

  // 2) Occupa il posto: scrivi guest_id e passa a 'playing'.
  //    Il controllo guest_id IS NULL evita che due persone entrino insieme.
  const { data: aggiornata, error: errEntra } = await supabase
    .from('matches')
    .update({ guest_id: utente.id, status: 'playing' })
    .eq('id', stanza.id)
    .is('guest_id', null)
    .select()
    .single();

  if (errEntra || !aggiornata)
    return { ok: false, errore: 'La stanza è già stata occupata da un altro giocatore.' };

  // 3) Recupera il testo della parola dal word_id salvato nella stanza.
  const { data: parolaRow, error: errParola } = await supabase
    .from('words')
    .select('word')
    .eq('id', aggiornata.word_id)
    .single();

  if (errParola || !parolaRow)
    return { ok: false, errore: 'Impossibile leggere la parola della sfida.' };

  return {
    ok: true,
    sfida: {
      id: aggiornata.id,
      codice: aggiornata.room_code,
      modalita: aggiornata.mode,
      lunghezza: aggiornata.word_length,
      parola: normalizzaParola(parolaRow.word),
      hostId: aggiornata.host_id,
      guestId: aggiornata.guest_id,
      stato: aggiornata.status,
    },
  };
}