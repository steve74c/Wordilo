// -----------------------------------------------------------------------------
// Componente Avatar riutilizzabile. Va salvato in:  app/src/components/Avatar.tsx
//
// Se c'è una foto (avatarUrl) la mostra tonda; altrimenti disegna un cerchio con
// le INIZIALI (da nome/cognome, in mancanza dal nick) su un colore di sfondo
// scelto in modo stabile per quella persona. Se la foto non si carica, ricade
// sulle iniziali da solo. `onPress` è opzionale (il menu, per esempio, gestisce
// il tocco nel contenitore esterno, quindi qui non serve).
// -----------------------------------------------------------------------------
import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { ViewStyle } from 'react-native';
import { FONT } from '../theme';

type Props = {
  avatarUrl?: string | null;
  nome?: string | null;
  cognome?: string | null;
  nick?: string | null;
  dimensione?: number; // lato del cerchio in px (default 40)
  onPress?: () => void;
  style?: ViewStyle;
};

// Colori di sfondo per le iniziali (usati solo quando manca la foto).
const PALETTE = ['#2A9D8F', '#457B9D', '#E9C46A', '#F4A261', '#E76F51', '#8AB17D', '#6D6875', '#4895EF'];

function calcolaIniziali(nome?: string | null, cognome?: string | null, nick?: string | null): string {
  const n = (nome ?? '').trim();
  const c = (cognome ?? '').trim();
  if (n && c) return (n[0] + c[0]).toUpperCase();
  if (n) return n.slice(0, 2).toUpperCase();
  const k = (nick ?? '').trim();
  if (k) return k.slice(0, 2).toUpperCase();
  return '?';
}

// Dallo stesso "seme" esce sempre lo stesso colore: l'avatar non "cambia colore".
function coloreDa(seme: string): string {
  let h = 0;
  for (let i = 0; i < seme.length; i++) h = (h * 31 + seme.charCodeAt(i)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function Avatar({ avatarUrl, nome, cognome, nick, dimensione = 40, onPress, style }: Props) {
  const [erroreImg, setErroreImg] = useState(false);
  const mostraFoto = !!avatarUrl && !erroreImg;

  const iniziali = calcolaIniziali(nome, cognome, nick);
  const sfondo = coloreDa((nick || `${nome ?? ''}${cognome ?? ''}` || 'x').toLowerCase());

  const base: ViewStyle = {
    width: dimensione,
    height: dimensione,
    borderRadius: dimensione / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: mostraFoto ? 'transparent' : sfondo,
  };

  const contenuto = mostraFoto ? (
    <Image
      source={{ uri: avatarUrl! }}
      style={{ width: dimensione, height: dimensione, borderRadius: dimensione / 2 }}
      onError={() => setErroreImg(true)}
    />
  ) : (
    <Text style={[styles.iniziali, { fontSize: dimensione * 0.4 }]}>{iniziali}</Text>
  );

  if (onPress) {
    return (
      <Pressable onPress={onPress} style={({ pressed }) => [base, style, pressed && { opacity: 0.8 }]}>
        {contenuto}
      </Pressable>
    );
  }
  return <View style={[base, style]}>{contenuto}</View>;
}

const styles = StyleSheet.create({
  iniziali: { color: '#ffffff', fontFamily: FONT.bold, fontWeight: '800', includeFontPadding: false },
});
