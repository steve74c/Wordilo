import { StyleSheet } from 'react-native';
import { bagliore } from '../theme';
import type { Tema } from '../temi/tipi';

// Stili del menu, derivati dal tema attivo (prima erano un `styles` statico con
// colori cablati). In tema Vetro i valori sono identici a prima.
export function creaStili(tema: Tema) {
  const P = tema.palette;
  const F = tema.font;
  const raggio = tema.misure.raggio;

  return StyleSheet.create({
    sfondo: { flex: 1 },
    safe: { flex: 1 },

    // Barra in alto: avatar + saluto a sinistra, (⚙️ + Esci) a destra.
    barraTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
      paddingHorizontal: 22,
      paddingTop: 10,
      gap: 12,
    },
    salutoGruppo: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
    avatarWrap: { position: 'relative' },
    avatarOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      // Scrim scuro sull'avatar durante l'upload: neutro rispetto al tema.
      backgroundColor: 'rgba(4,9,12,0.55)',
    },
    saluto: { flexShrink: 1, color: P.testo, fontSize: 15, fontFamily: F.medium, fontWeight: '600' },
    salutoNick: { color: P.accentoSoft, fontFamily: F.bold, fontWeight: '800' },

    // Gruppo destro: pulsante Impostazioni + Esci.
    destra: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    impostazioni: {
      backgroundColor: P.superficieAlta,
      borderWidth: 1,
      borderColor: P.hair,
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    impostazioniTesto: { fontSize: 16 },
    esci: {
      backgroundColor: P.superficieAlta,
      borderWidth: 1,
      borderColor: P.hair,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    esciTesto: { color: P.testoTenue, fontSize: 14, fontFamily: F.medium, fontWeight: '600' },

    // Contenitore scrollabile. Su schermi bassi il contenuto (card + contatori +
    // azioni + legenda) non ci sta tutto: prima era una View centrata SENZA
    // scroll, così le ultime voci (Sfida online, Classifica, legenda) finivano
    // sotto il bordo e non si vedevano. Questo è lo stile ESTERNO della
    // ScrollView; l'impaginazione interna sta in `contenutoInner`.
    contenuto: {
      flex: 1,
      width: '100%',
      maxWidth: 440,
      alignSelf: 'center',
    },
    // contentContainerStyle della ScrollView: `flexGrow: 1` + `justifyContent:
    // 'center'` centra il contenuto quando c'è spazio e lo lascia scorrere quando
    // è troppo. Il padding verticale evita che l'ultima voce tocchi i bordi.
    contenutoInner: {
      flexGrow: 1,
      paddingHorizontal: 22,
      paddingVertical: 16,
      justifyContent: 'center',
      gap: 20,
    },

    // Titolo
    intestazione: { alignItems: 'center', gap: 10 },
    logo: {
      color: P.accentoSoft,
      fontSize: 56,
      fontFamily: F.serif,
      fontWeight: '600',
      letterSpacing: 0.5,
      ...bagliore(P.glow, 24),
    },
    tagline: { color: P.testo, opacity: 0.82, fontSize: 15, fontFamily: F.medium, fontWeight: '500' },
    divisore: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
    divLinea: { height: 1, width: 48, backgroundColor: P.accentoScuro, opacity: 0.6 },
    divRombo: { width: 8, height: 8, backgroundColor: P.accento, transform: [{ rotate: '45deg' }], opacity: 0.85 },

    // Card
    card: {
      backgroundColor: P.superficieAlta,
      borderColor: P.hair,
      borderWidth: 1,
      borderRadius: 24,
      padding: 22,
    },
    eyebrow: {
      color: P.testoTenue,
      fontSize: 12,
      fontFamily: F.bold,
      fontWeight: '700',
      letterSpacing: 2,
      marginBottom: 14,
    },

    // Anteprima tessere
    tessere: { flexDirection: 'row', gap: 8, marginBottom: 20 },
    tessera: {
      flex: 1,
      aspectRatio: 1,
      borderRadius: raggio,
      backgroundColor: P.tesseraSfondo,   // era 'rgba(79,227,208,0.06)'
      borderWidth: 1,
      borderColor: P.tesseraBordo,        // era 'rgba(79,227,208,0.28)'
    },
    tesseraAccesa: {
      backgroundColor: P.tesseraAccesaSfondo, // era 'rgba(79,227,208,0.16)'
      borderColor: P.bordoAttivo,             // era 'rgba(120,236,220,0.55)' (= bordoAttivo)
    },

    etichetta: {
      color: P.testoTenue,
      fontSize: 12,
      fontFamily: F.medium,
      fontWeight: '700',
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      marginBottom: 10,
    },
    etichettaSpazio: { marginTop: 18 },
    riga: { flexDirection: 'row', gap: 10 },
    pillolaWrap: { flex: 1 },
    pillola: { borderRadius: raggio, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
    pillolaInerte: { backgroundColor: P.superficie, borderWidth: 1, borderColor: P.hair },
    pillolaTesto: { color: P.testo, fontSize: 15, fontFamily: F.medium, fontWeight: '600' },
    pillolaTestoAttivo: { color: P.testoSuAccento, fontSize: 15, fontFamily: F.bold, fontWeight: '800' }, // era '#052722'

    giocaWrap: { marginTop: 22 },
    gioca: { borderRadius: 16, paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
    giocaTesto: { color: P.testoSuAccento, fontSize: 18, fontFamily: F.bold, fontWeight: '800', letterSpacing: 0.3 }, // era '#052722'

    // Contatori
    stats: { flexDirection: 'row', gap: 11 },
    stat: {
      flex: 1,
      paddingVertical: 14,
      paddingHorizontal: 10,
      borderRadius: 16,
      alignItems: 'center',
      backgroundColor: P.superficie,
      borderWidth: 1,
      borderColor: P.hair,
    },
    statTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    statPunto: { width: 8, height: 8, borderRadius: 4 },
    statNum: { color: P.testo, fontSize: 20, fontFamily: F.black, fontWeight: '800' },
    statLab: { marginTop: 4, color: P.testoTenue, fontSize: 12, fontFamily: F.medium, fontWeight: '500' },

    // Azioni online + Classifica. `azioniGruppo` impila due righe (online / classifica);
    // `azioni` è la singola riga di pulsanti affiancati (ciascuno flex:1).
    azioniGruppo: { gap: 11 },
    azioni: { flexDirection: 'row', gap: 11 },
    azioneBtn: {
      flex: 1,
      backgroundColor: P.superficieAlta,
      borderWidth: 1,
      borderColor: P.hair,
      borderRadius: 14,
      paddingHorizontal: 12,
      paddingVertical: 13,
      alignItems: 'center',
    },
    azioneTesto: { color: P.testo, fontSize: 15, fontFamily: F.bold, fontWeight: '700' },

    legenda: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
    legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
    quadratino: { width: 14, height: 14, borderRadius: 4 },
    legendaTesto: { color: P.testoTenue, fontSize: 13, fontFamily: F.regular },
  });
}

export type StiliMenu = ReturnType<typeof creaStili>;
