// -----------------------------------------------------------------------------
// AIUTI a pagamento nella schermata di gioco.
// Va salvato in:  app/src/components/Aiuti.tsx
//
// - <RigaAiuti>:  una fila di caselle allineate alle colonne della griglia, con
//                 le lettere comprate (verde = posizione giusta, arancione =
//                 lettera presente ma NON in quella colonna).
// - <BarraAiuti>: i pulsanti d'acquisto. Primo tocco = "Conferma?", secondo
//                 tocco (entro 3 s) = acquisto: niente monete spese per sbaglio.
// -----------------------------------------------------------------------------
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import type { AiutoLettera } from '@SpotLex/core';
import { useTema } from '../temi/TemaContext';
import type { Tema } from '../temi/tipi';
import { useT } from '../i18n/LinguaUIContext';
import type { ConfigAiuto, TipoAiuto } from '../economia/aiuti';

export const RIGA_AIUTI_H = 30;
export const BARRA_AIUTI_H = 40;

// ---------------------------------------------------------------------------
export function RigaAiuti({
  lunghezza,
  lato,
  aiuti,
}: {
  lunghezza: number;
  lato: number;
  aiuti: AiutoLettera[];
}) {
  const tema = useTema();
  const s = useMemo(() => creaStili(tema), [tema]);

  return (
    <View style={s.riga}>
      {Array.from({ length: lunghezza }).map((_, i) => {
        // Se due aiuti cadono nella stessa colonna, vince il verde.
        const qui = aiuti.filter((a) => a.posizione === i);
        const a = qui.find((x) => x.tipo === 'lettera_verde') ?? qui[0];
        const verde = a?.tipo === 'lettera_verde';
        return (
          <View
            key={i}
            style={[
              s.cella,
              { width: lato },
              a ? { backgroundColor: verde ? tema.palette.verde : tema.palette.arancione, borderWidth: 0 } : null,
            ]}
          >
            {a && <Text style={s.cellaTesto}>{a.lettera}</Text>}
          </View>
        );
      })}
    </View>
  );
}

// ---------------------------------------------------------------------------
type StatoPulsante = 'pronto' | 'conferma' | 'attesa' | 'usato' | 'off';

export function BarraAiuti({
  aiuti,
  usati,
  saldo,
  disabilitata,
  timerAttivo,
  inAcquisto,
  onCompra,
}: {
  aiuti: ConfigAiuto[];
  usati: Partial<Record<TipoAiuto, number>>;
  saldo: number | null;
  disabilitata: boolean;
  timerAttivo: boolean;
  inAcquisto: TipoAiuto | null;
  onCompra: (tipo: TipoAiuto) => void;
}) {
  const tema = useTema();
  const s = useMemo(() => creaStili(tema), [tema]);
  const t = useT();
  const [armato, setArmato] = useState<TipoAiuto | null>(null);
  const { width } = useWindowDimensions();
  const compatta = aiuti.length >= 3 && width < 480;

  // La conferma scade da sola dopo 3 secondi.
  useEffect(() => {
    if (!armato) return;
    const id = setTimeout(() => setArmato(null), 3000);
    return () => clearTimeout(id);
  }, [armato]);
  useEffect(() => {
    if (disabilitata) setArmato(null);
  }, [disabilitata]);

  const etichetta = (a: ConfigAiuto) =>
    a.tipo === 'tempo' ? t('aiutoTempo', { n: a.valore ?? 0 }) : t('aiutoLettera');

  return (
    <View style={s.barraWrap}>
      <View style={s.barra}>
        {aiuti.map((a) => {
          const nUsati = usati[a.tipo] ?? 0;
          const esaurito = nUsati >= a.maxPerPartita;
          const povero = saldo != null && saldo < a.costo;
          const senzaTimer = a.tipo === 'tempo' && !timerAttivo;
          const stato: StatoPulsante =
            inAcquisto === a.tipo
              ? 'attesa'
              : esaurito
                ? 'usato'
                : disabilitata || povero || senzaTimer || inAcquisto != null
                  ? 'off'
                  : armato === a.tipo
                    ? 'conferma'
                    : 'pronto';

          const pallino =
            a.tipo === 'lettera_verde' ? tema.palette.verde : a.tipo === 'lettera_arancione' ? tema.palette.arancione : null;

          return (
            <Pressable
              key={a.tipo}
              disabled={stato === 'off' || stato === 'usato' || stato === 'attesa'}
              onPress={() => {
                if (stato === 'conferma') {
                  setArmato(null);
                  onCompra(a.tipo);
                } else {
                  setArmato(a.tipo);
                }
              }}
              style={({ pressed }) => [
                s.pulsante,
                stato === 'conferma' && { borderColor: tema.palette.accento, borderWidth: 2 },
                (stato === 'off' || stato === 'usato') && { opacity: 0.45 },
                { transform: [{ scale: pressed ? 0.95 : 1 }] },
              ]}
            >
              {stato === 'attesa' ? (
                <ActivityIndicator size="small" color={tema.palette.testo} />
              ) : stato === 'conferma' ? (
                <Text style={s.pulsanteTesto} numberOfLines={1}>
                  {t('aiutoConferma', { n: a.costo })}
                </Text>
              ) : (
                <>
                  {pallino ? <View style={[s.quadratino, { backgroundColor: pallino }]} /> : <Text style={s.icona}>⏱️</Text>}
                  {/* Con 3 pulsanti su schermi stretti la scritta "Lettera" si toglie:
                      basta il quadratino colorato. */}
                  {(a.tipo === 'tempo' || !compatta) && (
                    <Text style={s.pulsanteTesto} numberOfLines={1}>
                      {etichetta(a)}
                    </Text>
                  )}
                  <Text style={s.costo} numberOfLines={1}>
                    {stato === 'usato' ? '✓' : `🪙 ${a.costo}`}
                  </Text>
                </>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
function creaStili(tema: Tema) {
  return StyleSheet.create({
    riga: { flexDirection: 'row', justifyContent: 'center', gap: 6, height: RIGA_AIUTI_H },
    cella: {
      height: RIGA_AIUTI_H,
      borderRadius: 8,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: tema.palette.hair,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cellaTesto: { color: tema.palette.testoSuColore, fontSize: 16, fontFamily: tema.font.bold, fontWeight: '800' },

    barraWrap: { width: '100%', alignItems: 'center', height: BARRA_AIUTI_H, justifyContent: 'center' },
    barra: { flexDirection: 'row', justifyContent: 'center', gap: 8, width: '100%' },
    pulsante: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      height: 34,
      paddingHorizontal: 10,
      borderRadius: 999,
      flexShrink: 1,
      minWidth: 0,
      backgroundColor: tema.palette.superficieAlta,
      borderWidth: 1,
      borderColor: tema.palette.hair,
    },
    quadratino: { width: 12, height: 12, borderRadius: 3 },
    icona: { fontSize: 13 },
    pulsanteTesto: { color: tema.palette.testo, fontSize: 13, fontFamily: tema.font.bold, fontWeight: '700', flexShrink: 1 },
    costo: { color: tema.palette.testoTenue, fontSize: 12, fontFamily: tema.font.bold, fontWeight: '700' },
  });
}
