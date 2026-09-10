import React, { useMemo } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTema, useControlliTema } from '../temi/TemaContext';
import { useControlliLingua } from '../lingua/LinguaContext';
import { useControlliLinguaUI, useT } from '../i18n/LinguaUIContext';
import { useProfilo } from '../profilo/ProfiloContext';
import type { LinguaUI } from '../i18n/LinguaUIContext';
import type { CodiceLingua } from '../lingua/LinguaContext';

export function SchermataImpostazioni({ onIndietro }: { onIndietro?: () => void }) {
  const tema = useTema();
  const { nomeTema, cambiaTema, temiDisponibili } = useControlliTema();
  const { lingua, cambiaLingua, lingueDisponibili } = useControlliLingua();
  const { linguaUI, cambiaLinguaUI, lingueUIDisponibili } = useControlliLinguaUI();
  const t = useT();
  const { aggiornaLingue, aggiornaTema } = useProfilo();

  // Cambia la lingua del gioco, la aggiorna nel contesto E la salva sul profilo.
  const onCambiaLinguaGioco = (codice: string) => {
    cambiaLingua(codice as CodiceLingua);
    aggiornaLingue(linguaUI, codice);
  };
  
  // Cambia il tema, lo aggiorna nel contesto E lo salva sul profilo.
  const onCambiaTema = (nome: string) => {
    cambiaTema(nome);
    aggiornaTema(nome);
  };  

  // Cambia la lingua dell'app, la aggiorna nel contesto E la salva sul profilo.
  const onCambiaLinguaUI = (codice: string) => {
    cambiaLinguaUI(codice as LinguaUI);
    aggiornaLingue(codice, lingua);
  };

  // Stili dinamici basati sul tema attivo
  const stili = useMemo(() => {
    const { palette: C, font: FONT, gradienti: GRAD } = tema;

    return StyleSheet.create({
      sfondo: { flex: 1 },
      safe: { flex: 1, padding: 20 },
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
      },
      titolo: {
        color: C.testo,
        fontSize: 24,
        fontFamily: FONT.bold,
        fontWeight: '700',
      },
      indietro: {
        color: C.accento,
        fontSize: 16,
        fontFamily: FONT.medium,
        fontWeight: '600',
      },
      sezione: { gap: 12 },
      label: {
        color: C.testo,
        fontSize: 18,
        fontFamily: FONT.bold,
        fontWeight: '700',
      },
      temiLista: { gap: 10 },
      temaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 12,
        backgroundColor: C.superficieAlta,
        borderWidth: 1,
        borderColor: C.hair,
      },
      temaItemAttivo: {
        borderColor: C.accento,
        backgroundColor: C.accentoSfondo, // era 'rgba(251,191,36,0.12)' cablato
      },
      temaNome: {
        color: C.testoTenue,
        fontSize: 16,
        fontFamily: FONT.medium,
        fontWeight: '500',
      },
      temaNomeAttivo: {
        color: C.accento,
        fontFamily: FONT.bold,
        fontWeight: '700',
      },
      check: {
        color: C.accento,
        fontSize: 18,
        fontFamily: FONT.bold,
        fontWeight: '700',
      },
    });
  }, [tema]);

  return (
    <LinearGradient colors={tema.gradienti.sfondo} style={stili.sfondo}>
      <SafeAreaView style={stili.safe}>
        <View style={stili.header}>
          <Text style={stili.titolo}>{t('impostazioni')}</Text>
          {onIndietro && (
            <Pressable onPress={onIndietro}>
              <Text style={stili.indietro}>← {t('indietro')}</Text>
            </Pressable>
          )}
        </View>

        <View style={stili.sezione}>
          <Text style={stili.label}>{t('sezioneTema')}</Text>
          <View style={stili.temiLista}>
            {temiDisponibili.map((nome) => (
              <Pressable
                key={nome}
                onPress={() => onCambiaTema(nome)}
                style={({ pressed }) => [
                  stili.temaItem,
                  nomeTema === nome && stili.temaItemAttivo,
                  { transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
              >
                <Text style={[ stili.temaNome, nomeTema === nome && stili.temaNomeAttivo ]}>
                  {nome === 'vetro' ? t('temaVetro') : t('temaGiallo')}
                </Text>
                {nomeTema === nome && <Text style={stili.check}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[stili.sezione, { marginTop: 28 }]}>
          <Text style={stili.label}>{t('sezioneLinguaGioco')}</Text>
          <View style={stili.temiLista}>
            {lingueDisponibili.map((l) => (
              <Pressable
                key={l.codice}
                onPress={() => onCambiaLinguaGioco(l.codice)}
                style={({ pressed }) => [
                  stili.temaItem,
                  lingua === l.codice && stili.temaItemAttivo,
                  { transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
              >
                <Text style={[ stili.temaNome, lingua === l.codice && stili.temaNomeAttivo ]}>
                  {l.bandiera}  {l.nome}
                </Text>
                {lingua === l.codice && <Text style={stili.check}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[stili.sezione, { marginTop: 28 }]}>
          <Text style={stili.label}>{t('sezioneLinguaApp')}</Text>
          <View style={stili.temiLista}>
            {lingueUIDisponibili.map((l) => (
              <Pressable
                key={l.codice}
                onPress={() => onCambiaLinguaUI(l.codice)}
                style={({ pressed }) => [
                  stili.temaItem,
                  linguaUI === l.codice && stili.temaItemAttivo,
                  { transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
              >
                <Text style={[ stili.temaNome, linguaUI === l.codice && stili.temaNomeAttivo ]}>
                  {l.bandiera}  {l.nome}
                </Text>
                {linguaUI === l.codice && <Text style={stili.check}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
