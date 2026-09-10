// -----------------------------------------------------------------------------
// Schermata Classifiche (C6) — per ora solo la classifica A PUNTI.
// Va salvato in:  app/src/screens/SchermataClassifiche.tsx
//
// Legge da online/classifiche.ts (vista leaderboard_points). Nessuna logica di
// gioco qui: solo lettura + presentazione. Migrata al sistema temi (useTema +
// creaStili); la logica di lettura è invariata.
// -----------------------------------------------------------------------------
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ombra } from '../theme';
import { useTema } from '../temi/TemaContext';
import { creaStili } from './SchermataClassifiche.stili';
import type { StiliClassifiche } from './SchermataClassifiche.stili';
import { Avatar } from '../components/Avatar';
import { leggiClassificaPunti, type VoceClassificaPunti } from '../online/classifiche';
import { useT } from '../i18n/LinguaUIContext';

type Props = {
  mioUserId?: string | null; // per evidenziare la propria riga
  onIndietro: () => void;
};

// Medaglia per i primi tre, numero per gli altri.
function Posizione({ pos, styles }: { pos: number; styles: StiliClassifiche }) {
  const medaglia = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null;
  if (medaglia) return <Text style={styles.medaglia}>{medaglia}</Text>;
  return (
    <View style={styles.posNumWrap}>
      <Text style={styles.posNum}>{pos}</Text>
    </View>
  );
}

function Riga({
  voce,
  pos,
  mia,
  styles,
  t,
  }: {
  voce: VoceClassificaPunti;
  pos: number;
  mia: boolean;
  styles: StiliClassifiche;
}) {
  return (
    <View style={[styles.riga, ombra(0.3, 12, 6, 5), mia && styles.rigaMia]}>
      <Posizione pos={pos} styles={styles} />
      <Avatar
        nick={voce.nick}
        nome={null}
        cognome={null}
        avatarUrl={voce.avatarUrl}
        dimensione={38}
      />
      <View style={styles.rigaCentro}>
        <Text style={[styles.nick, mia && styles.nickMio]} numberOfLines={1}>
          {voce.nick}
          {mia ? ' ' + t('tu') : ''}
        </Text>
        <Text style={styles.sotto} numberOfLines={1}>
          {voce.partiteOnline} {t('partite')} · {voce.vinte}V {voce.perse}P {voce.pareggiate}X
        </Text>
      </View>
      <View style={styles.puntiWrap}>
        <Text style={styles.punti}>{voce.puntiTotali}</Text>
        <Text style={styles.puntiLab}>{t('punti')}</Text>
      </View>
    </View>
  );
}

export function SchermataClassifiche({ mioUserId, onIndietro }: Props) {
  const tema = useTema();
  const t = useT();
  const styles = useMemo(() => creaStili(tema), [tema]);

  const [voci, setVoci] = useState<VoceClassificaPunti[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(true);

  const carica = useCallback(async () => {
    setCaricando(true);
    setErrore(null);
    const r = await leggiClassificaPunti();
    if (r.ok) {
      setVoci(r.voci);
    } else {
      setErrore(r.errore);
      setVoci(null);
    }
    setCaricando(false);
  }, []);

  useEffect(() => {
    carica();
  }, [carica]);

  return (
    <LinearGradient colors={tema.gradienti.sfondo} style={styles.sfondo}>
      <SafeAreaView style={styles.safe}>
        {/* Barra: Indietro + titolo */}
        <View style={styles.barraTop}>
          <Pressable
            onPress={onIndietro}
            hitSlop={8}
            style={({ pressed }) => [styles.indietro, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.indietroTesto}>{`‹ ${t('indietro')}`}</Text>
          </Pressable>
          <Text style={styles.titolo}>{t('classificaTitolo')}</Text>
          <View style={styles.spazioDestra} />
        </View>

        <View style={styles.contenuto}>
          <Text style={styles.sottotitolo}>{t('classificaSotto')}</Text>

          {caricando && (
            <View style={styles.centro}>
              <ActivityIndicator size="large" color={tema.palette.accento} />
            </View>
          )}

          {!caricando && errore && (
            <View style={styles.centro}>
              <Text style={styles.msg}>{t('classificaErrore')}</Text>
              <Text style={styles.msgTenue}>{errore}</Text>
              <Pressable onPress={carica} style={styles.riprovaWrap}>
                <LinearGradient
                  colors={tema.gradienti.accento}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.riprova, ombra(0.3, 10, 5, 5)]}
                >
                  <Text style={styles.riprovaTesto}>{t('classificaRiprova')}</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {!caricando && !errore && voci && voci.length === 0 && (
            <View style={styles.centro}>
              <Text style={styles.msg}>{t('classificaVuota')}</Text>
              <Text style={styles.msgTenue}>{t('classificaVuotaSub')}</Text>
            </View>
          )}

          {!caricando && !errore && voci && voci.length > 0 && (
            <FlatList
              data={voci}
              keyExtractor={(v) => v.userId}
              contentContainerStyle={styles.lista}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <Riga voce={item} 
					  pos={index + 1} 
					  mia={item.userId === mioUserId} 
					  styles={styles} 
					  t={t}/>
              )}
            />
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
