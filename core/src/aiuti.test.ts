import { describe, expect, it } from 'vitest';
import { coloriConAiuti, pescaAiuto } from './aiuti';

describe('pescaAiuto', () => {
  it('verde: la lettera è davvero in quella posizione', () => {
    for (let k = 0; k < 50; k++) {
      const a = pescaAiuto('CARTA', 'lettera_verde')!;
      expect('CARTA'[a.posizione]).toBe(a.lettera);
    }
  });

  it('arancione: lettera presente ma NON in quella posizione', () => {
    for (let k = 0; k < 50; k++) {
      const a = pescaAiuto('CARTA', 'lettera_arancione')!;
      expect('CARTA').toContain(a.lettera);
      expect('CARTA'[a.posizione]).not.toBe(a.lettera);
    }
  });

  it('evita le colonne già occupate quando può', () => {
    for (let k = 0; k < 50; k++) {
      const a = pescaAiuto('PIANO', 'lettera_verde', [0, 1, 2, 3])!;
      expect(a.posizione).toBe(4);
      const b = pescaAiuto('PIANO', 'lettera_arancione', [0, 1, 2, 3])!;
      expect(b.posizione).toBe(4);
    }
  });
});

describe('coloriConAiuti', () => {
  it('colora la lettera senza peggiorare un verde', () => {
    const r = coloriConAiuti({ A: 'green' }, [
      { tipo: 'lettera_arancione', lettera: 'A', posizione: 0 },
      { tipo: 'lettera_verde', lettera: 'R', posizione: 2 },
    ]);
    expect(r).toEqual({ A: 'green', R: 'green' });
  });
});
