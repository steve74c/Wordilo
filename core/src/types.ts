// -----------------------------------------------------------------------------
// Tipi condivisi del modulo `core`.
// Questo modulo è TypeScript puro: nessuna dipendenza da React/React Native, così
// gira identico su web, iOS e Android e si può testare in isolamento.
// -----------------------------------------------------------------------------

// Colore assegnato a ogni lettera di un tentativo.
export type Colore = 'green' | 'orange' | 'grey';

// Modalità single player. ('online' erediterà queste regole e arriverà più avanti.)
export type Modalita = 'principiante' | 'esperto';

// Lunghezza della parola scelta a inizio partita.
export type LunghezzaParola = 5 | 6;

// Parametri di UNA modalità.
// NB: nessun numero è "cablato" nella logica: i valori arrivano da qui, e più
// avanti questa struttura verrà riempita con i dati del server (game_settings).
export interface ImpostazioniModalita {
  maxTentativi: number;                 // = numero di righe della griglia
  secondiPerTentativo: number | null;   // null = nessun timer; es. 10 per esperto
}

// L'intera configurazione di gioco lato single player.
export type ConfigGioco = Record<Modalita, ImpostazioniModalita>;
