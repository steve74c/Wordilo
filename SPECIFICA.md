# Wordilo — Specifica del progetto

> Documento di riferimento del gioco. È la "fonte di verità": descrive cosa si
> vuole costruire, con quali scelte tecniche e con quale modello dati. Va tenuto
> aggiornato a ogni decisione presa.

**Stato:** in sviluppo — modulo `core` (colori, motore di gioco, normalizzazione)
implementato e testato, e **app Expo** single player **completa e collegata a
Supabase**, giocabile su web e mobile con **grafica in stile flat** (vedi §16):
schermata di scelta (lunghezza 5/6 + modalità), **principiante** ed **esperto**
(countdown per tentativo) funzionanti; **login obbligatorio** email/password con
**profilo** creato in automatico; **parametri di gioco letti dal database**
(`game_settings`) e **statistiche personali reali** (partite salvate in `games`,
conteggi dalla vista `user_stats`); **dizionario italiano reale** con **validazione**
attiva, **offline-first** (il single player gira anche senza rete); **login Google**
funzionante **sul web** e **avatar** (foto Google o iniziali) con nick corretto per
tutti. **Online — filone C v1 quasi completo:** la **sfida vera è giocabile dall'inizio
alla fine** ed è testata su web (tabella `matches` + RLS, creazione/ingresso stanza col
**codice**, **Realtime** broadcast, host che parte **da solo**; due giocatori sulla
**stessa parola**, riepiloghi verdi/arancioni come **pallini** a sinistra dell'avversario
— D3/D4). La sfida ha un **finale condiviso** (C5a: l'host arbitra "vince chi indovina
per primo") che ora viene **scritto su DB** (C5b: due righe in `games` + `matches` a
`finished`); ci sono le **classifiche** (C6: `user_stats` estesa + viste
`leaderboard_points`/`leaderboard_skill` + schermata Classifiche dal menu, per ora solo
a punti) e la gestione dei **casi limite** (C7: chi lascia perde — via `abbandono` +
Presence). **Unico passo online rimasto:** la **lobby vera dal menu** al posto del banco
di prova temporaneo (poi rimuovere il banco). Ancora da fare fuori dall'online: **test
del login Google su Android/iOS** (serve un *development build*) e **login Facebook**.
L'anti-cheat server-side resta rimandato alla **v2**.
**Ultimo aggiornamento:** 2026-09-05

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
- **Online anti-cheat** *(obiettivo v2)*: la parola target non deve mai arrivare in
  chiaro al client; la valutazione dei tentativi avviene lato server. **La v1
  dell'online rinuncia a questo** in cambio di semplicità (parola sul client,
  classifica "sulla fiducia"); l'anti-cheat server-side arriva in **v2** — vedi §14.

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
  src/         valutaTentativo, gioco (motore), normalizza, config, types
  src/dizionario.ts     parolaValida (validazione dal dizionario) + stub storico
  src/dizionarioDati.ts dizionario italiano vero: SOLUZIONI (bersagli) + VALIDE (generato dal DB)
  src/paroleDev.ts      pescaParolaCasuale = pesca un bersaglio dal dizionario reale
  dev/gioca.ts CLI di prova (banco di prova della logica, non fa parte del gioco)
/app         → app Expo (web + iOS + Android)
  App.tsx                      carica i font, monta i provider (config/auth/stat) e il gioco
  .env                         chiavi Supabase locali (EXPO_PUBLIC_*), NON in Git
  .env.example                 template committabile delle variabili d'ambiente
  src/lib/supabase.ts          client Supabase unico (URL + chiave anon dal .env)
  src/config/configService.ts  legge game_settings dal DB → ConfigGioco (fallback ai default)
  src/config/ConfigContext.tsx provider della config + hook useConfig()
  src/auth/AuthContext.tsx     provider auth (sessione + registrati/accedi/accediConGoogle/esci)
  src/auth/PortaAuth.tsx       "cancello": login se non loggato, gioco se loggato
  src/profilo/ProfiloContext.tsx provider profilo (nick/nome/cognome/avatarUrl + cambiaAvatar)
  src/profilo/avatarStorage.ts scegliEcaricaAvatar: selettore foto + upload su Storage
  src/components/Avatar.tsx    avatar tondo: foto (avatarUrl) o iniziali su sfondo colorato
  src/hooks/useGioco.ts        ponte React ↔ motore core (+ timer esperto)
  src/stats/statistiche.tsx    statistiche per-utente dal DB (games + vista user_stats)
  src/components/Griglia.tsx   griglia di celle colorate (+ countdown esperto, + pallini avversario online a sinistra riga)
  src/components/Tastiera.tsx  tastiera a schermo (neutri bianchi, OK teal)
  src/components/Coriandoli.tsx  particelle leggere per la vittoria
  src/screens/Wordilo.tsx      router minimale menu ↔ partita ↔ classifiche ↔ sfida online (senza librerie di navigazione)
  src/screens/SchermataAuth.tsx  accesso/registrazione (email/password)
  src/screens/SchermataMenu.tsx  saluto+logout, scelta lunghezza/modalità, contatori, legenda, pulsante 🏆 Classifica
  src/screens/SchermataClassifiche.tsx  schermata Classifiche (C6): legge leaderboard_points, lista con medaglie/avatar/punti, evidenzia la propria riga [FILONE C]
  src/screens/SchermataGioco.tsx  props ONLINE opzionali (parolaForzata, online, onRigaConfermata, righeAvversario, onPartitaFinita, esitoOnline); senza, è il single player di sempre
  src/online/stanze.ts         creaStanza/entraInStanza: parola dal DB (parola_casuale), codice-stanza, scrittura in matches [FILONE C]
  src/online/canaleStanza.ts   canale Realtime broadcast: inviaRiga (riepiloghi) + ingresso guest (guest-entrato/host-ok) + fine partita (finito/esito) + abbandono/Presence (C7) [FILONE C]
  src/online/classifiche.ts    leggiClassificaPunti: legge la vista leaderboard_points → voci pronte per la UI [FILONE C]
  src/online/SchermataGiocoOnline.tsx  contenitore sfida online: apre il canale, monta SchermataGioco sulla parola condivisa, passa righeAvversario (pallini), fa da ARBITRO dell'esito (host) → esitoOnline condiviso, SCRIVE l'esito (C5b: games + matches finished) e gestisce abbandono/disconnessione (C7) [FILONE C]
  src/online/BancoProvaStanze.tsx  BANCO DI PROVA TEMPORANEO (crea/entra stanza, invia riga finta, entra in partita) — da rimuovere a lobby pronta
  src/LoadingScreen.tsx        schermata di caricamento brandizzata
  src/theme.ts                 colori, font, ombre (stile flat)
  assets/fonts/                font Poppins incorporati (.ttf)
  metro.config.js              wiring monorepo (Metro vede /core)
/backend     → Edge Functions / logica server per l'online (non ancora creata; serve solo alla v2 anti-cheat)
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

**Stato attuale (implementato):** **login obbligatorio** con **email/password**
(`AuthProvider` + `SchermataAuth`; `PortaAuth` mostra login o gioco a seconda della
sessione). Alla registrazione si raccoglie per ora **solo il nick** (oltre a
email/password); nome, cognome e avatar arriveranno con il login social. Il
**profilo** viene creato **in automatico** al primo accesso da un **trigger** sul
database (`handle_new_user`), così esiste sempre. In sviluppo la **conferma via
email è disattivata** (registrazione → subito dentro).

**Login Google — collegato (web).** Provider Google attivo su Supabase (client
OAuth di tipo *Web application*; il *client secret* sta **solo** su Supabase, mai
nell'app). Sul **web** il login funziona end-to-end (`accediConGoogle` in
`AuthContext` + pulsante in `SchermataAuth`). Il **trigger** è stato aggiornato:
se il nick **manca** (login social) ne **genera uno univoco** dalla parte prima
della `@` dell'email, e importa **nome/cognome/foto** da Google
(`given_name`/`family_name`/`picture`). Sul **telefono** il codice è pronto (deep
link con scheme `wordilo`, via `expo-web-browser`/`expo-auth-session`), ma il test
richiede un **development build** (Expo Go non registra lo scheme). **Facebook**
ancora da collegare.

### Profilo

Ogni utente ha un profilo con: **nick** (univoco), nome, cognome, **immagine
avatar**.

Gestione avatar in tre casi, in ordine di priorità:

1. Se l'utente ha **caricato una propria foto**, si usa quella.
2. Altrimenti, se è entrato con **Google/Facebook**, si usa la foto del social
   (fornita automaticamente da Supabase al primo accesso).
3. Altrimenti si mostra un **avatar generato** con le iniziali su sfondo colorato
   (mai un riquadro vuoto).

**Stato attuale (implementato):** componente `Avatar` che mostra la foto se
presente, altrimenti le **iniziali** (nome/cognome → in mancanza nick) su sfondo
colorato stabile; nel menu l'avatar è **toccabile** per cambiare foto
(`ProfiloContext.cambiaAvatar` → selettore + upload su Storage). Su web funziona
end-to-end; l'upload da telefono va verificato col development build.

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

- **25 secondi per ogni tentativo** (default), con countdown mostrato a lato
  della riga corrente.
- Se scadono i 25 secondi, quel **tentativo è perso** e si passa al successivo
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

**Stato attuale (implementato):** le statistiche sono **reali e per-utente**. A
fine partita l'app scrive una riga in **`games`** (`app/src/stats/statistiche.tsx`,
hook `useStatistiche`, alimentato da `useGioco(..., registra)`); i contatori
**giocate / vinte / perse** del menu si leggono dalla vista **`user_stats`**, che
aggrega `games` rispettando la RLS (ogni utente vede solo i propri). Essendo su
Supabase, le statistiche **seguono l'utente su ogni dispositivo** e sopravvivono
ai riavvii. Le "ultime partite" in dettaglio e gli aggregati online (pareggiate,
win-rate, punti) arriveranno con la parte online.

---

## 9. Dizionario

Serve un dizionario italiano di parole da **5 e 6 lettere** con doppio uso:

- estrarre la **parola target**;
- **validare** che ciò che l'utente scrive sia una parola reale.

Il gioco è **accent-insensitive**: gli accenti si rimuovono sia dal dizionario sia
dall'input dell'utente (es. `perché` → `PERCHE`) e la tastiera a schermo non ha
tasti accentati. La normalizzazione è centralizzata in `normalizzaParola` (`core`).

**Stato attuale (implementato):** dizionario italiano **reale** importato nella
tabella `words` (**26.793 parole**: 8.176 da 5 lettere, 18.617 da 6). Una parte è
marcata come **bersaglio** (`is_solution = true`): **1.452** da 5 e **1.705** da 6,
scelte incrociando l'elenco con una **classifica di frequenza** (soglia ~top 15.000),
così i target sono parole riconoscibili; il resto resta valido solo come tentativo. La
scelta dei bersagli si affina in ogni momento con un `UPDATE` di `is_solution`, senza
reimportare. **Offline-first**: per il single player il dizionario è anche **dentro
l'app** (`core/src/dizionarioDati.ts`, generato dai dati del DB — `SOLUZIONI` per
pescare il target, `VALIDE` per validare), quindi si gioca e si valida **senza rete e
senza attese**. La **validazione è attiva** (`parolaValida` iniettata in
`confermaTentativo`). Il DB resta la **fonte di verità**: la funzione SQL
`parola_casuale(lunghezza)` (pesca un bersaglio lato server) è pronta per l'**online**.

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
  seconds_per_attempt  int                 -- null = senza timer; 25 per esperto
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
-- statistiche personali  ✅ IMPLEMENTATA ED ESTESA (C6)
--   (security_invoker: rispetta la RLS di games → ognuno vede solo i propri)
--   giocate/vinte/perse su TUTTE le partite (single + online);
--   gli aggregati online: giocate_online, pareggiate, win_rate, punti_totali.
user_stats (view)
  → user_id, giocate, vinte, perse, pareggiate, giocate_online, win_rate,
    punti_totali
  -- win_rate = vinte_online / giocate_online (0..1, 3 decimali; null se 0 online)

-- classifica a punti  ✅ IMPLEMENTATA (C6) — vista PUBBLICA (no security_invoker)
leaderboard_points (view)
  → user_id, nick, avatar_url, partite_online, vinte, perse, pareggiate,
    punti_totali
  order by punti_totali desc, vinte desc
  -- partite_online = tutte le righe games con mode='online'

-- classifica per bravura (con soglia minima)  ✅ IMPLEMENTATA (C6) — PUBBLICA
leaderboard_skill (view)
  → user_id, nick, avatar_url, partite_online, vinte, win_rate
  where partite_online >= app_config.skill_min_games   -- default 10
  order by win_rate desc, partite_online desc
```

### Note di modellazione

- **`matches` separata da `games`**: un match online produce **due righe** in
  `games` (una per giocatore), con lo stesso `match_id`. Così le statistiche di un
  utente si calcolano **sempre** dalla sola `games`, sia solitario che online.
- **`guesses` (jsonb)** salva la sequenza dei tentativi con i colori: utile per
  rimostrare una partita passata e, nell'online, come traccia. Opzionale.
- Parametri di gioco e punti stanno nel DB → si cambiano senza ricompilare.
- **Stato attuale del DB (implementato):** create tutte le tabelle qui sopra con
  **RLS attiva** (ognuno vede/scrive solo i propri dati; dizionario e parametri in
  lettura pubblica), il **trigger** `handle_new_user` che popola `profiles` alla
  registrazione, i **seed** di `game_settings`/`app_config` (esperto = 25s), il
  **dizionario italiano reale** in `words` (26.793 parole, di cui 3.157 bersagli), la
  funzione `parola_casuale(lunghezza)` (restituisce `id` + `word` di un bersaglio a
  caso lato server, usata dall'online) e la **vista `user_stats`**. La tabella
  **`matches`** è ora **completa e blindata** (filone C1): `room_code` **unico**,
  campi obbligatori (`room_code`/`mode`/`word_length`/`host_id`), **check** su
  `mode` e `status`, **RLS** con tre policy (host crea; lettura delle proprie sfide o
  di quelle `waiting`; update per giocare o per entrare in una stanza libera).
  **Nota trigger:** il trigger `handle_new_user` è sano per i **nuovi** iscritti; due
  account creati **prima** dell'ultima versione erano rimasti **senza profilo** e sono
  stati **rigenerati a mano** con un `insert … select` (nick dai metadati o
  dall'email, anti-collisione).
  **Aggiornamento C5b/C6:** verificato che la RLS di `matches` copre già l'**update di
  chiusura** dell'host (policy `aggiorna match (entra o gioca)`: `host_id = auth.uid()`
  vale sia in USING sia in WITH CHECK) e che `games_insert_own` consente a ciascuno di
  inserire la **propria** riga online con `match_id`. La vista **`user_stats` è stata
  estesa** (pareggiate, giocate_online, win_rate, punti_totali) e sono state **create le
  due viste classifiche** `leaderboard_points` e `leaderboard_skill` (pubbliche; la
  soglia bravura arriva da `app_config.skill_min_games`). Resta da verificare il bucket
  **`avatars`** (l'upload avatar su web funziona già via Storage).

---

## 11. Flusso della sfida online (codice-stanza)

> **Nota v1 / v2.** La sequenza qui sotto descrive il traguardo **v2** (parola e
> valutazione lato server). **La v1 — quella che costruiamo per prima —** è
> identica nella struttura (tabella `matches`, codice-stanza, Realtime, punteggi,
> classifiche), ma **senza Edge Function**: la parola la sceglie e la valuta il
> **client** (riuso del `core`, come nel single player). Passare a v2 significherà
> spostare **solo** i punti 2 e 3 (scelta parola + valutazione) dentro un'Edge
> Function, senza rifare il resto.

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

> **Applicabile in v2.** In **v1** la parola sta sul **client**, quindi un utente
> tecnico potrebbe leggerla: la classifica v1 è "sulla fiducia" (online amichevole
> col codice-stanza). I punti sotto sono il modello **v2**, che blinda le
> classifiche pubbliche.

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
stato, digita/cancella, `svuotaRiga` — svuota solo la parola in digitazione per il
pulsante ↻ —, conferma tentativo, `timeoutTentativo`, `coloriTastiera`, e
`contaColori` — riepiloga una riga in {verdi, arancioni} per l'online, solo conteggi
mai le lettere):
funzioni senza effetti collaterali che le schermate consumano senza duplicare
logica; il timer, essendo un effetto, vive nella UI e allo scadere chiama
`timeoutTentativo`. La configurazione (`ConfigGioco`) si legge da un provider
(`ConfigProvider`/`useConfig`): oggi i valori arrivano **dal server**
(`game_settings` via `configService`), con `CONFIG_DEFAULT` come **fallback** se la
rete non risponde — il tutto senza modifiche al `core`. La **validazione**
della parola è un predicato **iniettabile** (`confermaTentativo(stato, isValida)`):
oggi è **attiva** e usa `parolaValida` (lookup nell'insieme `VALIDE` di
`dizionarioDati.ts`, accent-insensitive). Anche il target si sceglie in locale con
`pescaParolaCasuale`, che ora attinge al **dizionario reale** (`SOLUZIONI`) invece
che alla vecchia lista di prova.

---

## 14. Decisioni prese

- Stack: **Expo + Supabase**, TypeScript, monorepo `core`/`app`/`backend`.
- Principiante: **7 tentativi** (default parametrico), nessun timer.
- Esperto: **25 secondi/tentativo** (default parametrico); allo scadere si perde
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
- Timer esperto **implementato come effetto in `useGioco`** (non nel `core` puro):
  scadenza a timestamp, aggiornamento al secondo, allo scadere chiama
  `timeoutTentativo`; il countdown è un **badge a lato della riga attiva** nella
  `Griglia` (teal → arancione negli ultimi secondi). Digitare/cancellare non lo
  resetta.
- Gioco **accent-insensitive**: accenti rimossi da dizionario, input e tastiera.
- **Validazione parola** iniettabile (`isValida` in `confermaTentativo`): ora
  **attiva** tramite `parolaValida` (insieme `VALIDE`). ✅ collegato.
- **Dizionario reale** importato in `words` (26.793 parole); **bersagli** scelti per
  **frequenza** (~top 15.000 → 1.452 da 5, 1.705 da 6), affinabili con un semplice
  `UPDATE` di `is_solution` senza reimportare. ✅
- **Single player offline-first**: dizionario **dentro l'app**
  (`core/src/dizionarioDati.ts`, generato dal DB) → target e validazione **locali,
  senza rete**. Il DB resta la fonte di verità; la funzione SQL
  `parola_casuale(lunghezza)` è riservata all'**online** (parola lato server).
  Aggiornare le parole = rigenerare il file + aggiornamento OTA. ✅
- Config di gioco letta da un **provider** (`ConfigProvider`): **valori dal DB**
  (`game_settings`), con `CONFIG_DEFAULT` come **fallback** offline. ✅ collegato.
- Righe della griglia = `maxTentativi` (parametrico): la griglia si allinea sempre
  al parametro.
- Navigazione: **router minimale** senza librerie (`Wordilo.tsx`) che alterna
  `SchermataMenu` ↔ `SchermataGioco`; la scelta lunghezza/modalità sta nel menu.
- Statistiche: **reali dal DB** — a fine partita si scrive in `games`, i conteggi
  vengono dalla vista `user_stats`. ✅ collegato (era un modulo provvisorio locale).
- **Backend Supabase** (passi 3–6): un unico client `supabase.ts` con chiavi nel
  `.env` (`EXPO_PUBLIC_*`, fuori da Git); la chiave `anon` sta nell'app, protetta
  dalla **RLS**. **Login obbligatorio** email/password; **profilo creato via
  trigger** alla registrazione; **conferma email disattivata** in sviluppo.
  Vista `user_stats` con **`security_invoker`** per rispettare la RLS. Login social
  (Google/Facebook) e viste classifiche rimandati.
- **Login social — Google (filone A):** collegato **sul web**. Provider Google su
  Supabase con client OAuth *Web application*; il *client secret* resta **solo** su
  Supabase. `accediConGoogle` è **universale**: su web fa il redirect di pagina, su
  iOS/Android apre un browser interno e rientra via **deep link** (`scheme:
  "wordilo"`, redirect `wordilo://auth-callback` tra i *Redirect URLs* di Supabase),
  usando `expo-web-browser` + `expo-auth-session`. **Test su telefono rimandato**:
  richiede un **development build** (Expo Go non registra lo scheme). Facebook non
  ancora fatto (richiederà la revisione dell'app lato Meta).
- **Trigger `handle_new_user` aggiornato:** se il nick manca (login social) ne
  **genera uno univoco** (base dall'email + suffisso se già preso) e importa
  **nome/cognome/avatar** da Google. Il flusso email/password resta invariato.
- **Avatar:** componente `Avatar` (foto o iniziali su sfondo colorato stabile, con
  fallback automatico se la foto non carica) in `src/components/Avatar.tsx`;
  `ProfiloContext` espone **nick/nome/cognome/avatarUrl** e `cambiaAvatar` (selettore
  + upload su Storage, già esistente). Nel menu l'avatar è **toccabile** per cambiare
  foto, con spinner durante il caricamento.
- **Nick nel menu** letto dal **profilo** (`ProfiloContext`), valido per tutti
  (anche Google), con ripiego sui metadati di Auth finché il profilo carica.
- **Online in due tappe (decisione):** si costruisce prima una **v1** senza
  Edge Function — parola scelta e valutata **sul client** (riuso del `core`), sfida
  col codice-stanza e **Realtime** per vedersi i progressi. Vantaggio: introduce
  **una sola** tecnologia nuova (Realtime) e resta tutta debuggabile lato client;
  costo: la classifica v1 è "sulla fiducia". La **v2** (in futuro) sposta scelta
  parola + valutazione dentro un'**Edge Function** per rendere le classifiche
  pubbliche non falsificabili — **senza** rifare tabelle/Realtime/punteggi, che
  restano identici (la v1 è ~90% della v2). Motivazione tecnica: cifrare la parola
  sul client **non** protegge (il client dovrebbe avere anche la chiave, quindi è
  leggibile) → l'unico anti-cheat vero è tenerla sul server.
- App su **Expo SDK 57** (React Native 0.86); l'app importa il core come
  `@wordilo/core` via alias Metro (`extraNodeModules`) + `paths` di TypeScript.
- Grafica e interfaccia: stile **flat** allineato al riferimento condiviso — celle
  e tasti a tinta piena, tasti neutri **bianchi**, tasto invio **"OK" in teal**,
  micro-animazioni, **pop-up** di fine partita, font **Poppins** incorporato. Tutti
  i dettagli in **§16**.
- **Online v1 — parola dal DB (non dal `core`):** host e guest devono avere la
  **stessa** parola, quindi l'online la sceglie con `parola_casuale` (che dà `id` +
  testo, così si salva `word_id` in `matches` e il guest risale al testo). Non usa
  `pescaParolaCasuale` del core (che dà solo il testo). Non cambia la sicurezza: la
  differenza v1/v2 è l'anti-cheat, non chi pesca la parola.
- **`useGioco` accetta una parola forzata** (4° argomento opzionale `parolaForzata`):
  se presente la usa, altrimenti pesca a caso come sempre → **single player
  invariato**. È il gancio che permette all'online di imporre la parola condivisa.
- **`SchermataGioco` estesa (Opzione B), con props ONLINE opzionali:**
  `parolaForzata`, `online` (nasconde "Nuova partita" e cambia i testi),
  `onRigaConfermata(riga, verdi, arancioni)` (a ogni riga confermata invia il
  riepilogo al canale). Regola ferrea: **se le props mancano, è il single player di
  sempre**. Scelta consapevole di NON duplicare la schermata (un solo file), tenendo
  griglia/tastiera come componenti condivisi.
- **Contenitore online `SchermataGiocoOnline`:** apre il canale Realtime della stanza
  e monta `SchermataGioco` sulla parola condivisa; raccoglie i riepiloghi
  dell'avversario (→ pallini D4) e **arbitra l'esito** (C5a). Il router
  `Wordilo.tsx` mostra la sfida online a tutto schermo quando è attiva.
- **Esito online arbitrato dall'host (C5a):** "vince chi indovina **per primo**; se
  l'altro indovina dopo, perde comunque". Poiché i due dispositivi **non hanno un
  orologio comune**, non ci si fida di un timestamp: chi finisce **annuncia** sul
  canale (`finito`, con indovinato sì/no); **l'host** ascolta entrambi i finali e il
  **primo "indovinato" che vede** vince (pareggio se finiscono entrambi senza
  indovinare), poi **ribatte** il verdetto ufficiale (`esito`), che i due si limitano
  a **mostrare** → sempre **d'accordo** by-construction (il guest accetta il verdetto).
  Il guest **ribatte** il proprio `finito` finché non riceve l'`esito` (broadcast non
  conserva i messaggi). Se il verdetto arriva mentre gioco ancora, mi **blocca** e
  mostra il pop-up. Limite noto (accettato in v1): nelle gare al millesimo l'host può
  "vedere" prima il proprio finale per il ritardo di rete. La **perdita totale** dei
  messaggi è materia di **C7**.
- **Host che parte da solo (avviso via broadcast, non Postgres Changes):** quando il
  guest entra, **annuncia** l'ingresso sul canale (`guest-entrato`); l'host in ascolto
  aggiorna la sfida a `playing` e **conferma** (`host-ok`). Il guest **ribatte**
  l'annuncio finché non riceve l'ok (max 5 volte), per battere il caso in cui il
  primo messaggio parte prima che l'host ascolti. Scelto il broadcast (già collaudato
  in C3) perché non richiede né configurazione della *publication* Realtime né gestione
  della RLS sulle notifiche, a differenza di *Postgres Changes*.
- **Metodo online:** finché non c'è la lobby vera nel menu, si crea/entra nelle stanze
  con un **banco di prova temporaneo** in fondo al menu (`BancoProvaStanze`), provabile
  con **due browser** (uno in incognito), account diversi. Da rimuovere a lobby pronta.
- **Scrittura dell'esito (C5b):** l'esito diventa "ufficiale" in un imbuto unico
  (`applicaEsito`), da cui passano sia host sia guest. Lì **ciascun client scrive la
  propria riga** in `games` (RLS `games_insert_own`), con `result` dal proprio punto di
  vista, `points` letti da `game_settings` (fallback 10/0/5), `mode='online'`,
  `match_id`, `word_length`; **guardia sincrona** contro le doppie scritture (l'esito
  può rimbalzare per le ribattute). I **tentativi** usano il conteggio vero quando la
  mia partita finisce da sola, o un contatore live delle righe se l'esito mi ferma
  prima. La chiusura di `matches` (`status='finished'` + `winner_id`/`is_draw`/
  `finished_at`) la scrive di norma **solo l'host** (resta l'arbitro), anch'essa con
  guardia. `word_id`/`duration_ms`/`guesses` restano opzionali (per ora null).
- **Classifiche (C6):** tre viste (vedi §10). `user_stats` **estesa** senza rompere il
  menu che leggeva già giocate/vinte/perse. Le `leaderboard_*` sono **pubbliche**
  (niente `security_invoker`): aggregano dentro la vista, così escono solo dati non
  sensibili (nick/avatar già pubblici + conteggi). **UI:** modulo dati
  `online/classifiche.ts` (`leggiClassificaPunti`) + `SchermataClassifiche` (stile card
  vetro, medaglie 🥇🥈🥉, riga propria evidenziata), aperta dal menu con 🏆; il router
  `Wordilo.tsx` gestisce la vista classifiche e passa il proprio `userId`. Per iniziare
  si mostra **solo la classifica a punti** (bravura pronta lato DB, non ancora in UI).
- **Casi limite — abbandono/disconnessione (C7):** regola scelta: **chi lascia perde,
  l'altro vince**. Due segnali confluiscono in un'unica callback
  `onAvversarioAssente(motivo)`: (a) **uscita esplicita** — chi preme "Indietro" a
  partita in corso manda un broadcast `abbandono` e si scrive la riga `lost`, poi esce;
  (b) **disconnessione vera** — tramite **Presence** del canale (join/leave), con
  un'**attesa di grazia** (~6s) che annulla se l'avversario rientra (blip di rete). Chi
  resta si **auto-dichiara vincitore** (niente arbitro: l'altro non c'è più) e scrive/
  chiude; per questo, in caso di abbandono, la chiusura di `matches` è concessa **anche
  al guest** (la RLS lo permette perché è `guest_id`). Limite noto v1: chi **crolla**
  (scheda chiusa) non riesce a scrivere la propria riga `lost` → resta solo la riga
  `won` di chi rimane (match e classifica del vincitore comunque corretti). Altro limite
  noto: la Presence vede la caduta solo dopo la scadenza dei "battiti" (~10-20s con la
  grazia); l'uscita esplicita è invece immediata. Le due strade si coprono a vicenda.

---

## 15. Punti ancora aperti

- **Affinamento bersagli del dizionario**: oggi scelti per frequenza (~top 15.000).
  Possibile ripulire in futuro nomi propri/forestierismi dai bersagli con un `UPDATE`
  di `is_solution` (le parole restano comunque valide come tentativo).
- **Classifica bravura**: soglia secca ora; valutare in futuro Elo/media pesata.
- **Gestione disconnessione** in una sfida online: ✅ **risolto in C7** (chi lascia
  perde, l'altro vince; via broadcast `abbandono` + Presence con grazia). Restano da
  definire il **timeout/scadenza delle stanze** (`waiting`/`playing` mai chiuse) e la
  **pulizia dei residui** in `matches` dai test.
- **Ordine di sviluppo**: si parte dal **single player**.
  - ✅ Fatto: modulo `core` (logica colori + motore di gioco + test).
  - ✅ Fatto: app Expo + schermata **principiante** (griglia + tastiera) su web e
    mobile, wiring monorepo verificato con export web.
  - ✅ Fatto: **schermata di scelta** (lunghezza 5/6 + modalità) con router minimale
    menu ↔ partita (`SchermataMenu` + `Wordilo`).
  - ✅ Fatto: **statistiche** (giocate/vinte/perse) mostrate nel menu e aggiornate a
    fine partita.
  - ✅ Fatto: **modalità esperto** completa — timer/countdown per tentativo
    (`useGioco` → `timeoutTentativo`) con badge a lato della riga attiva; con questo
    il **single player è completo**.
  - ✅ Fatto: **collegamento a Supabase** — client unico + chiavi in `.env` (passo 3).
  - ✅ Fatto: **schema del database** — tabelle §10 + RLS + trigger profilo + seed
    (esperto 25s) + dizionario di prova, poi **sostituito dal dizionario reale** nel
    filone B (passo 2).
  - ✅ Fatto: **config dal database** — `game_settings` via `ConfigProvider`, con
    fallback ai default (passo 4).
  - ✅ Fatto: **login e profili** — email/password, login obbligatorio, profilo
    automatico via trigger, saluto + logout nel menu (passo 5).
  - ✅ Fatto: **statistiche reali dal database** — partite in `games`, conteggi da
    `user_stats` (passo 6).
  - ✅ Fatto: **dizionario reale + validazione** (filone B) — import in `words`,
    target dal dizionario vero e validazione attiva, **offline-first**
    (`dizionarioDati.ts`); resta la funzione SQL `parola_casuale` per l'online.
  - ✅ Fatto: **login Google (web) + avatar** (filone A) — provider Google su
    Supabase, `accediConGoogle` (web ok; codice telefono pronto), trigger aggiornato
    per generare il nick sui login social, componente `Avatar` (foto/iniziali)
    toccabile nel menu, nick letto dal profilo per tutti.
  - 🟡 In sospeso nel filone A: **test del login Google su Android/iOS** (passo 3c —
    richiede un **development build**); **login Facebook**; verifica dell'**upload
    avatar da telefono**.
  - 🔵 **Online — filone C, versione v1** (parola sul client, niente Edge Function):
    **la sfida è completa e giocabile** — creazione/ingresso, parola condivisa,
    riepiloghi/pallini, esito arbitrato **scritto** su DB, classifiche e casi limite.
    Provato **su web** con due browser (account diversi). Manca solo la **lobby** dal
    menu (sotto). Dettaglio:
    - ✅ **C1** — tabella `matches` + RLS (vincoli e policy verificati).
    - ✅ **C2** — crea/entra stanza col **codice** (`stanze.ts`: `creaStanza`/
      `entraInStanza`, parola dal DB uguale per i due). Lungo la strada risolto un
      problema latente: **profili mancanti** per 2 utenti vecchi (rigenerati a mano).
    - ✅ **C3** — **Realtime** broadcast (`canaleStanza.ts`): i riepiloghi
      verdi/arancioni viaggiano tra i due. Aggiunto l'**avviso ingresso guest** così
      l'host passa a `playing` **da solo** (guest-entrato/host-ok, con ribattuta).
    - ✅ **D1** — `useGioco` accetta `parolaForzata` (single player invariato).
    - ✅ **D2a** — `SchermataGioco` accetta `parolaForzata`/`online` (opzionali).
    - ✅ **D2b** — a ogni riga confermata `SchermataGioco` chiama `onRigaConfermata`
      (usa `contaColori` del core); `contaColori` aggiunta al core.
    - ✅ **D3** — contenitore `SchermataGiocoOnline` + routing in `Wordilo.tsx` +
      pulsante "Entra in partita" nel banco: **testato su web** (host che parte da
      solo; riepiloghi che viaggiano in partita). Il log temporaneo `[D3]` è stato
      rimosso in D4.
    - ✅ **D4** — **pallini** dell'avversario (verde=corrette, arancione=fuori
      posizione) disegnati **a sinistra delle righe** nella `Griglia` (componenti
      `PalliniAvversario`/`Pallino`, figli della riga in `absolute` come il
      countdown, così non spostano le celle). Lo stato `righeAvversario` scende da
      `SchermataGiocoOnline` → `SchermataGioco` → `Griglia`. **Testato su web**.
    - ✅ **C5a** — **esito condiviso** ("vince chi indovina per primo; se l'altro
      indovina dopo, perde comunque"). L'**host fa da arbitro**: chi finisce annuncia
      sul canale (`finito`: indovinato sì/no); il **primo "indovinato" che l'host
      vede vince**, se finiscono entrambi senza indovinare → **pareggio**; l'host
      ribatte il verdetto ufficiale (`esito`) e i due mostrano lo **stesso** risultato
      (pop-up "Hai vinto/perso/Pareggio"). Se l'avversario indovina mentre gioco
      ancora, l'esito **mi ferma**. Il guest **ribatte** il `finito` finché non riceve
      l'esito. Scelto l'host-arbitro (non un timestamp) perché i due non hanno un
      orologio comune: così sono **sempre d'accordo** sull'esito; limite noto — nelle
      gare al millesimo può vincere l'host per il ritardo di rete (accettato in v1).
      **Testato su web** (vittoria, sconfitta, pareggio, fotofinish). *Ancora niente
      scrittura su DB: è C5b.*
    - ✅ **C5b** — **scrittura dell'esito**: a fine sfida ciascun client scrive la
      **propria riga** in `games` (`result` won/lost/draw, `points` 10/0/5 da
      `game_settings` con fallback, `mode='online'`, `match_id`, `word_length`), con
      guardia anti-doppione; l'**host** porta `matches` a **`finished`**
      (`winner_id`/`is_draw`/`finished_at`). RLS **già sufficiente** (verificata, nessuna
      modifica). **Testato su web** (2 righe con stesso `match_id`; `matches` finished).
    - ✅ **C6** — **classifiche**: `user_stats` **estesa** (pareggiate, giocate_online,
      win_rate, punti_totali) senza rompere il menu; create le viste **pubbliche**
      `leaderboard_points` e `leaderboard_skill` (soglia da `app_config`). **UI:** modulo
      `online/classifiche.ts` + `SchermataClassifiche` (medaglie/avatar/punti, riga
      propria evidenziata) aperta dal menu con 🏆; per ora **solo classifica a punti**.
      **Testato su web**.
    - ✅ **C7** — **casi limite**: **chi lascia perde, l'altro vince**. In
      `canaleStanza.ts` aggiunti messaggio `abbandono` + **Presence** (join/leave con
      grazia ~6s); in `SchermataGiocoOnline` l'**uscita esplicita** (Indietro →
      abbandono + riga `lost`) e la **disconnessione** confluiscono in "io vinco",
      scrivendo/chiudendo (in abbandono può chiudere `matches` anche il guest). Limiti
      v1 noti: chi crolla non scrive la riga `lost`; la Presence reagisce dopo ~10-20s.
      **Testato su web** (uscita esplicita e disconnessione).
    - ⏭️ **Lobby vera dal menu** (crea/entra stanza + attesa avversario in Realtime) al
      posto del **banco di prova**, e poi **rimozione del banco** (`BancoProvaStanze` +
      le due righe di innesto in `SchermataMenu`, l'import in `Wordilo`). **Unico passo
      rimasto** per chiudere il filone C v1. In sospeso anche la **pulizia dei residui**
      `playing`/`waiting` in `matches` (test pre-C7) e lo **scadere delle stanze**.
  - 🔮 Futuro: **online v2 (anti-cheat)** — spostare scelta parola + valutazione in
    un'**Edge Function** (parola solo lato server) per rendere le classifiche
    pubbliche non falsificabili. Struttura invariata rispetto alla v1.

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
- **Countdown (solo esperto)**: badge circolare **a lato della riga attiva** (fuori
  dal flow, quindi non sposta le celle centrate; scende con la riga). Conta i
  secondi rimasti (default 25), fa un piccolo "pop" a ogni secondo e passa da
  **teal ad arancione** negli ultimi secondi. In esperto la griglia riserva un po'
  di spazio a destra così il badge non esce mai dallo schermo; in principiante è
  assente.
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