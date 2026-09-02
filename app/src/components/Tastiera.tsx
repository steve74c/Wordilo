import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { Colore } from '@wordilo/core';
import { C, FONT, ombra, RAGGIO } from '../theme';

// Layout QWERTY. "OK" = invio (teal), "⌫" = cancella.
const RIGHE = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['OK', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', '⌫'],
];

// Vetro dei tasti "neutri" (non ancora usati) e del tasto cancella:
// bianco traslucido (chiaro ma non pieno) con testo scuro → look "vetro".
const VETRO_BG = 'rgba(255,255,255,0.92)';
const VETRO_BORDO = 'rgba(255,255,255,0.70)';
const VETRO_TESTO = '#12242B';

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

  // Default = vetro bianco traslucido (tasto non ancora usato + cancella).
  let bg: string = VETRO_BG;
  let testoColore: string = VETRO_TESTO;
  let bordo: string | null = VETRO_BORDO;

  if (enter) {
    bg = C.accento;
    testoColore = '#052722';
    bordo = null;
  } else if (colore === 'green') {
    bg = C.verde;
    testoColore = '#FFFFFF';
    bordo = null;
  } else if (colore === 'orange') {
    bg = C.arancione;
    testoColore = '#FFFFFF';
    bordo = null;
  } else if (colore === 'grey') {
    // lettera assente: slate pieno (spento), distinto dal vetro dei non usati
    bg = C.grigio;
    testoColore = C.testo;
    bordo = null;
  }
  // canc resta vetro (default)

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
