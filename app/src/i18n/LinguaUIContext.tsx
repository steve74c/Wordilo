import React, { createContext, useContext, useMemo, useState } from 'react';
import { it } from './it';
import type { ChiaveTesto } from './it';
import { en } from './en';
 
// -----------------------------------------------------------------------------
// Provider della LINGUA DELL'INTERFACCIA — SEPARATA dalla lingua del gioco.
// Va salvato in:  app/src/i18n/LinguaUIContext.tsx
//
// Sta nello stesso stile di TemaContext / LinguaContext: tiene QUALE lingua è
// attiva e offre `t(chiave)` per ottenere il testo giusto. I testi veri vivono
// nei cataloghi it.ts / en.ts (nel codice, uguali per tutti gli utenti): qui c'è
// solo la scelta della lingua + la funzione che pesca la frase.
//
//   • Fallback: se la lingua attiva non ha una chiave, si usa l'italiano.
//   • Interpolazione: t('nLettere', { n: 5 }) sostituisce {n} nel testo.
//   • `iniziale`: la lingua di partenza (in futuro la si passerà leggendo la
//     preferenza salvata dell'utente; per ora, default italiano).
//
// La PREFERENZA (quale lingua vuole l'utente) NON sta qui: è un valore per-utente
// che verrà salvato/riletto altrove (account/profilo). Questo file gestisce solo
// la lingua attiva a runtime.
// -----------------------------------------------------------------------------
 
/** Codici delle lingue d'interfaccia supportate. Estendi quando ne aggiungi una. */
export type LinguaUI = 'it' | 'en';
 
type InfoLinguaUI = { codice: LinguaUI; nome: string; bandiera: string };
 
// Elenco delle lingue d'interfaccia (ordine = ordine nel selettore).
const LINGUE_UI: Record<LinguaUI, InfoLinguaUI> = {
  it: { codice: 'it', nome: 'Italiano', bandiera: '🇮🇹' },
  en: { codice: 'en', nome: 'English', bandiera: '🇬🇧' },
};
 
// I cataloghi per lingua. `it` è completo; gli altri sono parziali (fallback su it).
const CATALOGHI: Record<LinguaUI, Partial<Record<ChiaveTesto, string>>> = { it, en };
 
const LINGUA_UI_DEFAULT: LinguaUI = 'en';
 
type Valori = Record<string, string | number>;
 
// Sostituisce i segnaposto {chiave} col valore passato. Se manca, lascia il segnaposto.
function interpola(testo: string, valori?: Valori): string {
  if (!valori) return testo;
  return testo.replace(/\{(\w+)\}/g, (_, k: string) => (k in valori ? String(valori[k]) : `{${k}}`));
}
 
// Costruisce la funzione `t` per una lingua: pesca dal catalogo, ripiega su it, interpola.
function creaT(lingua: LinguaUI) {
  return (chiave: ChiaveTesto, valori?: Valori): string => {
    const testo = CATALOGHI[lingua]?.[chiave] ?? it[chiave];
    return interpola(testo, valori);
  };
}
 
type ControlliLinguaUI = {
  linguaUI: LinguaUI;                        // codice attivo (es. 'it')
  info: InfoLinguaUI;                        // nome + bandiera della lingua attiva
  lingueUIDisponibili: InfoLinguaUI[];       // per costruire il selettore
  cambiaLinguaUI: (codice: LinguaUI) => void;
  t: (chiave: ChiaveTesto, valori?: Valori) => string;
};
 
const LinguaUIContext = createContext<ControlliLinguaUI>({
  linguaUI: LINGUA_UI_DEFAULT,
  info: LINGUE_UI[LINGUA_UI_DEFAULT],
  lingueUIDisponibili: Object.values(LINGUE_UI),
  cambiaLinguaUI: () => {},
  t: creaT(LINGUA_UI_DEFAULT),
});
 
export function LinguaUIProvider({
  children,
  iniziale = LINGUA_UI_DEFAULT,
}: {
  children: React.ReactNode;
  iniziale?: LinguaUI;
}) {
  const [linguaUI, setLinguaUI] = useState<LinguaUI>(iniziale);
 
  const valore = useMemo<ControlliLinguaUI>(
    () => ({
      linguaUI,
      info: LINGUE_UI[linguaUI] ?? LINGUE_UI[LINGUA_UI_DEFAULT],
      lingueUIDisponibili: Object.values(LINGUE_UI),
      cambiaLinguaUI: (codice: LinguaUI) => {
        if (LINGUE_UI[codice]) setLinguaUI(codice);
      },
      t: creaT(linguaUI),
    }),
    [linguaUI],
  );
 
  return <LinguaUIContext.Provider value={valore}>{children}</LinguaUIContext.Provider>;
}
 
/** Solo la funzione di traduzione:  const t = useT();  <Text>{t('gioca')}</Text> */
export function useT() {
  return useContext(LinguaUIContext).t;
}
 
/** Controlli completi (lingua attiva, elenco, cambio) per il selettore in Impostazioni. */
export function useControlliLinguaUI(): ControlliLinguaUI {
  return useContext(LinguaUIContext);
}
 