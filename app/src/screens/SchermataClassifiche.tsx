// -----------------------------------------------------------------------------
// Schermata Classifiche (C6) — due tab: A PUNTI e A BRAVURA.
// Va salvato in:  app/src/screens/SchermataClassifiche.tsx
//
// Legge da online/classifiche.ts (viste leaderboard_points / leaderboard_skill).
// Nessuna logica di gioco qui: solo lettura + presentazione. A tema (useTema +
// creaStili). I dati di ogni tab si leggono la PRIMA volta che lo apri e poi
// restano in cache (cambiare tab non rilegge dal DB).
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
import {
  leggiClassificaPunti,
  leggiClassificaBravura,
  type VoceClassificaPunti,
  type VoceClassificaBravura,
} from '../online/classifiche';
import { useT } from '../i18n/LinguaUIContext';

type Props = {
  mioUserId?: string | null; // per evidenziare la propria riga
  onIndietro: () => void;
};

type Tab = 'punti' | 'bravura';
type TFunc = ReturnType<typeof useT>;

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

// Riga della classifica A PUNTI (destra = punti totali).
function RigaPunti({
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
  t: TFunc;
}) {
  return (
    <View style={[styles.riga, ombra(0.3, 12, 6, 5), mia && styles.rigaMia]}>
      <Posizione pos={pos} styles={styles} />
      <Avatar nick={voce.nick} nome={null} cognome={null} avatarUrl={voce.avatarUrl} dimensione={38} />
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

// Riga della classifica A BRAVURA (destra = percentuale di vittorie).
function RigaBravura({
  voce,
  pos,
  mia,
  styles,
  t,
}: {
  voce: VoceClassificaBravura;
  pos: number;
  mia: boolean;
  styles: StiliClassifiche;
  t: TFunc;
}) {
  // win_rate normalizzato: se ≤ 1 è una frazione (0..1) → ×100; altrimenti è già %.
  const pct = voce.winRate <= 1 ? voce.winRate * 100 : voce.winRate;
  const pctTxt = `${Math.round(pct)}%`;
  return (
    <View style={[styles.riga, ombra(0.3, 12, 6, 5), mia && styles.rigaMia]}>
      <Posizione pos={pos} styles={styles} />
      <Avatar nick={voce.nick} nome={null} cognome={null} avatarUrl={voce.avatarUrl} dimensione={38} />
      <View style={styles.rigaCentro}>
        <Text style={[styles.nick, mia && styles.nickMio]} numberOfLines={1}>
          {voce.nick}
          {mia ? ' ' + t('tu') : ''}
        </Text>
        <Text style={styles.sotto} numberOfLines={1}>
          {voce.partiteOnline} {t('partite')} · {voce.vinte}V
        </Text>
      </View>
      <View style={styles.puntiWrap}>
        <Text style={styles.punti}>{pctTxt}</Text>
        <Text style={styles.puntiLab}>{t('percVittorie')}</Text>
      </View>
    </View>
  );
}

export function SchermataClassifiche({ mioUserId, onIndietro }: Props) {
  const tema = useTema();
  const t = useT();
  const styles = useMemo(() => creaStili(tema), [tema]);

  const [tab, setTab] = useState<Tab>('punti');
  const [vociPunti, setVociPunti] = useState<VoceClassificaPunti[] | null>(null);
  const [vociBravura, setVociBravura] = useState<VoceClassificaBravura[] | null>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(true);

  const caricaPunti = useCallback(async () => {
    setCaricando(true);
    setErrore(null);
    const r = await leggiClassificaPunti();
    if (r.ok) setVociPunti(r.voci);
    else setErrore(r.errore);
    setCaricando(false);
  }, []);

  const caricaBravura = useCallback(async () => {
    setCaricando(true);
    setErrore(null);
    const r = await leggiClassificaBravura();
    if (r.ok) setVociBravura(r.voci);
    else setErrore(r.errore);
    setCaricando(false);
  }, []);

  // Al cambio tab: leggo dal DB solo se non ho già i dati (cache); altrimenti
  // mostro subito quelli in memoria (niente spinner, niente errore vecchio).
  useEffect(() => {
    if (tab === 'punti') {
      if (vociPunti == null) caricaPunti();
      else {
        setCaricando(false);
        setErrore(null);
      }
    } else {
      if (vociBravura == null) caricaBravura();
      else {
        setCaricando(false);
        setErrore(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const ricarica = () => (tab === 'punti' ? caricaPunti() : caricaBravura());

  const voci = tab === 'punti' ? vociPunti : vociBravura;

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

          {/* Selettore a due tab */}
          <View style={styles.tabBar}>
            {(['punti', 'bravura'] as Tab[]).map((quale) => {
              const attivo = tab === quale;
              return (
                <Pressable
                  key={quale}
                  onPress={() => setTab(quale)}
                  style={({ pressed }) => [
                    styles.tab,
                    attivo && styles.tabAttivo,
                    { transform: [{ scale: pressed ? 0.98 : 1 }] },
                  ]}
                >
                  <Text style={[styles.tabTesto, attivo && styles.tabTestoAttivo]}>
                    {quale === 'punti' ? t('tabPunti') : t('tabBravura')}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          {caricando && (
            <View style={styles.centro}>
              <ActivityIndicator size="large" color={tema.palette.accento} />
            </View>
          )}

          {!caricando && errore && (
            <View style={styles.centro}>
              <Text style={styles.msg}>{t('classificaErrore')}</Text>
              <Text style={styles.msgTenue}>{errore}</Text>
              <Pressable onPress={ricarica} style={styles.riprovaWrap}>
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

          {!caricando && !errore && tab === 'punti' && vociPunti && vociPunti.length > 0 && (
            <FlatList
              data={vociPunti}
              keyExtractor={(v) => v.userId}
              contentContainerStyle={styles.lista}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <RigaPunti voce={item} pos={index + 1} mia={item.userId === mioUserId} styles={styles} t={t} />
              )}
            />
          )}

          {!caricando && !errore && tab === 'bravura' && vociBravura && vociBravura.length > 0 && (
            <FlatList
              data={vociBravura}
              keyExtractor={(v) => v.userId}
              contentContainerStyle={styles.lista}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <RigaBravura voce={item} pos={index + 1} mia={item.userId === mioUserId} styles={styles} t={t} />
              )}
            />
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
