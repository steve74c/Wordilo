# Wordilo — Specifica del progetto

> Documento di riferimento del gioco. È la "fonte di verità": descrive cosa si
> vuole costruire, con quali scelte tecniche e con quale modello dati. Va tenuto
> aggiornato a ogni decisione presa.

**Stato:** in sviluppo — modulo `core` (colori, motore di gioco, normalizzazione)
implementato e testato, e **app Expo** con la prima schermata single player
(**modalità principiante**) giocabile su web e mobile, con **grafica in stile flat**
(vedi §16). Ancora da fare: modalità esperto (countdown), schermata di scelta 5/6 +
modalità, e tutto il backend.
**Ultimo aggiornamento:** 2026-08-31

---

## 1. Cos'è

Wordilo è un gioco "indovina la parola" (stile Wordle) in italiano, disponibile
come **app web** e come **app mobile (iOS e Android)** con **un unico codebase**.

L'utente sceglie all'inizio se giocare con parole da **5 o 6 lettere**, poi gioca
in una delle tre modalità. A ogni tentativo, dopo la conferma, ogni lettera viene
colorata:

- **Verde** — lettera giusta nella posizione giusta.
- **Arancione** — lettera presente nella parola ma in posizione sbagliata.
- **Grigio** — lettera non presente nella parola.

Gli stessi colori si applicano ai tasti della tastiera a schermo.

---

## 2. Obiettivi e vincoli chiave

- **Un solo codice** per web + iOS + Android; a ogni modifica l'impatto per
  dispositivo deve essere minimo o nullo.
- **Parametri di gioco lato server** e modificabili senza ricompilare l'app
  (numero tentativi, secondi per tentativo, punti, soglie).
- **Online anti-cheat**: la parola target non deve mai arrivare in chiaro al
  client; la valutazione dei tentativi avviene lato server.

---

## 3. Stack tecnologico

| Ambito            | Scelta                                                        |
|-------------------|---------------------------------------------------------------|
| App (multi-piattaforma) | **Expo** (React Native + React Native Web), **TypeScript** |
| Backend           | **Supabase** (Auth, Postgres, Realtime, Storage, Edge Functions) |
| Logica di gioco   | Modulo **`core`** in TypeScript puro, condiviso tra i target   |
| Online tempo reale| **Supabase Realtime** (canali broadcast)                       |
| Valutazione online| **Edge Function** lato server (tiene la parola, restituisce i colori) |

**Perché Expo:** con `react-native-web` gli stessi componenti girano su web e
mobile; le app risultano native (tocco reattivo, animazioni e aptica native),
cosa importante per un gioco a tempo. Consente inoltre aggiornamenti
over-the-air del codice JS senza ripassare dagli store.

### Struttura del progetto (monorepo)

```
/core        → logica di gioco, tipi, dizionario (TypeScript puro, condiviso)
  src/         valutaTentativo, gioco (motore), normalizza, config, paroleDev, types
  dev/gioca.ts CLI di prova (banco di prova della logica, non fa parte del gioco)
/app         → app Expo (web + iOS + Android)
  App.tsx                      carica i font (Poppins locali) e monta la schermata
  src/hooks/useGioco.ts        ponte React ↔ motore core
  src/components/Griglia.tsx   griglia di celle colorate
  src/components/Tastiera.tsx  tastiera a schermo (neutri bianchi, OK teal)
  src/components/Coriandoli.tsx  particelle leggere per la vittoria
  src/screens/SchermataGioco.tsx
  src/LoadingScreen.tsx        schermata di caricamento brandizzata
  src/theme.ts                 colori, font, ombre (stile flat)
  assets/fonts/                font Poppins incorporati (.ttf)
  metro.config.js              wiring monorepo (Metro vede /core)
/backend     → Edge Functions / logica server per l'online (non ancora creata)
```

L'app importa il core come `@wordilo/core`: l'alias è risolto sia da TypeScript
(`paths` in `tsconfig`) sia da Metro (`extraNodeModules` + `watchFolders` verso la
radice), così lo **stesso identico** modulo `core` gira su web, iOS e Android.

---

## 4. Account e accesso

Registrazione e login tramite **Supabase Auth**:

- **Email/password** — durante la registrazione si raccolgono **nome, cognome,
  email, nick**.
- **Google**.
- **Facebook**.

### Profilo

Ogni utente ha un profilo con: **nick** (univoco), nome, cognome, **immagine
avatar**.

Gestione avatar in tre casi, in ordine di priorità:

1. Se l'utente ha **caricato una propria foto**, si usa quella.
2. Altrimenti, se è entrato con **Google/Facebook**, si usa la foto del social
   (fornita automaticamente da Supabase al primo accesso).
3. Altrimenti si mostra un **avatar generato** con le iniziali su sfondo colorato
   (mai un riquadro vuoto).

Il file immagine sta in **Supabase Storage** (bucket `avatars`, un file per
utente, es. `avatars/<user_id>.jpg`); nel database si salva solo l'URL
(`profiles.avatar_url`). Alla sostituzione della foto, l'URL deve cambiare (o
avere un parametro variabile) per evitare la cache di browser/telefono.

---

## 5. Modalità di gioco

I valori numerici qui sotto sono **default parametrizzabili lato server**.

### 5.1 Principiante

- **7 tentativi** (default) per indovinare la parola.
- Nessun timer.
- Dopo l'ultimo tentativo sbagliato si perde.

### 5.2 Esperto

- **10 secondi per ogni tentativo** (default), con countdown mostrato a lato
  della riga corrente.
- Se scadono i 10 secondi, quel **tentativo è perso** e si passa al successivo
  (non si perde l'intera partita). In dettaglio: la riga viene **persa senza
  valutazione** — ciò che era stato digitato si scarta e **non riceve colori** —,
  il timeout **consuma comunque un tentativo** (conta verso il massimo) e il
  **countdown riparte da capo a ogni nuova riga**.
- Stesso numero di tentativi del principiante (parametrico).

### 5.3 Online

- Sfida tra **due giocatori** sulla **stessa parola target**.
- Si sceglie se giocare in modalità **principiante o esperto** (ne eredita le
  regole: tentativi e/o timer).
- **Accoppiamento: solo tramite codice-stanza** (per ora). Un giocatore crea la
  stanza e riceve un codice breve da condividere; l'altro entra digitandolo.
  *(La coda casuale è prevista in futuro e non cambierà la struttura dati.)*
- **Indicatore avversario:** a lato di ogni riga giocata dall'avversario
  compaiono due pallini che riassumono il suo tentativo su quella riga —
  **un pallino verde con il numero di lettere corrette** e **un pallino arancione
  con il numero di lettere presenti ma fuori posizione**. Si trasmettono **solo i
  conteggi, mai le lettere**, così si vede l'andamento dell'avversario senza poter
  copiare.

---

## 6. Punteggio ed esiti

### Single player (principiante / esperto)

- **Nessun punteggio.** Solo esito: **vinta** o **persa**. Non esiste il pareggio.

### Online

- Chi indovina per primo **vince**; l'altro **perde**.
- Se **nessuno dei due** indovina entro i tentativi → **pareggio**.
- Punti (default parametrici): **vittoria 10**, **sconfitta 0**, **pareggio 5 a
  testa**.
- I punti si accumulano **solo dall'online** (il single player vale sempre 0).

---

## 7. Classifiche

Due classifiche **distinte**:

1. **Classifica a punti** — somma dei punti guadagnati online. Premia la costanza
   (chi gioca molto e vince).
2. **Classifica per bravura** — ordinata sul **win-rate** (vittorie/partite).
   Premia la qualità.

**Soglia minima** per la classifica bravura: per entrare servono almeno
**N partite online** (default 10, parametrico), altrimenti un giocatore con una
sola vittoria risulterebbe al 100%. A parità di win-rate, sta più in alto chi ha
giocato più partite.

*(In futuro, eventuale sistema tipo Elo o media pesata al posto della soglia
secca. Rimandato.)*

---

## 8. Statistiche personali

All'ingresso l'utente vede le **ultime partite** (vinte / perse / pareggiate) e i
contatori aggregati. Le "ultime partite" sono gli ultimi N record dell'utente
ordinati per data; gli aggregati escono da una vista sul database.

---

## 9. Dizionario

Serve un dizionario italiano di parole da **5 e 6 lettere** con doppio uso:

- estrarre la **parola target**;
- **validare** che ciò che l'utente scrive sia una parola reale.

Il gioco è **accent-insensitive**: gli accenti si rimuovono sia dal dizionario sia
dall'input dell'utente (es. `perché` → `PERCHE`) e la tastiera a schermo non ha
tasti accentati. La normalizzazione è centralizzata in `normalizzaParola` (`core`).

---

## 10. Modello dati (Supabase / Postgres)

```sql
-- 1. PROFILI (estende auth.users)
profiles
  id           uuid PK → auth.users.id
  nick         text unique not null
  nome         text
  cognome      text
  avatar_url   text
  created_at   timestamptz default now()
  -- email e provider (google/facebook/email) stanno già in auth.users

-- 2. DIZIONARIO
words
  id           bigint PK
  word         text not null
  length       smallint not null          -- 5 o 6
  is_solution  boolean default true        -- true = estraibile come target
  lang         text default 'it'
  unique(word, lang)

-- 3. PARAMETRI PER MODALITÀ
game_settings
  mode                 text PK             -- 'principiante' | 'esperto'
  max_attempts         int not null default 7
  seconds_per_attempt  int                 -- null = senza timer; 10 per esperto
  points_win           smallint default 10
  points_lose          smallint default 0
  points_draw          smallint default 5
  updated_at           timestamptz

-- 3b. PARAMETRI GLOBALI (riga singola)
app_config
  id               int PK default 1
  skill_min_games  int default 10          -- soglia classifica bravura

-- 4. PARTITE ONLINE (l'incontro tra due giocatori)
matches
  id            uuid PK
  room_code     text unique                -- es. "K7P2Q"
  mode          text                        -- 'principiante' | 'esperto'
  word_id       bigint → words.id           -- stessa parola per entrambi
  word_length   smallint
  host_id       uuid → profiles.id          -- chi crea la stanza
  guest_id      uuid → profiles.id          -- chi entra (null finché vuota)
  status        text                        -- 'waiting' | 'playing' | 'finished'
  winner_id     uuid → profiles.id          (nullable)
  is_draw       boolean default false
  created_at    timestamptz
  finished_at   timestamptz

-- 5. GIOCATE (una riga per partita giocata da un utente)
games
  id            uuid PK
  user_id       uuid → profiles.id
  match_id      uuid → matches.id           -- null = single player
  mode          text                        -- 'principiante' | 'esperto' | 'online'
  word_length   smallint                    -- 5 o 6
  word_id       bigint → words.id           -- target (per il single player)
  result        text                        -- 'won' | 'lost' | 'draw'
  attempts_used smallint
  duration_ms   int
  points        smallint                    -- 0 / 5 / 10 (sempre 0 in single player)
  guesses       jsonb                       -- [{ word, pattern:['green','orange','grey',...] }]
  created_at    timestamptz
  finished_at   timestamptz
```

### Storage

- Bucket **`avatars`** — file immagine profilo. Lettura pubblica; scrittura solo
  del proprietario del file.

### Viste

```sql
-- statistiche personali
user_stats (view)
  → user_id, giocate, vinte, perse, pareggiate, win_rate, punti_totali

-- classifica a punti
leaderboard_points (view)
  → user_id, nick, avatar_url, partite_online, vinte, perse, pareggiate,
    punti_totali
  order by punti_totali desc

-- classifica per bravura (con soglia minima)
leaderboard_skill (view)
  → user_id, nick, avatar_url, partite_online, vinte, win_rate
  where partite_online >= app_config.skill_min_games
  order by win_rate desc, partite_online desc
```

### Note di modellazione

- **`matches` separata da `games`**: un match online produce **due righe** in
  `games` (una per giocatore), con lo stesso `match_id`. Così le statistiche di un
  utente si calcolano **sempre** dalla sola `games`, sia solitario che online.
- **`guesses` (jsonb)** salva la sequenza dei tentativi con i colori: utile per
  rimostrare una partita passata e, nell'online, come traccia. Opzionale.
- Parametri di gioco e punti stanno nel DB → si cambiano senza ricompilare.

---

## 11. Flusso della sfida online (codice-stanza)

1. **Host crea** la stanza → `matches` con `room_code` generato, `guest_id` vuoto,
   `status = 'waiting'`.
2. **Guest entra** col codice → si riempie `guest_id`, `status = 'playing'`.
   **In questo momento** il server assegna `word_id` (non prima).
3. I client ricevono **solo la lunghezza** della parola; ogni tentativo è valutato
   dal server, che restituisce i colori.
4. Dopo ogni tentativo, ciascun client pubblica sul canale realtime un messaggio
   minimale, es. `{ riga: 3, verdi: 2, arancioni: 1 }`; l'avversario disegna i due
   pallini accanto a quella riga.
5. Fine sfida → `status = 'finished'` con `winner_id` oppure `is_draw = true`;
   vengono scritte le due righe in `games` con `result` e `points`.

---

## 12. Sicurezza (anti-cheat)

- Parola target **solo lato server**; al client va solo la lunghezza.
- Valutazione tentativi via **Edge Function**; il client riceve solo i colori.
- Nell'online si trasmettono **conteggi**, non lettere, per i pallini avversario.
- Regole di accesso a livello di riga (RLS) su Supabase: ogni utente legge/scrive
  solo i propri dati; classifiche e avatar in lettura pubblica.

---

## 13. Logica di gioco condivisa (`core`)

Funzione pura, indipendente dal dispositivo, usata identica ovunque:

```
valutaTentativo(guess, target) →
  per ogni lettera: 'green' | 'orange' | 'grey'
```

Regola dei duplicati (come in Wordle): le lettere verdi "consumano" le occorrenze
del target per prime; l'arancione si assegna solo se restano occorrenze non ancora
abbinate. Da definire con test dedicati.

Le tre modalità differiscono solo per configurazione (numero tentativi, timer,
sincronizzazione avversario), non per codice.

Oltre a `valutaTentativo`, il `core` contiene un **motore di gioco puro** (crea
stato, digita/cancella, conferma tentativo, `timeoutTentativo`, `coloriTastiera`):
funzioni senza effetti collaterali che le schermate consumano senza duplicare
logica; il timer, essendo un effetto, vive nella UI e allo scadere chiama
`timeoutTentativo`. La configurazione (`ConfigGioco`) si legge da un provider:
oggi un default **provvisorio lato client** (`CONFIG_DEFAULT`), domani i valori del
server (`game_settings`), senza modifiche al resto del codice. La **validazione**
della parola è un predicato **iniettabile** (`confermaTentativo(stato, isValida)`),
oggi disattivato tramite stub, pronto per il dizionario reale.

---

## 14. Decisioni prese

- Stack: **Expo + Supabase**, TypeScript, monorepo `core`/`app`/`backend`.
- Principiante: **7 tentativi** (default parametrico), nessun timer.
- Esperto: **10 secondi/tentativo** (default parametrico); allo scadere si perde
  **solo quel tentativo**.
- Tutti i valori numerici chiave sono **parametrici lato server**.
- Single player: **nessun punteggio**, solo vinta/persa, niente pareggio.
- Online: **solo codice-stanza** ora; coda casuale in futuro.
- Punti online: **10 / 0 / 5**.
- **Due classifiche** distinte (punti + bravura), bravura con **soglia minima**
  (default 10 partite).
- Avatar in **Storage**, con fallback social → iniziali.
- Esperto, dettaglio timeout: allo scadere la riga è **persa senza valutazione**
  (nessun colore), **consuma un tentativo**, e il **timer riparte a ogni riga**.
- Gioco **accent-insensitive**: accenti rimossi da dizionario, input e tastiera.
- **Validazione parola iniettabile** (`isValida` in `confermaTentativo`); stub
  disattivato in questa fase.
- Config di gioco letta da un **provider**: default **provvisorio lato client**
  finché non è collegato Supabase, poi valori da `game_settings` senza cambi di
  codice.
- Righe della griglia = `maxTentativi` (parametrico): la griglia si allinea sempre
  al parametro.
- App su **Expo SDK 57** (React Native 0.86); l'app importa il core come
  `@wordilo/core` via alias Metro (`extraNodeModules`) + `paths` di TypeScript.
- Grafica e interfaccia: stile **flat** allineato al riferimento condiviso — celle
  e tasti a tinta piena, tasti neutri **bianchi**, tasto invio **"OK" in teal**,
  micro-animazioni, **pop-up** di fine partita, font **Poppins** incorporato. Tutti
  i dettagli in **§16**.

---

## 15. Punti ancora aperti

- **Dizionario italiano** da procurare/importare (5 e 6 lettere), da normalizzare
  accent-insensitive. Nel frattempo il single player usa una piccola lista di
  parole di prova.
- **Classifica bravura**: soglia secca ora; valutare in futuro Elo/media pesata.
- **Gestione disconnessione** in una sfida online (abbandono = sconfitta? timeout
  della stanza?).
- **Ordine di sviluppo**: si parte dal **single player**.
  - ✅ Fatto: modulo `core` (logica colori + motore di gioco + test).
  - ✅ Fatto: app Expo + schermata **principiante** (griglia + tastiera) su web e
    mobile, wiring monorepo verificato con export web.
  - ⏭️ Prossimo: modalità **esperto** (countdown per tentativo → `timeoutTentativo`)
    e **schermata di scelta** 5/6 + modalità.
  - Poi: collegamento al database, poi l'online.

---

## 16. Grafica e interfaccia (stato attuale)

Stile **flat** allineato al riferimento condiviso, **identità invariata**: slate
scuro con accento **teal**; celle **verde/arancione**, **grigio** per la lettera
assente. Niente gradienti pesanti sugli elementi: il gradiente si usa **solo** su
sfondo e sul pulsante del pop-up.

### Schermata di gioco

- **Header**: 🎯 + **Wordilo**; sotto, il contatore **"Tentativi: X/max · N
  lettere"** (aggiornato in tempo reale) e il sottotitolo in corsivo **"Indovina la
  parola in {max} tentativi."**
- **Griglia**: righe = `maxTentativi` (parametrico), celle a **tinta piena** con
  angoli arrotondati; cella vuota con bordo; la **riga attiva** ha un bordo più
  chiaro come indicatore.
- **Tastiera** (QWERTY):
  - tasti **non ancora usati → bianchi** (testo scuro);
  - lettera **assente → grigio**; lettera **presente/corretta → arancione/verde** a
    tinta piena;
  - **invio = tasto "OK" in teal**; cancella = **"⌫"** grigio (l'etichetta "OK" è
    quella del riferimento; rinominabile in "INVIO" se si preferisce);
  - su **web** è attiva anche la **tastiera fisica**.
  - colore dei tasti in **"best-of"** (verde > arancione > grigio); le righe perse
    per timeout non colorano i tasti.

### Micro-animazioni e feedback

- **Rivelazione a flip** in cascata quando si conferma una riga.
- **Scossa** della riga su parola **incompleta/non valida** (con messaggio "pill").
- **Pop** della cella all'inserimento della lettera.

### Fine partita

- **Pop-up modale** che appare **dopo** la rivelazione della riga: **"Indovinata!"**
  (oppure **"Peccato!"** + la parola) e pulsante **"↻ Nuova partita"** in teal.
- **Coriandoli** leggeri alla vittoria.

### Font e caricamento

- **Poppins** incorporato nel progetto (`app/assets/fonts/*.ttf`, **nessun pacchetto
  esterno**), caricato con `expo-font` in modo **non bloccante** (se non carica,
  fallback al font di sistema).
- **Schermata di caricamento** brandizzata mentre il font si prepara.

### Responsività e layout

- Dimensione delle celle calcolata sul **minore** fra vincolo di **larghezza** e di
  **altezza disponibile** → la griglia entra **sempre sopra la tastiera**, su
  qualsiasi schermo.
- Impaginazione: **header in alto → area griglia (allineata in alto) → tastiera in
  basso**, senza sovrapposizioni.
- Contenuto **centrato e limitato in larghezza** su tablet/desktop; **target touch
  generosi** (tasti più alti su telefono).

### Performance

- Solo **`Animated` nativo** (niente Reanimated/Skia) + un unico modulo leggero
  (**`expo-linear-gradient`**) per sfondo e pulsante.
- Animazioni **one-shot** (nessun loop perenne), coriandoli limitati (~16
  particelle). Pensato per **fascia media e web**.

### Dipendenze grafiche aggiunte

- `expo-linear-gradient` (sfondo/pulsante), `expo-font` + **font Poppins locali**.
