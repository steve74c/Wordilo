import { StyleSheet } from 'react-native';
import type { Colore } from '@wordilo/core';
import type { Tema } from '../temi/tipi';

export function creaStili(tema: Tema) {
  const colori = {
    cellaInserita: tema.palette.cellaInseritaSfondo,
    cellaAttiva: tema.palette.cellaAttivaSfondo,
    cellaVuota: tema.palette.cellaSfondo,
    bordoInserita: tema.palette.bordoAttivo,
    bordoAttiva: tema.palette.bordoCellaAttiva,
    bordoVuota: tema.palette.bordoVuoto,
    // Numero + bordo del countdown in stato NORMALE. Uso accentoSoft (non
    // accento) perché è la variante d'accento pensata per LEGGERSI: nel tema
    // giallo è ambra scuro, così numero e anello restano leggibili sul fondo
    // chiaro/tenue — niente più dischetto marrone pieno.
    countdownNormale: tema.palette.accentoSoft,
    // Allarme ultimi secondi: ROSSO acceso, uguale in tutti i temi (segnale
    // universale di "tempo quasi scaduto"). Non arriva dalla palette perché
    // nessun tema ha un token rosso dedicato; volendo si può renderlo per-tema.
    countdownAllarme: '#FF3B30',
    // Fondo del cerchietto in stato NORMALE (sopra i 5s) e colore del numero
    // quando il fondo diventa rosso pieno: bianco, per il massimo contrasto.
    countdownSfondo: tema.palette.countdownSfondo,
    countdownTestoAllarme: tema.palette.testoSuColore,
    // Colore della lettera:
    // - su cella VALUTATA (fondo pieno verde/arancione/grigio) → bianco.
    // - su cella NON valutata (fondo chiaro/scuro del tema) → testo del tema.
    letteraValutata: tema.palette.testoSuColore,
    letteraCella: tema.palette.testo,
    valutata: (colore: Colore): string =>
      colore === 'green'
        ? tema.palette.verde
        : colore === 'orange'
          ? tema.palette.arancione
          : tema.palette.grigio,
  };

  const stili = StyleSheet.create({
    riga: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
    cella: { alignItems: 'center', justifyContent: 'center' },
    cellaVuota: { borderWidth: 2 },
    // NB: niente `color` qui — lo mette la Griglia a seconda del tipo di cella.
    lettera: {
      fontFamily: tema.font.bold,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    // Countdown esperto: ancorato al bordo destro della riga (left:'100%'), fuori flow.
    countdown: {
      position: 'absolute',
      left: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      backgroundColor: tema.palette.countdownSfondo,
      pointerEvents: 'none', // (era prop deprecata sul componente)
    },
    countdownTesto: { fontFamily: tema.font.bold, fontWeight: '800' },
    // Pallini avversario (online): ancorati al bordo SINISTRO della riga
    // (right:'100%'), fuori dal flow → non spostano le celle centrate.
    palliniAvv: {
      position: 'absolute',
      right: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      pointerEvents: 'none', // (era prop deprecata sul componente)
    },
    pallino: { alignItems: 'center', justifyContent: 'center' },
    pallinoTesto: { color: tema.palette.testoSuColore, fontFamily: tema.font.bold, fontWeight: '800' },
  });

  return { stili, colori };
}

export type StiliGriglia = ReturnType<typeof creaStili>['stili'];
export type ColoriGriglia = ReturnType<typeof creaStili>['colori'];
