import { StyleSheet } from 'react-native';
import type { Tema } from '../temi/tipi';

export function creaStili(tema: Tema) {
  const coriandoliColori = [
    tema.palette.verde,
    tema.palette.arancione,
    tema.palette.accento,
    tema.palette.coriandoloChiaro, // era '#F2F5F8' cablato
  ];

  const stili = StyleSheet.create({
    contenitore: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  return { stili, coriandoliColori };
}

export type StiliCoriandoli = ReturnType<typeof creaStili>['stili'];
