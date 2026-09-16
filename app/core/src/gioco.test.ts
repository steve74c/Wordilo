import { describe, it, expect } from 'vitest';
import type { ConfigGioco } from './types';
import {
  creaStato,
  digitaLettera,
  cancella,
  confermaTentativo,
  timeoutTentativo,
  coloriTastiera,
} from './gioco';

// Config di test: pochi tentativi per rendere brevi i casi "sconfitta"/"timeout".
// (Dimostra anche che i valori sono parametrici: qui non uso i default reali.)
const CONFIG_TEST: ConfigGioco = {
  principiante: { maxTentativi: 2, secondiPerTentativo: null },
  esperto: { maxTentativi: 2, secondiPerTentativo: 5 },
};

// Helper: digita un'intera parola lettera per lettera.
function scrivi(stato: ReturnType<typeof creaStato>, parola: string) {
  for (const ch of parola) stato = digitaLettera(stato, ch);
  return stato;
}

describe('input: digitazione e cancellazione', () => {
  it('digita, rispetta la lunghezza massima e cancella', () => {
    let s = creaStato(CONFIG_TEST, 'principiante', 'CANTO', 5);
    s = scrivi(s, 'CAN');
    expect(s.rigaCorrente).toBe('CAN');

    // oltre la lunghezza non aggiunge nulla
    s = scrivi(s, 'TOX');
    expect(s.rigaCorrente).toBe('CANTO');

    s = cancella(s);
    expect(s.rigaCorrente).toBe('CANT');
  });

  it('normalizza gli accenti anche in input (accent-insensitive)', () => {
    let s = creaStato(CONFIG_TEST, 'principiante', 'CANTO', 5);
    s = digitaLettera(s, 'à');
    expect(s.rigaCorrente).toBe('A');
  });
});

describe('conferma tentativo', () => {
  it('riga incompleta → problema "incompleta", stato invariato', () => {
    let s = creaStato(CONFIG_TEST, 'principiante', 'CANTO', 5);
    s = scrivi(s, 'CAN');
    const r = confermaTentativo(s);
    expect(r.problema).toBe('incompleta');
    expect(r.stato).toBe(s);
  });

  it('parola giusta → vittoria', () => {
    let s = creaStato(CONFIG_TEST, 'principiante', 'CANTO', 5);
    const r = confermaTentativo(scrivi(s, 'CANTO'));
    expect(r.problema).toBeUndefined();
    expect(r.stato.esito).toBe('won');
    expect(r.stato.righe).toHaveLength(1);
    expect(r.stato.righe[0].colori).toEqual([
      'green',
      'green',
      'green',
      'green',
      'green',
    ]);
  });

  it('esauriti i tentativi senza indovinare → sconfitta', () => {
    let s = creaStato(CONFIG_TEST, 'principiante', 'CANTO', 5);
    s = confermaTentativo(scrivi(s, 'RUSPE')).stato;
    expect(s.esito).toBe('in_corso');
    s = confermaTentativo(scrivi(s, 'RUSPE')).stato;
    expect(s.esito).toBe('lost');
    expect(s.righe).toHaveLength(2);
  });

  it('validazione iniettata: parola bocciata → problema "non_valida"', () => {
    let s = creaStato(CONFIG_TEST, 'principiante', 'CANTO', 5);
    s = scrivi(s, 'RUSPE');
    const r = confermaTentativo(s, () => false); // dizionario "finto" che boccia
    expect(r.problema).toBe('non_valida');
    expect(r.stato).toBe(s);
  });
});

describe('timeout modalità esperto (opzione A)', () => {
  it('la riga è persa senza valutazione ma consuma un tentativo', () => {
    let s = creaStato(CONFIG_TEST, 'esperto', 'CANTO', 5);

    s = timeoutTentativo(s);
    expect(s.righe).toHaveLength(1);
    expect(s.righe[0].persaPerTimeout).toBe(true);
    expect(s.righe[0].parola).toBe('');
    expect(s.righe[0].colori).toEqual([]); // nessun colore
    expect(s.esito).toBe('in_corso');

    s = timeoutTentativo(s); // secondo (e ultimo) tentativo consumato
    expect(s.esito).toBe('lost');
  });
});

describe('colori della tastiera', () => {
  it('tiene il colore migliore (verde > arancione > grigio)', () => {
    let s = creaStato(CONFIG_TEST, 'principiante', 'CANTO', 5);
    // TANTO vs CANTO: T iniziale grigia, ma T finale verde → il tasto T è verde
    s = confermaTentativo(scrivi(s, 'TANTO')).stato;
    const k = coloriTastiera(s);
    expect(k['T']).toBe('green');
    expect(k['A']).toBe('green');
    expect(k['N']).toBe('green');
    expect(k['O']).toBe('green');
    expect(k['C']).toBeUndefined(); // lettera mai digitata
  });

  it('le righe perse per timeout non colorano tasti', () => {
    let s = creaStato(CONFIG_TEST, 'esperto', 'CANTO', 5);
    s = timeoutTentativo(s);
    expect(coloriTastiera(s)).toEqual({});
  });
});
