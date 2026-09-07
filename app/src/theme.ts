import { Platform } from 'react-native';
import type { TextStyle, ViewStyle } from 'react-native';
import type { Colore } from '@wordilo/core';

// -----------------------------------------------------------------------------
// Tema visivo — questo file contiene la palette del tema "VETRO" (glassmorphism:
// sfondo teal-navy profondo, superfici traslucide, titolo serif con bagliore,
// accento teal) + le funzioni pure (`ombra`, `bagliore`, `coloreDiSfondo`).
//
// NB (sistema temi): `C` NON va più usato direttamente nei componenti: è la
// palette del tema Vetro, avvolta da `temi/Temavetro.ts`. I componenti leggono i
// colori con `useTema()`. La *forma* di un tema (`tipi.ts`) deriva le chiavi da
// `C` (`keyof typeof C`), quindi ogni NUOVO token aggiunto qui diventa
// OBBLIGATORIO anche per gli altri temi (es. TemaGiallo): è la rete di sicurezza
// "niente colori dimenticati".
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

  // Tastiera: tasti neutri.
  tasto: '#3B4653',
  tastoAssente: '#262E38',
  tastoAssenteTesto: '#6B7480',
  // NB: questi tre valori sono stati allineati a quelli REALMENTE resi dalla
  // tastiera (prima erano cablati dentro Tastiera.stili.ts e questi token, con
  // altri valori, non venivano usati). Ora la tastiera legge da qui.
  tastoNeutro: 'rgba(255,255,255,0.92)',
  tastoNeutroBordo: 'rgba(255,255,255,0.70)',
  tastoNeutroTesto: '#12242B',

  vittoria: '#4ECB7C',
  scrim: 'rgba(4,9,12,0.74)',

  // ---------------------------------------------------------------------------
  // Token del sistema temi (Lotto 1). Valori = quelli VETRO resi oggi, prima
  // "cablati" a mano nei vari *.stili.ts. Spostandoli qui, il tema Giallo (e
  // futuri temi) possono ridefinirli. In Vetro il look resta identico.
  // ---------------------------------------------------------------------------

  // Sfondo delle card modali (pop-up esito, card login).
  cardSfondo: 'rgba(16,40,47,0.97)',

  // Celle della griglia NON valutate.
  cellaSfondo: 'rgba(255,255,255,0.04)',            // cella vuota
  cellaInseritaSfondo: 'rgba(120,236,220,0.12)',    // cella con lettera inserita
  cellaAttivaSfondo: 'rgba(120,236,220,0.05)',      // cella della riga attiva
  bordoCellaAttiva: 'rgba(120,236,220,0.32)',       // bordo cella della riga attiva

  // Badge countdown (modalità esperto).
  countdownSfondo: 'rgba(120,236,220,0.10)',

  // Testi su fondi pieni.
  testoSuColore: '#FFFFFF',   // lettera su cella/tasto verde/arancione/grigio
  testoSuAccento: '#052722',  // testo su pulsante/tasto in accento

  // Superficie tinta d'accento (evidenziazioni, es. tema attivo in Impostazioni).
  accentoSfondo: 'rgba(47,209,193,0.12)',

  // Bordo chiaro decorativo (icona gomma).
  gommaBordo: 'rgba(255,255,255,0.35)',

  // Coriandolo "chiaro" (4° colore della festa di vittoria).
  coriandoloChiaro: '#F2F5F8',

  // Menu — tessere "anteprima" decorative (Lotto 2). Erano teal fisse cablate.
  tesseraSfondo: 'rgba(79,227,208,0.06)',
  tesseraBordo: 'rgba(79,227,208,0.28)',
  tesseraAccesaSfondo: 'rgba(79,227,208,0.16)',
  // NB: il bordo della tessera "accesa" riusa `bordoAttivo`.
} as const;

// Gradienti (LinearGradient accetta 2+ stop). `as const` = tuple readonly.
export const GRAD = {
  sfondo: ['#0E2A31', '#071319', '#04090C'] as const,
  accento: ['#78ECDC', '#1FA99C'] as const,
};

// Colore pieno (griglia e tastiera) dato lo stato del core.
// NB: legge il `C` statico (tema Vetro). I componenti tematizzati usano invece
// `colori.valutata(...)` dai loro *.stili.ts. Da rivedere in Lotto 2 se qualche
// schermata (es. pallini avversario online) lo usa ancora e deve seguire il tema.
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
