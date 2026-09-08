import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import type { Colore, StatoGioco } from '@wordilo/core';
import { useTema } from '../temi/TemaContext';
import { creaStili } from './Griglia.stili';
import type { StiliGriglia, ColoriGriglia } from './Griglia.stili';

// Riepilogo dell'avversario per una riga (online): solo conteggi (mai le lettere).
type RiepilogoAvversario = { verdi: number; arancioni: number };

type StatoCella =
  | { tipo: 'vuota'; attiva: boolean }
  | { tipo: 'inserita'; lettera: string }
  | { tipo: 'valutata'; lettera: string; colore: Colore };

function celleDi(stato: StatoGioco): StatoCella[][] {
  const rigaAttiva = stato.esito === 'in_corso' ? stato.righe.length : -1;
  const righe: StatoCella[][] = [];
  for (let r = 0; r < stato.maxTentativi; r++) {
    const colonne: StatoCella[] = [];
    if (r < stato.righe.length) {
      const riga = stato.righe[r];
      for (let c = 0; c < stato.lunghezza; c++) {
        if (riga.persaPerTimeout) colonne.push({ tipo: 'vuota', attiva: false });
        else colonne.push({ tipo: 'valutata', lettera: riga.parola[c], colore: riga.colori[c] });
      }
    } else if (r === rigaAttiva) {
      for (let c = 0; c < stato.lunghezza; c++) {
        const lettera = stato.rigaCorrente[c];
        colonne.push(lettera ? { tipo: 'inserita', lettera } : { tipo: 'vuota', attiva: true });
      }
    } else {
      for (let c = 0; c < stato.lunghezza; c++) colonne.push({ tipo: 'vuota', attiva: false });
    }
    righe.push(colonne);
  }
  return righe;
}

function Cella({
  cella,
  lato,
  indiceColonna,
  raggio,
  stili,
  colori,
}: {
  cella: StatoCella;
  lato: number;
  indiceColonna: number;
  raggio: number;
  stili: StiliGriglia;
  colori: ColoriGriglia;
}) {
  const flip = useRef(new Animated.Value(cella.tipo === 'valutata' ? 1 : 0)).current;
  const pop = useRef(new Animated.Value(1)).current;
  const eraPiena = useRef(cella.tipo === 'inserita');

  useEffect(() => {
    if (cella.tipo === 'valutata') {
      flip.setValue(0);
      Animated.timing(flip, { toValue: 1, duration: 320, delay: indiceColonna * 90, useNativeDriver: true }).start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cella.tipo, (cella as any).colore]);

  useEffect(() => {
    const pienaOra = cella.tipo === 'inserita';
    if (pienaOra && !eraPiena.current) {
      pop.setValue(0.72);
      Animated.spring(pop, { toValue: 1, friction: 5, tension: 220, useNativeDriver: true }).start();
    }
    eraPiena.current = pienaOra;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cella.tipo, (cella as any).lettera]);

  const dim = { width: lato, height: lato, borderRadius: raggio } as const;
  const dimTesto = { fontSize: Math.round(lato * 0.46) } as const;

  if (cella.tipo === 'valutata') {
    const rotateX = flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['90deg', '0deg', '0deg'] });
    const opacity = flip.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] });
    return (
      <Animated.View
        style={[
          stili.cella,
          dim,
          { backgroundColor: colori.valutata(cella.colore) },
          { opacity, transform: [{ perspective: 400 }, { rotateX }] },
        ]}
      >
        {/* cella piena → lettera bianca */}
        <Text style={[stili.lettera, dimTesto, { color: colori.letteraValutata }]}>{cella.lettera}</Text>
      </Animated.View>
    );
  }

  const bg =
    cella.tipo === 'inserita' ? colori.cellaInserita : cella.attiva ? colori.cellaAttiva : colori.cellaVuota;
  const bordo =
    cella.tipo === 'inserita' ? colori.bordoInserita : cella.attiva ? colori.bordoAttiva : colori.bordoVuota;

  return (
    <Animated.View
      style={[
        stili.cella,
        stili.cellaVuota,
        dim,
        { backgroundColor: bg, borderColor: bordo, transform: [{ scale: pop }] },
      ]}
    >
      {/* cella non valutata → lettera col testo del tema (scura sul chiaro) */}
      {cella.tipo === 'inserita' && (
        <Text style={[stili.lettera, dimTesto, { color: colori.letteraCella }]}>{cella.lettera}</Text>
      )}
    </Animated.View>
  );
}

// Badge del countdown (modalità esperto): cerchio a DESTRA della riga attiva.
function Countdown({
  secondi,
  lato,
  stili,
  colori,
}: {
  secondi: number;
  lato: number;
  stili: StiliGriglia;
  colori: ColoriGriglia;
}) {
  const size = Math.max(26, Math.round(lato * 0.8));
  const pop = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    pop.setValue(0.8);
    Animated.spring(pop, { toValue: 1, friction: 4, tension: 260, useNativeDriver: true }).start();
  }, [secondi, pop]);

  // Ultimi 5 secondi: il cerchietto si RIEMPIE di rosso e il numero diventa
  // bianco (allarme netto). Sopra i 5s resta tutto com'era: fondo tenue, numero
  // e bordo col colore accento del tema.
  const inAllarme = secondi <= 5;
  const coloreBordo = inAllarme ? colori.countdownAllarme : colori.countdownNormale;
  const coloreFondo = inAllarme ? colori.countdownAllarme : colori.countdownSfondo;
  const coloreNumero = inAllarme ? colori.countdownTestoAllarme : colori.countdownNormale;
  const gap = Math.max(6, Math.round(lato * 0.16));

  return (
    <Animated.View
      style={[
        stili.countdown,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          top: (lato - size) / 2,
          backgroundColor: coloreFondo,
          borderColor: coloreBordo,
          transform: [{ translateX: gap }, { scale: pop }],
        },
      ]}
    >
      <Text style={[stili.countdownTesto, { fontSize: Math.round(size * 0.46), color: coloreNumero }]}>
        {secondi}
      </Text>
    </Animated.View>
  );
}

// Un singolo pallino con dentro un numero.
function Pallino({
  numero,
  colore,
  size,
  stili,
}: {
  numero: number;
  colore: string;
  size: number;
  stili: StiliGriglia;
}) {
  return (
    <View style={[stili.pallino, { width: size, height: size, borderRadius: size / 2, backgroundColor: colore }]}>
      <Text style={[stili.pallinoTesto, { fontSize: Math.round(size * 0.5) }]}>{numero}</Text>
    </View>
  );
}

// Pallini dell'avversario (online): due cerchietti a SINISTRA della riga —
// verde = lettere corrette, arancione = presenti ma fuori posizione. Come il
// Countdown: figlio della riga + absolute (fuori dal flow), così non sposta le
// celle centrate. Colori delle celle presi dal tema (colori.valutata).
function PalliniAvversario({
  verdi,
  arancioni,
  lato,
  stili,
  colori,
}: {
  verdi: number;
  arancioni: number;
  lato: number;
  stili: StiliGriglia;
  colori: ColoriGriglia;
}) {
  const size = Math.max(18, Math.round(lato * 0.52));
  const gap = Math.max(6, Math.round(lato * 0.16));
  return (
    <View style={[stili.palliniAvv, { top: (lato - size) / 2, transform: [{ translateX: -gap }] }]}>
      <Pallino numero={verdi} colore={colori.valutata('green')} size={size} stili={stili} />
      <Pallino numero={arancioni} colore={colori.valutata('orange')} size={size} stili={stili} />
    </View>
  );
}

export function Griglia({
  stato,
  lato,
  scossa,
  secondiRimasti,
  righeAvversario,
}: {
  stato: StatoGioco;
  lato: number;
  scossa: number;
  secondiRimasti?: number | null;
  righeAvversario?: Record<number, RiepilogoAvversario>; // online: pallini per riga
}) {
  const tema = useTema();
  const { stili, colori } = useMemo(() => creaStili(tema), [tema]);
  const raggio = tema.misure.raggio;

  const righe = celleDi(stato);
  const shake = useRef(new Animated.Value(0)).current;
  const primo = useRef(true);

  useEffect(() => {
    if (primo.current) {
      primo.current = false;
      return;
    }
    Animated.sequence([
      Animated.timing(shake, { toValue: 1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: -1, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0.6, duration: 55, useNativeDriver: true }),
      Animated.timing(shake, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scossa]);

  const translateX = shake.interpolate({ inputRange: [-1, 1], outputRange: [-9, 9] });
  const rigaAttiva = stato.esito === 'in_corso' ? stato.righe.length : -1;

  return (
    <View>
      {righe.map((colonne, r) => {
        const contenuto = colonne.map((cella, c) => (
          <Cella key={c} cella={cella} lato={lato} indiceColonna={c} raggio={raggio} stili={stili} colori={colori} />
        ));
        const avv = righeAvversario?.[r];
        const pallini = avv ? (
          <PalliniAvversario verdi={avv.verdi} arancioni={avv.arancioni} lato={lato} stili={stili} colori={colori} />
        ) : null;
        const stile = [stili.riga, { marginBottom: Math.max(6, Math.round(lato * 0.14)) }];
        return r === rigaAttiva ? (
          <Animated.View key={r} style={[stile, { transform: [{ translateX }] }]}>
            {pallini}
            {contenuto}
            {secondiRimasti != null && <Countdown secondi={secondiRimasti} lato={lato} stili={stili} colori={colori} />}
          </Animated.View>
        ) : (
          <View key={r} style={stile}>
            {pallini}
            {contenuto}
          </View>
        );
      })}
    </View>
  );
}
