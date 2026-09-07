import { Platform, StyleSheet } from 'react-native';
import { bagliore } from '../theme';
import type { Tema } from '../temi/tipi';

export function creaStili(tema: Tema) {
  return StyleSheet.create({
    sfondo: { flex: 1 },
    safe: { flex: 1 },
    centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
    titolo: {
      color: tema.palette.accentoSoft,
      fontSize: 40,
      fontFamily: tema.font.serif,
      fontWeight: '600',
      letterSpacing: 0.5,
      marginBottom: 22,
      ...bagliore(tema.palette.glow, 24),
    },
    card: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: tema.palette.cardSfondo, // era 'rgba(16,40,47,0.97)'
      borderColor: tema.palette.hair,
      borderWidth: 1,
      borderRadius: 22,
      padding: 22,
      gap: 12,
    },
    toggle: {
      flexDirection: 'row',
      backgroundColor: tema.palette.superficie, // era 'rgba(255,255,255,0.05)'
      borderRadius: 14,
      padding: 4,
      marginBottom: 4,
    },
    toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
    toggleAttivo: { backgroundColor: tema.palette.superficieAlta },
    toggleTesto: { color: tema.palette.testoTenue, fontSize: 15, fontFamily: tema.font.medium, fontWeight: '600' },
    toggleTestoAttivo: { color: tema.palette.testo },
    input: {
      backgroundColor: tema.palette.superficieAlta,
      borderColor: tema.palette.hair,
      borderWidth: 1,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: Platform.OS === 'web' ? 12 : 14,
      color: tema.palette.testo,
      fontSize: 16,
      fontFamily: tema.font.regular,
    },
    errore: { color: tema.palette.arancione, fontSize: 14, fontFamily: tema.font.medium, fontWeight: '600', textAlign: 'center' },
    bottone: { width: '100%', paddingVertical: 15, borderRadius: 16, alignItems: 'center', marginTop: 4 },
    bottoneTesto: { color: tema.palette.testoSuAccento, fontSize: 16, fontFamily: tema.font.bold, fontWeight: '800' }, // era '#052722'
  });
}

export type StiliAuth = ReturnType<typeof creaStili>;
