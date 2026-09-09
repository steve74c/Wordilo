# Prompt per riprendere lo sviluppo di Wordilo

> Incolla questo testo come **primo messaggio** in una nuova chat, e **allega il file
> `SPECIFICA.md`**. È scritto per mettere l'assistente nelle stesse condizioni in cui
> eravamo alla fine dell'ultima sessione.

---

Ciao. Sto sviluppando **Wordilo**, un gioco "indovina la parola" (stile Wordle),
ora **multilingua (italiano + inglese)**, come **app unica** per web + iOS + Android.
Ti allego **`SPECIFICA.md`**: è la fonte di verità del progetto, aggiornata all'ultimo
stato. **Leggila per intero prima di rispondere.** Non sono un esperto di backend/
Supabase, quindi spiegami le cose in modo semplice e **procediamo un passo alla volta**.

## Dove sono arrivato (già fatto e funzionante)

- **Single player COMPLETO** e collegato a Supabase: core puro con test, app Expo
  (menu 5/6 lettere, principiante ed esperto con timer, griglia/tastiera/animazioni/
  pop-up in stile flat), config dal DB (`game_settings`), **login email/password**,
  **statistiche reali** (`games` + vista `user_stats`), dizionario reale con validazione
  **offline-first**, **login Google (web)** + **avatar**.
- **Online — filone C v1: COMPLETO e CHIUSO** — la sfida è giocabile dall'inizio alla
  fine, con **lobby vera dal menu** e **pulizia/scadenza delle stanze** (testata su web
  con due browser, account diversi): tabella `matches` + RLS, crea/entra con codice,
  Realtime (riepiloghi verdi/arancioni + pallini avversario), esito arbitrato dall'host
  e **scritto** in `games`/`matches`, classifiche (per ora solo a punti), casi limite
  (abbandono/disconnessione = "chi lascia perde"). Dettagli completi in `SPECIFICA.md`.
- **Temi e interfaccia**: sistema di temi (`app/src/temi/`), tema attivo via
  `TemaProvider`/`useTema`, scelto dal menu (**⚙️ → Impostazioni**). Due temi: **Vetro**
  (glass scuro, default) e **Giallo** (chiaro flat). A tema: menu, gioco, login,
  impostazioni, loading. *Ancora statiche*: schermate **online** e `Avatar`.
- **NUOVO in quest'ultima sessione — Coda casuale (🎲 Gioca online):** seconda modalità
  online che **convive** con quella col codice. Un giocatore preme 🎲 e l'app lo accoppia
  automaticamente con un altro in attesa che abbia le **stesse impostazioni** (modalità +
  lunghezza + lingua); niente codice da scambiare. **Provato in app con due browser.**
  - **DB:** aggiunta a `matches` la colonna **`is_public`** (`boolean not null default
    false`): `true` = stanze della coda, `false` (default) = stanze col codice, così
    `creaStanza`/`creaRivincita` restano private senza modifiche. **Nessuna policy RLS
    nuova**: la coda riusa i permessi esistenti (SELECT delle `waiting` + UPDATE per
    entrare in una `waiting` con `guest_id IS NULL`) — verificato prima di scrivere codice.
  - **Logica (`stanze.ts`):** nuova `trovaOCreaStanzaPubblica(modalita, lunghezza, lingua)`
    — *prima cerca* una stanza pubblica compatibile ed entra (ruolo `guest`, parte subito),
    *poi crea* la propria se non c'è (ruolo `host`, attende). Il "prima cerca poi crea" +
    la guardia `guest_id IS NULL` disinnesca la corsa dei due-che-premono-insieme. Ritorna
    anche il **ruolo**. `creaStanza`/`entraInStanza`/`creaRivincita` **non toccate**.
  - **UI:** nuovo pulsante **🎲 Gioca online** nel menu (accanto a ⚔️ Sfida amico) via
    prop opzionale `onGiocaOnline`; nuova **`SchermataCodaCasuale.tsx`** che riusa la
    **stessa stretta di mano e gli stessi stili** della lobby (mostra "cerco/attendo/
    trovato"); collegamento nel router `Wordilo.tsx` (stato `codaCasuale`). L'Indietro
    dell'host chiude la stanza pubblica (`annullaStanza`).
  - **Header di gioco:** la riga in alto ora mostra anche la **lingua effettiva** con la
    bandierina (`linguaForzata ?? linguaApp`) — in single la lingua dell'app, online quella
    della sfida (es. 🇬🇧 anche con app in italiano). Modifica in `SchermataGioco.tsx`.
  - *Limite noto:* una stanza pubblica il cui host **chiude di colpo la scheda** resta lì
    finché non scade (10 min): un altro giocatore può agganciarla e vedere "l'avversario
    non risponde" dopo ~8s. Stessa classe del limite "chi crolla" della v1 → da rifinire
    ("stanze fantasma").
- **Lingua della sfida ONLINE (multilingua ONLINE completo):**
  la lingua è ora una **proprietà della sfida**, uguale per host e guest, così i due
  validano sempre sullo **stesso** dizionario (prima ognuno usava la lingua **locale**: con
  lingue diverse la sfida si rompeva). Fatto e **provato in app**: colonna **`lang`** in
  `matches`; campo **`lingua`** nel tipo `Sfida` (`stanze.ts`), scritto in
  `creaStanza`/`creaRivincita` ed **ereditato** dal guest in `entraInStanza`; bersaglio
  pescato dal DB **nella lingua della sfida** (`parola_casuale(lunghezza, p_lang)`); **chip
  🇮🇹/🇬🇧 nella lobby** (sceglie solo l'host, come stato **locale** che non tocca la lingua
  globale dell'app; il guest eredita); `SchermataGiocoOnline` passa `sfida.lingua` come
  **`linguaForzata`** a `SchermataGioco` → `useGioco`, che valida/pesca con
  `linguaEffettiva = linguaForzata ?? lingua`. La **rivincita mantiene la lingua**. Con
  questo il **multilingua è completo anche nell'online**.
- **Rivincita online:**
  - A fine sfida il pop-up di esito offre **🔁 Rivincita**; l'avversario **✓ Accetta /
    Rifiuta**. Sull'accordo, l'**host** crea un **nuovo match** (parola nuova, stessa
    modalità/lunghezza/lingua, guest già dentro, `status='playing'`) e lo diffonde:
    entrambi ripartono su una partita fresca **sullo stesso canale** (niente nuovo
    handshake). Solo l'host può creare (lo impone la RLS di `matches`), quindi la
    creazione è sempre instradata a lui.
  - **File toccati:** `canaleStanza.ts` (nuovi eventi Realtime `rivincita-richiesta` /
    `rivincita-risposta` / `rivincita-via` + relativi `invia*`), `stanze.ts` (nuova
    `creaRivincita`), `SchermataGiocoOnline.tsx` (orchestrazione del negoziato + reset
    del round con `key` che rimonta `SchermataGioco`; **il canale resta aperto una sola
    volta** grazie a `handlersRef`, così cambiare round non rifà scattare
    presence/handshake), `SchermataGioco.tsx` (bottoni 🔁 Rivincita / ✓ Accetta / Rifiuta
    nel pop-up, via 4 props opzionali `statoRivincita` + `onRichiedi/Accetta/RifiutaRivincita`).
  - Ogni rivincita è un **nuovo `matches`** → le statistiche e le classifiche contano
    tutti i round. Richieste incrociate → accordo automatico; se l'avversario esce
    durante l'attesa, la **Presence** la tratta come rifiuto. **Provato su web.**
- **Sessione precedente — Multilingua (it/en) + rifiniture mobile:**
  - **Parole inglesi nel DB**: importate in `words` (`lang='en'`) 12.041 da 5 lettere e
    21.441 da 6; `is_solution` scelto per **frequenza d'uso** (`wordfreq`, **Zipf ≥ 3.5**
    → 1.769 e 2.039 bersagli). Import via **CSV** senza la colonna `id` (è
    `GENERATED ALWAYS AS IDENTITY`, la genera il DB).
  - **Sistema lingua**: `LinguaContext` (`app/src/lingua/`), montato in `App.tsx`
    accanto a `TemaProvider`; **estendibile con una riga**. Selettore **🌐 Lingua** in
    `SchermataImpostazioni` (accanto al tema).
  - **Dizionario per lingua**: `dizionarioDati.ts` diventato **indice**
    (`SOLUZIONI[lingua][lunghezza]`, `VALIDE[lingua][lunghezza]`, tipo `Lingua`) che
    unisce `dizionarioDati.it.ts` e `dizionarioDati.en.ts`. Le funzioni del core ora
    prendono la lingua: `pescaParolaCasuale(lingua, lunghezza)` e
    `parolaValida(parola, lingua, lunghezza)`; `useGioco` legge `useLingua()` e la passa.
    **Il single player cambia lingua correttamente.**
  - **Bug registrazione risolto**: `AuthContext.registrati` aveva 5 argomenti ma la
    schermata ne passava 3 → `email`/`password` `undefined` → crash su `.trim()`. Firma
    riportata a `registrati(nick, email, password)`.
  - **Rifiniture mobile**: pallini avversario che uscivano a sinistra (ora la griglia
    riserva spazio anche per l'online); menu che tagliava i pulsanti in fondo (ora è una
    `ScrollView`); countdown nel tema Giallo reso leggibile (numero ambra scuro) con
    **allarme rosso pieno + numero bianco negli ultimi 5 secondi**.

## Cosa manca / prossimi passi (in ordine consigliato)

1. **Rifiniture della coda casuale** (seguito naturale di quanto appena fatto):
   **stanze fantasma** — chi resta in attesa e chiude di colpo la scheda lascia una stanza
   pubblica che un altro può agganciare a vuoto (~8s di timeout). Idee: usare la **Presence**
   per accoppiarsi solo con host davvero online, oppure far **riprovare** in automatico il
   guest (crea la sua stanza) invece di fermarsi al messaggio d'errore. Più eventuale
   **scadenza** più aggressiva delle stanze pubbliche mai accoppiate.
2. **Scelta del font** in Impostazioni (accanto a lingua e tema). Richiede: caricare i
   `.ttf` dei font alternativi in `App.tsx` (`useFonts`) + far **sovrascrivere**
   `tema.font` dalla scelta utente (un piccolo override che avvolge il tema). *Serve
   decidere quali font rendere disponibili e da dove prenderli.*
3. **Persistenza di lingua e tema** (AsyncStorage): oggi entrambi ripartono dal default
   a ogni avvio. Stesso meccanismo per i due contesti (`LinguaContext` e `TemaContext`).
4. **Temi — completare**: tematizzare le schermate **online** (Classifiche, Lobby,
   partita online, **coda casuale**) e il componente **Avatar** (oggi ancora a colori
   statici). *Nota: `SchermataCodaCasuale` riusa già gli stili della lobby, quindi si
   tematizza "in automatico" quando si tematizza la lobby.* Quando si toccano
   `SchermataGioco.tsx`/`Griglia.tsx`, usare le versioni **con le props online**
   (`parolaForzata`, `righeAvversario`, pallini), non quelle single-player.
5. **Rifinitura classifiche (opzionale)**: mostrare anche la **bravura** in UI (la vista
   `leaderboard_skill` è già pronta lato DB) — tab Punti/Bravura in `SchermataClassifiche`.

## Punti dove si può migliorare (debito tecnico / idee)

- **Rivincita — limiti/idee**: se la `creaRivincita` (lato host) fallisce per rete,
  l'avversario viene sbloccato (rifiuto automatico) e si può riprovare. Idea futura: un
  piccolo **timeout** sulla richiesta di rivincita (ora resta in attesa finché l'altro
  non risponde o esce).
- **Pulizia debug (piccola, ma da fare)**: in `SchermataGiocoOnline.tsx` (righe ~106-107)
  c'è un `console.log('[DEBUG parola]', …)` che **stampa la parola da indovinare** nel log
  a ogni round. Innocuo in sé, ma in una partita online scrive la **soluzione** nella
  console: togliere prima di considerare l'online davvero rifinito.
- **Affinamento bersagli del dizionario**: l'inglese usa Zipf ≥ 3.5 (regolabile);
  l'italiano fu scelto con una soglia di frequenza più grezza. Si può riallineare
  l'italiano con lo **stesso metodo** (`wordfreq` supporta l'italiano) e ripulire
  nomi propri/forestierismi dai bersagli con un `UPDATE` di `is_solution`.
- **Maiuscolo/minuscolo nel DB**: le parole importate sono in MAIUSCOLO; verificare che
  siano coerenti con le righe già presenti (il gioco normalizza comunque a monte).
- ~~**`parola_casuale(lunghezza)` lato DB** va resa **per lingua**~~ ✅ **fatto**: ora è
  `parola_casuale(lunghezza, p_lang)` (default `'it'`), usata da codice e coda.
- **Online v2 (anti-cheat)**: spostare scelta parola + valutazione in un'**Edge Function**
  (parola solo lato server), rendendo le classifiche pubbliche non falsificabili;
  la scelta parola dovrà essere **per lingua**.
- **Limiti online v1 noti**: chi **crolla** (scheda chiusa) non scrive la riga `lost`; la
  Presence reagisce dopo ~10–20s; nelle gare al millesimo può vincere l'host per il
  ritardo di rete (esito arbitrato dall'host, accettato in v1). **Coda casuale**: stessa
  radice del problema "stanze fantasma" (host in attesa che chiude la scheda) → vedi punto 1
  dei prossimi passi.
- **Barrel del core**: se `@wordilo/core` ha un `index.ts` che ri-esporta, valutare di
  esportare anche `type Lingua` per averlo disponibile lato app (non obbligatorio: l'app
  usa `CodiceLingua` da `LinguaContext`, che è lo stesso `'it' | 'en'`).
- Fuori dall'online (quando vorrò): dev build + test **login Google su telefono**;
  **login Facebook**; verifica **upload avatar da telefono**.

## Stack e convenzioni da rispettare

- **Expo SDK 57 / React Native 0.86**, TypeScript. Monorepo: `/core`, `/app`,
  `/backend` (quest'ultimo solo per la **v2**, non ancora creato). L'app importa il core
  come `@wordilo/core` (alias Metro + `paths` tsconfig).
- **Backend**: Supabase (Auth, Postgres, Realtime, Storage, Edge Functions).
- **Nomi in italiano** nel codice — mantieni lo stile esistente.
- **Il `core` resta puro**: niente effetti/React lì dentro. La **lingua** viaggia come
  **parametro** delle funzioni del core (non come hook), coerente con questa regola.
- **Lingua = contesto gemello del tema** (`LinguaProvider`/`useLingua`), estendibile con
  una riga; il dizionario è **splittato per lingua** e unito da un indice.
- **Online v1 = parola sul client** (classifica "sulla fiducia"); anti-cheat vero = v2.
- **Due accoppiamenti online che convivono**: **codice-stanza** (con un amico) e **coda
  casuale** (🎲, con uno sconosciuto). Le stanze della coda hanno `matches.is_public = true`;
  quelle col codice `false` (default). La coda **riusa** stretta di mano, stili e pulizia
  della lobby: quando tocchi quei pezzi, ricordati che valgono per entrambe.
- **Esito arbitrato dall'host**; **abbandono/disconnessione**: chi lascia perde.
  **Rivincita**: il nuovo match lo crea **sempre l'host** (RLS), sullo stesso canale.
- **Sicurezza**: chiave `anon` nell'app protetta da **RLS**; `service_role` e client
  secret Google **mai** nell'app. Segreti nel `.env`/pannelli, mai in chat né in Git.
- Gotcha: URL Supabase = `https://<progetto>.supabase.co`; il `.env` si legge **solo
  all'avvio**; se **cambi/aggiungi file nel `core`** riavvia con **`npx expo start -c`**
  (solo `app` → non serve `-c`); login Google su telefono NON in Expo Go (serve dev
  build); broadcast Realtime non conserva i messaggi (di qui le "ribattute"); attenzione
  ai copia-incolla di `useState<...>` su più righe.

## Come voglio che lavoriamo (metodo)

1. **Un (sotto-)passo alla volta.** Fai un pezzo, spiegami cosa fa e come provarlo,
   poi **aspetta la mia conferma** prima di andare avanti.
2. **Non hai il codice nel tuo contesto.** Prima di modificare un file, **chiedimi di
   incollartelo**. Consegnami **file completi "drop-in"** oppure modifiche puntuali
   chiarissime.
3. **Verifica a ogni passo**: dimmi cosa devo vedere/controllare (in app e, se serve,
   nel pannello Supabase). Le query di sola lettura prima, le modifiche dopo.
4. **Spiega con parole semplici** le parti backend/SQL: sto imparando.
5. Se qualcosa dà errore, te lo incollo e lo risolviamo prima di proseguire.

## Come iniziare

Per prima cosa: leggi la specifica, poi **riassumimi in poche righe dove siamo** (per
confermare che il contesto è chiaro). L'online ha ora **due modalità** (codice + coda
casuale 🎲) e il **multilingua è completo anche online**. Il prossimo passo naturale sono le
**rifiniture della coda** (stanze fantasma, punto 1 qui sopra); in alternativa **scelta del
font**, **persistenza** di lingua+tema, **completare i temi** sulle schermate online, o la
piccola **pulizia del `console.log`** che stampa la parola. Dimmi tu da dove ripartire, con
lo stesso metodo qui sopra: un sotto-passo alla volta, chiedendomi i file prima di
modificarli.
