// -----------------------------------------------------------------------------
// Schermata Lobby online (1b) — crea/entra stanza + attesa avversario in Realtime
// con INGRESSO AUTOMATICO in partita (niente più bottone manuale del banco).
// Va salvato in:  app/src/screens/SchermataLobby.tsx
//
// Come funziona (riuso la stretta di mano già collaudata nel banco):
//   • HOST  → "Crea stanza": creaStanza(modalita, lunghezza), mostra il codice e
//     apre il canale. Appena arriva 'guest-entrato', aspetta un attimo (perché il
//     'host-ok' raggiunga il guest) e poi ENTRA IN PARTITA da solo.
//   • GUEST → digita il codice, "Entra": entraInStanza(codice) (il DB porta la
//     stanza a 'playing' ed eredita modalità/lunghezza dell'host), apre il canale,
//     annuncia l'ingresso e appena riceve 'host-ok' ENTRA IN PARTITA.
//   • Nessuno dei due entra prima che la stretta di mano sia completa.
//
// Indietro dell'HOST mentre attende → annullaStanza(id) cancella la riga 'waiting'
// così non restano residui in matches.
//
// NB (tema): schermata migrata al sistema temi (useTema + creaStili). La LOGICA
// online (crea/entra, canale, handshake) è invariata: sono cambiati solo i colori.
// -----------------------------------------------------------------------------
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { LunghezzaParola, Modalita } from '@wordilo/core';
import { ombra } from '../theme';
import { useTema } from '../temi/TemaContext';
import { creaStili } from './SchermataLobby.stili';
import { supabase } from '../lib/supabase';
import {
  creaStanza,
  entraInStanza,
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

// Ritardo dell'HOST prima di entrare, per lasciar arrivare 'host-ok' al guest.
const HOST_DELAY_MS = 1200;
// Attesa del GUEST prima di annunciarsi (il canale si sta sottoscrivendo).
const GUEST_DELAY_MS = 400;
// Se dopo questo tempo il guest non riceve conferma, mostra un messaggio.
const GUEST_TIMEOUT_MS = 8000;

type Ruolo = 'host' | 'guest';

export function SchermataLobby({ modalita, lunghezza, onEntraInPartita, onIndietro }: Props) {
  const tema = useTema();
  const styles = useMemo(() => creaStili(tema), [tema]);

  const [mioId, setMioId] = useState<string | null>(null);
  const [codiceInput, setCodiceInput] = useState('');
  const [occupato, setOccupato] = useState(false);      // durante crea/entra
  const [sfida, setSfida] = useState<Sfida | null>(null);
  const [ruolo, setRuolo] = useState<Ruolo | null>(null);
  const [trovato, setTrovato] = useState(false);        // avversario trovato → sto per entrare
  const [messaggio, setMessaggio] = useState<string | null>(null);

  const connessione = useRef<ConnessioneStanza | null>(null);
  const entratoRef = useRef(false);   // guardia: entro in partita una sola volta
  const scheduledRef = useRef(false); // host: ho già programmato l'ingresso

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMioId(data?.user?.id ?? null));
  }, []);

  // (2c) All'apertura della lobby, spazza via le proprie stanze vecchie non finite.
  useEffect(() => {
    pulisciStanzeVecchie();
  }, []);

  // Canale della stanza: si apre appena c'è una sfida (host dopo Crea, guest dopo
  // Entra). Keyed su codice + mioId + ruolo, come nel banco.
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
      () => {},          // onRiga: in lobby non servono i riepiloghi
      onGuestEntrato,    // solo l'host ci reagisce
    );
    connessione.current = conn;

    let annuncioTimer: ReturnType<typeof setTimeout> | null = null;
    let timeoutTimer: ReturnType<typeof setTimeout> | null = null;

    // GUEST: mi annuncio e, appena ricevo 'host-ok', entro.
    if (ruolo === 'guest') {
      const onConfermato = () => entra(sfida);
      annuncioTimer = setTimeout(() => {
        conn.annunciaIngresso(mioId, onConfermato);
      }, GUEST_DELAY_MS);
      timeoutTimer = setTimeout(() => {
        if (!entratoRef.current) {
          setMessaggio('L’avversario non risponde. Torna indietro e riprova.');
        }
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

  async function onCrea() {
    setOccupato(true);
    setMessaggio(null);
    try {
      const r = await creaStanza(modalita as ModalitaOnline, lunghezza);
      if (r.ok) {
        setRuolo('host');
        setSfida(r.sfida);
      } else {
        setMessaggio(r.errore);
      }
    } finally {
      setOccupato(false);
    }
  }

  async function onEntra() {
    const codice = codiceInput.trim();
    if (codice.length < 4) {
      setMessaggio('Inserisci un codice valido.');
      return;
    }
    setOccupato(true);
    setMessaggio(null);
    try {
      const r = await entraInStanza(codice);
      if (r.ok) {
        setRuolo('guest');
        setSfida(r.sfida); // già 'playing', modalità/lunghezza ereditate dall'host
      } else {
        setMessaggio(r.errore);
      }
    } finally {
      setOccupato(false);
    }
  }

  // Indietro: l'host che era in attesa cancella la sua stanza 'waiting'.
  async function annullaEEsci() {
    if (ruolo === 'host' && sfida && !trovato) {
      try {
        await annullaStanza(sfida.id);
      } catch {
        // se non riesce, pazienza: la stanza scadrà nella pulizia (passo 2)
      }
    }
    onIndietro();
  }

  // ------------------------------------------------------------------ render ---

  const inAttesa = !!sfida && !trovato && !messaggio;

  return (
    <LinearGradient colors={tema.gradienti.sfondo} style={styles.sfondo}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.barraTop}>
          <Pressable
            onPress={annullaEEsci}
            hitSlop={8}
            style={({ pressed }) => [styles.indietro, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.indietroTesto}>‹ Indietro</Text>
          </Pressable>
          <Text style={styles.titolo}>Sfida online</Text>
          <View style={styles.spazioDestra} />
        </View>

        <View style={styles.contenuto}>
          <Text style={styles.sottotitolo}>
            {modalita === 'esperto' ? 'Esperto' : 'Principiante'} · {lunghezza} lettere
          </Text>

          {/* SCELTA: né sfida attiva né messaggio bloccante */}
          {!sfida && (
            <View style={[styles.card, ombra(0.45, 26, 14, 12)]}>
              <Text style={styles.eyebrow}>CREA UNA STANZA</Text>
              <Text style={styles.spiega}>
                Apri una stanza e detta il codice al tuo avversario.
              </Text>
              <Pressable
                onPress={onCrea}
                disabled={occupato}
                style={({ pressed }) => [styles.creaWrap, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
              >
                <LinearGradient
                  colors={tema.gradienti.accento}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.crea, ombra(0.4, 14, 7, 8), occupato && { opacity: 0.6 }]}
                >
                  <Text style={styles.creaTesto}>＋  Crea stanza</Text>
                </LinearGradient>
              </Pressable>

              <View style={styles.oppure}>
                <View style={styles.oppureLinea} />
                <Text style={styles.oppureTesto}>oppure</Text>
                <View style={styles.oppureLinea} />
              </View>

              <Text style={styles.eyebrow}>ENTRA COL CODICE</Text>
              <TextInput
                value={codiceInput}
                onChangeText={(t) => setCodiceInput(t.toUpperCase())}
                placeholder="es. K7P2Q"
                placeholderTextColor={tema.palette.testoTenue}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={6}
                style={styles.input}
              />
              <Pressable
                onPress={onEntra}
                disabled={occupato}
                style={({ pressed }) => [styles.entraBtn, { opacity: pressed || occupato ? 0.7 : 1 }]}
              >
                <Text style={styles.entraTesto}>Entra nella stanza</Text>
              </Pressable>
            </View>
          )}

          {/* ATTESA HOST: mostro il codice + spinner */}
          {sfida && ruolo === 'host' && inAttesa && (
            <View style={[styles.card, ombra(0.45, 26, 14, 12), styles.cardCentro]}>
              <Text style={styles.eyebrow}>IL TUO CODICE</Text>
              <Text style={styles.codice}>{sfida.codice}</Text>
              <Text style={styles.spiega}>Dettalo all'avversario.</Text>
              <View style={styles.attesaRiga}>
                <ActivityIndicator color={tema.palette.accento} />
                <Text style={styles.attesaTesto}>In attesa dell'avversario…</Text>
              </View>
            </View>
          )}

          {/* ATTESA GUEST: connessione in corso */}
          {sfida && ruolo === 'guest' && inAttesa && (
            <View style={[styles.card, ombra(0.45, 26, 14, 12), styles.cardCentro]}>
              <View style={styles.attesaRiga}>
                <ActivityIndicator color={tema.palette.accento} />
                <Text style={styles.attesaTesto}>Mi collego alla stanza…</Text>
              </View>
            </View>
          )}

          {/* TROVATO: sto per entrare (host o guest) */}
          {sfida && trovato && (
            <View style={[styles.card, ombra(0.45, 26, 14, 12), styles.cardCentro]}>
              <View style={styles.attesaRiga}>
                <ActivityIndicator color={tema.palette.accento} />
                <Text style={styles.attesaTesto}>Avversario trovato! Avvio…</Text>
              </View>
            </View>
          )}

          {/* MESSAGGIO (errore o timeout) */}
          {messaggio && (
            <View style={[styles.card, ombra(0.45, 26, 14, 12), styles.cardCentro]}>
              <Text style={styles.msg}>{messaggio}</Text>
              <Pressable onPress={annullaEEsci} style={styles.entraBtn}>
                <Text style={styles.entraTesto}>Torna al menu</Text>
              </Pressable>
            </View>
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
