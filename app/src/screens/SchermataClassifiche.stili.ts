import { StyleSheet } from 'react-native';
import { bagliore } from '../theme';
import type { Tema } from '../temi/tipi';

export function creaStili(tema: Tema) {
  const P = tema.palette;
  const F = tema.font;

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
    spazioDestra: { width: 92 }, // bilancia il pulsante Indietro per centrare il titolo

    contenuto: {
      flex: 1,
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      paddingHorizontal: 22,
      paddingTop: 14,
    },
    sottotitolo: {
      color: P.testoTenue,
      fontSize: 12,
      fontFamily: F.bold,
      fontWeight: '700',
      letterSpacing: 2,
      textTransform: 'uppercase',
      marginBottom: 14,
    },

    // --- Barra a due tab (Punti / Bravura). Stile coerente con le chip lingua:
    //     bordo + sfondo d'accento quando il tab è attivo.
    tabBar: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 14,
    },
    tab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 9,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: P.hair,
      backgroundColor: P.superficie,
    },
    tabAttivo: {
      borderColor: P.accento,
      backgroundColor: P.accentoSfondo,
    },
    tabTesto: {
      color: P.testoTenue,
      fontSize: 14,
      fontFamily: F.medium,
      fontWeight: '700',
    },
    tabTestoAttivo: {
      color: P.accento,
      fontFamily: F.bold,
      fontWeight: '800',
    },

    centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 60 },
    msg: { color: P.testo, fontSize: 16, fontFamily: F.medium, fontWeight: '600', textAlign: 'center' },
    msgTenue: { color: P.testoTenue, fontSize: 13, fontFamily: F.regular, textAlign: 'center' },
    riprovaWrap: { marginTop: 12 },
    riprova: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28 },
    riprovaTesto: { color: P.testoSuAccento, fontSize: 15, fontFamily: F.bold, fontWeight: '800' }, // era '#052722'

    lista: { gap: 10, paddingBottom: 24 },
    riga: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      backgroundColor: P.superficie,
      borderWidth: 1,
      borderColor: P.hair,
      borderRadius: 16,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    rigaMia: { borderColor: P.accento, backgroundColor: P.accentoSfondo }, // era 'rgba(79,227,208,0.08)'
    medaglia: { fontSize: 22, width: 30, textAlign: 'center' },
    posNumWrap: { width: 30, alignItems: 'center' },
    posNum: { color: P.testoTenue, fontSize: 16, fontFamily: F.bold, fontWeight: '800' },
    rigaCentro: { flex: 1, minWidth: 0 },
    nick: { color: P.testo, fontSize: 16, fontFamily: F.medium, fontWeight: '700' },
    nickMio: { color: P.accentoSoft },
    sotto: { color: P.testoTenue, fontSize: 12, fontFamily: F.regular, marginTop: 2 },
    puntiWrap: { alignItems: 'flex-end' },
    punti: { color: P.accentoSoft, fontSize: 20, fontFamily: F.black, fontWeight: '800' },
    puntiLab: { color: P.testoTenue, fontSize: 11, fontFamily: F.regular },
  });
}

export type StiliClassifiche = ReturnType<typeof creaStili>;
