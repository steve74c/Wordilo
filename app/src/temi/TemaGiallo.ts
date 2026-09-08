import type { Tema } from './tipi';

// -----------------------------------------------------------------------------
// Tema GIALLO — chiaro "flat / pieno" (non vetro).
//
// Scelta di design: su sfondo CHIARO le superfici bianche traslucide sparirebbero,
// quindi qui le superfici sono PIENE (bianco) con BORDO ambra visibile e ombra
// morbida per l'elevazione. I valori sono un buon punto di partenza: una volta
// visto a schermo si affinano facilmente da questo unico file.
// -----------------------------------------------------------------------------

const PALETTA_GIALLA = {
  // Sfondo caldo (gradiente).
  sfondoTop: '#FFF8E7',
  sfondoMid: '#FDEBD0',
  sfondoBottom: '#FAD7A0',

  // Superfici PIENE (l'elevazione la dà l'ombra, non la trasparenza).
  superficie: '#FFFFFF',
  superficieAlta: '#FFFFFF',

  // Testo scuro su chiaro.
  testo: '#1E293B',
  testoTenue: '#475569',

  // Accento ambra. NB: accentoSoft/Tenue scuriti rispetto alla bozza, perché su
  // crema i gialli chiari erano illeggibili (accentoSoft è il colore del TITOLO).
  accento: '#FBBF24',
  accentoSoft: '#D97706',   // titolo/tessere: ambra scuro leggibile su chiaro
  accentoScuro: '#B45309',
  accentoTenue: '#B45309',  // sottotitolo: era troppo chiaro
  glow: 'rgba(251,191,36,0.45)',

  // Stati lettera (verde/arancione invariati; grigio caldo per il chiaro).
  verde: '#41B85F',
  arancione: '#EDA435',
  grigio: '#B7A99A',

  // Bordi / linee ambra, marcati abbastanza da vedersi su chiaro.
  hair: 'rgba(217,119,6,0.28)',
  hairSoft: 'rgba(217,119,6,0.16)',
  bordoVuoto: '#E3B94F',              // bordo cella vuota: NETTO su crema (era troppo tenue)
  bordoAttivoSoft: 'rgba(217,119,6,0.35)',
  bordoAttivo: 'rgba(217,119,6,0.65)',

  // Tastiera.
  tasto: '#FFFFFF',
  tastoAssente: '#CBB79E',
  tastoAssenteTesto: '#5B4A32',
  tastoNeutro: '#FFFFFF',
  tastoNeutroBordo: '#F1C453', // bordo ambra sui tasti bianchi
  tastoNeutroTesto: '#1E293B',

  vittoria: '#4ECB7C',
  scrim: 'rgba(30,20,0,0.45)',

  // --- Token del sistema temi (Lotto 1), versione chiara/flat ---
  cardSfondo: '#FFFFFF',
  cellaSfondo: '#FFFFFF',
  cellaInseritaSfondo: '#FCE7A8',   // cella con lettera: tinta ambra DECISA (era troppo tenue)
  cellaAttivaSfondo: '#FFF7DD',     // riga attiva: crema chiara
  bordoCellaAttiva: '#E0A233',      // bordo riga attiva: netto
  // Countdown: fondo TENUE (come lo sfondo chiaro del tema). Numero e bordo ora
  // usano accentoSoft (ambra scuro), quindi si leggono bene su questo fondo
  // chiaro senza dover riempire il cerchietto.
  countdownSfondo: 'rgba(251,191,36,0.18)',
  testoSuColore: '#FFFFFF',         // lettera su celle/tasti verde/arancione
  testoSuAccento: '#3A2A00',        // testo scuro sui pulsanti ambra
  accentoSfondo: 'rgba(251,191,36,0.16)',
  gommaBordo: 'rgba(30,41,59,0.30)',
  coriandoloChiaro: '#FFFFFF',

  // Menu — tessere "anteprima" (versione chiara: tinta ambra su card bianca).
  tesseraSfondo: 'rgba(251,191,36,0.10)',
  tesseraBordo: 'rgba(217,119,6,0.30)',
  tesseraAccesaSfondo: 'rgba(251,191,36,0.25)',
} as const;

const GRADIENTI_GIALLI = {
  sfondo: ['#FFF8E7', '#FDEBD0', '#FAD7A0'] as const,
  accento: ['#FBBF24', '#F59E0B'] as const,
};

// Stesso FONT del tema vetro (Poppins). Se vuoi un font più giocoso, cambialo qui.
const FONT_GIALLO = {
  regular: 'Poppins_400Regular',
  medium: 'Poppins_600SemiBold',
  bold: 'Poppins_700Bold',
  black: 'Poppins_800ExtraBold',
  serif: 'Georgia',
} as const;

export const temaGiallo: Tema = {
  nome: 'giallo',
  palette: PALETTA_GIALLA,
  gradienti: GRADIENTI_GIALLI,
  font: FONT_GIALLO,
  misure: {
    raggio: 14, // angoli più morbidi del vetro (12)
  },
};
