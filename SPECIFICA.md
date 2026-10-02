# SpotLex — Specifica del progetto

> Documento di riferimento del gioco. È la "fonte di verità": descrive cosa si
> vuole costruire, con quali scelte tecniche e con quale modello dati. Va tenuto
> aggiornato a ogni decisione presa.

**Stato:** in sviluppo attivo. Single player completo, online v1 completo e chiuso, sistema temi (Vetro/Giallo) **con persistenza sul profilo** e **applicato a tutte le schermate** (incluse online + `Avatar`), multilingua it/en completo (gioco + interfaccia, incluso l'header di gioco e i bottoni auth, nessuna stringa cablata nota residua). Pulsanti online rinominati (**🎲 Gioca online** = coda casuale, **⚔️ Sfida amico** = col codice). Header di gioco ridisegnato con pallini-tentativi. Preferenze lingua **e tema** salvate sul profilo Supabase. Sistema i18n (`app/src/i18n/`) con `useT()` attivo in tutte le schermate principali **e nei messaggi d'errore di `stanze.ts`** (che ritorna chiavi `ChiaveTesto`, non testo cablato). Registrazione: selettori lingua gioco/app **e tema**. Lingua predefinita **prima del login: inglese** (UI e gioco); dopo il login prevale sempre la preferenza salvata sul profilo. Rivincita online con **retry automatico**. Coda casuale con **retry anti-stanze-fantasma**. Classifiche: **due tab Punti/Bravura**. **Novità 2026-10-02:** **economia MONETE** per il single player (calcolate lato server, costo **20 monete** per giocare online), **punti online 10/−10/0**, tentativi **da 7 a 6** (deciso, da completare), **login/registrazione scrollabile**. **Ultimo aggiornamento:** 2026-10-02

---

## 1. Cos'è

SpotLex è un gioco "indovina la parola" (stile Wordle) in italiano, disponibile
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
  (numero tentativi, secondi per tentativo, punti, monete, soglie).
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
  src/auth/AuthContext.tsx     provider auth (sessione + registrati(nick,email,password,linguaGioco,linguaUI,tema)/accedi/accediConGoogle/esci)
  src/auth/PortaAuth.tsx       "cancello": login se non loggato, gioco se loggato
  src/profilo/ProfiloContext.tsx provider profilo (nick/nome/cognome/avatarUrl/linguaUI/linguaGioco/tema + cambiaAvatar + aggiornaLingue + aggiornaTema)
  src/profilo/avatarStorage.ts scegliEcaricaAvatar: selettore foto + upload su Storage
  src/components/Avatar.tsx    avatar tondo: foto (avatarUrl) o iniziali su sfondo colorato
  src/hooks/useGioco.ts        ponte React ↔ motore core (+ timer esperto)
  src/stats/statistiche.tsx    statistiche per-utente dal DB (games + vista user_stats)
  src/economia/economia.ts     💰 MONETE: registraPartitaSolo (RPC registra_partita_solo → {premio, saldo}), pagaIngressoOnline (RPC paga_ingresso_online), hook useSaldo() (monete da profiles + punti da user_stats.punti_totali), costante COSTO_ONLINE = 20; file puro (ritorna codici errore, es. 'MONETE_INSUFFICIENTI')
  src/components/Griglia.tsx   griglia di celle colorate (+ countdown esperto, + pallini avversario online a sinistra riga)
  src/components/Tastiera.tsx  tastiera a schermo (neutri bianchi, OK teal)
  src/components/Coriandoli.tsx  particelle leggere per la vittoria
  src/screens/SpotLex.tsx      router minimale menu ↔ partita ↔ classifiche ↔ lobby ↔ sfida online (senza librerie di navigazione); entraInPartitaOnline paga le 20 monete prima di aprire la sfida (lobby e coda), altrimenti torna al menu con `avviso`
  src/screens/SchermataAuth.tsx  accesso/registrazione (email/password); contenuto in una ScrollView (scrollInner: flexGrow 1 + center) dentro il KeyboardAvoidingView, così la card lunga di registrazione scorre
  src/screens/SchermataMenu.tsx  saluto+logout, chip saldo 🪙 monete · ⭐ punti (useSaldo), scelta lunghezza/modalità, contatori, legenda, pulsanti 🎲 Gioca online + ⚔️ Sfida amico (con "🪙 20", disattivati se monete < 20) e 🏆 Classifica, + ⚙️ Impostazioni accanto a Esci; prop `avviso`; testi via useT()
  src/screens/SchermataClassifiche.tsx  schermata Classifiche (C6): DUE TAB (Punti/Bravura) — legge leaderboard_points e leaderboard_skill, lista con medaglie/avatar, evidenzia la propria riga, cache per tab [FILONE C]
  src/screens/SchermataLobby.tsx  lobby online (1b): crea/entra stanza col codice + attesa avversario in Realtime + INGRESSO AUTOMATICO in partita; Indietro dell'host → annullaStanza; all'apertura chiama pulisciStanzeVecchie (2c) [FILONE C] — ⚠️ bug noto: onCrea fa setRuolo('guest') invece di 'host'
  src/screens/SchermataCodaCasuale.tsx  coda casuale (🎲 Gioca online): trovaOCreaStanzaPubblica → host in attesa o guest che entra; retry anti-fantasma (escludiIds, MAX_RETRY) [CODA]
  src/screens/SchermataGioco.tsx  props ONLINE opzionali (parolaForzata, online, onRigaConfermata, righeAvversario, onPartitaFinita, esitoOnline) + RIVINCITA; in single player a fine partita chiama registraPartitaSolo UNA volta (guardia moneteRegistrate, azzerata da "Nuova partita") e mostra il premio nel pop-up (+N 🪙 verde / −N 🪙 arancione)
  src/online/stanze.ts         creaStanza/entraInStanza/annullaStanza/pulisciStanzeVecchie/creaRivincita/trovaOCreaStanzaPubblica [FILONE C / CODA]
  src/online/canaleStanza.ts   canale Realtime broadcast: riepiloghi + ingresso guest + fine partita + abbandono/Presence (C7) + rivincita [FILONE C]
  src/online/classifiche.ts    leggiClassificaPunti + leggiClassificaBravura [FILONE C]
  src/online/SchermataGiocoOnline.tsx  contenitore sfida online: canale, parola condivisa, pallini, arbitro dell'esito (host), scrittura esito (C5b), abbandono (C7), rivincita [FILONE C]
  src/LoadingScreen.tsx        schermata di caricamento brandizzata
  src/theme.ts                 palette del tema VETRO + token del sistema temi + funzioni pure (ombra/bagliore/coloreDiSfondo)
  src/temi/tipi.ts             forma di un Tema (palette/gradienti/font/misure); chiavi di palette da keyof typeof C
  src/temi/Temavetro.ts        tema "vetro" = valori di theme.ts impacchettati
  src/temi/TemaGiallo.ts       tema "giallo" (chiaro flat/pieno)
  src/temi/TemaContext.tsx     TemaProvider + useTema()/useControlliTema()
  src/lingua/LinguaContext.tsx  LinguaProvider + useLingua()/useControlliLingua(): lingua del GIOCO
  src/i18n/it.ts               catalogo testi in ITALIANO (fonte di verità delle chiavi); tipo ChiaveTesto
  src/i18n/en.ts               catalogo testi in INGLESE
  src/i18n/LinguaUIContext.tsx  LinguaUIProvider + useT()/useControlliLinguaUI(): lingua dell'INTERFACCIA; default pre-login 'en'
  src/screens/SchermataImpostazioni.tsx  scelta TEMA, LINGUA DEL GIOCO, LINGUA DELL'APP (salvate su profiles)
  src/**/*.stili.ts            stili per-schermata via creaStili(tema)
  assets/fonts/                font Poppins incorporati (.ttf)
  metro.config.js              wiring monorepo (Metro vede /core)
/backend     → Edge Functions / logica server per l'online (non ancora creata; serve solo alla v2 anti-cheat)
supabase_monete_punti.sql → migrazione economia (colonna monete, trigger, movimenti_monete, RPC, punti online) — eseguita
```

L'app importa il core come `@SpotLex/core`: l'alias è risolto sia da TypeScript
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
sessione). Alla registrazione si raccolgono **nick**, email/password e le tre
preferenze (lingua gioco, lingua app, tema). Il **profilo** viene creato **in
automatico** al primo accesso da un **trigger** sul database (`handle_new_user`),
così esiste sempre; parte con **100 monete** (default della colonna). In sviluppo la
**conferma via email è disattivata** (registrazione → subito dentro).

La schermata di accesso/registrazione è **scrollabile** (`ScrollView` dentro il
`KeyboardAvoidingView`): su schermi bassi la card di registrazione, più lunga, non
viene più tagliata.

**Login Google — collegato (web).** Provider Google attivo su Supabase (client
OAuth di tipo *Web application*; il *client secret* sta **solo** su Supabase, mai
nell'app). Sul **web** il login funziona end-to-end (`accediConGoogle` in
`AuthContext` + pulsante in `SchermataAuth`). Il **trigger** è stato aggiornato:
se il nick **manca** (login social) ne **genera uno univoco** dalla parte prima
della `@` dell'email, e importa **nome/cognome/foto** da Google
(`given_name`/`family_name`/`picture`). Sul **telefono** il codice è pronto (deep
link con scheme `SpotLex`, via `expo-web-browser`/`expo-auth-session`), ma il test
richiede un **development build** (Expo Go non registra lo scheme). **Facebook**
ancora da collegare.

### Profilo

Ogni utente ha un profilo con: **nick** (univoco), nome, cognome, **immagine
avatar**, preferenze (lingue, tema) e **saldo monete**.

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

- **6 tentativi** (default; prima erano 7 — passaggio a 6 deciso il 2026-10-02).
- Nessun timer.
- Dopo l'ultimo tentativo sbagliato si perde.

### 5.2 Esperto

- **25 secondi per ogni tentativo** (default), con countdown mostrato a lato
  della riga corrente.
- Se scadono i secondi, quel **tentativo è perso** e si passa al successivo
  (non si perde l'intera partita). In dettaglio: la riga viene **persa senza
  valutazione** — ciò che era stato digitato si scarta e **non riceve colori** —,
  il timeout **consuma comunque un tentativo** (conta verso il massimo) e il
  **countdown riparte da capo a ogni nuova riga**.
- Stesso numero di tentativi del principiante (parametrico).

### 5.3 Online

- Sfida tra **due giocatori** sulla **stessa parola target**.
- Si sceglie se giocare in modalità **principiante o esperto** (ne eredita le
  regole: tentativi e/o timer).
- **Costo d'ingresso: 20 monete** per partita (sia coda casuale sia sfida con
  amico), pagate da **ciascun** giocatore quando la partita parte davvero (dopo la
  stretta di mano: una stanza annullata non costa nulla). Serve un saldo **≥ 20**; nel
  menu i pulsanti online sono disattivati se le monete non bastano. Il pagamento è
  **idempotente** (una sola volta per partita). Anche la **rivincita** è un nuovo match;
  oggi il pagamento è agganciato all'ingresso da lobby/coda in `SpotLex.tsx`.
- **Accoppiamento: due modalità che convivono.**
  1. **Con un amico — codice-stanza** (⚔️ Sfida amico): un giocatore crea la stanza
     e riceve un codice breve da condividere; l'altro entra digitandolo.
  2. **Con uno sconosciuto — coda casuale** (🎲 Gioca online): il giocatore non digita
     codici; l'app **cerca** una stanza pubblica in attesa con le **stesse impostazioni**
     (modalità + lunghezza + lingua) e vi **entra**; se non ce n'è, ne **crea** una
     pubblica e **aspetta** che arrivi il prossimo. Regola anti-corsa: *prima cerca, poi
     crea* (+ guardia `guest_id IS NULL` sull'update). Le stanze della coda sono marcate
     `is_public = true` (le stanze col codice restano `false`). Riusa la **stessa stretta
     di mano** Realtime e la stessa pulizia/scadenza stanze della modalità col codice.
     **Anti-stanze-fantasma:** se l'host di una stanza pubblica è sparito, il guest
     allo scadere del timeout **scarta** quella stanza (`escludiIds`) e **riprova** il
     matchmaking (cap `MAX_RETRY`).
- **Indicatore avversario:** a lato di ogni riga giocata dall'avversario
  compaiono due pallini — **verde con il numero di lettere corrette** e **arancione
  con il numero di lettere presenti ma fuori posizione**. Si trasmettono **solo i
  conteggi, mai le lettere**.
- **Lingua della sfida — FATTO.** Proprietà della sfida (`matches.lang`), uguale per
  host e guest; propagata a `useGioco` come `linguaForzata`. Col codice la sceglie
  l'host (chip 🇮🇹/🇬🇧); nella coda è la lingua dell'app. Parola pescata con
  `parola_casuale(lunghezza, p_lang)`.
- **Rivincita:** a fine sfida **🔁 Rivincita / ✓ Accetta / Rifiuta**; se accetta,
  l'**host** crea un **nuovo match** (parola nuova, stesse impostazioni) sullo stesso
  canale.

---

## 6. Punteggio, monete ed esiti

### Single player (principiante / esperto) → **MONETE**

- Esito: **vinta** o **persa** (nessun pareggio).
- **Nessun punto in classifica**, ma si guadagnano/perdono **monete**, che servono
  per giocare online.

| Vinta al tentativo | 1 | 2 | 3 | 4 | 5 | 6 | Persa |
|---|---|---|---|---|---|---|---|
| Principiante | 100 | 70 | 50 | 30 | 0 | 0 | **−20** |
| Esperto | 200 | 150 | 100 | 60 | 0 | 0 | **−40** |

- **Saldo iniziale: 100 monete.** Le monete **possono andare in negativo**.
- Il premio è **calcolato dal server** (funzione `registra_partita_solo`): l'app invia
  solo modalità, vinta/persa e numero di tentativi. Anti-spam: al massimo una partita
  registrata ogni 5 secondi; tentativi validati (1..6).
- Il pop-up di fine partita mostra il premio (**+70 🪙** / **−20 🪙**).

### Online → **PUNTI**

- Chi indovina per primo **vince**; l'altro **perde**.
- Se **nessuno dei due** indovina entro i tentativi → **pareggio**.
- Punti (parametrici, `game_settings`): **vittoria +10**, **sconfitta −10**,
  **pareggio 0** (dal 2026-10-02; prima 10/0/5). **Stesse regole** per coda casuale e
  sfida con amico.
- I punti si accumulano **solo dall'online**; le monete **solo dal single player**
  (l'online le **consuma**: 20 per partita).
- La **rivincita** apre una **nuova partita = nuovo `matches`**: ogni round ha la
  sua riga in `games` e il proprio esito.

### Dove si cambiano i valori

- **Monete per tentativo / sconfitta:** funzione SQL `registra_partita_solo`
  (array `v_base`, `v_esperto`; variabili `v_persa_base`, `v_persa_esperto`). Si
  cambia rieseguendo il solo blocco `create or replace function` nel SQL Editor
  (effetto immediato, senza aggiornare l'app). Ogni array deve avere **6 numeri**.
- **Costo online (20):** funzione `paga_ingresso_online` **e** `COSTO_ONLINE` in
  `economia.ts` (il server decide; l'app lo usa solo per il menu) — tenerli allineati.
- **Monete iniziali (100):** `default` della colonna `profiles.monete` **e** trigger
  `_proteggi_monete`.
- **Punti online:** Table Editor → `game_settings` (`points_win/lose/draw`).
- **Saldo di un giocatore:** Table Editor → `profiles.monete` (correzione manuale
  consentita dalla dashboard, non registrata in `movimenti_monete`).

---

## 7. Classifiche

Due classifiche **distinte**:

1. **Classifica a punti** — somma dei punti guadagnati online (ora possono anche
   scendere: −10 a sconfitta).
2. **Classifica per bravura** — ordinata sul **win-rate** (vittorie/partite).

**Soglia minima** per la classifica bravura: almeno **N partite online** (default 10,
parametrico). A parità di win-rate, sta più in alto chi ha giocato più partite.

*(In futuro: Elo/media pesata, classifiche per periodo/categoria, classifica monete.
Rimandato.)*

---

## 8. Statistiche personali

All'ingresso l'utente vede i contatori aggregati e il **saldo** (🪙 monete,
⭐ punti online). Le "ultime partite" sono gli ultimi N record dell'utente
ordinati per data; gli aggregati escono da una vista sul database.

**Stato attuale (implementato):** statistiche **reali e per-utente**. A fine partita
l'app scrive una riga in **`games`** (`useStatistiche`, alimentato da
`useGioco(..., registra)`); i contatori **giocate / vinte / perse** del menu si
leggono dalla vista **`user_stats`**. Il saldo si legge con `useSaldo()`
(`profiles.monete` + `user_stats.punti_totali`); il menu si rimonta a ogni ritorno,
quindi il saldo è sempre aggiornato.

---

## 9. Dizionario

Serve un dizionario di parole da **5 e 6 lettere**, **per ogni lingua**, con doppio uso:

- estrarre la **parola target**;
- **validare** che ciò che l'utente scrive sia una parola reale.

Il gioco è **accent-insensitive**: gli accenti si rimuovono sia dal dizionario sia
dall'input dell'utente (es. `perché` → `PERCHE`) e la tastiera a schermo non ha
tasti accentati. La normalizzazione è centralizzata in `normalizzaParola` (`core`).

**Stato attuale (implementato): dizionario MULTILINGUA (it + en).** La tabella `words`
ha la colonna **`lang`** e contiene due lingue:

- **Italiano** (`lang='it'`): **26.793 parole** (8.176 da 5, 18.617 da 6); bersagli
  (`is_solution=true`): **1.452** da 5 e **1.705** da 6, scelti per frequenza (~top 15.000).
- **Inglese** (`lang='en'`): **33.482 parole** (12.041 da 5, 21.441 da 6); bersagli:
  **1.769** da 5 e **2.039** da 6, scelti con **frequenza d'uso reale** (libreria
  `wordfreq`, soglia **Zipf ≥ 3.5**). Import fatto via **CSV** (senza colonna `id`, che è
  `GENERATED ALWAYS AS IDENTITY`).

La scelta dei bersagli si affina con un `UPDATE` di `is_solution`, senza reimportare.
**Offline-first**: il dizionario è anche **dentro l'app**, **indicizzato per lingua**
(`core/src/dizionarioDati.ts` + file per lingua). Le funzioni del core prendono la
lingua: `pescaParolaCasuale(lingua, lunghezza)` e `parolaValida(parola, lingua,
lunghezza)`. Il DB resta la **fonte di verità**; `parola_casuale(lunghezza, p_lang)` è
usata dall'online.

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
  lingua_ui    text not null default 'it'
  lingua_gioco text not null default 'it'
  tema         text not null default 'giallo' check (tema in ('giallo','vetro'))
  monete       int  not null default 100     -- 💰 saldo monete (può essere negativo); NON scrivibile dal client
  created_at   timestamptz default now()

-- 2. DIZIONARIO
words
  id           bigint PK
  word         text not null
  length       smallint not null          -- 5 o 6
  is_solution  boolean default true
  lang         text default 'it'
  unique(word, lang)

-- 3. PARAMETRI PER MODALITÀ
game_settings
  mode                 text PK             -- 'principiante' | 'esperto'
  max_attempts         int not null        -- 6 (deciso 2026-10-02; prima 7) — da aggiornare
  seconds_per_attempt  int                 -- null = senza timer; 25 per esperto
  points_win           smallint            -- 10
  points_lose          smallint            -- -10 (prima 0)
  points_draw          smallint            -- 0   (prima 5)
  updated_at           timestamptz

-- 3b. PARAMETRI GLOBALI (riga singola)
app_config
  id               int PK default 1
  skill_min_games  int default 10

-- 4. PARTITE ONLINE
matches
  id            uuid PK
  room_code     text unique
  mode          text
  word_id       bigint → words.id
  word_length   smallint
  host_id       uuid → profiles.id
  guest_id      uuid → profiles.id
  status        text                        -- 'waiting' | 'playing' | 'finished'
  winner_id     uuid → profiles.id          (nullable)
  is_draw       boolean default false
  lang          text default 'it'
  is_public     boolean not null default false
  created_at    timestamptz
  finished_at   timestamptz

-- 5. GIOCATE
games
  id            uuid PK
  user_id       uuid → profiles.id
  match_id      uuid → matches.id           -- null = single player
  mode          text
  word_length   smallint
  word_id       bigint → words.id
  result        text                        -- 'won' | 'lost' | 'draw'
  attempts_used smallint
  duration_ms   int
  points        smallint                    -- online: +10 / -10 / 0; single player 0
  guesses       jsonb
  created_at    timestamptz
  finished_at   timestamptz

-- 6. STORICO MONETE  💰 (2026-10-02)
movimenti_monete
  id         bigint PK (identity)
  user_id    uuid → auth.users (on delete cascade)
  tipo       text check in ('solo','ingresso_online')
  importo    int                            -- es. +70, -20
  match_id   uuid → matches (on delete set null)   -- solo per ingresso_online
  dettagli   jsonb                          -- {modalita, vinta, tentativi} per 'solo'
  creato_il  timestamptz default now()
  -- indice UNICO (user_id, match_id) where tipo='ingresso_online' → si paga una volta per partita
  -- RLS: select solo delle proprie righe; nessuna scrittura dal client
```

### Funzioni e trigger dell'economia (2026-10-02)

- **`_proteggi_monete()`** — trigger `before insert or update` su `profiles`: se a
  scrivere è il client (`anon`/`authenticated`), all'insert forza `monete = 100` e
  all'update **vieta** di cambiare `monete` (`SALDO_NON_MODIFICABILE`). Le funzioni
  `security definer` girano come proprietario e quindi possono aggiornarle.
- **`registra_partita_solo(p_modalita, p_vinta, p_tentativi) → jsonb {premio, saldo}`**
  — calcola il premio dalla tabella §6, anti-spam 5s, scrive `movimenti_monete` e
  aggiorna `profiles.monete`. Errori: `NON_AUTENTICATO`, `MODALITA_NON_VALIDA`,
  `TENTATIVI_NON_VALIDI`, `TROPPO_VELOCE`.
- **`paga_ingresso_online(p_match_id) → int saldo`** — verifica che l'utente sia
  host/guest del match, idempotente, richiede saldo ≥ 20, scala 20. Errori:
  `NON_PARTECIPANTE`, `MONETE_INSUFFICIENTI`.
- `execute` revocato a `anon`/`public`, concesso solo ad `authenticated`.

### Storage

- Bucket **`avatars`** — file immagine profilo. Lettura pubblica; scrittura solo
  del proprietario del file.

### Viste

```sql
user_stats (view, security_invoker)
  → user_id, giocate, vinte, perse, pareggiate, giocate_online, win_rate, punti_totali

leaderboard_points (view pubblica)
  → user_id, nick, avatar_url, partite_online, vinte, perse, pareggiate, punti_totali
  order by punti_totali desc, vinte desc

leaderboard_skill (view pubblica)
  → user_id, nick, avatar_url, partite_online, vinte, win_rate
  where partite_online >= app_config.skill_min_games
  order by win_rate desc, partite_online desc
```

### Note di modellazione

- **`matches` separata da `games`**: un match online produce **due righe** in
  `games` (una per giocatore), con lo stesso `match_id`.
- **Monete separate dai punti**: le monete vivono su `profiles.monete` con storico in
  `movimenti_monete`; i punti online restano in `games.points` (aggregati da
  `user_stats`/`leaderboard_points`). Due "valute" indipendenti.
- Parametri di gioco e punti stanno nel DB → si cambiano senza ricompilare; i valori
  delle monete stanno nella funzione SQL (anch'essi modificabili senza ricompilare).
- **Nome reale della tabella profili: `profiles`** (non `profili`): verificare sempre i
  nomi reali prima di scrivere SQL.
- **Stato attuale del DB (implementato):** tutte le tabelle con **RLS attiva**,
  trigger `handle_new_user` (scrive anche `lingua_ui`/`lingua_gioco`/`tema`), seed di
  `game_settings`/`app_config`, dizionario reale it/en, `parola_casuale(lunghezza,
  p_lang)`, viste `user_stats`/`leaderboard_points`/`leaderboard_skill`. `matches` con
  quattro policy (insert host; select proprie o `waiting`; update entra/gioca; delete
  stanze proprie non finite > 10 min) e colonne `lang`/`is_public`. **Economia monete**
  (migrazione `supabase_monete_punti.sql`): colonna `monete`, trigger
  `_proteggi_monete`, tabella `movimenti_monete`, RPC `registra_partita_solo` e
  `paga_ingresso_online`, `game_settings` punti a 10/−10/0.

---

## 11. Flusso della sfida online (codice-stanza)

> **Nota v1 / v2.** La sequenza descrive il traguardo **v2** (parola e valutazione
> lato server). **La v1** è identica nella struttura ma **senza Edge Function**: la
> parola la sceglie e la valuta il **client**.

1. **Host crea** la stanza → `matches` con `room_code`, `guest_id` vuoto,
   `status = 'waiting'`.
2. **Guest entra** col codice → si riempie `guest_id`, `status = 'playing'`.
3. Stretta di mano Realtime (`guest-entrato`/`host-ok`); **ciascuno paga 20 monete**
   (`paga_ingresso_online`) ed entra in partita. In v2 il server assegna qui la parola
   e la valuta.
4. Dopo ogni tentativo, ciascun client pubblica `{ riga, verdi, arancioni }`;
   l'avversario disegna i pallini.
5. Fine sfida → `status = 'finished'` con `winner_id` oppure `is_draw = true`;
   vengono scritte le due righe in `games` con `result` e `points` (+10/−10/0).

---

## 12. Sicurezza (anti-cheat)

> **Applicabile in v2.** In **v1** la parola sta sul **client**: la classifica v1 è
> "sulla fiducia".

- Parola target **solo lato server**; al client va solo la lunghezza.
- Valutazione tentativi via **Edge Function**; il client riceve solo i colori.
- Nell'online si trasmettono **conteggi**, non lettere.
- RLS su Supabase: ogni utente legge/scrive solo i propri dati; classifiche e avatar
  in lettura pubblica.
- **Monete (già in v1):** saldo **non scrivibile** dal client (trigger); premi e costi
  calcolati da funzioni `security definer`. Limiti noti: l'esito single player è
  dichiarato dal client (mitigato da anti-spam e validazione); il pagamento d'ingresso
  è **chiamato dal client** (`SpotLex.tsx`) — da spostare dentro le RPC di
  creazione/ingresso stanza per renderlo obbligatorio.

---

## 13. Logica di gioco condivisa (`core`)

Funzione pura, indipendente dal dispositivo:

```
valutaTentativo(guess, target) →
  per ogni lettera: 'green' | 'orange' | 'grey'
```

Regola dei duplicati (come in Wordle): le lettere verdi "consumano" le occorrenze
del target per prime; l'arancione si assegna solo se restano occorrenze non ancora
abbinate.

Le tre modalità differiscono solo per configurazione (numero tentativi, timer,
sincronizzazione avversario), non per codice.

Il `core` contiene un **motore di gioco puro** (crea stato, digita/cancella,
`svuotaRiga`, conferma tentativo, `timeoutTentativo`, `coloriTastiera`, `contaColori`).
Il timer vive nella UI. La configurazione (`ConfigGioco`) si legge da `ConfigProvider`/
`useConfig`: valori **dal server** (`game_settings` via `configService`), con
`CONFIG_DEFAULT` come **fallback** offline (⚠️ da allineare a **6 tentativi**). La
**validazione** è un predicato iniettabile (`confermaTentativo(stato, isValida)`) che
usa `parolaValida(parola, lingua, lunghezza)`. La **lingua** è un parametro; il `core`
resta puro. **Le monete non sono nel core**: le gestisce `app/src/economia/` + server.

---

## 14. Decisioni prese

- Stack: **Expo + Supabase**, TypeScript, monorepo `core`/`app`/`backend`.
- Principiante: **6 tentativi** (default parametrico; **cambiato da 7 a 6 il
  2026-10-02**), nessun timer.
- Esperto: **25 secondi/tentativo** (default parametrico); allo scadere si perde
  **solo quel tentativo**.
- Tutti i valori numerici chiave sono **parametrici lato server**.
- **Single player: MONETE** (dal 2026-10-02; prima "nessun punteggio") —
  100/70/50/30/0/0 e −20 (principiante), 200/150/100/60/0/0 e −40 (esperto); saldo
  iniziale 100; può andare in negativo. Le monete servono per giocare online.
- **Online: costo 20 monete a partita** per ciascun giocatore, coda casuale e amico
  uguali; serve saldo ≥ 20.
- **Punti online: +10 / −10 / 0** (dal 2026-10-02; prima 10/0/5), stesse regole per
  coda casuale e amico.
- **Economia lato server:** monete calcolate da funzioni SQL `security definer`
  (`registra_partita_solo`, `paga_ingresso_online`); colonna saldo protetta da
  trigger; storico in `movimenti_monete`. L'app invia solo l'esito. Scelto di **non**
  duplicare il sistema punti online (già esistente su `games`/`game_settings`).
- **Pagamento all'ingresso, non alla creazione:** si paga quando la partita parte
  davvero (dopo la stretta di mano), così una stanza annullata non costa nulla.
- Online: **due accoppiamenti** — codice-stanza (con un amico) e **coda casuale**
  (🎲 Gioca online, stanze `is_public`).
- **Due classifiche** distinte (punti + bravura), bravura con **soglia minima**
  (default 10 partite).
- Avatar in **Storage**, con fallback social → iniziali.
- Esperto, dettaglio timeout: riga **persa senza valutazione**, **consuma un
  tentativo**, **timer riparte a ogni riga**.
- Timer esperto **come effetto in `useGioco`**; countdown **badge a lato della riga
  attiva**.
- Gioco **accent-insensitive**.
- **Validazione parola** iniettabile, attiva tramite `parolaValida`.
- **Dizionario reale** in `words`, bersagli per frequenza, affinabili con `UPDATE`.
- **Single player offline-first** (dizionario dentro l'app).
- Config di gioco da **provider** con fallback offline.
- Righe della griglia = `maxTentativi` (parametrico).
- Navigazione: **router minimale** senza librerie (`SpotLex.tsx`).
- Statistiche **reali dal DB** (`games` + `user_stats`).
- **Backend Supabase**: client unico, chiavi nel `.env`, `anon` protetta da RLS, login
  obbligatorio, profilo via trigger.
- **Login Google** collegato sul web; telefono richiede development build.
- **Online in due tappe** (v1 parola sul client, v2 Edge Function).
- **Online v1 — parola dal DB** (`parola_casuale`), `useGioco` accetta `parolaForzata`,
  `SchermataGioco` con props online opzionali, contenitore `SchermataGiocoOnline`.
- **Esito online arbitrato dall'host** (C5a); scrittura esito (C5b) con punti da
  `game_settings` (⚠️ fallback in codice ancora 10/0/5 → aggiornare a 10/−10/0).
- **Classifiche (C6)**, **casi limite (C7)**, **lobby (1b)**, **pulizia stanze (2c)**,
  **rivincita**, **coda casuale** con retry anti-fantasma.
- **Sistema temi (Vetro/Giallo)** con persistenza su `profiles.tema`.
- **Multilingua (it/en)**: lingua del gioco e lingua dell'interfaccia indipendenti,
  persistite su `profiles`; default pre-login inglese.
- **Schermate lunghe scrollabili:** menu (già) e ora anche **login/registrazione**
  (`ScrollView` con `flexGrow:1` + `justifyContent:'center'`).
- **Regola di codice:** hook e chiamate che usano props/stato vanno **dentro** il
  componente (in `useEffect` con guardia `useRef` se devono scattare una volta), mai a
  livello di modulo.

---

## 15. Punti ancora aperti

- **Completare 7 → 6 tentativi:** `update game_settings set max_attempts = 6;` +
  `CONFIG_DEFAULT` nel core (fallback offline).
- **Chiavi i18n economia** da aggiungere in `it.ts`/`en.ts`: `monete`, `puntiOnline`,
  `moneteInsufficienti`, `erroreIngressoOnline`.
- **Bug `SchermataLobby.onCrea`:** `setRuolo('guest')` → deve essere `setRuolo('host')`.
- **Fallback punti in `SchermataGiocoOnline`:** 10/0/5 → 10/−10/0.
- **Verifica in app dell'economia** (chip saldo, pop-up premio, blocco < 20,
  pagamento d'ingresso con due browser).
- **Anti-cheat ingresso online:** spostare `paga_ingresso_online` dentro le RPC di
  creazione/ingresso stanza; gestire il caso "pagamento fallito dopo la stretta di
  mano" come abbandono. Valutare il costo anche per la **rivincita**.
- **Affinamento bersagli del dizionario** (nomi propri/forestierismi).
- **Classifica bravura**: soglia secca ora; valutare Elo/media pesata. Idee: classifiche
  settimanali, per categoria (modalità × lunghezza × lingua).
- **Stanze fantasma nella coda casuale**: mitigato (Passo 1); opzionale Passo 2.
- **Scelta del font** in Impostazioni.
- **Ordine di sviluppo** (storico): single player ✅ → Supabase ✅ → dizionario ✅ →
  login Google + avatar ✅ (telefono/Facebook in sospeso) → online v1 ✅ (C1–C7, lobby,
  pulizia, rivincita, coda, bravura in UI) → temi ✅ → multilingua ✅ → **economia
  monete ✅ (2026-10-02, da verificare in app)** → font 🟡 → online v2 🔮.

---

## 16. Grafica e interfaccia (stato attuale)

L'app ha un **sistema di temi**: colori/font/misure in un oggetto `Tema` fornito da un
provider (`useTema()`). **Due temi** scegliibili a runtime (⚙️ → Impostazioni):

- **Vetro**: *glassmorphism* scuro, accento **teal**.
- **Giallo** (default del provider): chiaro **flat/pieno**, accento ambra.

In entrambi: celle **verde/arancione/grigio**; lettera **bianca** sulle celle valutate.
Architettura in `app/src/temi/` (`tipi.ts`, `Temavetro.ts`, `TemaGiallo.ts`,
`TemaContext.tsx`); `theme.ts` = palette Vetro + funzioni pure + token; ogni schermata
ha `*.stili.ts` con `creaStili(tema)`. **Tutte le schermate sono a tema**; `Avatar` con
tavolozza colori-persona fissa e iniziali bianche. Tema persistito su `profiles.tema`.

### Menu

- Barra in alto: avatar + nick, ⚙️ Impostazioni, Esci.
- Titolo serif con bagliore + tagline.
- **Chip saldo** (2026-10-02): **🪙 monete** e **⭐ punti online**; valore in arancione
  se negativo.
- Card "Imposta la partita" (lunghezza, modalità, Gioca), contatori, **avviso**
  (es. monete insufficienti), azioni **🎲 Gioca online / ⚔️ Sfida amico** con sotto
  **🪙 20** (semitrasparenti e disattivate se monete < 20), 🏆 Classifica, legenda.
- `ScrollView` (`flexGrow:1` + center): centrato se c'è spazio, scorre se no.

### Schermata di gioco

- **Header**: indietro ←, **SpotLex** con `● Principiante · 5 lettere · Italiano`,
  **pallini tentativi** + contatore **`X/max`** (con 6 tentativi: `2/6`).
- **Griglia**: righe = `maxTentativi`; celle a tinta piena; riga attiva evidenziata.
- **Countdown (solo esperto)**: badge a lato della riga attiva; allarme rosso negli
  ultimi 5 secondi.
- **Tastiera** QWERTY: tasti neutri bianchi, assente grigio, presente/corretta
  arancione/verde, **OK teal**, ⌫; tastiera fisica su web; colori "best-of".

### Micro-animazioni e feedback

- **Flip** in cascata alla conferma, **scossa** su parola incompleta/non valida,
  **pop** della cella.

### Fine partita

- **Pop-up modale** dopo la rivelazione: **"Indovinata!"** / **"Peccato!"** + la
  parola; in single player mostra anche il **premio in monete** (**+N 🪙** verde,
  **−N 🪙** arancione, 0 neutro); pulsante **"↻ Nuova partita"**.
- Online: Hai vinto/perso/Pareggio + bottoni rivincita.
- **Coriandoli** alla vittoria.

### Accesso / registrazione

- Card centrata con toggle Accedi/Registrati; in registrazione nick + tre selettori
  (lingua gioco, lingua app, tema). **Scrollabile** (2026-10-02).

### Font e caricamento

- **Poppins** incorporato, caricato con `expo-font` in modo non bloccante.
- Schermata di caricamento brandizzata.
- **Scelta del font (pianificata)** in Impostazioni: caricare i `.ttf` alternativi in
  `App.tsx` e sovrascrivere `tema.font`.

### Responsività e layout

- Dimensione celle = minore fra vincolo di larghezza e di altezza → griglia e tastiera
  entrano sempre.
- Griglia e tastiera nello stesso contenitore centrato verticalmente.
- Riserva di "colonne virtuali" per countdown (esperto, destra) e pallini avversario
  (online, sinistra), con `Math.max`.
- **Menu e login scrollabili** su schermi bassi.
- Contenuto centrato e limitato in larghezza su tablet/desktop; target touch generosi.

### Performance

- Solo **`Animated` nativo** + `expo-linear-gradient`. Animazioni one-shot, coriandoli
  limitati (~16 particelle).

### Dipendenze grafiche aggiunte

- `expo-linear-gradient`, `expo-font` + **font Poppins locali**.
