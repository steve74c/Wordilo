import React from 'react';
import { Image, Text, View } from 'react-native';
import type { ImageStyle, TextStyle, ViewStyle } from 'react-native';
import { C, FONT, ombra } from '../theme';

// -----------------------------------------------------------------------------
// Avatar riutilizzabile. Ordine di priorità (come da §4 della specifica):
//   1. se c'è `avatarUrl` (foto caricata o presa dal social) → mostra la foto;
//   2. altrimenti → cerchio colorato con le INIZIALI, mai un riquadro vuoto.
//
// Per ora le iniziali arrivano dal NICK (nome/cognome verranno col login social,
// passo A5): il componente li accetta già, così poi non si tocca più.
// Nessuna dipendenza nuova: solo React Native + il tema (`C`, `FONT`, `ombra`).
// -----------------------------------------------------------------------------

type Props = {
  nick?: string | null;
  nome?: string | null;
  cognome?: string | null;
  avatarUrl?: string | null;
  /** Diametro in px (default 40). */
  dimensione?: number;
};

// Palette di sfondi: tinte piene che si sposano col tema teal-navy e reggono
// bene il testo bianco sopra. L'indice è scelto in modo STABILE dal "seme"
// (il nick), così lo stesso utente ha SEMPRE lo stesso colore.
const SFONDI = [
  '#2FA5B8', // teal
  '#3D7EDB', // blu
  '#7A6BE0', // viola
  '#C063C0', // magenta
  '#E0705A', // corallo
  '#E0A23C', // ambra
  '#3FB27A', // verde
  '#5A93A8', // ottanio tenue
];

// Iniziali: da nome+cognome se presenti, altrimenti dal nick (max 2 lettere).
function iniziali(nick?: string | null, nome?: string | null, cognome?: string | null): string {
  const n = (nome ?? '').trim();
  const c = (cognome ?? '').trim();
  if (n || c) {
    const a = n ? n[0] : '';
    const b = c ? c[0] : '';
    return (a + b || a || b).toUpperCase();
  }
  const k = (nick ?? '').trim();
  if (!k) return '?';
  return k.slice(0, 2).toUpperCase(); // prime due lettere del nick
}

// Hash semplice e deterministico → indice stabile nella palette.
function indiceColore(seme: string): number {
  let somma = 0;
  for (let i = 0; i < seme.length; i++) somma = (somma + seme.charCodeAt(i)) % 1_000_000;
  return somma % SFONDI.length;
}

export function Avatar({ nick, nome, cognome, avatarUrl, dimensione = 40 }: Props) {
  const d = dimensione;
  const raggio = d / 2;

  const contenitore: ViewStyle = {
    width: d,
    height: d,
    borderRadius: raggio,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.hair,
    overflow: 'hidden',
    ...ombra(0.25, 8, 4),
  };

  // Caso 1: foto disponibile.
  if (avatarUrl) {
    const img: ImageStyle = { width: d, height: d, borderRadius: raggio };
    return (
      <View style={contenitore}>
        <Image source={{ uri: avatarUrl }} style={img} />
      </View>
    );
  }

  // Caso 2 (fallback): iniziali su sfondo colorato stabile.
  const testo = iniziali(nick, nome, cognome);
  const seme = `${nome ?? ''}${cognome ?? ''}${nick ?? ''}` || '?';
  const sfondo = SFONDI[indiceColore(seme)];
  const label: TextStyle = {
    color: '#FFFFFF',
    fontFamily: FONT.bold,
    fontWeight: '800',
    fontSize: Math.round(d * 0.4),
    letterSpacing: 0.5,
  };

  return (
    <View style={[contenitore, { backgroundColor: sfondo }]}>
      <Text style={label} numberOfLines={1}>
        {testo}
      </Text>
    </View>
  );
}
