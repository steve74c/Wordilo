import type { ConfigGioco } from './types';

/**
 * Default di gioco PROVVISORI lato client.
 *
 * ⚠️  In produzione questi valori arriveranno dal server (tabella `game_settings`)
 * e sostituiranno questo oggetto senza toccare il resto del codice: la schermata
 * legge sempre da un `ConfigGioco`, mai da numeri fissi. Questo file è solo il
 * "ponte" finché non colleghiamo Supabase.
 */
export const CONFIG_DEFAULT: ConfigGioco = {
  principiante: { maxTentativi: 7, secondiPerTentativo: null },
  esperto: { maxTentativi: 7, secondiPerTentativo: 10 },
};
