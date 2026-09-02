import { describe, it, expect } from 'vitest';
import { valutaTentativo } from './valutaTentativo';
import type { Colore } from './types';

// Alias compatti per rendere i test leggibili a colpo d'occhio.
const V: Colore = 'green';
const A: Colore = 'orange';
const G: Colore = 'grey';

// NB: la funzione non valida il dizionario, quindi alle parole basta la lunghezza
// giusta; qui uso comunque parole italiane reali (tutte MAIUSCOLE = già normalizzate).

describe('valutaTentativo — casi base', () => {
  it('parola indovinata → tutte verdi', () => {
    expect(valutaTentativo('CANTO', 'CANTO')).toEqual([V, V, V, V, V]);
  });

  it('nessuna lettera in comune → tutte grigie', () => {
    // RUSPE = {R,U,S,P,E} disgiunto da CANTO = {C,A,N,T,O}
    expect(valutaTentativo('RUSPE', 'CANTO')).toEqual([G, G, G, G, G]);
  });

  it('lettere giuste ma spostate → arancioni', () => {
    // CONTA vs CANTO: C,N,T combaciano; A e O sono scambiate → arancioni
    expect(valutaTentativo('CONTA', 'CANTO')).toEqual([V, A, V, V, A]);
  });
});

describe('valutaTentativo — gestione dei duplicati', () => {
  it('lettera doppia nel guess ma singola nel target → solo una colorata', () => {
    // AVENA ha due A; GATTO ha una sola A (in pos.1, non allineata).
    // La 1ª A prende l'arancione, la 2ª A resta grigia.
    expect(valutaTentativo('AVENA', 'GATTO')).toEqual([A, G, G, G, G]);
  });

  it('un verde "consuma" l\'unica occorrenza → le copie extra restano grigie', () => {
    // SASSO vs SEDIA: la S in pos.0 è verde e usa l'unica S del target;
    // le altre due S restano grigie (non arancioni). La A diventa arancione.
    expect(valutaTentativo('SASSO', 'SEDIA')).toEqual([V, A, G, G, G]);
  });

  it('lettera doppia nel target, entrambe verdi → le altre restano grigie', () => {
    // LILLA vs PALLA: le due L centrali sono verdi e usano entrambe le L del
    // target; la L iniziale e la I restano grigie.
    expect(valutaTentativo('LILLA', 'PALLA')).toEqual([G, G, V, V, V]);
  });
});

describe('valutaTentativo — parole da 6 lettere', () => {
  it('gestisce correttamente verdi/arancioni/grigi con una doppia', () => {
    // ARRIVO vs GIRARE: una R verde, l'altra R (disponibile) arancione,
    // A e I arancioni, V e O grigie.
    expect(valutaTentativo('ARRIVO', 'GIRARE')).toEqual([A, A, V, A, G, G]);
  });
});

describe('valutaTentativo — robustezza', () => {
  it('lancia un errore se le lunghezze sono diverse', () => {
    expect(() => valutaTentativo('ABC', 'ABCD')).toThrow();
  });
});
