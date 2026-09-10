// -----------------------------------------------------------------------------
// Schermata Coda casuale (🎲 Gioca online) — matchmaking SENZA codice.
// Va salvato in:  app/src/screens/SchermataCodaCasuale.tsx
//
// È la gemella "automatica" della lobby: riusa la STESSA stretta di mano
// (host aspetta 'guest-entrato'; guest si annuncia e aspetta 'host-ok'), ma al
// posto dei pulsanti crea/entra chiama trovaOCreaStanzaPubblica() all'apertura:
//   • non c'era nessuno  → sono HOST di una stanza pubblica in attesa → ATTENDO;
//   • ho trovato qualcuno → sono GUEST → mi annuncio ed ENTRO.
//
// LINGUA: la coda usa la lingua che sto usando ORA nell'app, così vengo accoppiato
// solo con chi ha la stessa lingua (oltre a stessa modalità e lunghezza).
//
// Riusa gli stili della lobby (SchermataLobby.stili) per restare identica d'aspetto.
// Indietro mentre attendo (host) → annullaStanza chiude la mia stanza pubblica.
//
// [FANTASMA] Anti-stanze-morte: se entro in una stanza pubblica il cui host se n'è
// andato (ha chiuso la scheda senza premere Indietro), la stretta di mano va in
// timeout perché non arriva mai 'host-ok'. Invece di mostrare un errore (vicolo
// cieco di ~8s), SCARTO quella stanza e RIPROVO il matchmaking escludendola: così
// trovo un altro avversario o divento host io. All'utente resta solo un
// "cerco avversario…" continuo. Cap di sicurezza a MAX_RETRY per non ciclare.
// -----------------------------------------------------------------------------
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useT } from '../i18n/LinguaUIContext';
import type { LunghezzaParola, Modalita } from '@wordilo/core';
import { ombra } from '../theme';
import { useTema } from '../temi/TemaContext';
import { useControlliLingua } from '../lingua/LinguaContext';
import { creaStili } from './SchermataLobby.stili';
import { supabase } from '../lib/supabase';
import {
  trovaOCreaStanzaPubblica,
  annullaStanza,
  pulisciStanzeVecchie,
  type ModalitaOnline,
  type Sfida,
} from '../online/stanze';
import { apriCanaleStanza, type ConnessioneStanza } from '../online/canaleStanza';

type Props = {
  modalita: Modalita;          // dalle pillole del menu
  lunghezza: LunghezzaParola;  // dalle pillole del menu
  onEntraInPartita: (sfida: Sfida) => void;
  onIndietro: () => void;
};

// Stessi tempi della lobby (stretta di mano collaudata).
const HOST_DELAY_MS = 1200;   // host: attende che 'host-ok' raggiunga il guest
const GUEST_DELAY_MS = 400;   // guest: attende che il canale si sottoscriva
const GUEST_TIMEOUT_MS = 8000; // guest: se non arriva conferma, la stanza è "morta"

// [FANTASMA] Quante stanze morte tollero prima di arrendermi con un messaggio.
// In pratica non se ne incontrano quasi mai più di una: appena un guest entra in
// una stanza fantasma la porta a 'playing', togliendola dalla pool 'waiting'.
const MAX_RETRY = 3;

type Ruolo = 'host' | 'guest';

export function SchermataCodaCasuale({ modalita, lunghezza, onEntraInPartita, onIndietro }: Props) {
  const tema = useTema();
  const t = useT();
  const styles = useMemo(() => creaStili(tema), [tema]);

  // La lingua della coda = quella che sto usando ora nell'app (non un selettore).
  const { lingua: linguaApp } = useControlliLingua();

  const [mioId, setMioId] = useState<string | null>(null);
  const [sfida, setSfida] = useState<Sfida | null>(null);
  const [ruolo, setRuolo] = useState<Ruolo | null>(null);
  const [trovato, setTrovato] = useState(false);       // avversario trovato → sto per entrare
  const [messaggio, setMessaggio] = useState<string | null>(null);

  const connessione = useRef<ConnessioneStanza | null>(null);
  const entratoRef = useRef(false);   // entro in partita una sola volta
  const scheduledRef = useRef(false); // host: ho già programmato l'ingresso
  const avviatoRef = useRef(false);   // il matchmaking parte una sola volta
  const morteRef = useRef<Set<string>>(new Set()); // [FANTASMA] id stanze scartate
  const retryRef = useRef(0);         // [FANTASMA] quante volte ho già riprovato

  // Chi sono io (serve al canale per la presenza e per filtrare i messaggi).
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMioId(data?.user?.id ?? null));
  }, []);

  // Matchmaking: cerca-o-crea una stanza pubblica, escludendo quelle già morte.
  // La usano sia l'avvio iniziale sia il retry [FANTASMA], così la logica è una sola.
  const avvia = useCallback(async () => {
    const r = await trovaOCreaStanzaPubblica(
      modalita as ModalitaOnline,
      lunghezza,
      linguaApp,
      Array.from(morteRef.current), // [FANTASMA] non ripescare stanze già scartate
    );
    if (!r.ok) {
      setMessaggio(t(r.errore));
      return;
    }
    setRuolo(r.ruolo);  // 'host' (attendo) oppure 'guest' (ho trovato, entro)
    setSfida(r.sfida);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modalita, lunghezza, linguaApp]);

  // All'apertura, appena so chi sono: pulizia residui + matchmaking (una volta sola).
  useEffect(() => {
    if (!mioId || avviatoRef.current) return;
    avviatoRef.current = true;

    pulisciStanzeVecchie(); // best-effort: rimuove mie vecchie stanze non finite
    avvia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mioId]);

  // Canale + stretta di mano: IDENTICO alla lobby. Si apre appena c'è la sfida.
  const codiceStanza = sfida?.codice ?? null;
  useEffect(() => {
    if (!codiceStanza || !mioId || !ruolo || !sfida) return;

    entratoRef.current = false;
    scheduledRef.current = false;

    const entra = (pronta: Sfida) => {
      if (entratoRef.current) return;
      entratoRef.current = true;
      onEntraInPartita(pronta);
    };

    // HOST: il guest è entrato → aspetto un attimo e parto da solo.
    const onGuestEntrato = (guestId: string) => {
      if (ruolo !== 'host' || scheduledRef.current) return;
      scheduledRef.current = true;
      setTrovato(true);
      const pronta: Sfida = { ...sfida, stato: 'playing', guestId };
      setTimeout(() => entra(pronta), HOST_DELAY_MS);
    };

    const conn = apriCanaleStanza(
      codiceStanza,
      mioId,
      () => {},        // onRiga: qui non servono i riepiloghi
      onGuestEntrato,  // solo l'host ci reagisce
    );
    connessione.current = conn;

    let annuncioTimer: ReturnType<typeof setTimeout> | null = null;
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

    // GUEST: ho già trovato l'avversario → mostro "trovato", mi annuncio ed entro.
    if (ruolo === 'guest') {
      setTrovato(true);
      const onConfermato = () => entra(sfida);
      annuncioTimer = setTimeout(() => {
        conn.annunciaIngresso(mioId, onConfermato);
      }, GUEST_DELAY_MS);

      // [FANTASMA] Se scade il tempo e non sono entrato, l'host di questa stanza
      // non risponde: la segno come morta e RIPROVO (o mi arrendo dopo MAX_RETRY).
      timeoutTimer = setTimeout(() => {
        if (entratoRef.current) return;
        if (sfida) morteRef.current.add(sfida.id);
        retryRef.current += 1;
        if (retryRef.current > MAX_RETRY) {
          setMessaggio(t('avversarioNonRisponde'));
          return;
        }
        // Torno allo stato "cerco" e rilancio il matchmaking escludendo le morte.
        // Azzerare la sfida chiude subito il canale morto (cleanup di questo effetto).
        setTrovato(false);
        setRuolo(null);
        setSfida(null);
        avvia();
      }, GUEST_TIMEOUT_MS);
    }

    return () => {
      if (annuncioTimer) clearTimeout(annuncioTimer);
      if (timeoutTimer) clearTimeout(timeoutTimer);
      conn.chiudi();
      connessione.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codiceStanza, mioId, ruolo]);

  // Indietro: se sono host ancora in attesa, chiudo la mia stanza pubblica così
  // nessuno ci entra a vuoto (stessa logica dell'Annulla della lobby).
  async function annullaEEsci() {
    if (ruolo === 'host' && sfida && !trovato) {
      try {
        await annullaStanza(sfida.id);
      } catch {
        // pazienza: scadrà con pulisciStanzeVecchie
      }
    }
    onIndietro();
  }

  // ------------------------------------------------------------------ render ---
  return (
    <LinearGradient colors={tema.gradienti.sfondo} style={styles.sfondo}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.barraTop}>
          <Pressable
            onPress={annullaEEsci}
            hitSlop={8}
            style={({ pressed }) => [styles.indietro, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.indietroTesto}>{t('indietro')}</Text>
          </Pressable>
          <Text style={styles.titolo}>{t('giocaOnlineTitolo')}</Text>
          <View style={styles.spazioDestra} />
        </View>

        <View style={styles.contenuto}>
          <Text style={styles.sottotitolo}>
            {modalita === 'esperto' ? t('labelEsperto') : t('labelPrincipiante')} · {lunghezza} {t('nLettere', { n: lunghezza }).replace(String(lunghezza) + ' ', '')}
          </Text>

          {messaggio ? (
            /* ERRORE / TIMEOUT */
            <View style={[styles.card, ombra(0.45, 26, 14, 12), styles.cardCentro]}>
              <Text style={styles.msg}>{messaggio}</Text>
              <Pressable onPress={annullaEEsci} style={styles.entraBtn}>
                <Text style={styles.entraTesto}>{t('tornaAlMenuBtn')}</Text>
              </Pressable>
            </View>
          ) : trovato ? (
            /* TROVATO: sto per entrare */
            <View style={[styles.card, ombra(0.45, 26, 14, 12), styles.cardCentro]}>
              <View style={styles.attesaRiga}>
                <ActivityIndicator color={tema.palette.accento} />
                <Text style={styles.attesaTesto}>{t('avversarioTrovato')}</Text>
              </View>
            </View>
          ) : (
            /* CERCO (guest, prima del match) / ATTENDO (host) */
            <View style={[styles.card, ombra(0.45, 26, 14, 12), styles.cardCentro]}>
              <View style={styles.attesaRiga}>
                <ActivityIndicator color={tema.palette.accento} />
                <Text style={styles.attesaTesto}>
                  {ruolo === 'host' ? t('inAttesaAvversarioCoda') : t('cercandoAvversario')}
                </Text>
              </View>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
