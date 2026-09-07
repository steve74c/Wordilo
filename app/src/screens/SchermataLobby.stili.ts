import { StyleSheet } from 'react-native';
import { bagliore } from '../theme';
import type { Tema } from '../temi/tipi';

// Stili della lobby online, derivati dal tema attivo (prima erano statici su C/FONT).
export function creaStili(tema: Tema) {
  const P = tema.palette;
  const F = tema.font;
  const raggio = tema.misure.raggio;

  return StyleSheet.create({
    sfondo: { flex: 1 },
    safe: { flex: 1 },

    barraTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      paddingHorizontal: 22,
      paddingTop: 10,
    },
    indietro: {
      backgroundColor: P.superficieAlta,
      borderWidth: 1,
      borderColor: P.hair,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    indietroTesto: { color: P.testoTenue, fontSize: 14, fontFamily: F.medium, fontWeight: '600' },
    titolo: {
      color: P.accentoSoft,
      fontSize: 22,
      fontFamily: F.serif,
      fontWeight: '600',
      ...bagliore(P.glow, 16),
    },
    spazioDestra: { width: 92 },

    contenuto: {
      flex: 1,
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      paddingHorizontal: 22,
      paddingTop: 14,
      justifyContent: 'center',
      gap: 16,
    },
    sottotitolo: {
      color: P.testoTenue,
      fontSize: 12,
      fontFamily: F.bold,
      fontWeight: '700',
      letterSpacing: 2,
      textTransform: 'uppercase',
      textAlign: 'center',
    },

    card: {
      backgroundColor: P.superficieAlta,
      borderColor: P.hair,
      borderWidth: 1,
      borderRadius: 24,
      padding: 22,
    },
    cardCentro: { alignItems: 'center', gap: 12 },
    eyebrow: {
      color: P.testoTenue,
      fontSize: 12,
      fontFamily: F.bold,
      fontWeight: '700',
      letterSpacing: 2,
      marginBottom: 10,
    },
    spiega: { color: P.testo, opacity: 0.85, fontSize: 14, fontFamily: F.regular, marginBottom: 4 },

    creaWrap: { marginTop: 8 },
    crea: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
    creaTesto: { color: P.testoSuAccento, fontSize: 17, fontFamily: F.bold, fontWeight: '800', letterSpacing: 0.3 }, // era '#052722'

    oppure: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 20 },
    oppureLinea: { flex: 1, height: 1, backgroundColor: P.hair },
    oppureTesto: { color: P.testoTenue, fontSize: 12, fontFamily: F.medium, textTransform: 'uppercase', letterSpacing: 1 },

    input: {
      borderWidth: 1,
      borderColor: P.hair,
      borderRadius: raggio,
      paddingHorizontal: 14,
      paddingVertical: 13,
      color: P.testo,
      backgroundColor: P.superficie,
      fontSize: 20,
      fontFamily: F.bold,
      fontWeight: '800',
      letterSpacing: 6,
      textAlign: 'center',
      marginBottom: 12,
    },
    entraBtn: {
      backgroundColor: P.superficie,
      borderWidth: 1,
      borderColor: P.bordoAttivo,
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
    },
    entraTesto: { color: P.accentoSoft, fontSize: 15, fontFamily: F.bold, fontWeight: '800' },

    codice: {
      color: P.accentoSoft,
      fontSize: 46,
      fontFamily: F.black,
      fontWeight: '800',
      letterSpacing: 10,
      ...bagliore(P.glow, 18),
    },
    attesaRiga: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
    attesaTesto: { color: P.testo, fontSize: 15, fontFamily: F.medium, fontWeight: '600' },

    msg: { color: P.testo, fontSize: 15, fontFamily: F.medium, fontWeight: '600', textAlign: 'center' },
  });
}

export type StiliLobby = ReturnType<typeof creaStili>;
