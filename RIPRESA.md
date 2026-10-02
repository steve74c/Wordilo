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

### ✅ Fatto nella sessione del 2026-10-02

1. **Login/registrazione scrollabile.** `SchermataAuth` ora mette titolo + card in una
   `ScrollView` (`flexGrow:1` + `justifyContent:'center'` nello stile `scrollInner`,
   `keyboardShouldPersistTaps="handled"`), dentro il `KeyboardAvoidingView`. Prima la
   card di registrazione (nick + 3 selettori) veniva tagliata su schermi bassi.
2. **💰 Economia MONETE (partite da solo) — lato server.**
   - **Regole:** vinta al tentativo 1..6 → principiante **100/70/50/30/0/0**, esperto
     **200/150/100/60/0/0**; persa → **−20** (principiante) / **−40** (esperto).
     Nuovo giocatore: **100 monete**. Le monete **possono andare in negativo**.
   - **Giocare online costa 20 monete** (sia 🎲 Gioca online sia ⚔️ Sfida amico);
     serve saldo **≥ 20**.
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
   10/0/5). Stessa regola per coda casuale e sfida amico. Valori in
   `game_settings.points_win/lose/draw` (aggiornati dallo script). Il sistema punti
   online **esistente** resta quello (righe `games` + `leaderboard_points`).
4. **Tentativi: da 7 a 6** (deciso). Va applicato in `game_settings.max_attempts` e
   nel default del core (vedi "Cosa manca").

### Dove si cambiano i valori (promemoria)

- **Monete per tentativo / sconfitta:** dentro la funzione SQL `registra_partita_solo`
  (array `v_base`, `v_esperto`, variabili `v_persa_base`, `v_persa_esperto`). Si
  modifica rieseguendo **solo** il blocco `create or replace function ...` nel SQL
  Editor (query salvata in Supabase).
- **Costo online (20):** funzione `paga_ingresso_online` **e** `COSTO_ONLINE` in
  `economia.ts` (tenerli uguali).
- **Monete iniziali (100):** `default 100` della colonna **e** funzione `_proteggi_monete`.
- **Punti online:** Table Editor → `game_settings`.
- **Saldo di un giocatore:** Table Editor → `profiles.monete` (dalla dashboard si può;
  la correzione manuale non compare in `movimenti_monete`).

## Cosa manca / prossimi passi (in ordine consigliato)

1. **Completare il passaggio a 6 tentativi:** `update game_settings set max_attempts = 6;`
   + aggiornare il default in `@SpotLex/core` (`CONFIG_DEFAULT`, usato come fallback
   offline). Serve vedere `hooks/useGioco.ts` / il config del core.
2. **Chiavi i18n nuove** da aggiungere in `it.ts`/`en.ts`: `monete`, `puntiOnline`,
   `moneteInsufficienti` (es. "Servono 20 monete per giocare online"),
   `erroreIngressoOnline`.
3. **Bug in `SchermataLobby.onCrea`:** dopo `creaStanza` fa `setRuolo('guest')`, deve
   essere **`setRuolo('host')`** (copia-incolla da `onEntra`) — altrimenti chi crea la
   stanza non vede il proprio codice. **Da correggere/verificare.**
4. **Fallback punti online** in `SchermataGiocoOnline` (C5b): legge `game_settings` con
   fallback **10/0/5** → aggiornarlo a **10/−10/0**.
5. **Verifica in app** dell'economia: menu (chip saldo), pop-up premio, blocco sotto 20,
   pagamento all'ingresso (due browser).
6. **Scelta del font** in Impostazioni (accanto a lingua e tema).
7. **Coda casuale — Passo 2 (opzionale):** ridurre la nascita delle stanze fantasma
   (`beforeunload` → `annullaStanza`, timeout coda ~5s).

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
