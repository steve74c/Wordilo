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
  e **scritto** in `games`/`matches`, classifiche (punti **e bravura**, due tab), casi limite
  (abbandono/disconnessione = "chi lascia perde"). Dettagli completi in `SPECIFICA.md`.
- **Temi e interfaccia**: sistema di temi (`app/src/temi/`), tema attivo via
  `TemaProvider`/`useTema`, scelto dal menu (**⚙️ → Impostazioni**). Due temi: **Vetro**
  (glass scuro) e **Giallo** (chiaro flat, default del provider). A tema: menu, gioco,
  login, impostazioni, loading, **e ora anche le schermate online** (Lobby, Coda
  casuale, Classifiche; la partita online si tinge per delega a `SchermataGioco`)
  **e il componente `Avatar`**. In pratica **tutte le schermate sono a tema**.
  `Avatar` è stato migrato "leggero": font e bordino dal tema (`tema.font.bold`,
  `tema.palette.hair`), tavolozza colori-persona **fissa** (colore "identità"
  stabile per nick) e iniziali bianche (stanno su una tinta satura, non su una
  superficie del tema). **Persistenza FATTA** (vedi sotto).
- **Coda casuale (🎲 Gioca online):** seconda modalità online che **convive** con quella
  col codice. Pulsanti rinominati: **🎲 Gioca online** (coda casuale) e **⚔️ Sfida amico**
  (col codice). Un giocatore preme 🎲 e l'app lo accoppia automaticamente con un altro in
  attesa che abbia le **stesse impostazioni** (modalità + lunghezza + lingua). **Provato
  in app con due browser.** DB: colonna `is_public` in `matches`; Logica: `stanze.ts`
  con `trovaOCreaStanzaPubblica`; UI: `SchermataCodaCasuale.tsx`.
  **Anti-stanze-fantasma (Passo 1) FATTO:** se entro in una stanza il cui host è
  sparito, allo scadere del timeout la **scarto** (lista locale passata come
  `escludiIds` a `trovaOCreaStanzaPubblica`) e **riprovo** il matchmaking invece di
  finire in errore (cap `MAX_RETRY`). Cura l'esperienza della vittima; la *nascita*
  dei fantasmi non è ancora ridotta (vedi prossimi passi).
- **Lingua della sfida ONLINE (multilingua ONLINE completo):**
  la lingua è una **proprietà della sfida**, uguale per host e guest. Colonna `lang` in
  `matches`; `linguaForzata` propagata fino a `useGioco`; chip 🇮🇹/🇬🇧 nella lobby;
  la **rivincita mantiene la lingua**. **Provato in app.**
- **Rivincita online:** a fine sfida pop-up con **🔁 Rivincita / ✓ Accetta / Rifiuta**.
  Nuovo `matches` per ogni round; canale Realtime aperto una sola volta. **Provato su web.**
  `creaEAvviaRivincita` (lato host) ora **riprova fino a 3 volte** prima di arrendersi
  in caso di errore potenzialmente transitorio (dettagli sotto, sezione debito tecnico).
  Il `console.log('[DEBUG parola]', …)` che stampava la parola in chiaro è stato
  **commentato** in `SchermataGiocoOnline.tsx`.
- **Rinomina pulsanti e nomi interni:**
  - "Gioca veloce" → **"Gioca online"** (`onGiocaOnline`, `codaCasuale`, `SchermataCodaCasuale`)
  - "Sfida online" → **"Sfida amico"** (`onSfidaAmico`)
  - File rinominato: `SchermataCodaVeloce.tsx` → **`SchermataCodaCasuale.tsx`**
- **Header della schermata di gioco ridisegnato** (come da figura di riferimento):
  - Riga singola: indietro ← · **Wordilo** + `● Principiante · 5 lettere · Italiano` · pallini tentativi + contatore `2/7`
  - **Pallini** colorati man mano che si fanno i tentativi (pieni = confermati, anello = corrente, vuoti = rimanenti)
  - La **gomma** (↻ svuota riga) rimossa dall'header
  - La **lingua** mostrata come testo (non emoji-bandiera, che su Windows appare come "it")
  - Nuovo componente `PalliniTentativi` in `SchermataGioco.tsx`; stili in `SchermataGioco.stili.ts`
  - `modalitaLabel` **tradotto**: ora usa `t('labelPrincipiante')`/`t('labelEsperto')`
    invece di derivare la stringa a mano (`charAt(0).toUpperCase()...`), che in
    inglese mostrava ancora "Principiante"/"Esperto". Anche "lettere" nella riga
    sotto il titolo ora passa da `t('nLettere', { n: lunghezza })`.
- **Tessere decorative rimosse dal menu** ("IMPOSTA LA PARTITA" rimane, ora **centrata**;
  componente `AnteprimaTessere` rimosso da `SchermataMenu.tsx`)
- **Preferenze lingua E TEMA sul profilo Supabase (architettura completa):**
  - DB: colonne `lingua_ui`, `lingua_gioco` (default `'it'`) e **`tema`** (default
    `'giallo'`, check `'giallo'|'vetro'`) su `profiles`; trigger `handle_new_user`
    aggiornato per copiarle tutte e tre dai metadati alla registrazione, sia
    nell'`insert` sia nell'`on conflict do update`.
    **SQL:** `migrazione_lingue_profilo.sql` (lingue) + `migrazione_tema_profilo.sql`
    (tema — da eseguire in Supabase SQL Editor).
  - `AuthContext.registrati(nick, email, password, linguaGioco, linguaUI, tema)` — le
    tre preferenze vanno nei metadati di Auth al signup.
  - `ProfiloContext`: legge `lingua_ui`/`lingua_gioco`/`tema` dal profilo, espone
    `aggiornaLingue(linguaUI, linguaGioco)` e **`aggiornaTema(tema)`** per il
    salvataggio dal menu Impostazioni.
  - `App.tsx`: componenti ponte `InizialiLingue` e **`InizialiTema`** che, **solo se
    c'è una sessione attiva** (`sessione &&`, altrimenti sovrascrivevano il default
    pre-login), leggono le preferenze dal profilo e le spingono nei provider
    (`cambiaLingua` + `cambiaLinguaUI` + `cambiaTema`).
  - `SchermataImpostazioni`: al cambio lingua chiama `aggiornaLingue` → salva sul DB;
    al cambio tema chiama **`onCambiaTema`** (wrapper che fa `cambiaTema` + `aggiornaTema`)
    — attenzione, il bug iniziale era che il bottone chiamava ancora `cambiaTema`
    diretto, bypassando il salvataggio: risolto.
  - `SchermataAuth`: **tre** selettori in fase di registrazione (lingua gioco, lingua
    app, tema — quest'ultimo con le stesse etichette di Impostazioni, 🪟 Vetro/☀️ Giallo).
    Bordo colorato aggiunto ai pulsanti attivi (`toggleAttivo` in
    `SchermataAuth.stili.ts`) perché sul tema chiaro erano poco distinguibili da
    testo semplice.
- **Sistema i18n per la lingua dell'interfaccia (`LinguaUIContext`):**
  - Cartella `app/src/i18n/` con tre file: `it.ts` (catalogo italiano completo,
    ~100 chiavi, fonte di verità), `en.ts` (catalogo inglese completo), `LinguaUIContext.tsx`
    (provider con `cambiaLinguaUI`, hook `useT()` per i testi, fallback all'italiano).
  - `LinguaUIProvider` montato in `App.tsx` tra `TemaProvider` e `LinguaProvider`.
  - **Tutte le schermate convertite a `t()`:** `SchermataImpostazioni`, `SchermataMenu`,
    `SchermataGioco`, `SchermataAuth`, `SchermataClassifiche`, `SchermataLobby`,
    `SchermataCodaCasuale`. Nessuna stringa UI cablata residua in quelle schermate —
    inclusi i bottoni "Crea account"/"Entra" in `SchermataAuth` (nuove chiavi
    `creaAccountBtn`/`entraBtn`) e "lettere" nell'header di gioco (`SchermataGioco`
    ora usa `t('nLettere', { n: lunghezza })` invece di concatenare a mano).
  - **`SchermataGiocoOnline.tsx`** non ha testi UI propri (delega a `SchermataGioco`),
    non è stata toccata.
  - **`app/src/online/stanze.ts` ora localizzato**: `RisultatoStanza.errore` /
    `RisultatoCoda.errore` sono **chiavi `ChiaveTesto`**, non testo italiano cablato.
    `stanze.ts` resta un file puro (niente `useT()`, non è un componente React): la
    traduzione avviene nelle schermate chiamanti con `t(risultato.errore)`
    (`SchermataLobby`, `SchermataCodaCasuale`). ~17 nuove chiavi `err*` aggiunte a
    `it.ts`/`en.ts`.
  - **`LEGENDA` in `SchermataMenu.tsx` — bug RISOLTO** (era `t()` fuori da un
    componente; spostata dentro, dopo `const t = useT()`).
  - **Lingua predefinita PRIMA del login: inglese.** `LINGUA_UI_DEFAULT` in
    `LinguaUIContext.tsx` = `'en'`; stesso default in `LinguaContext.tsx` (lingua del
    gioco). Chi apre l'app senza essere loggato vede "Log in / Sign up", "Game
    language", "App language", "🎨 Theme" in inglese. **Perché funziona ora e non
    prima:** `InizialiLingue`/`InizialiTema` in `App.tsx` erano montati sempre (anche
    pre-login) e, leggendo da `ProfiloContext` (che senza utente resta su `'it'`),
    sovrascrivevano subito il default inglese. Fix: aggiunto il controllo `sessione &&`
    in tutti gli `useEffect` dei due ponti, così scattano solo dopo il login — prima
    del login resta il default del provider.

## Cosa manca / prossimi passi (in ordine consigliato)

1. **Scelta del font** in Impostazioni (accanto a lingua e tema).
2. **Coda casuale — ridurre la nascita dei fantasmi (opzionale, Passo 2)**: il retry
   del Passo 1 cura la vittima ma i fantasmi nascono ancora. Idee: chiudere la stanza
   dell'host su chiusura scheda web (`beforeunload` → `annullaStanza`, best-effort)
   e/o accorciare il timeout della **sola** coda (~5s) per rendere il retry più rapido.

> ✅ **Fatto in questa sessione:** *Temi sulle schermate online + `Avatar`.* Alla
> verifica, Lobby/Coda casuale/Classifiche/GiocoOnline erano **già a tema** (la
> specifica era rimasta indietro): restava solo `Avatar`, ora migrato. Con questo
> il sistema temi copre **tutte** le schermate.
>
> ✅ **Fatto in questa sessione (2):** *Coda casuale — retry anti-stanze-fantasma
> (Passo 1).* Se il guest entra in una stanza con host sparito, non va più in errore:
> scarta la stanza e riprova (`escludiIds` + `MAX_RETRY`). File toccati: `stanze.ts`
> (nuovo param `escludiIds`) e `SchermataCodaCasuale.tsx`. Resta opzionale il Passo 2
> (ridurre la nascita dei fantasmi).
>
> ✅ **Fatto in questa sessione (3):** *Classifica bravura in UI.* `SchermataClassifiche`
> ora ha **due tab Punti/Bravura**. Nuova `leggiClassificaBravura` (vista
> `leaderboard_skill`: `win_rate` + soglia minima partite); riga bravura con **% di
> vittorie** (win_rate normalizzato: se ≤1 ×100); cache per tab. File toccati:
> `classifiche.ts`, `SchermataClassifiche.tsx`, `SchermataClassifiche.stili.ts` (+ chiavi
> i18n `tabPunti`/`tabBravura`/`percVittorie` in `it.ts`/`en.ts`).

## Punti dove si può migliorare (debito tecnico / idee)

- **Rivincita — retry automatico FATTO**: `creaEAvviaRivincita` in
  `SchermataGiocoOnline.tsx` ora riprova fino a **3 volte** (pausa crescente
  0,7s/1,4s) prima di arrendersi, ma **solo** per errori potenzialmente transitori
  (rete/parola/insert) — non per `errLoggatoRivincita`/`errSoloHostRivincita`
  (errori di permessi, un retry non li risolverebbe). Solo dopo aver esaurito i
  tentativi scatta il rifiuto automatico verso l'avversario, come prima.
- **Affinamento bersagli del dizionario**: riallineare l'italiano con `wordfreq`
  (stesso metodo usato per l'inglese); ripulire nomi propri/forestierismi. *Non
  ancora affrontato.*
- **Online v2 (anti-cheat)**: spostare scelta parola + valutazione in un'Edge Function.

## Stack e convenzioni da rispettare

- **Expo SDK 57 / React Native 0.86**, TypeScript. Monorepo: `/core`, `/app`.
- **Backend**: Supabase (Auth, Postgres, Realtime, Storage, Edge Functions).
- **Nomi in italiano** nel codice — mantieni lo stile esistente.
- **Il `core` resta puro**: niente effetti/React. La lingua viaggia come parametro.
- **Due lingue indipendenti:**
  - `LinguaProvider` / `useLingua()` → lingua del **gioco** (parole, dizionario)
  - `LinguaUIProvider` / `useT()` → lingua dell'**interfaccia** (testi UI)
  - Entrambe salvate su `profiles` (`lingua_gioco`, `lingua_ui`); lette all'avvio
    da `ProfiloContext` e spinte nei provider da `InizialiLingue` in `App.tsx`
    (solo con sessione attiva). **Default pre-login: `'en'`** per entrambe.
- **Tema** salvato su `profiles.tema` (default `'giallo'`); spinto da `InizialiTema`
  in `App.tsx` (stesso meccanismo delle lingue, gemello di `InizialiLingue`).
- **`useT()` dentro i componenti, mai a livello di modulo** — `t()` è un hook React.
- **File "puri" (non componenti React, es. `stanze.ts`) non traducono da soli**:
  ritornano una **chiave** `ChiaveTesto`; la traduzione avviene nel chiamante con
  `t(chiave)`. Pattern da riusare per eventuali altri file di logica online/dati.
- **Online v1 = parola sul client**; anti-cheat vero = v2.
- **Due accoppiamenti online:** codice-stanza (`onSfidaAmico`) e coda casuale
  (`onGiocaOnline`). Le stanze della coda hanno `matches.is_public = true`.
- **Esito arbitrato dall'host**; chi lascia perde; rivincita = nuovo match creato
  sempre dall'host (RLS).
- **Sicurezza**: chiave `anon` protetta da RLS; `service_role` mai nell'app.

## Come voglio che lavoriamo (metodo)

1. **Un (sotto-)passo alla volta.** Fai un pezzo, spiegami cosa fa e come provarlo,
   poi **aspetta la mia conferma** prima di andare avanti.
2. **Non hai il codice nel tuo contesto.** Prima di modificare un file, **chiedimi di
   incollartelo**. Consegnami **file completi "drop-in"** oppure modifiche puntuali.
3. **Verifica a ogni passo**: dimmi cosa devo vedere/controllare.
4. **Spiega con parole semplici** le parti backend/SQL.
5. Se qualcosa dà errore, te lo incollo e lo risolviamo prima di proseguire.

## Come iniziare

Leggi la specifica, poi **riassumimi in poche righe dove siamo** (per confermare che
il contesto è chiaro). I temi sono ora completi su **tutte** le schermate, quindi il
prossimo punto naturale è la **scelta del font** in Impostazioni (oppure il Passo 2
opzionale sulla coda casuale — ridurre la nascita dei fantasmi). Dimmi tu da dove
ripartire, con lo stesso metodo: un sotto-passo alla volta, chiedendomi i file prima
di modificarli.
