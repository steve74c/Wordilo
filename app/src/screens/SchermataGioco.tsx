import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { contaColori } from '@wordilo/core';
import type { LunghezzaParola, Modalita } from '@wordilo/core';
import { useGioco } from '../hooks/useGioco';
import { useStatistiche } from '../stats/statistiche';
import { Griglia } from '../components/Griglia';
import { Tastiera } from '../components/Tastiera';
import { Coriandoli } from '../components/Coriandoli';
import { C, FONT, GRAD, ombra, bagliore } from '../theme';

type Props = {
  modalita?: Modalita;
  lunghezza?: LunghezzaParola;
  onIndietro?: () => void; // torna al menu (foto 1)

  // --- Online (tutte opzionali: se assenti, la schermata è il single player di sempre) ---
  parolaForzata?: string;   // la parola condivisa della stanza
  online?: boolean;         // true = sfida online (cambia testi e nasconde "nuova partita")
  onRigaConfermata?: (riga: number, verdi: number, arancioni: number) => void; // → invia al canale
  righeAvversario?: Record<number, { verdi: number; arancioni: number }>; // online: pallini avversario
  onPartitaFinita?: (indovinato: boolean, tentativi: number) => void; // online: avvisa che ho finito
  esitoOnline?: 'vinta' | 'persa' | 'pareggio' | null; // online: verdetto condiviso deciso dall'host
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

// Iconcina "gomma": corpo chiaro + fascetta teal, leggermente inclinata.
function IconaGomma() {
  return (
    <View style={styles.gomma}>
      <View style={styles.gommaCorpo} />
      <View style={styles.gommaFascia} />
    </View>
  );
}

export function SchermataGioco({
  modalita = 'principiante',
  lunghezza = 5,
  onIndietro,
  parolaForzata,
  online = false,
  onRigaConfermata,
  righeAvversario,
  onPartitaFinita,
  esitoOnline,
}: Props) {
  const { registra } = useStatistiche();
  const { stato, problema, scossa, secondiRimasti, tastiera, digita, cancella, svuotaRiga, conferma, nuovaPartita } =
    useGioco(modalita, lunghezza, registra, parolaForzata); // ← 4° argomento: la parola online
  const finita = stato.esito !== 'in_corso';
  const vinta = stato.esito === 'won';

  // Online: la partita è "bloccata" se ho finito io OPPURE se è arrivato il verdetto
  // (es. l'avversario ha indovinato per primo mentre stavo ancora giocando).
  const bloccato = finita || (online && esitoOnline != null);

  const { width, height } = useWindowDimensions();
  const righe = stato.maxTentativi;

  // Altezza dei tasti (condivisa con la Tastiera per il calcolo dello spazio).
  const altezzaTasto = width < 600 ? 52 : 46;
  const keyboardH = altezzaTasto * 3 + 16; // 3 righe + 2 gap da 8

  // Spazio verticale che resta per la griglia (stime prudenti del "contorno").
  const HEADER_H = 92; // barra top (48) + sottotitolo + padding
  const AVVISO_H = 34;
  const CONTORNO_V = 28 + 24; // padding verticali + margine di sicurezza
  const spazioGriglia = Math.max(140, height - HEADER_H - AVVISO_H - keyboardH - CONTORNO_V);

  // Lato cella: il minore fra il vincolo di LARGHEZZA e quello di ALTEZZA,
  // così la griglia entra sempre sopra la tastiera su qualsiasi schermo.
  const gapRiga = 0.16; // ~ rapporto del margine fra righe
  const latoAltezza = spazioGriglia / (righe + (righe - 1) * gapRiga);
  // In esperto riserviamo ~2 "colonne" di larghezza: la griglia resta centrata e
  // il countdown, che sporge a destra della riga attiva, non esce mai dallo schermo.
  const riservaEsperto = modalita === 'esperto' ? 2 : 0;
  const latoLarghezza =
    (Math.min(width - 24, 470) - 6 * (lunghezza - 1)) / (lunghezza + riservaEsperto);
  const lato = clamp(Math.min(latoLarghezza, latoAltezza), 30, 64);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const onKey = (e: KeyboardEvent) => {
      if (bloccato) return;
      if (e.key === 'Enter') conferma();
      else if (e.key === 'Backspace') cancella();
      else if (/^[a-zA-Zàèéìòù]$/.test(e.key)) digita(e.key);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bloccato, conferma, cancella, digita]);

  // Online: ogni volta che compare una NUOVA riga confermata, spedisci il suo
  // riepilogo (verdi/arancioni) al canale. Salta le righe perse per timeout.
  const righeInviate = useRef(0);
  useEffect(() => {
    if (!onRigaConfermata) return;
    for (let i = righeInviate.current; i < stato.righe.length; i++) {
      const riga = stato.righe[i];
      if (!riga.persaPerTimeout) {
        const { verdi, arancioni } = contaColori(riga);
        onRigaConfermata(i, verdi, arancioni);
      }
    }
    righeInviate.current = stato.righe.length;
  }, [stato.righe, onRigaConfermata]);

  // Online: appena la MIA partita finisce, avvisa il contenitore (una volta sola).
  const notificato = useRef(false);
  useEffect(() => {
    if (!online || !onPartitaFinita) return;
    if (finita && !notificato.current) {
      notificato.current = true;
      onPartitaFinita(vinta, stato.righe.length);
    }
  }, [online, finita, vinta, onPartitaFinita, stato.righe.length]);

  // Esito da mostrare nel pop-up: online = verdetto condiviso; altrimenti locale.
  const esitoFin: 'vinta' | 'persa' | 'pareggio' =
    online ? esitoOnline ?? 'persa' : vinta ? 'vinta' : 'persa';
  const haVinto = esitoFin === 'vinta';

  // Quando aprire il pop-up: single → appena finisco; online → all'arrivo dell'esito.
  const prontoPopup = online ? esitoOnline != null : finita;
  const [popup, setPopup] = useState(false);
  useEffect(() => {
    if (!prontoPopup) {
      setPopup(false);
      return;
    }
    const t = setTimeout(() => setPopup(true), 780);
    return () => clearTimeout(t);
  }, [prontoPopup]);

  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (popup) {
      anim.setValue(0);
      Animated.spring(anim, { toValue: 1, friction: 7, tension: 70, useNativeDriver: true }).start();
    }
  }, [popup, anim]);

  const avviso =
    online && bloccato && esitoOnline == null
      ? 'Hai finito · in attesa dell\'avversario…'
      : problema === 'incompleta'
        ? 'Parola incompleta'
        : problema === 'non_valida'
          ? 'Parola non valida'
          : null;

  const cardScale = anim.interpolate({ inputRange: [0, 1], outputRange: [0.88, 1] });

  const tentativoCorrente = finita
    ? stato.righe.length
    : Math.min(stato.righe.length + 1, stato.maxTentativi);

  return (
    <LinearGradient colors={GRAD.sfondo} style={styles.sfondo}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.contenuto}>
          <View style={styles.header}>
            <View style={styles.barraTop}>
              <Pressable
                onPress={onIndietro}
                disabled={!onIndietro}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.tondo,
                  ombra(0.25, 6, 3, 3),
                  { opacity: onIndietro ? 1 : 0, transform: [{ scale: pressed ? 0.92 : 1 }] },
                ]}
              >
                <Text style={styles.tondoIcona}>←</Text>
              </Pressable>

              <Text style={styles.titolo}>Wordilo</Text>

              <Pressable
                onPress={svuotaRiga}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.tondo,
                  ombra(0.25, 6, 3, 3),
                  { transform: [{ scale: pressed ? 0.92 : 1 }] },
                ]}
              >
                <IconaGomma />
              </Pressable>
            </View>

            <Text style={styles.sottotitolo}>
              {modalita} · {lunghezza} lettere · tentativo {tentativoCorrente}/{stato.maxTentativi}
            </Text>
          </View>

          {/* Area griglia: flessibile e centrata, non può sovrapporsi alla tastiera */}
          <View style={styles.gioco}>
            <View style={styles.zonaAvviso}>
              {avviso && (
                <View style={styles.avviso}>
                  <Text style={styles.avvisoTesto}>{avviso}</Text>
                </View>
              )}
            </View>
            <Griglia
              stato={stato}
              lato={lato}
              scossa={scossa}
              secondiRimasti={secondiRimasti}
              righeAvversario={righeAvversario}
            />
          </View>

          <Tastiera
            colori={tastiera}
            onLettera={digita}
            onInvio={conferma}
            onCancella={cancella}
            disabilitata={bloccato}
            altezzaTasto={altezzaTasto}
          />
        </View>

        <Modal visible={popup} transparent animationType="fade" onRequestClose={online ? onIndietro : nuovaPartita}>
          <View style={styles.scrim}>
            <Coriandoli attivo={haVinto} />
            <Animated.View style={[styles.card, ombra(0.45, 26, 14, 16), { transform: [{ scale: cardScale }] }]}>
              <Text style={styles.emoji}>{haVinto ? '🎉' : esitoFin === 'pareggio' ? '🤝' : '😕'}</Text>
              <Text style={styles.esitoTitolo}>
                {online
                  ? haVinto
                    ? 'Hai vinto!'
                    : esitoFin === 'pareggio'
                      ? 'Pareggio!'
                      : 'Hai perso!'
                  : haVinto
                    ? 'Indovinata!'
                    : 'Peccato!'}
              </Text>
              <Text style={styles.esitoSub}>
                {online
                  ? haVinto
                    ? `In ${stato.righe.length} ${stato.righe.length === 1 ? 'tentativo' : 'tentativi'}`
                    : esitoFin === 'pareggio'
                      ? `Nessuno ha indovinato. La parola era ${stato.target}`
                      : `La parola era ${stato.target}`
                  : haVinto
                    ? `In ${stato.righe.length} ${stato.righe.length === 1 ? 'tentativo' : 'tentativi'}`
                    : `La parola era ${stato.target}`}
              </Text>

              {!online && (
                <Pressable
                  onPress={nuovaPartita}
                  style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }], width: '100%' }]}
                >
                  <LinearGradient
                    colors={GRAD.accento}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[styles.bottone, ombra(0.35, 10, 5, 6)]}
                  >
                    <Text style={styles.bottoneTesto}>↻  Nuova partita</Text>
                  </LinearGradient>
                </Pressable>
              )}

              {onIndietro && (
                <Pressable onPress={onIndietro} hitSlop={8} style={styles.linkIndietro}>
                  <Text style={styles.linkIndietroTesto}>← Torna al menu</Text>
                </Pressable>
              )}
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1 },
  safe: { flex: 1 },
  contenuto: {
    flex: 1,
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
  },
  header: { paddingTop: 4, paddingBottom: 6, gap: 8 },
  barraTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tondo: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: C.superficieAlta,
    borderWidth: 1,
    borderColor: C.hair,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tondoIcona: { color: C.testo, fontSize: 22, fontFamily: FONT.bold, fontWeight: '800', marginTop: -1 },
  gomma: {
    width: 22,
    height: 15,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.35)',
    transform: [{ rotate: '-18deg' }],
  },
  gommaCorpo: { flex: 2, backgroundColor: '#EAF6F4' },
  gommaFascia: { flex: 1, backgroundColor: C.accento },
  titolo: {
    flex: 1,
    textAlign: 'center',
    color: C.accentoSoft,
    fontSize: 30,
    fontFamily: FONT.serif,
    fontWeight: '600',
    letterSpacing: 0.5,
    ...bagliore(C.glow, 20),
  },
  sottotitolo: {
    color: C.accentoTenue,
    fontSize: 13,
    fontFamily: FONT.medium,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  gioco: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 4 },
  zonaAvviso: { height: 34, justifyContent: 'center' },
  avviso: {
    backgroundColor: C.superficieAlta,
    borderWidth: 1,
    borderColor: C.hair,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  avvisoTesto: { color: C.testo, fontSize: 14, fontFamily: FONT.medium, fontWeight: '600' },
  scrim: { flex: 1, backgroundColor: C.scrim, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: 'rgba(16,40,47,0.97)',
    borderColor: C.hair,
    borderWidth: 1,
    borderRadius: 22,
    padding: 26,
    alignItems: 'center',
    gap: 6,
  },
  emoji: { fontSize: 44, marginBottom: 2 },
  esitoTitolo: { color: C.testo, fontSize: 24, fontFamily: FONT.black, fontWeight: '900' },
  esitoSub: { color: C.testoTenue, fontSize: 15, fontFamily: FONT.regular, marginBottom: 18, textAlign: 'center' },
  bottone: { width: '100%', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
  bottoneTesto: { color: '#052722', fontSize: 16, fontFamily: FONT.bold, fontWeight: '800' },
  linkIndietro: { marginTop: 14, paddingVertical: 6 },
  linkIndietroTesto: { color: C.testoTenue, fontSize: 14, fontFamily: FONT.medium, fontWeight: '600' },
});