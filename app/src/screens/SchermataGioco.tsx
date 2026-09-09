import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { contaColori } from '@wordilo/core';
import type { LunghezzaParola, Modalita } from '@wordilo/core';
import { useGioco } from '../hooks/useGioco';
import { useStatistiche } from '../stats/statistiche';
import type { CodiceLingua } from '../lingua/LinguaContext';
import { Griglia } from '../components/Griglia';
import { Tastiera } from '../components/Tastiera';
import { Coriandoli } from '../components/Coriandoli';
import { ombra } from '../theme';
import { useTema } from '../temi/TemaContext';
import { creaStili } from './SchermataGioco.stili';
import type { StiliGioco } from './SchermataGioco.stili';
import { useControlliLingua } from '../lingua/LinguaContext';

type Props = {
  modalita?: Modalita;
  lunghezza?: LunghezzaParola;
  onIndietro?: () => void; // torna al menu

  // --- Online (tutte opzionali: se assenti, è il single player di sempre) ---
  parolaForzata?: string;   // la parola condivisa della stanza
  linguaForzata?: CodiceLingua; // la lingua della sfida (valida i tentativi su questa)
  online?: boolean;         // true = sfida online (cambia testi e nasconde "nuova partita")
  onRigaConfermata?: (riga: number, verdi: number, arancioni: number) => void; // → invia al canale
  righeAvversario?: Record<number, { verdi: number; arancioni: number }>;      // online: pallini avversario
  onPartitaFinita?: (indovinato: boolean, tentativi: number) => void;          // online: ho finito
  esitoOnline?: 'vinta' | 'persa' | 'pareggio' | null;                         // online: verdetto condiviso (host)

  // --- Rivincita (online) ---
  statoRivincita?: 'idle' | 'inviata' | 'ricevuta' | 'in-avvio' | 'rifiutata';
  onRichiediRivincita?: () => void;
  onAccettaRivincita?: () => void;
  onRifiutaRivincita?: () => void;
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

function IconaGomma({ stili }: { stili: StiliGioco }) {
  return (
    <View style={stili.gomma}>
      <View style={stili.gommaCorpo} />
      <View style={stili.gommaFascia} />
    </View>
  );
}

export function SchermataGioco({
  modalita = 'principiante',
  lunghezza = 5,
  onIndietro,
  parolaForzata,
  linguaForzata,
  online = false,
  onRigaConfermata,
  righeAvversario,
  onPartitaFinita,
  esitoOnline,
  statoRivincita = 'idle',
  onRichiediRivincita,
  onAccettaRivincita,
  onRifiutaRivincita,
}: Props) {
  const tema = useTema();
  const stili = useMemo(() => creaStili(tema), [tema]);


  // Lingua da mostrare nell'header: quella della SFIDA se online (linguaForzata),
  // altrimenti quella dell'app. Prendo la bandierina dall'elenco lingue.
  const { lingua: linguaApp, lingueDisponibili } = useControlliLingua();
  const linguaMostrata: CodiceLingua = linguaForzata ?? linguaApp;
  const bandieraLingua =
    lingueDisponibili.find((l) => l.codice === linguaMostrata)?.bandiera ?? linguaMostrata.toUpperCase();
	
	
  const { registra } = useStatistiche();
  const { stato, problema, scossa, secondiRimasti, tastiera, digita, cancella, svuotaRiga, conferma, nuovaPartita } =
    useGioco(modalita, lunghezza, registra, parolaForzata, linguaForzata); // ← 4°: parola online · 5°: lingua della sfida
  const finita = stato.esito !== 'in_corso';
  const vinta = stato.esito === 'won';

  // Online: la partita è "bloccata" se ho finito io OPPURE se è arrivato il verdetto
  // (es. l'avversario ha indovinato per primo mentre stavo ancora giocando).
  const bloccato = finita || (online && esitoOnline != null);

  const { width, height } = useWindowDimensions();
  const righe = stato.maxTentativi;

  const altezzaTasto = width < 600 ? 52 : 46;
  const keyboardH = altezzaTasto * 3 + 16;

  const HEADER_H = 92;
  const AVVISO_H = 34;
  const CONTORNO_V = 28 + 24;
  const spazioGriglia = Math.max(140, height - HEADER_H - AVVISO_H - keyboardH - CONTORNO_V);

  const gapRiga = 0.16;
  const latoAltezza = spazioGriglia / (righe + (righe - 1) * gapRiga);
  // Riserva di colonne "virtuali" per fare spazio ai badge che stanno FUORI
  // dalla griglia (la griglia è centrata): il countdown esperto a destra e —
  // soprattutto su mobile — i pallini dell'avversario a sinistra. Senza riserva
  // la griglia riempie lo schermo e i pallini (verde in testa) finivano tagliati
  // fuori dal bordo. Uso il max, non la somma, così con esperto+online le celle
  // non diventano minuscole: una riserva sufficiente copre entrambi i lati.
  const riservaEsperto = modalita === 'esperto' ? 2 : 0;
  const riservaOnline = online ? 3 : 0;
  const riserva = Math.max(riservaEsperto, riservaOnline);
  const latoLarghezza =
    (Math.min(width - 24, 470) - 6 * (lunghezza - 1)) / (lunghezza + riserva);
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
    <LinearGradient colors={tema.gradienti.sfondo} style={stili.sfondo}>
      <SafeAreaView style={stili.safe}>
        <View style={stili.contenuto}>
          <View style={stili.header}>
            <View style={stili.barraTop}>
              <Pressable
                onPress={onIndietro}
                disabled={!onIndietro}
                hitSlop={8}
                style={({ pressed }) => [
                  stili.tondo,
                  ombra(0.25, 6, 3, 3),
                  { opacity: onIndietro ? 1 : 0, transform: [{ scale: pressed ? 0.92 : 1 }] },
                ]}
              >
                <Text style={stili.tondoIcona}>←</Text>
              </Pressable>

              <Text style={stili.titolo}>Wordilo</Text>

              <Pressable
                onPress={svuotaRiga}
                hitSlop={8}
                style={({ pressed }) => [
                  stili.tondo,
                  ombra(0.25, 6, 3, 3),
                  { transform: [{ scale: pressed ? 0.92 : 1 }] },
                ]}
              >
                <IconaGomma stili={stili} />
              </Pressable>
            </View>

            <Text style={stili.sottotitolo}>
              {modalita} · {lunghezza} lettere · tentativo {tentativoCorrente}/{stato.maxTentativi} · {bandieraLingua}
            </Text>
          </View>

          {/* LAYOUT: griglia e tastiera insieme, centrate e ravvicinate */}
          <View style={stili.gioco}>
            <View style={stili.zonaAvviso}>
              {avviso && (
                <View style={stili.avviso}>
                  <Text style={stili.avvisoTesto}>{avviso}</Text>
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

            <Tastiera
              colori={tastiera}
              onLettera={digita}
              onInvio={conferma}
              onCancella={cancella}
              disabilitata={bloccato}
              altezzaTasto={altezzaTasto}
            />
          </View>
        </View>

        <Modal
          visible={popup}
          transparent
          animationType="fade"
          onRequestClose={online ? onIndietro : nuovaPartita}
        >
          <View style={stili.scrim}>
            <Coriandoli attivo={haVinto} />
            <Animated.View style={[stili.card, ombra(0.45, 26, 14, 16), { transform: [{ scale: cardScale }] }]}>
              <Text style={stili.emoji}>{haVinto ? '🎉' : esitoFin === 'pareggio' ? '🤝' : '😕'}</Text>
              <Text style={stili.esitoTitolo}>
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
              <Text style={stili.esitoSub}>
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

              {/* Online: rivincita (richiedi / accetta / rifiuta). Single: rigioca. */}
              {online ? (
                <>
                  {statoRivincita === 'idle' && (
                    <Pressable
                      onPress={onRichiediRivincita}
                      style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }], width: '100%' }]}
                    >
                      <LinearGradient
                        colors={tema.gradienti.accento}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={[stili.bottone, ombra(0.35, 10, 5, 6)]}
                      >
                        <Text style={stili.bottoneTesto}>🔁  Rivincita</Text>
                      </LinearGradient>
                    </Pressable>
                  )}

                  {statoRivincita === 'inviata' && (
                    <Text style={stili.esitoSub}>In attesa della risposta dell’avversario…</Text>
                  )}

                  {statoRivincita === 'in-avvio' && (
                    <Text style={stili.esitoSub}>Avvio della rivincita…</Text>
                  )}

                  {statoRivincita === 'ricevuta' && (
                    <>
                      <Text style={stili.esitoSub}>L’avversario chiede la rivincita</Text>
                      <Pressable
                        onPress={onAccettaRivincita}
                        style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }], width: '100%' }]}
                      >
                        <LinearGradient
                          colors={tema.gradienti.accento}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={[stili.bottone, ombra(0.35, 10, 5, 6)]}
                        >
                          <Text style={stili.bottoneTesto}>✓  Accetta</Text>
                        </LinearGradient>
                      </Pressable>
                      <Pressable onPress={onRifiutaRivincita} hitSlop={8} style={stili.linkIndietro}>
                        <Text style={stili.linkIndietroTesto}>Rifiuta</Text>
                      </Pressable>
                    </>
                  )}

                  {statoRivincita === 'rifiutata' && (
                    <Text style={stili.esitoSub}>Rivincita rifiutata.</Text>
                  )}
                </>
              ) : (
                <Pressable
                  onPress={nuovaPartita}
                  style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.97 : 1 }], width: '100%' }]}
                >
                  <LinearGradient
                    colors={tema.gradienti.accento}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[stili.bottone, ombra(0.35, 10, 5, 6)]}
                  >
                    <Text style={stili.bottoneTesto}>↻  Nuova partita</Text>
                  </LinearGradient>
                </Pressable>
              )}

              {onIndietro && (
                <Pressable onPress={onIndietro} hitSlop={8} style={stili.linkIndietro}>
                  <Text style={stili.linkIndietroTesto}>← Torna al menu</Text>
                </Pressable>
              )}
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}
