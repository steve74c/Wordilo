import React, { useMemo } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTema, useControlliTema } from '../temi/TemaContext';

export function SchermataImpostazioni({ onIndietro }: { onIndietro?: () => void }) {
  const tema = useTema();
  const { nomeTema, cambiaTema, temiDisponibili } = useControlliTema();

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
          <Text style={stili.titolo}>⚙️ Impostazioni</Text>
          {onIndietro && (
            <Pressable onPress={onIndietro}>
              <Text style={stili.indietro}>← Indietro</Text>
            </Pressable>
          )}
        </View>

        <View style={stili.sezione}>
          <Text style={stili.label}>🎨 Tema</Text>
          <View style={stili.temiLista}>
            {temiDisponibili.map((nome) => (
              <Pressable
                key={nome}
                onPress={() => cambiaTema(nome)}
                style={({ pressed }) => [
                  stili.temaItem,
                  nomeTema === nome && stili.temaItemAttivo,
                  { transform: [{ scale: pressed ? 0.97 : 1 }] },
                ]}
              >
                <Text
                  style={[
                    stili.temaNome,
                    nomeTema === nome && stili.temaNomeAttivo,
                  ]}
                >
                  {nome === 'vetro' ? '🪟 Vetro' : '☀️ Giallo'}
                </Text>
                {nomeTema === nome && <Text style={stili.check}>✓</Text>}
              </Pressable>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
