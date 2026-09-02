import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { Colore, StatoGioco } from '@wordilo/core';
import { C, coloreDiSfondo, FONT, RAGGIO } from '../theme';

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

// Vetro delle celle NON valutate (teal traslucido, come le tessere del menu).
const VETRO_INSERITA = 'rgba(120,236,220,0.12)';
const VETRO_ATTIVA = 'rgba(120,236,220,0.05)';
const VETRO_VUOTA = 'rgba(255,255,255,0.04)';
const BORDO_ATTIVA = 'rgba(120,236,220,0.32)';

function Cella({ cella, lato, indiceColonna }: { cella: StatoCella; lato: number; indiceColonna: number }) {
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

  const dim = { width: lato, height: lato, borderRadius: RAGGIO } as const;
  const testo = [styles.lettera, { fontSize: Math.round(lato * 0.46) }];

  // Cella valutata: tinta piena (feedback nitido) + flip di rivelazione.
  if (cella.tipo === 'valutata') {
    const rotateX = flip.interpolate({ inputRange: [0, 0.5, 1], outputRange: ['90deg', '0deg', '0deg'] });
    const opacity = flip.interpolate({ inputRange: [0, 0.35, 1], outputRange: [0, 1, 1] });
    return (
      <Animated.View
        style={[
          styles.cella,
          dim,
          { backgroundColor: coloreDiSfondo(cella.colore) },
          { opacity, transform: [{ perspective: 400 }, { rotateX }] },
        ]}
      >
        <Text style={testo}>{cella.lettera}</Text>
      </Animated.View>
    );
  }

  // Celle NON valutate: vetro traslucido + bordo sottile.
  const bg =
    cella.tipo === 'inserita' ? VETRO_INSERITA : cella.attiva ? VETRO_ATTIVA : VETRO_VUOTA;
  const bordo =
    cella.tipo === 'inserita' ? C.bordoAttivo : cella.attiva ? BORDO_ATTIVA : C.bordoVuoto;

  return (
    <Animated.View
      style={[
        styles.cella,
        styles.cellaVuota,
        dim,
        { backgroundColor: bg, borderColor: bordo, transform: [{ scale: pop }] },
      ]}
    >
      {cella.tipo === 'inserita' && <Text style={testo}>{cella.lettera}</Text>}
    </Animated.View>
  );
}

export function Griglia({ stato, lato, scossa }: { stato: StatoGioco; lato: number; scossa: number }) {
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
          <Cella key={c} cella={cella} lato={lato} indiceColonna={c} />
        ));
        const stile = [styles.riga, { marginBottom: Math.max(6, Math.round(lato * 0.14)) }];
        return r === rigaAttiva ? (
          <Animated.View key={r} style={[stile, { transform: [{ translateX }] }]}>
            {contenuto}
          </Animated.View>
        ) : (
          <View key={r} style={stile}>
            {contenuto}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  riga: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  cella: { alignItems: 'center', justifyContent: 'center' },
  cellaVuota: { borderWidth: 2 },
  lettera: { color: '#FFFFFF', fontFamily: FONT.bold, fontWeight: '800', textTransform: 'uppercase' },
});
