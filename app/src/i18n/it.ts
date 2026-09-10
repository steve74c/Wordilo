// -----------------------------------------------------------------------------
// Catalogo dei testi in ITALIANO — fonte di verità delle chiavi.
// Va salvato in:  app/src/i18n/it.ts
// -----------------------------------------------------------------------------
export const it = {
  // — Comune —
  wordilo: 'Wordilo',
  indietro: 'Indietro',
  tornaAlMenu: '← Torna al menu',
  parolaIncompleta: 'Parola incompleta',
  parolaNonValida: 'Parola non valida',

  headerMenu: 'Indovina la parola. Allena la mente.',
  esci: 'Esci',
  partite: 'partite',
  codiceEsempio: 'Codice di esempio:',
  // — Menu —
  saluto: 'Ciao, {nick}',
  giocatore: 'Giocatore',
  impostaPartita: 'IMPOSTA LA PARTITA',
  lunghezzaParola: 'Lunghezza parola',
  modalita:'Modalità',
  nLettere: '{n} lettere',
  labelPrincipiante: 'Principiante',
  labelEsperto: 'Esperto',
  gioca: '▶  Gioca',
  giocate: 'Giocate',
  vinte: 'Vinte',
  perse: 'Perse',
  giocaOnline: '🎲  Gioca online',
  sfidaAmico: '⚔️  Sfida amico',
  classifica: '🏆  Classifica',
  legendaGiusta: 'giusta',
  legendaSpostata: 'spostata',
  legendaAssente: 'assente',

  // — Gioco —
  attesaAvversario: "Hai finito · in attesa dell'avversario…",
  esitoHaiVinto: 'Hai vinto!',
  esitoPareggioTitolo: 'Pareggio!',
  esitoHaiPerso: 'Hai perso!',
  esitoIndovinata: 'Indovinata!',
  esitoPeccato: 'Peccato!',
  inNTentativo: 'In {n} tentativo',
  inNTentativi: 'In {n} tentativi',
  laParolaEra: 'La parola era {parola}',
  nessunoIndovinato: 'Nessuno ha indovinato. La parola era {parola}',
  rivincita: '🔁  Rivincita',
  rivincitaAttesa: "In attesa della risposta dell'avversario…",
  rivincitaAvvio: 'Avvio della rivincita…',
  rivincitaRichiesta: "L'avversario chiede la rivincita",
  accetta: '✓  Accetta',
  rifiuta: 'Rifiuta',
  rivincitaRifiutata: 'Rivincita rifiutata.',
  nuovaPartita: '↻  Nuova partita',

  // — Auth —
  accedi: 'Accedi',
  registrati: 'Registrati',
  nickname: 'Nickname',
  emailPlaceholder: 'Email',
  passwordPlaceholder: 'Password',
  errNickCorto: 'Il nickname deve avere almeno 3 caratteri.',
  errEmailPassword: 'Inserisci email e password.',
  errPasswordCorta: 'La password deve avere almeno 6 caratteri.',
  labelLinguaGioco: 'Lingua del gioco',
  labelLinguaApp: "Lingua dell'app",

  // — Classifica —
  classificaTitolo: 'Classifica',
  classificaSotto: 'A punti · online',
  classificaErrore: 'Impossibile caricare la classifica.',
  classificaRiprova: 'Riprova',
  classificaVuota: 'Ancora nessuna partita online.',
  classificaVuotaSub: 'Gioca una sfida per comparire in classifica!',
  punti: 'punti',
  tu: '(tu)',

  // — Lobby (Sfida amico) —
  sfidaOnlineTitolo: 'Sfida amico',
  creaStanza: 'CREA UNA STANZA',
  creaStanzaSpiega: "Apri una stanza e detta il codice al tuo avversario.",
  linguaSfida: 'LINGUA DELLA SFIDA',
  creaStanzaBtn: '+  Crea stanza',
  oppure: 'oppure',
  entraColCodice: 'ENTRA COL CODICE',
  entraStanzaBtn: 'Entra nella stanza',
  ilTuoCodice: 'IL TUO CODICE',
  dettaAlAvversario: "Dettalo all'avversario.",
  inAttesaAvversario: "In attesa dell'avversario…",
  collegandoStanza: 'Mi collego alla stanza…',
  avversarioTrovato: 'Avversario trovato! Avvio…',
  avversarioNonRisponde: "L'avversario non risponde. Torna indietro e riprova.",
  codiceNonValido: 'Inserisci un codice valido.',
  tornaAlMenuBtn: 'Torna al menu',

  // — Coda casuale (Gioca online) —
  giocaOnlineTitolo: 'Gioca online',
  cercandoAvversario: 'Cerco un avversario…',
  inAttesaAvversarioCoda: 'In attesa di un avversario…',

  // — Impostazioni —
  impostazioni: '⚙️ Impostazioni',
  sezioneTema: '🎨 Tema',
  temaVetro: '🪟 Vetro',
  temaGiallo: '☀️ Giallo',
  sezioneLinguaGioco: '🎯 Lingua del gioco',
  sezioneLinguaApp: "🌐 Lingua dell'app",
  
  
  // — Errori stanze online (stanze.ts) —
  errLoggatoCrea: 'Devi essere loggato per creare una stanza.',
  errLoggatoEntra: 'Devi essere loggato per entrare in una stanza.',
  errLoggatoRivincita: 'Devi essere loggato per la rivincita.',
  errLoggatoOnline: 'Devi essere loggato per giocare online.',
  errNessunaParola: 'Nessuna parola disponibile per questa lunghezza.',
  errNessunaParolaRivincita: 'Nessuna parola disponibile per la rivincita.',
  errCreaStanza: 'Non è stato possibile creare la stanza.',
  errCreaRivincita: 'Non è stato possibile creare la rivincita.',
  errTroppiTentativiCodice: 'Troppi tentativi di generare un codice. Riprova.',
  errCodiceStanzaNonValido: 'Codice non valido.',
  errRicercaStanza: 'Errore nella ricerca della stanza.',
  errStanzaInesistente: 'Nessuna stanza in attesa con questo codice.',
  errStanzaPropria: 'Non puoi entrare nella tua stessa stanza.',
  errStanzaOccupata: 'La stanza è già stata occupata da un altro giocatore.',
  errLetturaParola: 'Impossibile leggere la parola della sfida.',
  errSoloHostRivincita: 'Solo l’host può avviare la rivincita.',
  errRicercaAvversario: 'Errore nella ricerca di un avversario.', 

  creaAccountBtn: 'Crea account',
  entraBtn: 'Entra',

  tabPunti: 'Punti',
  tabBravura: 'Bravura',
  percVittorie: 'di vittorie',
  
} as const;

export type ChiaveTesto = keyof typeof it;
