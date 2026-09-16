import { describe, it, expect } from 'vitest';
import { normalizzaParola } from './normalizza';

describe('normalizzaParola (accent-insensitive)', () => {
  it('porta in maiuscolo', () => {
    expect(normalizzaParola('cane')).toBe('CANE');
  });

  it('rimuove gli accenti', () => {
    expect(normalizzaParola('perché')).toBe('PERCHE');
    expect(normalizzaParola('città')).toBe('CITTA');
    expect(normalizzaParola('È')).toBe('E');
  });

  it('toglie gli spazi ai bordi', () => {
    expect(normalizzaParola('  sole  ')).toBe('SOLE');
  });
});
