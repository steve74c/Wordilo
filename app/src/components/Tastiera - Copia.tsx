import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { Colore } from '@wordilo/core';
import { C, FONT, ombra, RAGGIO } from '../theme';

// Layout QWERTY. "OK" = invio (colorato in teal), "⌫" = cancella.
const RIGHE = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['OK', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
];

type Props = {
  colori: Record<string, Colore>;
  onLettera: (l: string) => void;
  onInvio: () => void;
  onCancella: () => void;
  disabilitata?: boolean;
  altezzaTasto?: number;
};

function Tasto({
  label,
  colore,
  altezza,
  onPress,
  disabilitata,
}: {
  label: string;
  colore: Colore | undefined;
  altezza: number;
  onPress: () => void;
  disabilitata?: boolean;
}) {
  const enter = label === 'OK';
  const canc = label === '⌫';
  const speciale = enter || canc;

  // Colori del tasto: OK=teal, verde/arancione pieni, assente grigio, ⌫ grigio,
  // neutro (non ancora usato) = BIANCO.
  let bg: string = C.tastoNeutro;
  let testoColore: string = C.tastoNeutroTesto;
  let bordo: string | null = C.tastoNeutroBordo;

  if (enter) {
    bg = C.accento;
    testoColore = '#06231F';
    bordo = null;
  } else if (colore === 'green') {
    bg = C.verde;
    testoColore = '#FFFFFF';
    bordo = null;
  } else if (colore === 'orange') {
    bg = C.arancione;
    testoColore = '#FFFFFF';
    bordo = null;
  } else if (colore === 'grey' || canc) {
    bg = C.grigio;
    testoColore = C.testo;
    bordo = null;
  }

  return (
    <Pressable
      disabled={disabilitata}
      onPress={onPress}
      style={({ pressed }) => [
        styles.tasto,
        speciale && styles.largo,
        ombra(0.18, 4, 2, 2),
        {
          height: altezza,
          backgroundColor: bg,
          borderWidth: bordo ? 1 : 0,
          borderColor: bordo ?? 'transparent',
          transform: [{ scale: pressed ? 0.93 : 1 }],
        },
      ]}
    >
      <Text style={[styles.testo, speciale && styles.testoPiccolo, { color: testoColore }]}>{label}</Text>
    </Pressable>
  );
}

export function Tastiera({ colori, onLettera, onInvio, onCancella, disabilitata, altezzaTasto }: Props) {
  const { width } = useWindowDimensions();
  const altezza = altezzaTasto ?? (width < 600 ? 52 : 46);

  const premi = (tasto: string) => {
    if (tasto === 'OK') onInvio();
    else if (tasto === '⌫') onCancella();
    else onLettera(tasto);
  };

  return (
    <View style={styles.tastiera}>
      {RIGHE.map((riga, i) => (
        <View key={i} style={styles.riga}>
          {riga.map((tasto) => (
            <Tasto
              key={tasto}
              label={tasto}
              colore={colori[tasto]}
              altezza={altezza}
              disabilitata={disabilitata}
              onPress={() => premi(tasto)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tastiera: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: 8 },
  riga: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  tasto: {
    minWidth: 28,
    flexGrow: 1,
    flexBasis: 0,
    borderRadius: RAGGIO,
    alignItems: 'center',
    justifyContent: 'center',
  },
  largo: { flexGrow: 1.7 },
  testo: { fontSize: 18, fontFamily: FONT.bold, fontWeight: '700' },
  testoPiccolo: { fontSize: 15, fontFamily: FONT.bold, fontWeight: '800' },
});
