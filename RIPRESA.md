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
- **NUOVO in quest'ultima sessione — Multilingua (it/en) + rifiniture mobile:**
  - **Parole inglesi nel DB**: importate in `words` (`lang='en'`) 12.041 da 5 lettere e
    21.441 da 6; `is_solution` scelto per **frequenza d'uso** (`wordfreq`, **Zipf ≥ 3.5**
    → 1.769 e 2.039 bersagli). Import via **CSV** senza la colonna `id` (è
    `GENERATED ALWAYS AS IDENTITY`, la genera il DB).
  - **Sistema lingua**: nuovo `LinguaContext` (`app/src/lingua/`), montato in `App.tsx`
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

1. **⚠️ Lingua della sfida ONLINE (importante).** Oggi la partita online valida i
   tentativi sulla lingua **locale** di chi gioca, non su quella della sfida: se i due
   giocatori hanno lingue **diverse**, la sfida si rompe (uno valida sul dizionario
   sbagliato). Da fare: rendere la **lingua una proprietà della sfida** — salvarla in
   `matches`, aggiungerla al tipo `Sfida` (`app/src/online/stanze.ts`), sceglierla alla
   creazione, e passarla fino a `useGioco` come **`linguaForzata`** (gemella di
   `parolaForzata`). *Decisione da prendere*: lingua della sfida **automatica** (= quella
   dell'host al momento della creazione) oppure **esplicita** (piccolo selettore nella
   lobby). *Finché i due tengono la stessa lingua, l'online già funziona.*
2. **Scelta del font** in Impostazioni (accanto a lingua e tema). Richiede: caricare i
   `.ttf` dei font alternativi in `App.tsx` (`useFonts`) + far **sovrascrivere**
   `tema.font` dalla scelta utente (un piccolo override che avvolge il tema). *Serve
   decidere quali font rendere disponibili e da dove prenderli.*
3. **Persistenza di lingua e tema** (AsyncStorage): oggi entrambi ripartono dal default
   a ogni avvio. Stesso meccanismo per i due contesti (`LinguaContext` e `TemaContext`).
4. **Temi — completare**: tematizzare le schermate **online** (Classifiche, Lobby,
   partita online) e il componente **Avatar** (oggi ancora a colori statici). Quando si
   toccano `SchermataGioco.tsx`/`Griglia.tsx`, usare le versioni **con le props online**
   (`parolaForzata`, `righeAvversario`, pallini), non quelle single-player.
5. **Rifinitura classifiche (opzionale)**: mostrare anche la **bravura** in UI (la vista
   `leaderboard_skill` è già pronta lato DB) — tab Punti/Bravura in `SchermataClassifiche`.

## Punti dove si può migliorare (debito tecnico / idee)

- **Affinamento bersagli del dizionario**: l'inglese usa Zipf ≥ 3.5 (regolabile);
  l'italiano fu scelto con una soglia di frequenza più grezza. Si può riallineare
  l'italiano con lo **stesso metodo** (`wordfreq` supporta l'italiano) e ripulire
  nomi propri/forestierismi dai bersagli con un `UPDATE` di `is_solution`.
- **Maiuscolo/minuscolo nel DB**: le parole importate sono in MAIUSCOLO; verificare che
  siano coerenti con le righe già presenti (il gioco normalizza comunque a monte).
- **`parola_casuale(lunghezza)` lato DB** va resa **per lingua** (parametro `lang`) prima
  di usarla per l'online v2.
- **Online v2 (anti-cheat)**: spostare scelta parola + valutazione in un'**Edge Function**
  (parola solo lato server), rendendo le classifiche pubbliche non falsificabili;
  la scelta parola dovrà essere **per lingua**.
- **Limiti online v1 noti**: chi **crolla** (scheda chiusa) non scrive la riga `lost`; la
  Presence reagisce dopo ~10–20s; nelle gare al millesimo può vincere l'host per il
  ritardo di rete (esito arbitrato dall'host, accettato in v1).
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
- **Esito arbitrato dall'host**; **abbandono/disconnessione**: chi lascia perde.
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
confermare che il contesto è chiaro). Il prossimo passo naturale è la **lingua della
sfida online** (punto 1 qui sopra), che chiude il multilingua anche nell'online. In
alternativa possiamo fare la **scelta del font**, la **persistenza** di lingua+tema, o
**completare i temi** sulle schermate online. Dimmi tu da dove ripartire, con lo stesso
metodo qui sopra: un sotto-passo alla volta, chiedendomi i file prima di modificarli.
