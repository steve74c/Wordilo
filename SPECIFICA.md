# Wordilo — Specifica del progetto

> Documento di riferimento del gioco. È la "fonte di verità": descrive cosa si
> vuole costruire, con quali scelte tecniche e con quale modello dati. Va tenuto
> aggiornato a ogni decisione presa.

**Stato:** in sviluppo attivo. Single player completo, online v1 completo e chiuso, sistema temi (Vetro/Giallo) **con persistenza sul profilo**, multilingua it/en completo (gioco + interfaccia, incluso l'header di gioco e i bottoni auth, nessuna stringa cablata nota residua). Pulsanti online rinominati (**🎲 Gioca online** = coda casuale, **⚔️ Sfida amico** = col codice). Header di gioco ridisegnato con pallini-tentativi. Preferenze lingua **e tema** salvate sul profilo Supabase. Sistema i18n (`app/src/i18n/`) con `useT()` attivo in tutte le schermate principali **e nei messaggi d'errore di `stanze.ts`** (che ritorna chiavi `ChiaveTesto`, non testo cablato). Registrazione: selettori lingua gioco/app **e tema**. Lingua predefinita **prima del login: inglese** (UI e gioco); dopo il login prevale sempre la preferenza salvata sul profilo. Bug `LEGENDA` in `SchermataMenu` **risolto**. Rivincita online: creazione **con retry automatico** in caso di errore transitorio; `console.log` di debug della parola **rimosso**. **Ultimo aggiornamento:** 2026-09-10

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
  src/dizionario.ts     parolaValida(parola, lingua, lunghezza): valida sul dizionario della LINGUA
  src/dizionarioDati.ts INDICE dei dizionari per lingua: SOLUZIONI[lingua][lunghezza] + VALIDE[lingua][lunghezza] (+ tipo Lingua = 'it' | 'en')
  src/dizionarioDati.it.ts dizionario ITALIANO (generato dal DB): SOLUZIONI_IT + VALIDE_IT
  src/dizionarioDati.en.ts dizionario INGLESE (generato dal DB): SOLUZIONI_EN + VALIDE_EN
  src/paroleDev.ts      pescaParolaCasuale(lingua, lunghezza) = pesca un bersaglio nella lingua scelta
  dev/gioca.ts CLI di prova (banco di prova della logica, non fa parte del gioco)
/app         → app Expo (web + iOS + Android)
  App.tsx                      carica i font, monta i provider (TEMA + LINGUAUI + LINGUA → config → auth → profilo → stat) e il gioco; componenti ponte InizialiLingue + InizialiTema (leggono lingue/tema dal profilo e li spingono nei provider, SOLO se c'è una sessione attiva — altrimenti resta il default pre-login)
  .env                         chiavi Supabase locali (EXPO_PUBLIC_*), NON in Git
  .env.example                 template committabile delle variabili d'ambiente
  src/lib/supabase.ts          client Supabase unico (URL + chiave anon dal .env)
  src/config/configService.ts  legge game_settings dal DB → ConfigGioco (fallback ai default)
  src/config/ConfigContext.tsx provider della config + hook useConfig()
  src/auth/AuthContext.tsx     provider auth (sessione + registrati(nick,email,password,linguaGioco,linguaUI)/accedi/accediConGoogle/esci)
  src/auth/PortaAuth.tsx       "cancello": login se non loggato, gioco se loggato
  src/profilo/ProfiloContext.tsx provider profilo (nick/nome/cognome/avatarUrl/linguaUI/linguaGioco + cambiaAvatar + aggiornaLingue)
  src/profilo/avatarStorage.ts scegliEcaricaAvatar: selettore foto + upload su Storage
  src/components/Avatar.tsx    avatar tondo: foto (avatarUrl) o iniziali su sfondo colorato
  src/hooks/useGioco.ts        ponte React ↔ motore core (+ timer esperto)
  src/stats/statistiche.tsx    statistiche per-utente dal DB (games + vista user_stats)
  src/components/Griglia.tsx   griglia di celle colorate (+ countdown esperto, + pallini avversario online a sinistra riga)
  src/components/Tastiera.tsx  tastiera a schermo (neutri bianchi, OK teal)
  src/components/Coriandoli.tsx  particelle leggere per la vittoria
  src/screens/Wordilo.tsx      router minimale menu ↔ partita ↔ classifiche ↔ lobby ↔ sfida online (senza librerie di navigazione)
  src/screens/SchermataAuth.tsx  accesso/registrazione (email/password)
  src/screens/SchermataMenu.tsx  saluto+logout, scelta lunghezza/modalità, contatori, legenda (senza tessere decorative), pulsanti 🎲 Gioca online (coda casuale, prop onGiocaOnline) + ⚔️ Sfida amico (col codice, prop onSfidaAmico) affiancati e 🏆 Classifica, + ⚙️ Impostazioni (tema+lingua) accanto a Esci; testi via useT()
  src/screens/SchermataClassifiche.tsx  schermata Classifiche (C6): legge leaderboard_points, lista con medaglie/avatar/punti, evidenzia la propria riga [FILONE C]
  src/screens/SchermataLobby.tsx  lobby online (1b): crea/entra stanza col codice + attesa avversario in Realtime + INGRESSO AUTOMATICO in partita; Indietro dell'host → annullaStanza; all'apertura chiama pulisciStanzeVecchie (2c) [FILONE C]
  src/screens/SchermataCodaCasuale.tsx  coda casuale (🎲 Gioca online, ex SchermataCodaVeloce): all'apertura chiama trovaOCreaStanzaPubblica → host in attesa o guest che entra; RIUSA stessa stretta di mano/stili della lobby; lingua = quella dell'app; Indietro host → annullaStanza; testi via useT() [CODA]
  src/screens/SchermataGioco.tsx  props ONLINE opzionali (parolaForzata, online, onRigaConfermata, righeAvversario, onPartitaFinita, esitoOnline) + RIVINCITA (statoRivincita, onRichiediRivincita, onAccettaRivincita, onRifiutaRivincita → bottoni 🔁/✓/Rifiuta nel pop-up); senza, è il single player di sempre
  src/online/stanze.ts         creaStanza/entraInStanza (parola dal DB via parola_casuale, codice-stanza, scrittura in matches) + annullaStanza (chiude la stanza a 'finished') + pulisciStanzeVecchie (2c: rimuove i residui propri non finiti >10 min) + creaRivincita (nuovo match per la rivincita: parola nuova, status='playing', guest già noto — solo host per RLS) + trovaOCreaStanzaPubblica (CODA casuale: cerca una stanza pubblica compatibile ed entra come guest, altrimenti crea una stanza is_public='waiting' e attende come host; ritorna anche il ruolo) [FILONE C / CODA]
  src/online/canaleStanza.ts   canale Realtime broadcast: inviaRiga (riepiloghi) + ingresso guest (guest-entrato/host-ok) + fine partita (finito/esito) + abbandono/Presence (C7) + RIVINCITA (rivincita-richiesta/risposta/via) [FILONE C]
  src/online/classifiche.ts    leggiClassificaPunti: legge la vista leaderboard_points → voci pronte per la UI [FILONE C]
  src/online/SchermataGiocoOnline.tsx  contenitore sfida online: apre il canale, monta SchermataGioco sulla parola condivisa, passa righeAvversario (pallini), fa da ARBITRO dell'esito (host) → esitoOnline condiviso, SCRIVE l'esito (C5b: games + matches finished) e gestisce abbandono/disconnessione (C7) + RIVINCITA (negoziato richiesta/accetta/rifiuta, riavvio del round con reset guardie + key; canale aperto una sola volta via handlersRef) [FILONE C]
  src/LoadingScreen.tsx        schermata di caricamento brandizzata
  src/theme.ts                 palette del tema VETRO + token del sistema temi + funzioni pure (ombra/bagliore/coloreDiSfondo)
  src/temi/tipi.ts             forma di un Tema (palette/gradienti/font/misure); le chiavi di palette derivano da keyof typeof C (niente token dimenticati)
  src/temi/Temavetro.ts        tema "vetro" = valori di theme.ts impacchettati
  src/temi/TemaGiallo.ts       tema "giallo" (chiaro flat/pieno); tutti i suoi colori si affinano da qui
  src/temi/TemaContext.tsx     TemaProvider (montato in cima ad App.tsx) + useTema()/useControlliTema() (cambio tema a runtime)
  src/lingua/LinguaContext.tsx  LinguaProvider + useLingua()/useControlliLingua(): lingua del GIOCO (parole/dizionario)
  src/i18n/it.ts               catalogo testi in ITALIANO (~100 chiavi, fonte di verità delle chiavi, incl. blocco err* per gli errori online); tipo ChiaveTesto
  src/i18n/en.ts               catalogo testi in INGLESE (completo, incl. blocco err*); Partial<Record<ChiaveTesto,string>>
  src/i18n/LinguaUIContext.tsx  LinguaUIProvider + useT()/useControlliLinguaUI(): lingua dell'INTERFACCIA (testi UI); default PRIMA del login = 'en'; fallback all'italiano se una chiave manca; interpola {segnaposto}
  src/screens/SchermataImpostazioni.tsx  scelta del TEMA (Vetro/Giallo), della LINGUA DEL GIOCO (🇮🇹/🇬🇧) e della LINGUA DELL'APP (🇮🇹/🇬🇧); al cambio chiama aggiornaLingue → salva su profiles; testi via useT()
  src/**/*.stili.ts            stili per-schermata via creaStili(tema): Menu/Gioco/Auth/Griglia/Tastiera/Coriandoli/Loading (le schermate online e Avatar sono ancora statiche)
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
- **Accoppiamento: due modalità che convivono.**
  1. **Con un amico — codice-stanza** (⚔️ Sfida amico): un giocatore crea la stanza
     e riceve un codice breve da condividere; l'altro entra digitandolo.
  2. **Con uno sconosciuto — coda casuale** (🎲 Gioca online): il giocatore non digita
     codici; l'app **cerca** una stanza pubblica in attesa con le **stesse impostazioni**
     (modalità + lunghezza + lingua) e vi **entra**; se non ce n'è, ne **crea** una
     pubblica e **aspetta** che arrivi il prossimo. Regola anti-corsa: *prima cerca, poi
     crea* (+ guardia `guest_id IS NULL` sull'update), così due che premono insieme si
     accoppiano invece di restare entrambi in attesa. Le stanze della coda sono marcate
     `is_public = true` (le stanze col codice restano `false`), così un giocatore casuale
     non entra mai in una partita creata per un amico. Riusa la **stessa stretta di mano**
     Realtime e la stessa pulizia/scadenza stanze della modalità col codice.
- **Indicatore avversario:** a lato di ogni riga giocata dall'avversario
  compaiono due pallini che riassumono il suo tentativo su quella riga —
  **un pallino verde con il numero di lettere corrette** e **un pallino arancione
  con il numero di lettere presenti ma fuori posizione**. Si trasmettono **solo i
  conteggi, mai le lettere**, così si vede l'andamento dell'avversario senza poter
  copiare.
- **Lingua della sfida — FATTO.** La lingua è una **proprietà della sfida**, uguale per
  host e guest, così entrambi validano sullo **stesso** dizionario. È salvata nella
  colonna **`lang`** di `matches`, esposta nel tipo `Sfida` (`stanze.ts`) e propagata a
  `useGioco` come **`linguaForzata`** (gemella di `parolaForzata`), che valida/pesca con
  `linguaEffettiva = linguaForzata ?? lingua`. Nella modalità **col codice** la sceglie
  l'host (chip 🇮🇹/🇬🇧 in lobby, stato locale che non tocca la lingua globale); nella
  **coda casuale** è la lingua che il giocatore sta usando nell'app (fa parte dei criteri
  di accoppiamento). La parola bersaglio si pesca dal DB **nella lingua della sfida**
  (`parola_casuale(lunghezza, p_lang)`). L'header della schermata di gioco mostra la
  lingua **effettiva** con la bandierina (`linguaForzata ?? linguaApp`).
- **Rivincita:** a fine sfida il pop-up di esito offre **🔁 Rivincita**. Chi la
  chiede manda una richiesta sul canale Realtime; l'altro vede **✓ Accetta /
  Rifiuta**. Se rifiuta, il richiedente legge "Rivincita rifiutata" e può solo
  tornare al menu. Se accetta, l'**host** crea un **nuovo match** (parola nuova,
  stessa modalità/lunghezza/lingua, guest già dentro, `status='playing'`) e lo
  diffonde: entrambi ripartono su una partita fresca **sullo stesso canale**
  (nessun nuovo handshake). Solo l'host può creare (lo impone la RLS di `matches`),
  perciò la creazione è sempre instradata a lui, chiunque abbia chiesto la rivincita.

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
- La **rivincita** apre una **nuova partita = nuovo `matches`**: ogni round ha la
  sua riga in `games` e il proprio esito (`winner_id`/`is_draw`), quindi statistiche
  e classifiche contano tutti i round.

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

Serve un dizionario di parole da **5 e 6 lettere**, **per ogni lingua**, con doppio uso:

- estrarre la **parola target**;
- **validare** che ciò che l'utente scrive sia una parola reale.

Il gioco è **accent-insensitive**: gli accenti si rimuovono sia dal dizionario sia
dall'input dell'utente (es. `perché` → `PERCHE`) e la tastiera a schermo non ha
tasti accentati. La normalizzazione è centralizzata in `normalizzaParola` (`core`).

**Stato attuale (implementato): dizionario MULTILINGUA (it + en).** La tabella `words`
ha la colonna **`lang`** e ora contiene due lingue:

- **Italiano** (`lang='it'`): **26.793 parole** (8.176 da 5, 18.617 da 6); bersagli
  (`is_solution=true`): **1.452** da 5 e **1.705** da 6, scelti per frequenza (~top 15.000).
- **Inglese** (`lang='en'`): **33.482 parole** (12.041 da 5, 21.441 da 6); bersagli:
  **1.769** da 5 e **2.039** da 6, scelti con **frequenza d'uso reale** (libreria
  `wordfreq`, soglia **Zipf ≥ 3.5**), così le soluzioni sono parole comuni e non termini
  da dizionario oscuri. Import fatto via **CSV** (senza colonna `id`, che è
  `GENERATED ALWAYS AS IDENTITY` e va lasciata generare dal DB).

La scelta dei bersagli si affina in ogni momento con un `UPDATE` di `is_solution` (o
rigenerando con una soglia diversa), senza reimportare. **Offline-first**: il dizionario
è anche **dentro l'app**, ora **indicizzato per lingua** — `core/src/dizionarioDati.ts`
è l'**indice** (`SOLUZIONI[lingua][lunghezza]`, `VALIDE[lingua][lunghezza]`, tipo
`Lingua`), che unisce i due file dati per lingua (`dizionarioDati.it.ts` /
`dizionarioDati.en.ts`, generati dai dati). Le funzioni del core prendono la lingua:
`pescaParolaCasuale(lingua, lunghezza)` e `parolaValida(parola, lingua, lunghezza)`. La
lingua attiva arriva dal `LinguaProvider` (§16), letta in `useGioco` con `useLingua()`.
Il DB resta la **fonte di verità**; la funzione SQL è ora **per lingua**,
`parola_casuale(lunghezza, p_lang)` (default `p_lang='it'`), usata dall'online per pescare
il bersaglio nella lingua della sfida.

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
  lingua_ui    text not null default 'it'    -- lingua dell'interfaccia preferita
  lingua_gioco text not null default 'it'    -- lingua del gioco preferita
  tema         text not null default 'giallo' check (tema in ('giallo','vetro')) -- tema preferito
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
  lang          text default 'it'           -- lingua della sfida (it/en), uguale per i due
  is_public     boolean not null default false -- true = stanza della CODA casuale; false = col codice
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
  **Nota trigger:** il trigger `handle_new_user` è aggiornato per scrivere anche
  `lingua_ui`/`lingua_gioco`/`tema` dai metadati di registrazione (default `'it'`/
  `'it'`/`'giallo'` via `coalesce`, sia nell'insert sia nell'`on conflict do update`).
  Migrazioni SQL: `migrazione_lingue_profilo.sql` (lingue) e `migrazione_tema_profilo.sql`
  (colonna `tema` + check + aggiornamento trigger).
  Due account creati prima dell'ultima versione erano rimasti senza profilo e sono
  stati rigenerati a mano.
  **Aggiornamento C5b/C6:** verificato che la RLS di `matches` copre già l'**update di
  chiusura** dell'host (policy `aggiorna match (entra o gioca)`: `host_id = auth.uid()`
  vale sia in USING sia in WITH CHECK) e che `games_insert_own` consente a ciascuno di
  inserire la **propria** riga online con `match_id`. La vista **`user_stats` è stata
  estesa** (pareggiate, giocate_online, win_rate, punti_totali) e sono state **create le
  due viste classifiche** `leaderboard_points` e `leaderboard_skill` (pubbliche; la
  soglia bravura arriva da `app_config.skill_min_games`). Resta da verificare il bucket
  **`avatars`** (l'upload avatar su web funziona già via Storage).
  **Aggiornamento lobby/pulizia stanze (1b/2c):** aggiunta a `matches` una **quarta
  policy — DELETE** `"host cancella stanze proprie non finite"`
  (`host_id = auth.uid()` **e** `status <> 'finished'` **e**
  `created_at < now() - interval '10 minutes'`): permette al proprietario di rimuovere
  le proprie stanze residue non finite oltre i 10 minuti, mai una sfida in corso (che
  dura pochi minuti). Su questa policy si appoggia `pulisciStanzeVecchie`. L'**Annulla**
  dell'host in lobby (stanza appena creata, 0 minuti → fuori dalla finestra DELETE) NON
  cancella ma **chiude** la stanza a `finished` via la policy di UPDATE dell'host.
  Fatta anche una **pulizia una-tantum** dei residui `playing` dei test (con le relative
  righe `games` collegate).
  **Aggiornamento coda casuale (🎲):** aggiunta a `matches` la colonna **`is_public`**
  (`boolean not null default false`): `true` marca le stanze della coda, `false` (default)
  quelle col codice — così `creaStanza`/`creaRivincita` restano private senza modifiche.
  **Nessuna nuova policy RLS**: la coda riusa i permessi già esistenti (la SELECT lascia
  leggere le stanze `waiting`; la UPDATE lascia entrare in una `waiting` con
  `guest_id IS NULL`), verificato prima di implementare. `parola_casuale` estesa a
  `(lunghezza, p_lang)` per pescare il bersaglio nella lingua della sfida.

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
oggi è **attiva** e usa `parolaValida(parola, lingua, lunghezza)` (lookup nell'insieme
`VALIDE[lingua][lunghezza]` di `dizionarioDati.ts`, accent-insensitive). Anche il target
si sceglie in locale con `pescaParolaCasuale(lingua, lunghezza)`, che attinge al
**dizionario reale per lingua** (`SOLUZIONI[lingua][lunghezza]`). La **lingua** è ora un
parametro di entrambe le funzioni: `useGioco` la legge dal `LinguaProvider` (`useLingua`)
e la passa; il `core` resta puro (non conosce React, riceve solo la lingua).

---

## 14. Decisioni prese

- Stack: **Expo + Supabase**, TypeScript, monorepo `core`/`app`/`backend`.
- Principiante: **7 tentativi** (default parametrico), nessun timer.
- Esperto: **25 secondi/tentativo** (default parametrico); allo scadere si perde
  **solo quel tentativo**.
- Tutti i valori numerici chiave sono **parametrici lato server**.
- Single player: **nessun punteggio**, solo vinta/persa, niente pareggio.
- Online: **due accoppiamenti** — codice-stanza (con un amico) e **coda casuale**
  (🎲 Gioca online, con uno sconosciuto: stesse impostazioni, stanze `is_public`).
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
- **Lobby vera dal menu (1b) — chiude il filone C v1:** nuova `SchermataLobby` aperta
  dal pulsante **⚔️ Sfida amico** del menu, che eredita **modalità e lunghezza** già
  scelte con le pillole (nessun selettore duplicato). L'host crea, vede il **codice** e
  attende; il guest entra col codice. L'**ingresso in partita è automatico**: riuso la
  stretta di mano collaudata (`guest-entrato`/`host-ok`), sostituendo i vecchi bottoni
  manuali del banco con l'auto-ingresso. Regola ferrea: nessuno entra prima che la
  stretta di mano sia completa (l'host attende `guest-entrato` e resta un attimo per far
  arrivare `host-ok`; il guest attende `host-ok`, con `annunciaIngresso` che ora accetta
  una callback `onConfermato`). Il **banco di prova è stato rimosso**
  (`BancoProvaStanze.tsx` + innesti in `SchermataMenu`/`Wordilo`).
- **Pulizia/scadenza stanze (2c):** scelta la **Strada 1** (pulizia dall'app, niente
  `pg_cron`): all'apertura della lobby `pulisciStanzeVecchie` rimuove le **proprie**
  stanze non finite più vecchie di **10 minuti** (una partita dura pochi minuti → oltre
  quella soglia è per forza un residuo). La policy **DELETE** su `matches` è stata
  allargata di conseguenza (`status <> 'finished'` + finestra 10 min). L'**Annulla**
  dell'host non usa più la DELETE (0 minuti la escluderebbe) ma **chiude** la stanza a
  `finished` via UPDATE. La Strada 2 (job schedulato `pg_cron` lato Supabase) resta in
  tasca per il futuro se servirà.
- **Sistema temi (Vetro/Giallo):** i colori non sono più costanti statiche importate
  ovunque, ma un oggetto `Tema` fornito da `TemaProvider` e letto con `useTema()`. La
  *forma* del tema (`temi/tipi.ts`) deriva le chiavi da `keyof typeof C`: aggiungere un
  token in `theme.ts` **obbliga** ogni tema a fornirlo (rete di sicurezza contro i
  colori dimenticati). `theme.ts` diventa "palette del tema Vetro + funzioni pure";
  ogni schermata ha un `*.stili.ts` con `creaStili(tema)`. Scelta chiave sul **Giallo**:
  essendo **chiaro**, non può riusare le superfici traslucide del vetro (sparirebbero) →
  è un tema **flat/pieno** (superfici piene, bordi ambra, ombra). Migrazione fatta a
  **lotti**, un gruppo di file alla volta, tenendo il **tema Vetro identico a prima**
  come verifica. `TemaProvider` va **in cima** ad `App.tsx`: senza, `cambiaTema` cade sul
  no-op del context di default e il cambio tema non ha effetto. *Ancora statiche*
  (da migrare): schermate online e `Avatar`. **Persistenza del tema — FATTA**: colonna
  `profiles.tema` (default `'giallo'`, check su `'giallo'|'vetro'`), `ProfiloContext`
  espone `tema`/`aggiornaTema`, componente ponte `InizialiTema` in `App.tsx` (gemello
  di `InizialiLingue`, attivo solo con sessione presente) spinge il tema salvato in
  `TemaProvider` al login, `SchermataImpostazioni` salva al cambio tramite
  `onCambiaTema` (wrapper che chiama sia `cambiaTema` sia `aggiornaTema`).

- **Multilingua (it/en), architettura.** Due lingue indipendenti:
  1. **Lingua del gioco** (`LinguaProvider`/`useLingua`): decide le parole e il dizionario.
     Dizionario splittato per lingua (`dizionarioDati.it.ts` / `.en.ts`) con indice
     (`dizionarioDati.ts`). Funzioni del core parametrizzate per lingua (core puro).
     Bersagli inglesi per frequenza d'uso (Zipf ≥ 3.5).
  2. **Lingua dell'interfaccia** (`LinguaUIProvider`/`useT()`): decide i testi UI.
     Cataloghi in `app/src/i18n/it.ts` (completo, fonte di verità) e `en.ts` (completo);
     fallback all'italiano se una chiave manca. Tutte le schermate principali usano
     `useT()` — niente stringhe cablate nel JSX. L'interfaccia cambia lingua in
     tempo reale. `useT()` va chiamato **solo dentro i componenti React** (è un hook).
  Entrambe le preferenze salvate su `profiles.lingua_gioco` / `profiles.lingua_ui`,
  lette all'avvio da `ProfiloContext` e inizializzate da `InizialiLingue` in `App.tsx`
  — che ora scatta **solo se c'è una sessione attiva** (`sessione &&` in entrambi gli
  `useEffect`), altrimenti sovrascriveva il default pre-login con `'it'` letto da un
  `ProfiloContext` senza utente. **Default prima del login: inglese** (sia
  `LINGUA_UI_DEFAULT` in `LinguaUIContext.tsx` sia il default equivalente in
  `LinguaContext.tsx`), così chi apre l'app per la prima volta vede "Log in / Sign up"
  e "Game language" in inglese; dopo il login prevale sempre la preferenza salvata sul
  profilo. La lingua della sfida online è proprietà di `matches.lang` (§5.3). La
  registrazione (`SchermataAuth`) raccoglie ora **tre** preferenze (lingua gioco,
  lingua app, tema), tutte passate a `registrati()` e salvate dal trigger. Gli errori
  di `app/src/online/stanze.ts` (creazione/ingresso stanza, rivincita, coda casuale)
  sono stati convertiti da testo italiano cablato a **chiavi `ChiaveTesto`**
  (`RisultatoStanza.errore` / `RisultatoCoda.errore` sono `ChiaveTesto`, non
  `string`): `stanze.ts` resta un file puro (nessun `useT()`), la traduzione avviene
  nelle schermate chiamanti (`SchermataLobby`, `SchermataCodaCasuale`) con
  `t(risultato.errore)`. La scelta del font resta da fare.

---

## 15. Punti ancora aperti

- **Affinamento bersagli del dizionario**: oggi scelti per frequenza (~top 15.000).
  Possibile ripulire in futuro nomi propri/forestierismi dai bersagli con un `UPDATE`
  di `is_solution` (le parole restano comunque valide come tentativo).
- **Classifica bravura**: soglia secca ora; valutare in futuro Elo/media pesata.
- **Gestione disconnessione** in una sfida online: ✅ **risolto in C7** (chi lascia
  perde, l'altro vince; via broadcast `abbandono` + Presence con grazia). **Scadenza
  stanze e pulizia residui**: ✅ **risolti in 2c** (`pulisciStanzeVecchie` all'apertura
  della lobby + policy DELETE con finestra 10 min; residui dei test già ripuliti).
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
    riepiloghi/pallini, esito arbitrato **scritto** su DB, classifiche e casi limite,
    **lobby dal menu** e **pulizia/scadenza stanze**. Provato **su web** con due browser
    (account diversi). **Filone C v1 CHIUSO**, con in più la **rivincita online**
    (resta solo la rifinitura opzionale della classifica bravura in UI). Dettaglio:
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
    - ✅ **Lobby vera dal menu (1b)** — `SchermataLobby` (crea/entra col codice +
      attesa avversario in Realtime + **ingresso automatico** in partita) al posto del
      **banco di prova**, poi **banco rimosso** (`BancoProvaStanze` + innesti in
      `SchermataMenu`/`Wordilo`). Ritocco additivo a `canaleStanza.annunciaIngresso`
      (callback `onConfermato`). **Testato su web** (crea→entra→gioco automatico).
    - ✅ **Pulizia/scadenza stanze (2c)** — residui dei test ripuliti; policy **DELETE**
      allargata (`status<>'finished'` + 10 min); `pulisciStanzeVecchie` all'apertura
      lobby; `annullaStanza` chiude la stanza a `finished`. **Testato** (Annulla +
      scadenza forzata). **Con questo il filone C v1 è CHIUSO.**
    - ✅ **Rivincita (online)** — a fine partita si può **chiedere/accettare/rifiutare**
      la rivincita dal pop-up di esito. Nuovi eventi Realtime in `canaleStanza.ts`
      (`rivincita-richiesta` / `rivincita-risposta` / `rivincita-via`); nuova
      `creaRivincita` in `stanze.ts` (crea un **nuovo match** con parola nuova,
      `status='playing'`, guest già noto — **solo l'host**, per RLS);
      `SchermataGiocoOnline` orchestra il negoziato e **riavvia il round** (reset delle
      guardie C5b/C7 + `key` che rimonta `SchermataGioco`; il canale resta aperto **una
      sola volta** grazie a `handlersRef`, così cambiare round non rifà scattare
      presence/handshake); `SchermataGioco` mostra i bottoni **🔁 Rivincita / ✓ Accetta /
      Rifiuta**. Richieste incrociate → accordo automatico; se l'avversario esce durante
      l'attesa, la **Presence** la tratta come rifiuto. **Testato su web** (accetta,
      rifiuta, richieste incrociate).
    - ⏭️ **Rifinitura opzionale** — mostrare in UI anche la **classifica bravura**
      (`leaderboard_skill` già pronta lato DB): tab Punti/Bravura in `SchermataClassifiche`.
  - 🎨 **Temi e interfaccia (dopo il filone C)** — sistema di temi (`app/src/temi/`);
    due temi: **Vetro** (glassmorphism scuro) e **Giallo** (chiaro flat). A tema:
    menu, gioco (griglia/tastiera/coriandoli), login, impostazioni, loading.
    *Non ancora a tema*: schermate online (Classifiche/Lobby/GiocoOnline) e `Avatar`.
    *Persistenza — FATTA*: colonna `tema` su `profiles`, componente ponte `InizialiTema`
    in `App.tsx` (stesso meccanismo della lingua); il tema scelto resta al riavvio.
  - 🌍 **Multilingua (it/en) + rifiniture mobile (dopo i temi)** — l'app ora supporta
    **più lingue** e la lingua scelta decide le parole del single player. Fatto:
    - ✅ **Parole inglesi nel DB**: importate in `words` (`lang='en'`) 12.041 parole da
      5 lettere e 21.441 da 6, con `is_solution` per **frequenza** (Zipf ≥ 3.5 →
      1.769 e 2.039 bersagli). Import via CSV lasciando generare l'`id` (identity).
    - ✅ **Sistema lingua**: `LinguaContext` (`app/src/lingua/`), montato in `App.tsx`;
      selettore 🌐 in `SchermataImpostazioni` accanto al tema.
    - ✅ **Dizionario per lingua**: split `dizionarioDati.it.ts` / `.en.ts` + indice
      `dizionarioDati.ts` (`SOLUZIONI[lingua][lunghezza]`, `VALIDE[lingua][lunghezza]`);
      `parolaValida`/`pescaParolaCasuale` ora prendono la **lingua**; `useGioco` la
      legge da `useLingua()` e la passa. **Il single player cambia lingua correttamente.**
    - ✅ **Bug registrazione risolto**: `AuthContext.registrati` aveva 5 argomenti
      (`nick,nome,cognome,email,password`) ma la schermata ne passava 3 → `email`/
      `password` finivano `undefined` e `.trim()` crashava ("Cannot read property 'trim'
      of undefined"). Firma riportata a `registrati(nick, email, password)`.
    - ✅ **Rifiniture mobile**: (a) i **pallini avversario** (online) uscivano dallo
      schermo a sinistra → `SchermataGioco` riserva ora spazio anche per l'online (non
      solo per il countdown esperto), con `Math.max` fra le due riserve. (b) Il **menu**
      su schermi bassi tagliava i pulsanti in fondo (Sfida amico/Classifica/legenda) →
      `SchermataMenu` ora è una **`ScrollView`** (`flexGrow:1`+`center`). (c) **Countdown**
      nel tema Giallo: numero+anello passati a `accentoSoft` (ambra scuro leggibile su
      fondo chiaro); l'**allarme** ora scatta negli **ultimi 5 secondi** con cerchietto
      **rosso pieno + numero bianco**.
    - ✅ **Lingua della sfida online — FATTO** (colonna `matches.lang`, chip in lobby,
      `linguaForzata` propagata a `useGioco`, rivincita mantiene la lingua).
    - ✅ **Preferenze lingua persistite sul profilo Supabase — FATTO** (colonne
      `lingua_ui`/`lingua_gioco` su `profiles`; trigger aggiornato; `ProfiloContext`
      legge e aggiorna; `InizialiLingue` in `App.tsx` inizializza i provider all'avvio;
      `SchermataImpostazioni` salva al cambio; `SchermataAuth` raccoglie le preferenze
      alla registrazione).
    - ✅ **Sistema i18n per l'interfaccia — FATTO** (`app/src/i18n/`: cataloghi `it.ts`
      ed `en.ts` completi, `LinguaUIContext` con `useT()`; tutte le schermate principali
      convertite; l'interfaccia cambia lingua in tempo reale).
    - ✅ **Bug `LEGENDA` — RISOLTO** (era `t()` a livello di modulo in `SchermataMenu.tsx`).
    - ✅ **Persistenza del tema — FATTO**: colonna `profiles.tema` (default `'giallo'`),
      `ProfiloContext.aggiornaTema`, componente ponte `InizialiTema` in `App.tsx`,
      `SchermataImpostazioni` salva al cambio. Il tema scelto ora resta al riavvio.
    - ✅ **Errori online tradotti — FATTO**: `stanze.ts` ritorna chiavi `ChiaveTesto`
      invece di testo italiano cablato; `SchermataLobby`/`SchermataCodaCasuale`
      traducono con `t(risultato.errore)`. ~17 nuove chiavi `err*` in `it.ts`/`en.ts`.
    - ✅ **Selettore tema in registrazione — FATTO**: `SchermataAuth` ha un terzo
      selettore (Vetro/Giallo) accanto a lingua gioco/app; `registrati()` accetta
      `tema` e lo passa nei metadati Auth; trigger `handle_new_user` lo copia su
      `profiles.tema`. Bordo visibile sui pulsanti attivi (`SchermataAuth.stili.ts`),
      prima erano poco distinguibili dal testo semplice sul tema chiaro.
    - ✅ **Lingua predefinita pre-login: inglese — FATTO**: `LINGUA_UI_DEFAULT` in
      `LinguaUIContext.tsx` e il default equivalente in `LinguaContext.tsx` sono `'en'`;
      `InizialiLingue`/`InizialiTema` in `App.tsx` spingono le preferenze del profilo
      **solo con sessione attiva**, così non sovrascrivono più il default pre-login.
    - ✅ **`modalitaLabel` nell'header gioco — FATTO**: ora usa
      `t('labelPrincipiante')`/`t('labelEsperto')` invece di derivare la stringa dalla
      modalità interna; anche "lettere" nella stessa riga passa ora da
      `t('nLettere', { n: lunghezza })`.
    - ✅ **Bottoni "Crea account"/"Entra" tradotti — FATTO**: ultime stringhe cablate
      residue in `SchermataAuth.tsx`; nuove chiavi `creaAccountBtn`/`entraBtn`.
    - ✅ **Rivincita — retry automatico FATTO**: `creaEAvviaRivincita` (lato host)
      riprova fino a 3 volte (pausa 0,7s/1,4s) prima di arrendersi, ma solo per errori
      potenzialmente transitori — non per `errLoggatoRivincita`/`errSoloHostRivincita`
      (permessi, un retry non li risolve). Solo dopo aver esaurito i tentativi scatta
      il rifiuto automatico verso l'avversario, come prima.
    - ✅ **`console.log` di debug rimosso** — `SchermataGiocoOnline.tsx` non stampa
      più la parola in chiaro.
    - 🟡 **Da fare: scelta del font** in Impostazioni — caricare i `.ttf` alternativi
      in `App.tsx` + override di `tema.font`.
  - 🔮 Futuro: **online v2 (anti-cheat)** — spostare scelta parola + valutazione in
    un'**Edge Function** (parola solo lato server) per rendere le classifiche
    pubbliche non falsificabili. Struttura invariata rispetto alla v1. *In v2 la scelta
    della parola e la validazione andranno rese **per lingua** (parametro `lang`).*

---

## 16. Grafica e interfaccia (stato attuale)

L'app ha un **sistema di temi**: tutti i colori/font/misure vivono in un oggetto
`Tema` fornito da un provider, e i componenti li leggono con `useTema()` invece di
importare costanti statiche. Ci sono **due temi**, scegliibili **a runtime** dal menu
(pulsante **⚙️**) → **Impostazioni**:

- **Vetro** (default): *glassmorphism* scuro — sfondo teal-navy profondo, superfici
  traslucide con bordo sottile, titolo serif con bagliore, accento **teal**. È
  l'identità storica dell'app.
- **Giallo**: tema **chiaro "flat/pieno"** — sfondo caldo crema, superfici piene con
  bordo ambra + ombra morbida (il vetro su fondo chiaro sparirebbe), accento ambra.

In entrambi: celle **verde/arancione**, **grigio** per la lettera assente; la lettera
è **bianca** sulle celle piene (valutate) e col **testo del tema** (scuro sul chiaro)
su quelle non ancora valutate. Il gradiente si usa su sfondo e pulsanti d'accento.

**Architettura dei temi** (cartella `app/src/temi/`):
- `tipi.ts` — forma di un `Tema` (`palette`/`gradienti`/`font`/`misure`); le chiavi di
  `palette` sono derivate da `keyof typeof C` (in `theme.ts`), così **ogni tema è
  obbligato** a fornire gli stessi token → niente colori dimenticati.
- `Temavetro.ts` — impacchetta i valori di `theme.ts` come tema "vetro".
- `TemaGiallo.ts` — il tema chiaro; **tutti i suoi colori si affinano da qui** (un
  file solo).
- `TemaContext.tsx` — `TemaProvider` (montato **in cima** ad `App.tsx`) + gli hook
  `useTema()` e `useControlliTema()` (tema attivo, elenco, `cambiaTema`).

`theme.ts` resta la **palette del tema Vetro** + le funzioni pure (`ombra`,
`bagliore`, `coloreDiSfondo`) + i **token** del sistema (colori prima cablati nei
componenti, ora centralizzati). Ogni schermata ha un file `*.stili.ts` con
`creaStili(tema)` (memoizzato su `tema`).

**Coperto dal tema**: menu, gioco (griglia/tastiera/coriandoli), login, impostazioni,
loading. **NON ancora a tema** (leggono ancora i colori statici): le schermate
**online** (`SchermataClassifiche`, `SchermataLobby`, `SchermataGiocoOnline`) e il
componente `Avatar`.

**Persistenza — FATTA**: il tema scelto è salvato su `profiles.tema` e viene
ripristinato al login (componente ponte `InizialiTema` in `App.tsx`); prima del login
resta il default del provider (`'giallo'`).

### Schermata di gioco

- **Header** (ridisegnato): riga singola — indietro ← a sinistra; **Wordilo** con sotto
  `● Principiante · 5 lettere · Italiano` (pallino di stato verde + nome lingua come testo);
  a destra **pallini tentativi** (pieni = fatti, anello = corrente, vuoti = rimanenti) +
  contatore **`X/max`** (es. `2/7`). La gomma ↻ è stata rimossa dall'header.
  Componente `PalliniTentativi` in `SchermataGioco.tsx`.
- **Griglia**: righe = `maxTentativi` (parametrico), celle a **tinta piena** con
  angoli arrotondati; cella vuota con bordo; la **riga attiva** ha un bordo più
  chiaro come indicatore.
- **Countdown (solo esperto)**: badge circolare **a lato della riga attiva** (fuori
  dal flow, quindi non sposta le celle centrate; scende con la riga). Conta i
  secondi rimasti (default 25, valore preso da `game_settings`) e fa un piccolo "pop"
  a ogni secondo. Numero e anello usano `accentoSoft` (nel Giallo: **ambra scuro**
  leggibile sul fondo chiaro). Negli **ultimi 5 secondi** scatta l'**allarme**: il
  cerchietto si **riempie di rosso** (`#FF3B30`) con **numero bianco**. In esperto la
  griglia riserva spazio a destra così il badge non esce mai dallo schermo; in
  principiante è assente.
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
- **Scelta del font (pianificata):** si vuole poterlo scegliere in Impostazioni
  (accanto a lingua e tema). Serve caricare in `App.tsx` (`useFonts`) i `.ttf` dei
  font alternativi e far **sovrascrivere** `tema.font` dalla scelta utente (piccolo
  contesto/override che avvolge il tema). Non ancora implementato.

### Responsività e layout

- Dimensione delle celle calcolata sul **minore** fra vincolo di **larghezza** e di
  **altezza disponibile** → la griglia entra **sempre** insieme alla tastiera, su
  qualsiasi schermo.
- Impaginazione: **header in alto → blocco gioco centrato**. Griglia e tastiera stanno
  nello **stesso contenitore centrato verticalmente** e ravvicinato (`justifyContent:
  'center'` + `gap`), così sparisce il grande vuoto che prima restava tra griglia (in
  alto) e tastiera (in fondo).
- **Badge fuori dalla griglia (mobile)**: in **esperto** la griglia riserva spazio a
  destra per il countdown; in **online** riserva spazio a **sinistra** per i **pallini
  dell'avversario** (riserva di "colonne virtuali", `Math.max` fra le due). Corregge un
  bug per cui su telefono il pallino **verde** usciva dal bordo sinistro.
- **Menu scrollabile**: `SchermataMenu` è una `ScrollView` (`flexGrow:1` +
  `justifyContent:'center'`): resta centrata quando c'è spazio, **scorre** quando non
  ce n'è, così su schermi bassi non si perdono i pulsanti in fondo (Sfida amico,
  Classifica, legenda) — bug corretto.
- Contenuto **centrato e limitato in larghezza** su tablet/desktop; **target touch
  generosi** (tasti più alti su telefono).

### Performance

- Solo **`Animated` nativo** (niente Reanimated/Skia) + un unico modulo leggero
  (**`expo-linear-gradient`**) per sfondo e pulsante.
- Animazioni **one-shot** (nessun loop perenne), coriandoli limitati (~16
  particelle). Pensato per **fascia media e web**.

### Dipendenze grafiche aggiunte

- `expo-linear-gradient` (sfondo/pulsante), `expo-font` + **font Poppins locali**.