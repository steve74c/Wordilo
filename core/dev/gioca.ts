// -----------------------------------------------------------------------------
// Wordilo — mini-versione da terminale (solo per PROVARE la logica).
// Usa il VERO motore `core`: stessi colori, stesse regole sui duplicati.
// Modalità principiante (senza timer): il countdown è un effetto della UI e lo
// vedremo nella schermata Expo. NON è il gioco finale, è un banco di prova.
//
// Avvio:   npx tsx dev/gioca.ts
// Trucco:  WORDILO_TARGET=CANTO npx tsx dev/gioca.ts   (forza la parola)
// -----------------------------------------------------------------------------
import readline from 'node:readline';
import {
  creaStato,
  digitaLettera,
  confermaTentativo,
  coloriTastiera,
  normalizzaParola,
  CONFIG_DEFAULT,
} from '../src/index';
import type { Colore, LunghezzaParola, StatoGioco } from '../src/index';

// Piccola lista di parole di prova (accenti già assenti, tutte reali).
const PAROLE: Record<LunghezzaParola, string[]> = {
  5: ['CANTO', 'PALLA', 'SEDIA', 'FIUME', 'LIBRO', 'MONTE', 'PORTA', 'VERDE'],
  6: ['GELATO', 'FINALE', 'MONETA', 'SIRENA', 'TAVOLO', 'DOMANI', 'CAMBIO'],
};

// Colora una lettera con lo sfondo giusto (verde/arancione/grigio).
function dipingi(lettera: string, colore: Colore): string {
  const bg =
    colore === 'green' ? '48;5;34' : colore === 'orange' ? '48;5;208' : '48;5;240';
  return `\x1b[${bg}m\x1b[97m ${lettera} \x1b[0m`;
}

function disegnaGriglia(stato: StatoGioco) {
  for (const riga of stato.righe) {
    const cells = riga.parola
      .split('')
      .map((l, i) => dipingi(l, riga.colori[i]))
      .join('');
    console.log('  ' + cells);
  }
}

function disegnaTastiera(stato: StatoGioco) {
  const mappa = coloriTastiera(stato);
  const per = (c: Colore) =>
    Object.keys(mappa)
      .filter((l) => mappa[l] === c)
      .sort()
      .join(' ') || '—';
  console.log(
    `  tasti → \x1b[48;5;34m verdi \x1b[0m ${per('green')}   ` +
      `\x1b[48;5;208m gialli \x1b[0m ${per('orange')}   ` +
      `\x1b[48;5;240m grigi \x1b[0m ${per('grey')}`,
  );
}

function intro(stato: StatoGioco) {
  console.log(
    `\n🎯 Indovina la parola di ${stato.lunghezza} lettere. Hai ${stato.maxTentativi} tentativi.\n`,
  );
}

const prompt = (stato: StatoGioco) =>
  process.stdout.write(`Tentativo ${stato.righe.length + 1}: `);

async function main() {
  const rl = readline.createInterface({ input: process.stdin });

  let stato: StatoGioco | null = null;
  const forzata = process.env.WORDILO_TARGET;

  // Se la parola è forzata, salto la domanda sulla lunghezza.
  if (forzata) {
    const target = normalizzaParola(forzata);
    stato = creaStato(CONFIG_DEFAULT, 'principiante', target, target.length as LunghezzaParola);
    intro(stato);
    prompt(stato);
  } else {
    process.stdout.write('Lunghezza parola (5 o 6): ');
  }

  for await (const raw of rl) {
    // Fase 1: scelta lunghezza (solo se non forzata).
    if (stato === null) {
      const lunghezza: LunghezzaParola = raw.trim() === '6' ? 6 : 5;
      const lista = PAROLE[lunghezza];
      const target = lista[Math.floor(Math.random() * lista.length)];
      stato = creaStato(CONFIG_DEFAULT, 'principiante', target, lunghezza);
      intro(stato);
      prompt(stato);
      continue;
    }

    // Fase 2: tentativi.
    const parola = normalizzaParola(raw);
    if (parola.length !== stato.lunghezza) {
      console.log(`  ⚠️  Servono esattamente ${stato.lunghezza} lettere.`);
      prompt(stato);
      continue;
    }

    for (const ch of parola) stato = digitaLettera(stato, ch);
    stato = confermaTentativo(stato).stato;

    console.log('');
    disegnaGriglia(stato);
    disegnaTastiera(stato);
    console.log('');

    if (stato.esito !== 'in_corso') {
      if (stato.esito === 'won') {
        console.log(`✅ Bravo! Indovinata in ${stato.righe.length} tentativi.\n`);
      } else {
        console.log(`❌ Persa. La parola era: ${stato.target}\n`);
      }
      rl.close();
      break;
    }
    prompt(stato);
  }
}

main();
