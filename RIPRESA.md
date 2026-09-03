# Prompt per riprendere lo sviluppo di Wordilo

> Incolla questo testo come **primo messaggio** in una nuova chat, e **allega il file
> `SPECIFICA.md`**. È scritto per mettere l'assistente nelle stesse condizioni in cui
> eravamo alla fine dell'ultima sessione.

---

Ciao. Sto sviluppando **Wordilo**, un gioco "indovina la parola" (stile Wordle) in
italiano, come **app unica** per web + iOS + Android. Ti allego **`SPECIFICA.md`**:
è la fonte di verità del progetto, aggiornata all'ultimo stato. **Leggila per intero
prima di rispondere.** Non sono un esperto di backend/Supabase, quindi spiegami le
cose in modo semplice e **procediamo un passo alla volta**.

## Dove sono arrivato (già fatto e funzionante)

- **Core** (`@wordilo/core`, TypeScript puro): logica colori + motore di gioco puro
  (crea stato, digita/cancella, `svuotaRiga`, `confermaTentativo`, `timeoutTentativo`,
  `coloriTastiera`) con test.
- **App Expo single player COMPLETA**: menu di scelta (5/6 lettere + modalità),
  modalità **principiante** ed **esperto** (con **timer/countdown** per tentativo),
  griglia + tastiera, animazioni, pop-up di fine partita, stile "flat".
- **Supabase collegato**:
  - client unico in `app/src/lib/supabase.ts`, chiavi nel file **`app/.env`**
    (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`), fuori da Git;
  - **schema del DB creato** (tabelle §10 con **RLS attiva**, trigger
    `handle_new_user` che crea il profilo alla registrazione, seed di
    `game_settings`/`app_config` con **esperto = 25s**, **dizionario italiano reale**
    in `words` + funzione `parola_casuale`, vista **`user_stats`**);
  - **config dal database**: `game_settings` letto via `ConfigProvider`/`useConfig`
    (`app/src/config/`), con `CONFIG_DEFAULT` del core come fallback offline;
  - **login obbligatorio email/password**: `AuthProvider` + `PortaAuth` +
    `SchermataAuth` (`app/src/auth/`, `app/src/screens/SchermataAuth.tsx`); profilo
    creato in automatico via trigger; **conferma email disattivata in sviluppo**;
    saluto col nick + pulsante **Esci** nel menu;
  - **statistiche reali per-utente**: a fine partita si scrive in `games`, i
    contatori (giocate/vinte/perse) si leggono dalla vista `user_stats`
    (`app/src/stats/statistiche.tsx`).
- **Dizionario reale + validazione (offline-first)**: importato il dizionario
  italiano vero in `words` (26.793 parole; 3.157 bersagli scelti per frequenza, soglia
  ~top 15.000). Il target si pesca e le parole si validano **in locale** dal
  dizionario incluso nell'app (`core/src/dizionarioDati.ts` → `SOLUZIONI`/`VALIDE`,
  con `parolaValida` iniettata in `confermaTentativo`): **si gioca anche senza rete**.
  Il DB resta la fonte di verità e la funzione SQL `parola_casuale` è pronta per
  l'online.

Con questo, **tutto il single player + account + statistiche + dizionario reale è
finito e collegato al database** (e il single player gira anche offline). Per i dettagli completi vedi la specifica (in particolare §3 struttura
file, §10 modello dati, §13 core, §14 decisioni, §15 stato/ordine di sviluppo).

## Stack e convenzioni da rispettare

- **Expo SDK 57 / React Native 0.86**, TypeScript. Monorepo: `/core`, `/app`,
  `/backend` (quest'ultimo non ancora creato). L'app importa il core come
  `@wordilo/core` (alias Metro + `paths` di tsconfig).
- **Backend**: Supabase (Auth, Postgres, Realtime, Storage, Edge Functions).
- **Nomi in italiano** nel codice (funzioni, variabili, tipi) — mantieni lo stile
  esistente.
- **Il `core` resta puro**: niente effetti/React lì dentro. Gli effetti (es. il
  timer) vivono nei hook/provider dell'app.
- **Sicurezza**: la chiave `anon` sta nell'app ed è protetta dalla **RLS**; la chiave
  `service_role` NON va mai nell'app (solo lato server/Edge Function). I segreti
  restano nel `.env` locale, mai in chat né in Git.
- Gotcha già incontrati: l'URL Supabase è **solo** `https://<progetto>.supabase.co`
  (niente `/rest/v1`, niente slash finale); il **`.env` si legge solo all'avvio**
  (dopo averlo modificato, riavviare Expo). Quando **cambi o aggiungi file nel
  `core`**, riavvia con **`npx expo start -c`** per pulire la cache di Metro.

## Come voglio che lavoriamo (metodo)

1. **Un (sotto-)passo alla volta.** Niente "sfornare" tutto insieme: fai un pezzo,
   spiegami cosa fa e come provarlo, poi **aspetta la mia conferma** prima di andare
   avanti.
2. **Non hai il codice nel tuo contesto.** Prima di modificare un file, **chiedimi di
   incollartelo** (o te lo allego) e lavora sulla versione esatta, per non rompere il
   build. Consegnami **file completi "drop-in"** (da sostituire integralmente) oppure
   modifiche puntuali chiarissime.
3. **Verifica a ogni passo**: dimmi esattamente cosa devo vedere/controllare (in app
   e, se serve, nel pannello Supabase) per sapere che ha funzionato.
4. **Spiega con parole semplici** le parti backend/SQL: sto imparando.
5. Se qualcosa dà errore, te lo incollo e lo risolviamo prima di proseguire.

## Cosa manca (prossimi passi possibili)

Da §15 della specifica, in ordine tipico. Sceglierò io da dove ripartire.
*(Il filone **B — Dizionario reale** è già stato completato: vedi sopra.)*

- **A. Login social + avatar** (peso medio): Google e Facebook via Supabase Auth
  (richiede configurare le app OAuth nei rispettivi pannelli), più immagine profilo
  in Storage con fallback alle iniziali. Raccoglierebbe anche nome/cognome.
- **C. Online** (peso grande, a sotto-passi): tabella `matches`, sfida in tempo reale
  con Supabase Realtime (codice-stanza), **Edge Function anti-cheat** che tiene la
  parola lato server, punteggi (10/0/5) e le due **classifiche** (`leaderboard_*`).

## Come iniziare

Per prima cosa: leggi la specifica, poi **riassumimi in poche righe dove siamo** (per
confermare che il contesto è chiaro), e **chiedimi quale dei due filoni rimasti
(A / C) voglio affrontare**. Quando ho scelto, partiamo dal **primo sotto-passo** di
quel filone, con lo stesso metodo qui sopra.