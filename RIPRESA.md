# Prompt per riprendere lo sviluppo di SpotLex

> Incolla questo testo come **primo messaggio** in una nuova chat, e **allega il file
> `SPECIFICA.md`**. È scritto per mettere l'assistente nelle stesse condizioni in cui
> eravamo alla fine dell'ultima sessione.

---

Ciao. Sto sviluppando **SpotLex**, un gioco "indovina la parola" (stile Wordle),
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
  e **scritto** in `games`/`matches`, classifiche (punti **e bravura**, due tab), casi limite
  (abbandono/disconnessione = "chi lascia perde"). Dettagli completi in `SPECIFICA.md`.
- **Temi e interfaccia**: sistema di temi (`app/src/temi/`), tema attivo via
  `TemaProvider`/`useTema`, scelto dal menu (**⚙️ → Impostazioni**). Due temi: **Vetro**
  (glass scuro) e **Giallo** (chiaro flat, default del provider). **Tutte le schermate
  sono a tema** (incluse online e `Avatar`). Tema e lingue **persistiti** su `profiles`.
- **Coda casuale (🎲 Gioca online)** + **Sfida amico (⚔️, col codice)**, con retry
  anti-stanze-fantasma (Passo 1), **lingua della sfida** (`matches.lang`), **rivincita**
  (con retry automatico lato host).
- **i18n completo** (`app/src/i18n/`, `useT()`), default pre-login **inglese**.
- **Header di gioco** ridisegnato (pallini tentativi + contatore `X/max`).
- **Sfida online: riga "Tu VS Avversario"** sotto l'header, con i nick dei due giocatori.

### ✅ Fatto nella sessione del 2026-10-02

1. **Login/registrazione scrollabile.** `SchermataAuth` ora mette titolo + card in una
   `ScrollView` (`flexGrow:1` + `justifyContent:'center'` nello stile `scrollInner`,
   `keyboardShouldPersistTaps="handled"`), dentro il `KeyboardAvoidingView`. Prima la
   card di registrazione (nick + 3 selettori) veniva tagliata su schermi bassi.
2. **💰 Economia MONETE (partite da solo) — lato server.**
   - **Regole:** vinta al tentativo 1..6 → principiante **100/70/50/30/0/0**, esperto
     **200/150/100/60/0/0**; persa → **−20** (principiante) / **−40** (esperto).
     *(Valori superati: vedi economia v2 del 2026-10-03.)*
     Nuovo giocatore: **100 monete** *(1000 dal 2026-10-03)*. Le monete **possono andare in negativo**.
   - **Giocare online costa 20 monete** (sia 🎲 Gioca online sia ⚔️ Sfida amico);
     serve saldo **≥ 20**. *(200 dal 2026-10-03.)*
   - **DB** (script `supabase_monete_punti.sql`, **eseguito**): colonna
     `profiles.monete` (default 100) protetta dal trigger `_proteggi_monete` (l'app non
     può modificarla, solo le funzioni); tabella storico **`movimenti_monete`** (RLS:
     ognuno legge i propri); funzioni RPC **`registra_partita_solo(p_modalita,
     p_vinta, p_tentativi)`** (→ `{premio, saldo}`, anti-spam 5s) e
     **`paga_ingresso_online(p_match_id)`** (idempotente: si paga una volta per partita).
   - **App:** nuovo modulo `app/src/economia/economia.ts` (`registraPartitaSolo`,
     `pagaIngressoOnline`, hook `useSaldo()`, costante `COSTO_ONLINE = 20`).
     `SchermataGioco` registra la partita **una sola volta** a fine partita (solo
     single player, guardia `moneteRegistrate` che si azzera con "Nuova partita") e
     mostra nel pop-up **+70 🪙** (verde) / **−20 🪙** (arancione).
     `SpotLex.tsx` scala le 20 monete **all'ingresso in partita** (`entraInPartitaOnline`,
     dopo la stretta di mano); se fallisce torna al menu con un avviso.
     `SchermataMenu` mostra due chip **🪙 monete · ⭐ punti** e **disattiva** i pulsanti
     online (con "🪙 20" sotto) se le monete sono < 20.
3. **Punti ONLINE cambiati:** vinta **+10**, persa **−10**, pareggio **0** (prima
   10/0/5). *(Il 2026-10-03 passati per poche ore a +25/−25/+10 e poi tornati a +10/−10/0.)* Stessa regola per coda casuale e sfida amico. Valori in
   `game_settings.points_win/lose/draw` (aggiornati dallo script). Il sistema punti
   online **esistente** resta quello (righe `games` + `leaderboard_points`).
4. **Tentativi: da 7 a 6** (deciso). Va applicato in `game_settings.max_attempts` e
   nel default del core (vedi "Cosa manca").

### ✅ Fatto nella sessione del 2026-10-03

1. **Nick dei giocatori durante la sfida online** (commit "Sfida online: mostra Tu VS
   Avversario", provato in app). Sotto l'header compare una pillola
   **`mioNick VS nickAvversario`**, sia in ⚔️ Sfida amico sia in 🎲 Gioca online, e resta
   uguale nelle rivincite.
   - `SchermataGiocoOnline.tsx`: il mio nick da `useProfilo()`; quello dell'avversario
     letto da **`profiles.nick`** (lettura pubblica, nessuna modifica al DB). L'id
     dell'avversario è `guestId` se sono host, altrimenti `hostId`.
   - `SchermataGioco.tsx`: nuove props opzionali **`nickMio`**, **`nickAvversario`**;
     la riga si vede solo con `online`. `HEADER_H` passa da 92 a **122** quando online,
     così la griglia non viene schiacciata.
   - `SchermataGioco.stili.ts`: stili `rigaSfida`, `rigaSfidaNick`, `rigaSfidaVs` (a tema).
   - i18n: chiavi **`tuVs`** ("Tu"/"You") e **`avversario`** ("Avversario"/"Opponent"),
     usate come ripiego finché il nick non è caricato. (`tu` esisteva già: è il "(tu)"
     delle classifiche.)

2. **Punteggi ritoccati** (mattina; **superato dal punto 3**):
   - Monete vinta al 5° tentativo: principiante **10**, esperto **20** (prima 0);
     il 6° tentativo resta **0**. Tabella completa: principiante **100/70/50/30/10/0**, esperto
     **200/150/100/60/20/0**; persa invariata (−20/−40).
   - Punti online: vittoria **+25**, sconfitta **−25**, pareggio **+10 a testa**
     (ingresso sempre 20 monete). Fallback nell'app (`PUNTI_FALLBACK` in
     `SchermataGiocoOnline.tsx`) allineato a **25/−25/10**.
   - **Tabella monete/punti nel menu** (`TabellaPunteggi` in `SchermataMenu.tsx`, in
     fondo sotto la legenda, si apre toccando il titolo). Legge le costanti
     `MONETE_VITTORIA`, `MONETE_SCONFITTA`, `PUNTI_ONLINE` di `economia.ts`, che sono
     una **copia** dei valori del server: aggiornate ai nuovi numeri (serve ricompilare).

3. **💰 Economia v2** (sera del 2026-10-03, script **`supabase_economia_v2.sql`**,
   da eseguire nel SQL Editor; sostituisce `supabase_punteggi_2026-10-03.sql`, eliminato):
   - **Da solo:** principiante **2000/700/500/300/100/0**, esperto
     **3000/1500/1000/600/200/0**; persa **−200** / **−400**.
   - **Sfide online:** ingresso **200 monete**; a fine partita **monete +250 / −250 /
     +100** (pareggio, a testa), che si **sommano** all'ingresso (vinci +50 netto, perdi
     −450, pareggio −100); **punti +10 / −10 / 0**.
   - Le monete dell'esito le assegna un **trigger sul DB** (`monete_esito_online` su
     `matches`, funzione `_monete_esito_online`, nuovo tipo `esito_online` in
     `movimenti_monete`): niente da chiamare dall'app; vale anche per abbandono e
     rivincita (la rivincita però non paga l'ingresso). Stanza annullata = 0.
   - `registra_partita_solo` e `paga_ingresso_online` **riscritte da capo** nello
     script (valori segnati con ✏️). Nuovi giocatori: **1000 monete** (saldi esistenti
     invariati: chi ha meno di 200 deve prima vincere da solo).
   - **App:** `economia.ts` (`COSTO_ONLINE = 200`, `MONETE_VITTORIA`,
     `MONETE_SCONFITTA`, nuova `MONETE_SFIDA`, `PUNTI_ONLINE`); tabella in fondo al menu
     con la sezione sfide a due colonne **🪙 / ⭐**; `PUNTI_FALLBACK` di
     `SchermataGiocoOnline` ora è `PUNTI_ONLINE` (una sola fonte).

### Dove si cambiano i valori (promemoria)

- **Monete partita da solo:** funzione SQL `registra_partita_solo` (array `v_base`,
  `v_esperto` — sempre **6 numeri** —; variabili `v_persa_base`, `v_persa_esperto`).
- **Costo d'ingresso online (200):** funzione `paga_ingresso_online` (`v_costo`).
- **Monete a fine sfida (+250/−250/+100):** funzione `_monete_esito_online`
  (`v_vittoria`, `v_sconfitta`, `v_pareggio`).
- **Monete iniziali (1000):** `default` della colonna `profiles.monete` **e** funzione
  `_proteggi_monete`.
- **Punti classifica online (+10/−10/0):** Table Editor → `game_settings`
  (`points_win/lose/draw`).
- Le funzioni si cambiano rieseguendo il loro blocco `create ... function` (o tutto
  `supabase_economia_v2.sql`, che si può rieseguire) nel SQL Editor: effetto immediato,
  senza aggiornare l'app. I valori sono segnati con ✏️ nello script.
- **Tabella del menu e pulsanti:** `COSTO_ONLINE`, `MONETE_VITTORIA`,
  `MONETE_SCONFITTA`, `MONETE_SFIDA`, `PUNTI_ONLINE` in `economia.ts` sono solo una
  **copia per la visualizzazione**: se cambi i valori sul server, aggiornali anche lì
  (e ricompila l'app).
- **Saldo di un giocatore:** Table Editor → `profiles.monete` (correzione manuale
  consentita dalla dashboard, non registrata in `movimenti_monete`).

## Cosa manca / prossimi passi (in ordine consigliato)

1. **Completare il passaggio a 6 tentativi:** `update game_settings set max_attempts = 6;`
   + aggiornare il default in `@SpotLex/core` (`CONFIG_DEFAULT`, usato come fallback
   offline). Serve vedere `hooks/useGioco.ts` / il config del core.
2. **Chiavi i18n nuove** da aggiungere in `it.ts`/`en.ts`: `monete`, `puntiOnline`,
   `moneteInsufficienti` (es. "Servono 200 monete per giocare online" — se esiste già
   con "20", aggiornarla),
   `erroreIngressoOnline`.
3. **Bug in `SchermataLobby.onCrea`:** dopo `creaStanza` fa `setRuolo('guest')`, deve
   essere **`setRuolo('host')`** (copia-incolla da `onEntra`) — altrimenti chi crea la
   stanza non vede il proprio codice. **Da correggere/verificare.**
4. **Eseguire `supabase_economia_v2.sql`** su Supabase e ricompilare l'app.
5. **(Idea) Monete dell'esito nel pop-up della sfida** (+250/−250/+100): oggi il saldo
   si vede aggiornato solo tornando al menu.
6. **Verifica in app** dell'economia: menu (chip saldo, tabella), pop-up premio, blocco sotto 200,
   pagamento all'ingresso (due browser).
7. **Scelta del font** in Impostazioni (accanto a lingua e tema).
8. **Coda casuale — Passo 2 (opzionale):** ridurre la nascita delle stanze fantasma
   (`beforeunload` → `annullaStanza`, timeout coda ~5s).
9. **(Idea) Nick dell'avversario anche nel pop-up di rivincita:** "Marco chiede la
   rivincita" invece di "L'avversario chiede la rivincita" (il nick è già disponibile
   in `SchermataGiocoOnline`). I testi della rivincita sono ancora cablati in italiano
   in `SchermataGioco.tsx`: conviene portarli in i18n nello stesso passo.

## Punti dove si può migliorare (debito tecnico / idee)

- **Anti-cheat monete:** oggi il pagamento d'ingresso è chiamato dal **client**
  (`SpotLex.tsx`); un client modificato potrebbe saltarlo. Più robusto: spostare
  `paga_ingresso_online` **dentro** le RPC/insert di creazione/ingresso stanza.
  Anche l'esito single player è dichiarato dal client (limite intrinseco del single
  player offline-first; mitigato da anti-spam 5s e validazione tentativi 1..6).
- **Pagamento fallito dopo la stretta di mano:** il giocatore torna al menu ma
  l'avversario resta nella partita (raro: il menu blocca già sotto 20). Gestirlo come
  abbandono.
- **Affinamento bersagli del dizionario** (italiano con `wordfreq`).
- **Online v2 (anti-cheat):** scelta parola + valutazione in un'Edge Function.
- **Aggiornamento Expo** disponibile (57.0.23 → 57.0.26): farlo a parte con
  `npx expo install --fix` quando tutto funziona.

## Stack e convenzioni da rispettare

- **Expo SDK 57 / React Native 0.86**, TypeScript. Monorepo: `/core`, `/app`.
- **Backend**: Supabase (Auth, Postgres, Realtime, Storage, Edge Functions).
- **Nomi in italiano** nel codice — mantieni lo stile esistente.
- **Il `core` resta puro**: niente effetti/React. La lingua viaggia come parametro.
- **Due lingue indipendenti:** `LinguaProvider`/`useLingua()` (gioco) e
  `LinguaUIProvider`/`useT()` (interfaccia), salvate su `profiles`; default pre-login `'en'`.
- **Tema** su `profiles.tema` (default `'giallo'`), spinto da `InizialiTema`.
- **`useT()` e qualsiasi hook/chiamata che usa props o stato vanno DENTRO i
  componenti**, mai a livello di modulo (oggi due crash per chiamate messe in cima al
  file: `modalita is not defined`, `sfida is not defined`).
- **File "puri"** (es. `stanze.ts`, `economia.ts`) non traducono: ritornano chiavi/codici.
- **Monete e punti si calcolano sul server** (funzioni SQL `security definer`); l'app
  invia solo l'esito. Le colonne di saldo non sono scrivibili dal client.
- **Online v1 = parola sul client**; anti-cheat vero = v2.
- **Esito arbitrato dall'host**; chi lascia perde; rivincita = nuovo match creato
  sempre dall'host (RLS).
- **Sicurezza**: chiave `anon` protetta da RLS; `service_role` mai nell'app.
- **Nomi reali del DB:** tabella profili = **`profiles`** (non `profili`); partite =
  `matches` (`host_id`, `guest_id`, `room_code`, `winner_id`, `is_draw`).

## Come voglio che lavoriamo (metodo)

1. **Un (sotto-)passo alla volta.** Fai un pezzo, spiegami cosa fa e come provarlo,
   poi **aspetta la mia conferma** prima di andare avanti.
2. **Non hai il codice nel tuo contesto.** Prima di modificare un file, **chiedimi di
   incollartelo**. Consegnami **file completi "drop-in"** oppure modifiche puntuali,
   dicendo **esattamente dove** vanno (dentro quale componente/funzione).
3. **Verifica a ogni passo**: dimmi cosa devo vedere/controllare.
4. **Spiega con parole semplici** le parti backend/SQL. Prima di scrivere SQL,
   **verifica i nomi reali** di tabelle/colonne.
5. Se qualcosa dà errore, te lo incollo e lo risolviamo prima di proseguire.

## Come iniziare

Leggi la specifica, poi **riassumimi in poche righe dove siamo**. Il prossimo punto
naturale è **chiudere il passaggio a 6 tentativi** e le **chiavi i18n** delle monete,
poi correggere il **bug `setRuolo` in `SchermataLobby`** e **verificare l'economia in
app**. Dopo: scelta del font. Un sotto-passo alla volta, chiedendomi i file prima di
modificarli.
