// -----------------------------------------------------------------------------
// Legge i parametri di gioco dalla tabella `game_settings` di Supabase e li
// trasforma nella forma `ConfigGioco` che il core già conosce.
// Va salvato in:  app/src/config/configService.ts
//
// Se la rete non risponde o la tabella è vuota, torna i CONFIG_DEFAULT: così
// l'app resta SEMPRE giocabile anche offline.
// -----------------------------------------------------------------------------
import { CONFIG_DEFAULT } from '@wordilo/core';
import type { ConfigGioco } from '@wordilo/core';
import { supabase } from '../lib/supabase';

type RigaSettings = {
  mode: string;
  max_attempts: number;
  seconds_per_attempt: number | null;
};

export async function caricaConfigDaDB(): Promise<ConfigGioco> {
  try {
    const { data, error } = await supabase
      .from('game_settings')
      .select('mode, max_attempts, seconds_per_attempt');

    if (error || !data || data.length === 0) {
      if (error) console.warn('Config dal DB non disponibile, uso i default:', error.message);
      return CONFIG_DEFAULT;
    }

    // Partiamo dai default e sovrascriviamo solo i campi che arrivano dal DB:
    // così, se un domani `ConfigGioco` avrà altri campi, restano validi.
    const config: ConfigGioco = {
      principiante: { ...CONFIG_DEFAULT.principiante },
      esperto: { ...CONFIG_DEFAULT.esperto },
    };

    for (const r of data as RigaSettings[]) {
      if (r.mode === 'principiante' || r.mode === 'esperto') {
        config[r.mode] = {
          ...config[r.mode],
          maxTentativi: r.max_attempts,
          secondiPerTentativo: r.seconds_per_attempt, // null = senza timer
        };
      }
    }

    return config;
  } catch (e) {
    console.warn('Errore caricando la config dal DB, uso i default.', e);
    return CONFIG_DEFAULT;
  }
}
