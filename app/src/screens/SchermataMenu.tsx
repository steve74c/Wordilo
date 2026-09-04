import React, { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { Colore, LunghezzaParola, Modalita } from '@wordilo/core';
import { C, coloreDiSfondo, FONT, GRAD, ombra, RAGGIO, bagliore } from '../theme';
import { useStatistiche } from '../stats/statistiche';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { useProfilo } from '../profilo/ProfiloContext';

// -----------------------------------------------------------------------------
// Prima "finestra" (stile vetro): titolo serif con bagliore, card traslucida
// con anteprima tessere + selezione lunghezza/modalità, pulsante Gioca, contatori
// (giocate/vinte/perse) e legenda. Nessuna logica di gioco qui.
//
// NB lunghezze: il core supporta 5 e 6 (type LunghezzaParola = 5 | 6) e il
// dizionario di prova ha parole di 5 e 6 lettere. Per abilitare il "4 lettere"
// del mockup basterà estendere il type e aggiungere parole in paroleDev.
// -----------------------------------------------------------------------------

type Props = {
  onGioca: (modalita: Modalita, lunghezza: LunghezzaParola) => void;
  lunghezzaIniziale?: LunghezzaParola;
  modalitaIniziale?: Modalita;
};

const LUNGHEZZE: LunghezzaParola[] = [5, 6];

const LEGENDA: { colore: Colore; label: string }[] = [
  { colore: 'green', label: 'giusta' },
  { colore: 'orange', label: 'spostata' },
  { colore: 'grey', label: 'assente' },
];

// Pillola selezionabile: attiva = gradiente teal, inerte = superficie vetro.
function Pillola({ label, attivo, onPress }: { label: string; attivo: boolean; onPress: () => void }) {
  if (attivo) {
    return (
      <Pressable onPress={onPress} style={styles.pillolaWrap}>
        <LinearGradient
          colors={GRAD.accento}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.pillola, ombra(0.3, 9, 4, 5)]}
        >
          <Text style={styles.pillolaTestoAttivo}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.pillolaWrap, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View style={[styles.pillola, styles.pillolaInerte]}>
        <Text style={styles.pillolaTesto}>{label}</Text>
      </View>
    </Pressable>
  );
}

// Anteprima decorativa: N tessere teal (N = lunghezza scelta), prima "accesa".
function AnteprimaTessere({ lunghezza }: { lunghezza: LunghezzaParola }) {
  return (
    <View style={styles.tessere}>
      {Array.from({ length: lunghezza }).map((_, i) => (
        <View key={i} style={[styles.tessera, i === 0 && styles.tesseraAccesa]} />
      ))}
    </View>
  );
}

// Contatore singolo in stile "badge" vetro.
function CartaStat({ numero, label, colore }: { numero: number; label: string; colore: string }) {
  return (
    <View style={[styles.stat, ombra(0.35, 14, 7, 6)]}>
      <View style={styles.statTop}>
        <View style={[styles.statPunto, { backgroundColor: colore }]} />
        <Text style={styles.statNum}>{numero}</Text>
      </View>
      <Text style={styles.statLab}>{label}</Text>
    </View>
  );
}

export function SchermataMenu({
  onGioca,
  lunghezzaIniziale = 5,
  modalitaIniziale = 'principiante',
}: Props) {
  const [lunghezza, setLunghezza] = useState<LunghezzaParola>(lunghezzaIniziale);
  const [modalita, setModalita] = useState<Modalita>(modalitaIniziale);
  const { giocate, vinte, perse } = useStatistiche();
  const { sessione, esci } = useAuth();
  const { nick: nickProfilo, avatarUrl, nome, cognome, caricando, cambiaAvatar } = useProfilo();
  // Il nick viene dal profilo (c'è per tutti, anche per gli utenti Google).
  // Finché il profilo si carica usiamo quello dei metadati di Auth come ripiego,
  // e in ultima istanza 'Giocatore'.
  const nickMeta = sessione?.user?.user_metadata?.nick as string | undefined;
  const nick = nickProfilo ?? nickMeta ?? 'Giocatore';

  return (
    <LinearGradient colors={GRAD.sfondo} style={styles.sfondo}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.barraTop}>
          <View style={styles.salutoGruppo}>
            <Pressable
              onPress={cambiaAvatar}
              disabled={caricando}
              hitSlop={6}
              style={styles.avatarWrap}
            >
              <Avatar nick={nick} nome={nome} cognome={cognome} avatarUrl={avatarUrl} dimensione={40} />
              {caricando && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </Pressable>
            <Text style={styles.saluto} numberOfLines={1}>
              Ciao, <Text style={styles.salutoNick}>{nick}</Text>
            </Text>
          </View>
          <Pressable
            onPress={esci}
            hitSlop={8}
            style={({ pressed }) => [styles.esci, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.esciTesto}>Esci</Text>
          </Pressable>
        </View>

        <View style={styles.contenuto}>
          {/* Titolo serif con bagliore */}
          <View style={styles.intestazione}>
            <Text style={styles.logo}>Wordilo</Text>
            <Text style={styles.tagline}>Indovina la parola. Allena la mente.</Text>
            <View style={styles.divisore}>
              <View style={styles.divLinea} />
              <View style={styles.divRombo} />
              <View style={styles.divLinea} />
            </View>
          </View>

          {/* Card vetro */}
          <View style={[styles.card, ombra(0.45, 26, 14, 12)]}>
            <Text style={styles.eyebrow}>IMPOSTA LA PARTITA</Text>
            <AnteprimaTessere lunghezza={lunghezza} />

            <Text style={styles.etichetta}>Lunghezza parola</Text>
            <View style={styles.riga}>
              {LUNGHEZZE.map((n) => (
                <Pillola
                  key={n}
                  label={`${n} lettere`}
                  attivo={lunghezza === n}
                  onPress={() => setLunghezza(n)}
                />
              ))}
            </View>

            <Text style={[styles.etichetta, styles.etichettaSpazio]}>Modalità</Text>
            <View style={styles.riga}>
              <Pillola
                label="Principiante"
                attivo={modalita === 'principiante'}
                onPress={() => setModalita('principiante')}
              />
              <Pillola
                label="Esperto"
                attivo={modalita === 'esperto'}
                onPress={() => setModalita('esperto')}
              />
            </View>

            <Pressable
              onPress={() => onGioca(modalita, lunghezza)}
              style={({ pressed }) => [styles.giocaWrap, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            >
              <LinearGradient
                colors={GRAD.accento}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.gioca, ombra(0.4, 14, 7, 8)]}
              >
                <Text style={styles.giocaTesto}>▶  Gioca</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Contatori */}
          <View style={styles.stats}>
            <CartaStat numero={giocate} label="Giocate" colore={C.accentoSoft} />
            <CartaStat numero={vinte} label="Vinte" colore={C.verde} />
            <CartaStat numero={perse} label="Perse" colore={C.arancione} />
          </View>

          {/* Legenda */}
          <View style={styles.legenda}>
            {LEGENDA.map((v) => (
              <View key={v.colore} style={styles.legendaItem}>
                <View style={[styles.quadratino, { backgroundColor: coloreDiSfondo(v.colore) }]} />
                <Text style={styles.legendaTesto}>{v.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1 },
  safe: { flex: 1 },

  // Barra in alto: avatar + saluto col nick a sinistra, pulsante Esci a destra.
  barraTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingTop: 10,
    gap: 12,
  },
  salutoGruppo: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 1 },
  // Avatar toccabile: contenitore relativo per poterci mettere sopra lo spinner.
  avatarWrap: { position: 'relative' },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(4,9,12,0.55)',
  },
  saluto: { flexShrink: 1, color: C.testo, fontSize: 15, fontFamily: FONT.medium, fontWeight: '600' },
  salutoNick: { color: C.accentoSoft, fontFamily: FONT.bold, fontWeight: '800' },
  esci: {
    backgroundColor: C.superficieAlta,
    borderWidth: 1,
    borderColor: C.hair,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  esciTesto: { color: C.testoTenue, fontSize: 14, fontFamily: FONT.medium, fontWeight: '600' },
  contenuto: {
    flex: 1,
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
    paddingHorizontal: 22,
    justifyContent: 'center',
    gap: 20,
  },

  // Titolo
  intestazione: { alignItems: 'center', gap: 10 },
  logo: {
    color: C.accentoSoft,
    fontSize: 56,
    fontFamily: FONT.serif,
    fontWeight: '600',
    letterSpacing: 0.5,
    ...bagliore(C.glow, 24),
  },
  tagline: { color: C.testo, opacity: 0.82, fontSize: 15, fontFamily: FONT.medium, fontWeight: '500' },
  divisore: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 2 },
  divLinea: { height: 1, width: 48, backgroundColor: C.accentoScuro, opacity: 0.6 },
  divRombo: {
    width: 8,
    height: 8,
    backgroundColor: C.accento,
    transform: [{ rotate: '45deg' }],
    opacity: 0.85,
  },

  // Card vetro
  card: {
    backgroundColor: C.superficieAlta,
    borderColor: C.hair,
    borderWidth: 1,
    borderRadius: 24,
    padding: 22,
  },
  eyebrow: {
    color: C.testoTenue,
    fontSize: 12,
    fontFamily: FONT.bold,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 14,
  },

  // Anteprima tessere
  tessere: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  tessera: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: RAGGIO,
    backgroundColor: 'rgba(79,227,208,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(79,227,208,0.28)',
  },
  tesseraAccesa: {
    backgroundColor: 'rgba(79,227,208,0.16)',
    borderColor: 'rgba(120,236,220,0.55)',
  },

  etichetta: {
    color: C.testoTenue,
    fontSize: 12,
    fontFamily: FONT.medium,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  etichettaSpazio: { marginTop: 18 },
  riga: { flexDirection: 'row', gap: 10 },
  pillolaWrap: { flex: 1 },
  pillola: { borderRadius: RAGGIO, paddingVertical: 15, alignItems: 'center', justifyContent: 'center' },
  pillolaInerte: { backgroundColor: C.superficie, borderWidth: 1, borderColor: C.hair },
  pillolaTesto: { color: C.testo, fontSize: 15, fontFamily: FONT.medium, fontWeight: '600' },
  pillolaTestoAttivo: { color: '#052722', fontSize: 15, fontFamily: FONT.bold, fontWeight: '800' },

  giocaWrap: { marginTop: 22 },
  gioca: { borderRadius: 16, paddingVertical: 17, alignItems: 'center', justifyContent: 'center' },
  giocaTesto: { color: '#052722', fontSize: 18, fontFamily: FONT.bold, fontWeight: '800', letterSpacing: 0.3 },

  // Contatori
  stats: { flexDirection: 'row', gap: 11 },
  stat: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: C.superficie,
    borderWidth: 1,
    borderColor: C.hair,
  },
  statTop: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statPunto: { width: 8, height: 8, borderRadius: 4 },
  statNum: { color: C.testo, fontSize: 20, fontFamily: FONT.black, fontWeight: '800' },
  statLab: { marginTop: 4, color: C.testoTenue, fontSize: 12, fontFamily: FONT.medium, fontWeight: '500' },

  legenda: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  legendaItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  quadratino: { width: 14, height: 14, borderRadius: 4 },
  legendaTesto: { color: C.testoTenue, fontSize: 13, fontFamily: FONT.regular },
});
