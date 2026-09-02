import { Platform } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';
import type { Colore } from '@wordilo/core';

// -----------------------------------------------------------------------------
// Tema visivo — stile "vetro" (glassmorphism): sfondo teal-navy profondo,
// superfici traslucide con bordo sottile, titolo serif con bagliore, accento
// teal. Nessuna dipendenza nuova.
// -----------------------------------------------------------------------------

export const C = {
  // Sfondo teal-navy profondo (gradiente in GRAD.sfondo).
  sfondoTop: '#0E2A31',
  sfondoMid: '#071319',
  sfondoBottom: '#04090C',

  // Superfici "vetro": bianco a bassa opacità sopra lo sfondo scuro.
  superficie: 'rgba(255,255,255,0.05)',
  superficieAlta: 'rgba(255,255,255,0.08)',

  // Testo.
  testo: '#EAF6F4',
  testoTenue: '#9DB4B3',

  // Accento teal.
  accento: '#2FD1C1',
  accentoSoft: '#78ECDC', // usato per titolo/tessere
  accentoScuro: '#1FA99C',
  accentoTenue: '#6FB1AB',
  glow: 'rgba(79,227,208,0.55)', // alone del titolo (bagliore)

  // Stati lettera (griglia e tastiera): invariati.
  verde: '#41B85F',
  arancione: '#EDA435',
  grigio: '#4A5561',

  // Bordi / linee "vetro".
  hair: 'rgba(255,255,255,0.10)',
  hairSoft: 'rgba(255,255,255,0.06)',
  bordoVuoto: 'rgba(255,255,255,0.10)',
  bordoAttivoSoft: 'rgba(255,255,255,0.16)',
  bordoAttivo: 'rgba(120,236,220,0.55)', // riga attiva: bordo teal tenue

  // Tastiera: tasti neutri bianchi su sfondo scuro (contrasto ottimo).
  tasto: '#3B4653',
  tastoAssente: '#262E38',
  tastoAssenteTesto: '#6B7480',
  tastoNeutro: '#F2F4F8',
  tastoNeutroBordo: '#D6DCE4',
  tastoNeutroTesto: '#1E2530',

  vittoria: '#4ECB7C',
  scrim: 'rgba(4,9,12,0.74)',
} as const;

// Gradienti (LinearGradient accetta 2+ stop). `as const` = tuple readonly.
export const GRAD = {
  sfondo: ['#0E2A31', '#071319', '#04090C'] as const,
  accento: ['#78ECDC', '#1FA99C'] as const,
};

// Colore pieno (griglia e tastiera) dato lo stato del core.
export function coloreDiSfondo(colore: Colore): string {
  switch (colore) {
    case 'green':
      return C.verde;
    case 'orange':
      return C.arancione;
    case 'grey':
      return C.grigio;
  }
}

// Stile "vetro" riutilizzabile (superficie traslucida + bordo sottile).
export function vetro(alta = false): ViewStyle {
  return {
    backgroundColor: alta ? C.superficieAlta : C.superficie,
    borderWidth: 1,
    borderColor: C.hair,
  };
}

// Ombra cross-platform via `boxShadow` (supportato su web + nativo in RN 0.86,
// Nuova Architettura). Sostituisce le vecchie props shadow*/elevation, ora
// deprecate. Firma invariata: il 4° argomento (elevation) non serve più.
export function ombra(opacity: number, radius: number, dy: number, _elevation?: number): ViewStyle {
  return { boxShadow: `0px ${dy}px ${radius}px rgba(0,0,0,${opacity})` } as ViewStyle;
}

// Bagliore del testo (titolo). Su web usa la shorthand `textShadow`; su nativo
// usa le props lunghe. Evita l'avviso di deprecazione di react-native-web.
export function bagliore(colore: string, radius: number): TextStyle {
  return Platform.select<TextStyle>({
    web: { textShadow: `0px 0px ${radius}px ${colore}` } as unknown as TextStyle,
    default: {
      textShadowColor: colore,
      textShadowOffset: { width: 0, height: 0 },
      textShadowRadius: radius,
    },
  })!;
}

export const RAGGIO = 12;

// Font. `serif` = famiglia elegante per il titolo.
// Per il look ESATTO del mockup: incorpora "Playfair Display" (playfair.ttf) in
// assets/fonts/, registralo in App.tsx come Poppins, e qui:
//   serif: 'PlayfairDisplay_600SemiBold'
export const FONT = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  black: 'Poppins_800ExtraBold',
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' })!,
} as const;
