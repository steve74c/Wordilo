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

- **Single player COMPLETO** e collegato a Supabase: core puro con test, app Expo
  (menu 5/6 lettere, principiante ed esperto con timer, griglia/tastiera/animazioni/
  pop-up in stile flat), config dal DB (`game_settings`), **login email/password**,
  **statistiche reali** (`games` + vista `user_stats`), **dizionario italiano reale**
  con validazione **offline-first**, **login Google (web)** + **avatar**.
- **Online — filone C v1: la sfida è COMPLETA e giocabile dall'inizio alla fine**
  (testata su web con due browser, account diversi). In dettaglio:
  - **C1** ✅ tabella `matches` + RLS (vincoli e policy verificati).
  - **C2** ✅ crea/entra stanza col **codice** (`app/src/online/stanze.ts`:
    `creaStanza`/`entraInStanza`; la parola la sceglie il **DB** con `parola_casuale`,
    così è **uguale** per i due).
  - **C3** ✅ **Realtime** broadcast (`app/src/online/canaleStanza.ts`): i riepiloghi
    **verdi/arancioni** viaggiano tra i due (solo conteggi, mai le lettere), più
    l'**avviso ingresso guest** (`guest-entrato`/`host-ok`): quando il guest entra,
    l'host passa a `playing` **da solo**.
  - **D1–D2** ✅ `useGioco` accetta una **parola forzata**; `SchermataGioco` ha props
    **online opzionali** (senza, è il single player di sempre) e a ogni riga chiama
    `onRigaConfermata(riga, verdi, arancioni)` (usa `contaColori`, nel core).
  - **D3–D4** ✅ contenitore `app/src/online/SchermataGiocoOnline.tsx` (apre il canale +
    monta la partita sulla parola condivisa), routing in `app/src/screens/Wordilo.tsx`;
    **pallini dell'avversario** a **sinistra** delle righe nella `Griglia`
    (verde=corrette, arancione=fuori posizione). **Testato.**
  - **C5a** ✅ **esito condiviso** arbitrato dall'**host** ("vince chi indovina **per
    primo**"); i due mostrano lo **stesso** pop-up (Hai vinto / Hai perso / Pareggio).
    **Testato** (vittoria, sconfitta, pareggio, fotofinish).
  - **C5b** ✅ **scrittura dell'esito**: a fine sfida ciascun client scrive la **propria
    riga** in `games` (`result` won/lost/draw, `points` 10/0/5 letti da `game_settings`
    con fallback, `mode='online'`, `match_id`, `word_length`), con **guardia
    anti-doppione**; l'**host** porta `matches` a **`finished`** (`winner_id`/`is_draw`/
    `finished_at`). La **RLS era già sufficiente** (verificata, nessuna modifica).
    **Testato** (due righe in `games` con stesso `match_id`; `matches` a `finished`).
  - **C6** ✅ **classifiche**: vista `user_stats` **estesa** (pareggiate, giocate_online,
    win_rate, punti_totali) senza rompere il menu; create le viste **pubbliche**
    `leaderboard_points` e `leaderboard_skill` (soglia bravura da `app_config`). **UI:**
    modulo `app/src/online/classifiche.ts` + **schermata `SchermataClassifiche`**
    (medaglie/avatar/punti, riga propria evidenziata), aperta dal menu col pulsante 🏆.
    Per ora si mostra **solo la classifica a punti**. **Testato.**
  - **C7** ✅ **casi limite** (abbandono/disconnessione): regola **"chi lascia perde,
    l'altro vince"**. In `canaleStanza.ts` aggiunti messaggio `abbandono` + **Presence**
    (join/leave con **grazia** ~6s per i blip di rete); in `SchermataGiocoOnline`
    l'**uscita esplicita** (Indietro → abbandono + riga `lost`) e la **disconnessione
    vera** confluiscono in "io vinco" e scrivono/chiudono (in abbandono può chiudere
    `matches` anche il guest, la RLS lo consente). **Testato** (uscita e disconnessione).
    *Limiti v1 noti:* chi **crolla** (scheda chiusa) non scrive la riga `lost`; la
    Presence reagisce dopo ~10-20s. L'uscita esplicita è immediata.

**File nuovi in `app/src/online/`**: `stanze.ts`, `canaleStanza.ts`, `classifiche.ts`,
`SchermataGiocoOnline.tsx`, `BancoProvaStanze.tsx` (**temporaneo**). Nuova schermata:
`app/src/screens/SchermataClassifiche.tsx`. Modificati di recente:
`app/src/screens/SchermataMenu.tsx` (pulsante 🏆 Classifica),
`app/src/screens/Wordilo.tsx` (routing classifiche + sfida online). Nel DB: vista
`user_stats` estesa; create `leaderboard_points` e `leaderboard_skill`;
`app_config.skill_min_games` = 10.

Per i dettagli completi vedi la specifica (§3 struttura file, §10 modello dati/viste,
§13 core, §14 decisioni, §15 stato/ordine di sviluppo).

## Come si prova l'online (per ora)

Non c'è ancora la lobby nel menu: si usa il **banco di prova temporaneo**
(`BancoProvaStanze`, riquadro arancione in fondo al menu). Serve **web** con **due
browser** (uno in incognito), ognuno loggato con **un account diverso**. Flusso:
Browser A "Crea stanza" (resta in attesa) → Browser B "Entra" col codice → A passa a
`playing` **da solo** → entrambi "▶ Entra in partita" → si gioca la **stessa parola**;
i **pallini** dell'avversario compaiono a sinistra; a fine partita **entrambi** vedono
lo stesso esito, che viene **scritto** in `games`/`matches`. Le **classifiche** si
aprono dal menu col pulsante 🏆.

## Stack e convenzioni da rispettare

- **Expo SDK 57 / React Native 0.86**, TypeScript. Monorepo: `/core`, `/app`,
  `/backend` (quest'ultimo serve solo alla **v2** anti-cheat, non ancora creato).
  L'app importa il core come `@wordilo/core` (alias Metro + `paths` di tsconfig).
- **Backend**: Supabase (Auth, Postgres, Realtime, Storage, Edge Functions).
- **Nomi in italiano** nel codice — mantieni lo stile esistente.
- **Il `core` resta puro**: niente effetti/React lì dentro (il timer, il canale e
  l'arbitrato dell'esito vivono nei hook/contenitori dell'app).
- **Online v1 = parola sul client** (classifica "sulla fiducia"); l'anti-cheat vero
  (parola solo lato server, Edge Function) è la **v2**, rimandata. Cifrare la parola
  sul client NON protegge (servirebbe anche la chiave nel client).
- **Esito arbitrato dall'host**: i due dispositivi non hanno un orologio comune, quindi
  a decidere è **sempre l'host** e l'altro accetta il verdetto (→ sempre d'accordo).
  Limite noto v1: nelle gare al millesimo può vincere l'host per il ritardo di rete.
- **Abbandono/disconnessione (C7)**: chi lascia perde. Rilevato via broadcast
  `abbandono` (uscita esplicita, immediato) **e** via **Presence** del canale
  (disconnessione vera, con grazia ~6s). Chi resta si auto-dichiara vincitore e in
  quel caso può chiudere `matches` anche il guest.
- **Scritture su DB dell'esito (C5b)**: avvengono nell'imbuto unico `applicaEsito` con
  **guardia sincrona** anti-doppione (l'esito rimbalza per le ribattute). Ogni client
  scrive **solo la propria** riga in `games`; `matches` la chiude l'host (o il guest in
  caso di abbandono).
- **Sicurezza**: la chiave `anon` sta nell'app ed è protetta dalla **RLS**; la chiave
  `service_role` e il **client secret di Google** NON vanno mai nell'app. I segreti
  restano nel `.env` locale/pannelli, mai in chat né in Git.
- Gotcha già incontrati: l'URL Supabase è **solo** `https://<progetto>.supabase.co`;
  il **`.env` si legge solo all'avvio**; quando **cambi/aggiungi file nel `core`**
  riavvia con **`npx expo start -c`** (se tocchi solo l'`app`, NON serve `-c`); il
  **login Google su telefono NON funziona in Expo Go** (serve un dev build);
  **broadcast Realtime non conserva i messaggi** (di qui le "ribattute" di guest ed
  esito); le **viste pubbliche** (`leaderboard_*`) NON usano `security_invoker` (una
  classifica è pubblica), mentre `user_stats` sì; attenzione ai **copia-incolla di
  `useState<...>` su più righe** (un refuso di sintassi ci ha già fatto perdere tempo).

## Come voglio che lavoriamo (metodo)

1. **Un (sotto-)passo alla volta.** Fai un pezzo, spiegami cosa fa e come provarlo,
   poi **aspetta la mia conferma** prima di andare avanti.
2. **Non hai il codice nel tuo contesto.** Prima di modificare un file, **chiedimi di
   incollartelo**. Consegnami **file completi "drop-in"** oppure modifiche puntuali
   chiarissime.
3. **Verifica a ogni passo**: dimmi cosa devo vedere/controllare (in app e, se serve,
   nel pannello Supabase). Le query sul DB **di sola lettura** prima, le modifiche dopo.
4. **Spiega con parole semplici** le parti backend/SQL: sto imparando.
5. Se qualcosa dà errore, te lo incollo e lo risolviamo prima di proseguire.

## Cosa manca (prossimi passi)

Ordine consigliato (da §15 della specifica):

1. **Lobby vera dal menu** (punto di ripartenza): crea/entra stanza + **attesa
   avversario in Realtime** direttamente dal menu, al posto del banco di prova. Poi
   **rimozione del banco** (`BancoProvaStanze` + le righe di innesto in `SchermataMenu`
   e l'import in `Wordilo`). Con questo il **filone C v1 è chiuso**.
2. **Pulizia/robustezza stanze**: ripulire i **residui** `playing`/`waiting` vecchi in
   `matches` (test pre-C7) con una `delete` mirata, e definire lo **scadere** delle
   stanze mai chiuse.
3. Eventuale rifinitura classifiche: mostrare anche la **bravura** in UI (la vista
   `leaderboard_skill` è già pronta lato DB), tab punti/bravura nella schermata.

Fuori dall'online (quando vorrò): **3c** dev build + test **login Google su telefono**;
**login Facebook**; verifica **upload avatar da telefono**. In **futuro**: online v2
anti-cheat (Edge Function, parola solo lato server), affinamento bersagli dizionario,
classifica bravura tipo Elo, pubblicazione sugli store (EAS build, icone/splash).

## Come iniziare

Per prima cosa: leggi la specifica, poi **riassumimi in poche righe dove siamo** (per
confermare che il contesto è chiaro). Poi ripartiamo dalla **Lobby vera dal menu**
(crea/entra + attesa avversario in Realtime, al posto del banco di prova), con lo stesso
metodo qui sopra: un sotto-passo alla volta, chiedendomi i file prima di modificarli.
