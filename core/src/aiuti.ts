import type { Colore } from './types';

// -----------------------------------------------------------------------------
// AIUTI a pagamento (lettere rivelate). Funzioni PURE: niente rete, niente
// monete. Il pagamento lo fa il server (RPC `compra_aiuto`); qui si sceglie solo
// QUALE lettera mostrare, a partire dalla parola bersaglio.
//
// Regola decisa: la lettera è CASUALE, anche se il giocatore l'ha già scoperta.
// -----------------------------------------------------------------------------

/** Tipi di aiuto lettera (il tempo extra non ha bisogno di logica qui). */
export type TipoAiutoLettera = 'lettera_arancione' | 'lettera_verde';

/**
 * Un aiuto rivelato.
 * - verde:     `lettera` è nella parola ESATTAMENTE in `posizione`.
 * - arancione: `lettera` è nella parola ma NON in `posizione`.
 */
export interface AiutoLettera {
  tipo: TipoAiutoLettera;
  lettera: string;
  posizione: number; // 0-based
}

const pesca = <T>(arr: T[], rnd: () => number): T => arr[Math.floor(rnd() * arr.length) % arr.length];

/**
 * Sceglie una lettera da rivelare.
 * `evita` = colonne già occupate da altri aiuti: si preferisce non usarle, così
 * nella riga aiuti ogni colonna mostra una lettera sola (se non si può, pazienza).
 * `rnd` è iniettabile per i test (default Math.random).
 */
export function pescaAiuto(
  target: string,
  tipo: TipoAiutoLettera,
  evita: number[] = [],
  rnd: () => number = Math.random,
): AiutoLettera | null {
  const n = target.length;
  if (n === 0) return null;
  const tutte = Array.from({ length: n }, (_, i) => i);
  const libere = (xs: number[]) => {
    const f = xs.filter((i) => !evita.includes(i));
    return f.length > 0 ? f : xs;
  };

  if (tipo === 'lettera_verde') {
    const i = pesca(libere(tutte), rnd);
    return { tipo, lettera: target[i], posizione: i };
  }

  // Arancione: lettera della parola + una colonna dove quella lettera NON c'è.
  const coppie: { lettera: string; posizione: number }[] = [];
  for (const i of tutte) {
    const l = target[i];
    for (const j of tutte) if (target[j] !== l) coppie.push({ lettera: l, posizione: j });
  }
  if (coppie.length === 0) return null; // parola di lettere tutte uguali: impossibile in pratica
  const buone = coppie.filter((c) => !evita.includes(c.posizione));
  const scelta = pesca(buone.length > 0 ? buone : coppie, rnd);
  return { tipo, ...scelta };
}

const PRIORITA: Record<Colore, number> = { grey: 0, orange: 1, green: 2 };

/**
 * Unisce gli aiuti ai colori della tastiera: una lettera rivelata si colora
 * (verde/arancione) ma non "peggiora" mai un colore già migliore.
 */
export function coloriConAiuti(
  base: Record<string, Colore>,
  aiuti: AiutoLettera[],
): Record<string, Colore> {
  if (aiuti.length === 0) return base;
  const out = { ...base };
  for (const a of aiuti) {
    const c: Colore = a.tipo === 'lettera_verde' ? 'green' : 'orange';
    const attuale = out[a.lettera];
    if (attuale === undefined || PRIORITA[c] > PRIORITA[attuale]) out[a.lettera] = c;
  }
  return out;
}
