import { StyleSheet } from 'react-native';
import type { Tema } from '../temi/tipi';

export function creaStili(tema: Tema) {
  // Prima queste tinte erano cablate (bianchi/#052722 fissi) e IGNORAVANO i
  // token tastoNeutro* della palette. Ora vengono tutte dal tema.
  const tinte = {
    neutroBg: tema.palette.tastoNeutro,
    neutroBordo: tema.palette.tastoNeutroBordo,
    neutroTesto: tema.palette.tastoNeutroTesto,
    invioBg: tema.palette.accento,
    invioTesto: tema.palette.testoSuAccento,
    verdeBg: tema.palette.verde,
    arancioneBg: tema.palette.arancione,
    grigioBg: tema.palette.grigio,
    statoTesto: tema.palette.testoSuColore,
    grigioTesto: tema.palette.testo,
  };

  const stili = StyleSheet.create({
    tastiera: { width: '100%', maxWidth: 600, alignSelf: 'center', gap: 8 },
    riga: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
    tasto: {
      minWidth: 28,
      flexGrow: 1,
      flexBasis: 0,
      borderRadius: tema.misure.raggio,
      alignItems: 'center',
      justifyContent: 'center',
    },
    largo: { flexGrow: 1.7 },
    testo: { fontSize: 18, fontFamily: tema.font.bold, fontWeight: '700' },
    testoPiccolo: { fontSize: 15, fontFamily: tema.font.bold, fontWeight: '800' },
  });

  return { stili, tinte };
}

export type StiliTastiera = ReturnType<typeof creaStili>['stili'];
export type TinteTastiera = ReturnType<typeof creaStili>['tinte'];
