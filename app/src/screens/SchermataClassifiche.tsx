// -----------------------------------------------------------------------------
// Schermata Classifiche (C6) — per ora solo la classifica A PUNTI.
// Va salvato in:  app/src/screens/SchermataClassifiche.tsx
//
// Legge da online/classifiche.ts (vista leaderboard_points). Nessuna logica di
// gioco qui: solo lettura + presentazione, nello stile del menu (card vetro).
// -----------------------------------------------------------------------------
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { C, FONT, GRAD, ombra, bagliore } from '../theme';
import { Avatar } from '../components/Avatar';
import { leggiClassificaPunti, type VoceClassificaPunti } from '../online/classifiche';

type Props = {
  mioUserId?: string | null; // per evidenziare la propria riga
  onIndietro: () => void;
};

// Medaglia per i primi tre, numero per gli altri.
function Posizione({ pos }: { pos: number }) {
  const medaglia = pos === 1 ? '🥇' : pos === 2 ? '🥈' : pos === 3 ? '🥉' : null;
  if (medaglia) return <Text style={styles.medaglia}>{medaglia}</Text>;
  return (
    <View style={styles.posNumWrap}>
      <Text style={styles.posNum}>{pos}</Text>
    </View>
  );
}

function Riga({ voce, pos, mia }: { voce: VoceClassificaPunti; pos: number; mia: boolean }) {
  return (
    <View style={[styles.riga, ombra(0.3, 12, 6, 5), mia && styles.rigaMia]}>
      <Posizione pos={pos} />
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
          {mia ? '  (tu)' : ''}
        </Text>
        <Text style={styles.sotto} numberOfLines={1}>
          {voce.partiteOnline} partite · {voce.vinte}V {voce.perse}P {voce.pareggiate}X
        </Text>
      </View>
      <View style={styles.puntiWrap}>
        <Text style={styles.punti}>{voce.puntiTotali}</Text>
        <Text style={styles.puntiLab}>punti</Text>
      </View>
    </View>
  );
}

export function SchermataClassifiche({ mioUserId, onIndietro }: Props) {
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
    <LinearGradient colors={GRAD.sfondo} style={styles.sfondo}>
      <SafeAreaView style={styles.safe}>
        {/* Barra: Indietro + titolo */}
        <View style={styles.barraTop}>
          <Pressable
            onPress={onIndietro}
            hitSlop={8}
            style={({ pressed }) => [styles.indietro, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.indietroTesto}>‹ Indietro</Text>
          </Pressable>
          <Text style={styles.titolo}>Classifica</Text>
          <View style={styles.spazioDestra} />
        </View>

        <View style={styles.contenuto}>
          <Text style={styles.sottotitolo}>A punti · online</Text>

          {caricando && (
            <View style={styles.centro}>
              <ActivityIndicator size="large" color={C.accento} />
            </View>
          )}

          {!caricando && errore && (
            <View style={styles.centro}>
              <Text style={styles.msg}>Impossibile caricare la classifica.</Text>
              <Text style={styles.msgTenue}>{errore}</Text>
              <Pressable onPress={carica} style={styles.riprovaWrap}>
                <LinearGradient
                  colors={GRAD.accento}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.riprova, ombra(0.3, 10, 5, 5)]}
                >
                  <Text style={styles.riprovaTesto}>Riprova</Text>
                </LinearGradient>
              </Pressable>
            </View>
          )}

          {!caricando && !errore && voci && voci.length === 0 && (
            <View style={styles.centro}>
              <Text style={styles.msg}>Ancora nessuna partita online.</Text>
              <Text style={styles.msgTenue}>Gioca una sfida per comparire in classifica!</Text>
            </View>
          )}

          {!caricando && !errore && voci && voci.length > 0 && (
            <FlatList
              data={voci}
              keyExtractor={(v) => v.userId}
              contentContainerStyle={styles.lista}
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => (
                <Riga voce={item} pos={index + 1} mia={item.userId === mioUserId} />
              )}
            />
          )}
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1 },
  safe: { flex: 1 },

  barraTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 10,
  },
  indietro: {
    backgroundColor: C.superficieAlta,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  indietroTesto: { color: C.testoTenue, fontSize: 14, fontFamily: FONT.medium, fontWeight: '600' },
  titolo: {
    color: C.accentoSoft,
    fontSize: 22,
    fontFamily: FONT.serif,
    fontWeight: '600',
    ...bagliore(C.glow, 16),
  },
  spazioDestra: { width: 92 }, // bilancia il pulsante Indietro per centrare il titolo

  contenuto: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 14,
  },
  sottotitolo: {
    color: C.testoTenue,
    fontSize: 12,
    fontFamily: FONT.bold,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },

  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingBottom: 60 },
  msg: { color: C.testo, fontSize: 16, fontFamily: FONT.medium, fontWeight: '600', textAlign: 'center' },
  msgTenue: { color: C.testoTenue, fontSize: 13, fontFamily: FONT.regular, textAlign: 'center' },
  riprovaWrap: { marginTop: 12 },
  riprova: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 28 },
  riprovaTesto: { color: '#052722', fontSize: 15, fontFamily: FONT.bold, fontWeight: '800' },

  lista: { gap: 10, paddingBottom: 24 },
  riga: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: C.superficie,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rigaMia: { borderColor: C.accento, backgroundColor: 'rgba(79,227,208,0.08)' },
  medaglia: { fontSize: 22, width: 30, textAlign: 'center' },
  posNumWrap: { width: 30, alignItems: 'center' },
  posNum: { color: C.testoTenue, fontSize: 16, fontFamily: FONT.bold, fontWeight: '800' },
  rigaCentro: { flex: 1, minWidth: 0 },
  nick: { color: C.testo, fontSize: 16, fontFamily: FONT.medium, fontWeight: '700' },
  nickMio: { color: C.accentoSoft },
  sotto: { color: C.testoTenue, fontSize: 12, fontFamily: FONT.regular, marginTop: 2 },
  puntiWrap: { alignItems: 'flex-end' },
  punti: { color: C.accentoSoft, fontSize: 20, fontFamily: FONT.black, fontWeight: '800' },
  puntiLab: { color: C.testoTenue, fontSize: 11, fontFamily: FONT.regular },
});