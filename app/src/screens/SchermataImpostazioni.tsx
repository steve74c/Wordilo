import React, { useMemo } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTema, useControlliTema } from '../temi/TemaContext';
import { useControlliLingua } from '../lingua/LinguaContext';
import { useControlliLinguaUI, useT } from '../i18n/LinguaUIContext';
import { useProfilo } from '../profilo/ProfiloContext';
import { Linking } from 'react-native';
import Constants from 'expo-constants';
import type { LinguaUI } from '../i18n/LinguaUIContext';
import type { CodiceLingua } from '../lingua/LinguaContext';

export function SchermataImpostazioni({ onIndietro }: { onIndietro?: () => void }) {
  const tema = useTema();
  const { nomeTema, cambiaTema, temiDisponibili } = useControlliTema();
  const { lingua, cambiaLingua, lingueDisponibili } = useControlliLingua();
  const { linguaUI, cambiaLinguaUI, lingueUIDisponibili } = useControlliLinguaUI();
  const t = useT();
  const { aggiornaLingue, aggiornaTema } = useProfilo();
  const versione = Constants.expoConfig?.version ?? '1.0.0';

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
        marginBottom: 20,
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
        backgroundColor: C.accentoSfondo,
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

      // — Info card (rifinita) —
      infoCard: {
        paddingVertical: 28,
        paddingHorizontal: 24,
        borderRadius: 20,
        backgroundColor: C.superficieAlta,
        borderWidth: 1,
        borderColor: C.hair,
        alignItems: 'center',
      },
      infoBadge: {
        width: 76,
        height: 76,
        borderRadius: 20,
        backgroundColor: C.accento,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        shadowColor: C.accento,
        shadowOpacity: 0.35,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 5,
      },
      infoBadgeTesto: {
        color: '#FFFFFF',
        fontSize: 38,
        fontFamily: FONT.bold,
        fontWeight: '800',
      },
      infoAppNome: {
        color: C.accento,
        fontSize: 26,
        fontFamily: FONT.bold,
        fontWeight: '800',
        letterSpacing: 0.3,
      },
      infoDescrizione: {
        color: C.testoTenue,
        fontSize: 14,
        fontFamily: FONT.medium,
        fontWeight: '500',
        textAlign: 'center',
        marginTop: 6,
      },
      infoDivisore: {
        height: 1,
        width: '100%',
        backgroundColor: C.hair,
        marginVertical: 20,
      },
      infoDevRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        alignSelf: 'stretch',
      },
      infoAvatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: C.accentoSfondo,
        borderWidth: 1,
        borderColor: C.accento,
        alignItems: 'center',
        justifyContent: 'center',
      },
      infoAvatarTesto: {
        color: C.accento,
        fontSize: 16,
        fontFamily: FONT.bold,
        fontWeight: '800',
      },
      infoDevTesti: { gap: 2 },
      infoDevLabel: {
        color: C.testoTenue,
        fontSize: 11,
        fontFamily: FONT.medium,
        fontWeight: '600',
        letterSpacing: 1,
      },
      infoDevNome: {
        color: C.testo,
        fontSize: 16,
        fontFamily: FONT.bold,
        fontWeight: '700',
      },
      infoVersionePill: {
        marginTop: 20,
        paddingVertical: 5,
        paddingHorizontal: 14,
        borderRadius: 999,
        backgroundColor: C.accentoSfondo,
      },
      infoVersioneTesto: {
        color: C.accento,
        fontSize: 12,
        fontFamily: FONT.medium,
        fontWeight: '600',
      },
      infoLinkRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 18,
      },
      infoLink: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: C.accentoSfondo,
        borderWidth: 1,
        borderColor: C.accento,
      },
      infoLinkTesto: {
        color: C.accento,
        fontSize: 14,
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

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ gap: 28, paddingBottom: 40 }}
        >
          <View style={stili.infoCard}>
            <View style={stili.infoBadge}>
              <Text style={stili.infoBadgeTesto}>S</Text>
            </View>

            <Text style={stili.infoAppNome}>SpotLex</Text>
            <Text style={stili.infoDescrizione}>
              Allenare la mente in un gioco di parole
            </Text>

            <View style={stili.infoDivisore} />

            <View style={stili.infoDevRow}>
              <View style={stili.infoAvatar}>
                <Text style={stili.infoAvatarTesto}>SC</Text>
              </View>
              <View style={stili.infoDevTesti}>
                <Text style={stili.infoDevLabel}>SVILUPPATO DA</Text>
                <Text style={stili.infoDevNome}>Stefano Calderone</Text>
              </View>
            </View>

            <View style={stili.infoVersionePill}>
              <Text style={stili.infoVersioneTesto}>Versione {versione}</Text>
            </View>

            {/* — Social (da attivare quando pronti) —
            <View style={stili.infoLinkRow}>
              <Pressable
                style={stili.infoLink}
                onPress={() => Linking.openURL('https://linkedin.com/in/...')}
              >
                <Text style={stili.infoLinkTesto}>LinkedIn</Text>
              </Pressable>
              <Pressable
                style={stili.infoLink}
                onPress={() => Linking.openURL('https://github.com/...')}
              >
                <Text style={stili.infoLinkTesto}>GitHub</Text>
              </Pressable>
            </View>
            */}
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

          <View style={stili.sezione}>
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

          <View style={stili.sezione}>
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

        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
