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
//
// MULTILINGUA: la sfida ha anche una LINGUA (it/en), salvata nella colonna `lang`
// di matches. È una proprietà della sfida, uguale per entrambi i giocatori: così
// tutti e due validano i tentativi sullo stesso dizionario, non su quello locale.
// La parola bersaglio si pesca dal DB NELLA LINGUA della sfida: parola_casuale ora
// prende anche p_lang (default 'it' lato DB), così l'host inglese ottiene una
// parola inglese.
// -----------------------------------------------------------------------------
import { supabase } from '../lib/supabase';
import { normalizzaParola } from '@wordilo/core';
import type { LunghezzaParola } from '@wordilo/core';

// Le modalità giocabili online (il single player "esperto/principiante" vale anche qui).
export type ModalitaOnline = 'principiante' | 'esperto';

// La lingua della sfida. È lo stesso 'it' | 'en' usato da LinguaContext (CodiceLingua)
// e dal core (Lingua): lo ridefiniamo qui per non dipendere dall'export del barrel
// del core. Essendo una semplice unione di stringhe resta compatibile con gli altri.
export type LinguaSfida = 'it' | 'en';

// Cos'è una "sfida" dal punto di vista dell'app, una volta creata o entrati.
// La `parola` è già normalizzata (accenti rimossi, maiuscola) e pronta per il core.
export type Sfida = {
  id: string;
  codice: string;
  modalita: ModalitaOnline;
  lunghezza: LunghezzaParola;
  lingua: LinguaSfida;   // lingua della sfida, uguale per entrambi i giocatori
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

// Chiede al database una parola-bersaglio della lunghezza e della LINGUA richieste.
// Passa p_lang alla funzione SQL parola_casuale(lunghezza, p_lang).
// Ritorna { id, testo } oppure null se qualcosa va storto.
async function pescaParolaDalDb(
  lunghezza: LunghezzaParola,
  lingua: LinguaSfida,
): Promise<{ id: number; testo: string } | null> {
  const { data, error } = await supabase.rpc('parola_casuale', {
    lunghezza,
    p_lang: lingua,
  });
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
 *
 * `lingua` è opzionale con default 'it' come rete di sicurezza (uguale al default
 * della colonna nel DB): dal sotto-passo 3 la lobby passerà sempre la lingua scelta
 * dall'host, quindi in pratica non si userà mai il default.
 */
export async function creaStanza(
  modalita: ModalitaOnline,
  lunghezza: LunghezzaParola,
  lingua: LinguaSfida = 'it',
): Promise<RisultatoStanza> {
  // 1) Chi sono io? (serve host_id, e conferma che siamo loggati)
  const { data: auth } = await supabase.auth.getUser();
  const utente = auth?.user;
  if (!utente) return { ok: false, errore: 'Devi essere loggato per creare una stanza.' };

  // 2) Parola dal database NELLA LINGUA della sfida (stessa per entrambi i giocatori).
  const parola = await pescaParolaDalDb(lunghezza, lingua);
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
        lang: lingua,          // ← lingua della sfida salvata nel DB
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
          lingua: data.lang,      // ← riletta dalla riga appena salvata
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
 * La LINGUA della sfida si eredita dalla stanza (colonna `lang`): il guest gioca
 * nella lingua scelta dall'host, non nella propria lingua locale.
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
      lingua: aggiornata.lang,      // ← lingua ereditata dalla stanza dell'host
      parola: normalizzaParola(parolaRow.word),
      hostId: aggiornata.host_id,
      guestId: aggiornata.guest_id,
      stato: aggiornata.status,
    },
  };
}


/**
 * PULISCE le stanze vecchie non finite dell'utente corrente.
 * Le partite online durano pochi minuti: qualsiasi stanza propria non 'finished'
 * più vecchia di 10 minuti è per forza un residuo mai chiuso. La RLS permette
 * questa delete solo sulle PROPRIE stanze oltre la finestra dei 10 minuti, quindi
 * non tocca mai una sfida in corso. Va chiamata all'apertura della lobby.
 */
export async function pulisciStanzeVecchie(): Promise<void> {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const utente = auth?.user;
    if (!utente) return;

    await supabase
      .from('matches')
      .delete()
      .eq('host_id', utente.id)
      .neq('status', 'finished')
      .lt('created_at', new Date(Date.now() - 10 * 60 * 1000).toISOString());
  } catch {
    // pulizia "best effort": un errore qui non deve bloccare la lobby
  }
}

/**
 * ANNULLA STANZA (host) — quando preme "Indietro" mentre attende.
 * La stanza è appena creata (0 minuti), quindi la delete NON passerebbe la RLS
 * (che ora richiede >10 minuti). La chiudiamo invece portandola a 'finished' con
 * la policy di UPDATE già esistente dell'host: esce dalle "in attesa" e non
 * intercetta più nessun guest. Il residuo 'finished' è ignorato ovunque.
 */
export async function annullaStanza(idSfida: string): Promise<void> {
  try {
    await supabase
      .from('matches')
      .update({ status: 'finished', finished_at: new Date().toISOString() })
      .eq('id', idSfida)
      .eq('status', 'waiting');
  } catch {
    // se non riesce, la stanza scadrà comunque con pulisciStanzeVecchie
  }
}


/**
 * CREA LA RIVINCITA (solo HOST).
 * Apre un NUOVO match sulla falsariga di quello appena concluso: stessa
 * modalità, lunghezza e lingua, con guest già noto e status 'playing' (i due
 * giocatori sono già insieme, niente handshake). La parola è NUOVA (pescata dal
 * DB nella lingua della sfida). Ritorna la Sfida pronta da giocare.
 *
 * Solo l'host può inserire in matches (RLS: `insert with check host_id = auth.uid()`),
 * quindi questa funzione è pensata per essere chiamata dall'host. Se la chiama un
 * altro, esce con un errore leggibile.
 */
export async function creaRivincita(precedente: Sfida): Promise<RisultatoStanza> {
  const { data: auth } = await supabase.auth.getUser();
  const utente = auth?.user;
  if (!utente) return { ok: false, errore: 'Devi essere loggato per la rivincita.' };
  if (utente.id !== precedente.hostId) {
    return { ok: false, errore: 'Solo l’host può avviare la rivincita.' };
  }

  // Parola nuova, stessa lunghezza e lingua della sfida precedente.
  const parola = await pescaParolaDalDb(precedente.lunghezza, precedente.lingua);
  if (!parola) return { ok: false, errore: 'Nessuna parola disponibile per la rivincita.' };

  // Inserimento con qualche tentativo in caso di collisione del codice.
  for (let tentativo = 0; tentativo < 5; tentativo++) {
    const codice = generaCodice();
    const { data, error } = await supabase
      .from('matches')
      .insert({
        room_code: codice,
        mode: precedente.modalita,
        word_id: parola.id,
        word_length: precedente.lunghezza,
        lang: precedente.lingua,
        host_id: utente.id,
        guest_id: precedente.guestId, // già noto: partita a due, nessun handshake
        status: 'playing',            // parte subito
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
          lingua: data.lang,
          parola: parola.testo,
          hostId: data.host_id,
          guestId: data.guest_id,
          stato: data.status,
        },
      };
    }
    // Codice duplicato (unique) → riprova; altri errori → esci.
    if (error && error.code !== '23505') {
      return { ok: false, errore: 'Non è stato possibile creare la rivincita.' };
    }
  }
  return { ok: false, errore: 'Troppi tentativi di generare un codice. Riprova.' };
}


// -----------------------------------------------------------------------------
// CODA CASUALE (🎲 Gioca veloce) — accoppiamento senza codice.
// Aggiunta additiva: NON tocca creaStanza/entraInStanza (la modalità col codice
// resta identica). Le stanze della coda sono marcate `is_public = true`, così un
// giocatore casuale non finisce mai in una stanza privata creata per un amico.
// -----------------------------------------------------------------------------

// Esito dell'accoppiamento: come RisultatoStanza, ma dice anche il RUOLO —
//   • 'guest' → sono entrato in una stanza già in attesa: la partita PARTE subito.
//   • 'host'  → non c'era nessuno, ho creato io la stanza pubblica: sono IN ATTESA.
// La schermata d'attesa usa `ruolo` per sapere cosa mostrare.
export type RisultatoCoda =
  | { ok: true; ruolo: 'host' | 'guest'; sfida: Sfida }
  | { ok: false; errore: string };

/**
 * TROVA-O-CREA una stanza pubblica (coda casuale).
 *
 * Regola anti-corsa: PRIMA prova a ENTRARE in una stanza pubblica compatibile già
 * in attesa; solo se non ne trova nessuna libera CREA la propria e aspetta. Così,
 * se due giocatori premono "Gioca veloce" nello stesso istante, al più uno crea e
 * l'altro entra — e se provano a entrare nella stessa stanza, la guardia
 * `guest_id IS NULL` sull'update fa vincere uno solo; l'altro ricade sul candidato
 * successivo o crea la sua.
 *
 * "Compatibile" = stessa modalità, lunghezza e lingua (la scelta fatta dall'utente
 * nel menu). Le stanze proprie sono escluse (non gioco contro me stesso).
 */
export async function trovaOCreaStanzaPubblica(
  modalita: ModalitaOnline,
  lunghezza: LunghezzaParola,
  lingua: LinguaSfida,
): Promise<RisultatoCoda> {
  // 1) Chi sono io?
  const { data: auth } = await supabase.auth.getUser();
  const utente = auth?.user;
  if (!utente) return { ok: false, errore: 'Devi essere loggato per giocare online.' };

  // 2) PRIMA CERCA: stanze pubbliche in attesa, compatibili, non mie.
  //    Le ordino dalla più vecchia: chi aspetta da più tempo viene accoppiato prima.
  const { data: candidate, error: errCerca } = await supabase
    .from('matches')
    .select('*')
    .eq('is_public', true)
    .eq('status', 'waiting')
    .is('guest_id', null)
    .eq('mode', modalita)
    .eq('word_length', lunghezza)
    .eq('lang', lingua)
    .neq('host_id', utente.id)
    .order('created_at', { ascending: true })
    .limit(10);

  if (errCerca) return { ok: false, errore: 'Errore nella ricerca di un avversario.' };

  // 3) Se ci sono candidate, provo a ENTRARE nella prima ancora libera.
  //    L'update passa solo se guest_id è ANCORA vuoto: se qualcuno l'ha occupata
  //    nel frattempo, l'update non aggiorna nulla e passo al candidato successivo.
  for (const stanza of candidate ?? []) {
    const { data: aggiornata, error: errEntra } = await supabase
      .from('matches')
      .update({ guest_id: utente.id, status: 'playing' })
      .eq('id', stanza.id)
      .is('guest_id', null)
      .eq('status', 'waiting')
      .select()
      .single();

    if (errEntra || !aggiornata) continue; // occupata da un altro → prova la prossima

    // Entrato! Leggo il testo della parola dal word_id della stanza.
    const { data: parolaRow, error: errParola } = await supabase
      .from('words')
      .select('word')
      .eq('id', aggiornata.word_id)
      .single();
    if (errParola || !parolaRow)
      return { ok: false, errore: 'Impossibile leggere la parola della sfida.' };

    return {
      ok: true,
      ruolo: 'guest',
      sfida: {
        id: aggiornata.id,
        codice: aggiornata.room_code,
        modalita: aggiornata.mode,
        lunghezza: aggiornata.word_length,
        lingua: aggiornata.lang,
        parola: normalizzaParola(parolaRow.word),
        hostId: aggiornata.host_id,
        guestId: aggiornata.guest_id,
        stato: aggiornata.status,
      },
    };
  }

  // 4) Nessuno con cui accoppiarsi (o me le hanno soffiate tutte): CREO io una
  //    stanza pubblica in attesa. Identica a creaStanza, ma con is_public = true.
  const parola = await pescaParolaDalDb(lunghezza, lingua);
  if (!parola) return { ok: false, errore: 'Nessuna parola disponibile per questa lunghezza.' };

  for (let tentativo = 0; tentativo < 5; tentativo++) {
    const codice = generaCodice();
    const { data, error } = await supabase
      .from('matches')
      .insert({
        room_code: codice,
        mode: modalita,
        word_id: parola.id,
        word_length: lunghezza,
        lang: lingua,
        host_id: utente.id,
        status: 'waiting',
        is_public: true,       // ← la sola differenza dalla stanza col codice
      })
      .select()
      .single();

    if (!error && data) {
      return {
        ok: true,
        ruolo: 'host',
        sfida: {
          id: data.id,
          codice: data.room_code,
          modalita: data.mode,
          lunghezza: data.word_length,
          lingua: data.lang,
          parola: parola.testo,
          hostId: data.host_id,
          guestId: data.guest_id,
          stato: data.status,
        },
      };
    }
    if (error && error.code !== '23505') {
      return { ok: false, errore: 'Non è stato possibile creare la stanza.' };
    }
  }
  return { ok: false, errore: 'Troppi tentativi di generare un codice. Riprova.' };
}
