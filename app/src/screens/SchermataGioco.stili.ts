import { StyleSheet } from 'react-native';
import { bagliore } from '../theme';
import type { Tema } from '../temi/tipi';

export function creaStili(tema: Tema) {
  return StyleSheet.create({
    sfondo: { flex: 1 },
    safe: { flex: 1 },
    contenuto: {
      flex: 1,
      width: '100%',
      maxWidth: 600,
      alignSelf: 'center',
      paddingHorizontal: 12,
      paddingTop: 12,
      paddingBottom: 16,
    },
    // Header su UNA riga: [indietro] · [titolo + sottotitolo] · [pallini + contatore].
    header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 4, paddingBottom: 6 },
    titoloGruppo: { flex: 1, justifyContent: 'center', gap: 2 },
    sottoRiga: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    puntoStato: { width: 8, height: 8, borderRadius: 4, backgroundColor: tema.palette.verde },
    // Tentativi come pallini che si riempiono + contatore "X/max".
    tentativiWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    pallini: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    pallino: { width: 8, height: 8, borderRadius: 4 },
    pallinoVuoto: { backgroundColor: tema.palette.hair },
    pallinoPieno: { backgroundColor: tema.palette.accento },
    pallinoCorrente: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: tema.palette.accento },
    contatore: { color: tema.palette.accentoSoft, fontSize: 13, fontFamily: tema.font.bold, fontWeight: '800', letterSpacing: 0.5 },
    tondo: {
      width: 48,
      height: 48,
      borderRadius: 16,
      backgroundColor: tema.palette.superficieAlta,
      borderWidth: 1,
      borderColor: tema.palette.hair,
      alignItems: 'center',
      justifyContent: 'center',
    },
    tondoIcona: { color: tema.palette.testo, fontSize: 22, fontFamily: tema.font.bold, fontWeight: '800', marginTop: -1 },
    titolo: {
      color: tema.palette.accentoSoft,
      fontSize: 22,
      fontFamily: tema.font.serif,
      fontWeight: '600',
      letterSpacing: 0.5,
      ...bagliore(tema.palette.glow, 14),
    },
    sottotitolo: {
      color: tema.palette.accentoTenue,
      fontSize: 13,
      fontFamily: tema.font.medium,
      fontWeight: '600',
      letterSpacing: 0.5,
      flexShrink: 1,
    },
    // Online: riga "Tu vs Avversario" sotto l'header (nick dei due giocatori).
    rigaSfida: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      alignSelf: 'center',
      maxWidth: '100%',
      paddingVertical: 4,
      paddingHorizontal: 14,
      borderRadius: 999,
      backgroundColor: tema.palette.superficieAlta,
      borderWidth: 1,
      borderColor: tema.palette.hair,
      marginBottom: 2,
    },
    rigaSfidaNick: {
      color: tema.palette.testo,
      fontSize: 14,
      fontFamily: tema.font.bold,
      fontWeight: '700',
      flexShrink: 1,
    },
    rigaSfidaVs: {
      color: tema.palette.accentoSoft,
      fontSize: 12,
      fontFamily: tema.font.bold,
      fontWeight: '800',
      letterSpacing: 1,
    },
    // LAYOUT: griglia + tastiera nello STESSO blocco, centrato verticalmente e
    // ravvicinato (gap).
    gioco: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingTop: 4 },
    zonaAvviso: { height: 34, justifyContent: 'center' },
    avviso: {
      backgroundColor: tema.palette.superficieAlta,
      borderWidth: 1,
      borderColor: tema.palette.hair,
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 999,
    },
    avvisoTesto: { color: tema.palette.testo, fontSize: 14, fontFamily: tema.font.medium, fontWeight: '600' },
    scrim: { flex: 1, backgroundColor: tema.palette.scrim, alignItems: 'center', justifyContent: 'center', padding: 24 },
    card: {
      width: '100%',
      maxWidth: 340,
      backgroundColor: tema.palette.cardSfondo,
      borderColor: tema.palette.hair,
      borderWidth: 1,
      borderRadius: 22,
      padding: 26,
      alignItems: 'center',
      gap: 6,
    },
    emoji: { fontSize: 44, marginBottom: 2 },
    esitoTitolo: { color: tema.palette.testo, fontSize: 24, fontFamily: tema.font.black, fontWeight: '900' },
    esitoSub: { color: tema.palette.testoTenue, fontSize: 15, fontFamily: tema.font.regular, marginBottom: 18, textAlign: 'center' },
    // 🪙 Premio monete nel pop-up (partita da solo).
    premioMonete: {
      color: tema.palette.testoTenue,
      fontSize: 22,
      fontFamily: tema.font.black,
      fontWeight: '800',
      marginTop: -8,
      marginBottom: 16,
    },
    premioPositivo: { color: tema.palette.verde },
    premioNegativo: { color: tema.palette.arancione },
    bottone: { width: '100%', paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
    bottoneTesto: { color: tema.palette.testoSuAccento, fontSize: 16, fontFamily: tema.font.bold, fontWeight: '800' },
    linkIndietro: { marginTop: 14, paddingVertical: 6 },
    linkIndietroTesto: { color: tema.palette.testoTenue, fontSize: 14, fontFamily: tema.font.medium, fontWeight: '600' },
  });
}

export type StiliGioco = ReturnType<typeof creaStili>;
