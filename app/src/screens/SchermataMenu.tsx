import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { Colore, LunghezzaParola, Modalita } from '@wordilo/core';
import { ombra } from '../theme';
import { useTema } from '../temi/TemaContext';
import type { Gradiente } from '../temi/tipi';
import { creaStili } from './SchermataMenu.stili';
import type { StiliMenu } from './SchermataMenu.stili';
import { useStatistiche } from '../stats/statistiche';
import { useAuth } from '../auth/AuthContext';
import { Avatar } from '../components/Avatar';
import { useProfilo } from '../profilo/ProfiloContext';

// -----------------------------------------------------------------------------
// Prima "finestra": titolo serif con bagliore, card con anteprima tessere +
// selezione lunghezza/modalità, pulsante Gioca, contatori (giocate/vinte/perse),
// azioni online (Sfida online + Classifica) e legenda. Nessuna logica di gioco.
//
// Lotto 2: migrata al sistema temi (useTema + creaStili) e aggiunto il pulsante
// ⚙️ Impostazioni (accanto a Esci) che apre la scelta del tema.
// -----------------------------------------------------------------------------

type Props = {
  onGioca: (modalita: Modalita, lunghezza: LunghezzaParola) => void;
  onSfidaOnline?: (modalita: Modalita, lunghezza: LunghezzaParola) => void; // (1b): apre la lobby
  onClassifiche?: () => void;         // (C6): apre la schermata classifiche
  onApriImpostazioni?: () => void;    // NEW (Lotto 2): apre le Impostazioni (tema)
  lunghezzaIniziale?: LunghezzaParola;
  modalitaIniziale?: Modalita;
};

const LUNGHEZZE: LunghezzaParola[] = [5, 6];

const LEGENDA: { colore: Colore; label: string }[] = [
  { colore: 'green', label: 'giusta' },
  { colore: 'orange', label: 'spostata' },
  { colore: 'grey', label: 'assente' },
];

// Pillola selezionabile: attiva = gradiente accento, inerte = superficie.
function Pillola({
  label,
  attivo,
  onPress,
  stili,
  gradiente,
}: {
  label: string;
  attivo: boolean;
  onPress: () => void;
  stili: StiliMenu;
  gradiente: Gradiente;
}) {
  if (attivo) {
    return (
      <Pressable onPress={onPress} style={stili.pillolaWrap}>
        <LinearGradient
          colors={gradiente}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[stili.pillola, ombra(0.3, 9, 4, 5)]}
        >
          <Text style={stili.pillolaTestoAttivo}>{label}</Text>
        </LinearGradient>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [stili.pillolaWrap, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}
    >
      <View style={[stili.pillola, stili.pillolaInerte]}>
        <Text style={stili.pillolaTesto}>{label}</Text>
      </View>
    </Pressable>
  );
}

// Anteprima decorativa: N tessere (N = lunghezza scelta), prima "accesa".
function AnteprimaTessere({ lunghezza, stili }: { lunghezza: LunghezzaParola; stili: StiliMenu }) {
  return (
    <View style={stili.tessere}>
      {Array.from({ length: lunghezza }).map((_, i) => (
        <View key={i} style={[stili.tessera, i === 0 && stili.tesseraAccesa]} />
      ))}
    </View>
  );
}

// Contatore singolo in stile "badge".
function CartaStat({
  numero,
  label,
  colore,
  stili,
}: {
  numero: number;
  label: string;
  colore: string;
  stili: StiliMenu;
}) {
  return (
    <View style={[stili.stat, ombra(0.35, 14, 7, 6)]}>
      <View style={stili.statTop}>
        <View style={[stili.statPunto, { backgroundColor: colore }]} />
        <Text style={stili.statNum}>{numero}</Text>
      </View>
      <Text style={stili.statLab}>{label}</Text>
    </View>
  );
}

export function SchermataMenu({
  onGioca,
  onSfidaOnline,
  onClassifiche,
  onApriImpostazioni,
  lunghezzaIniziale = 5,
  modalitaIniziale = 'principiante',
}: Props) {
  const tema = useTema();
  const stili = useMemo(() => creaStili(tema), [tema]);

  const [lunghezza, setLunghezza] = useState<LunghezzaParola>(lunghezzaIniziale);
  const [modalita, setModalita] = useState<Modalita>(modalitaIniziale);
  const { giocate, vinte, perse } = useStatistiche();
  const { sessione, esci } = useAuth();
  const { nick: nickProfilo, avatarUrl, nome, cognome, caricando, cambiaAvatar } = useProfilo();
  // Il nick viene dal profilo (c'è per tutti, anche per gli utenti Google).
  const nickMeta = sessione?.user?.user_metadata?.nick as string | undefined;
  const nick = nickProfilo ?? nickMeta ?? 'Giocatore';

  // Colore dello stato (legenda/pallini) dal tema attivo, non più statico.
  const coloreStato = (c: Colore): string =>
    c === 'green' ? tema.palette.verde : c === 'orange' ? tema.palette.arancione : tema.palette.grigio;

  return (
    <LinearGradient colors={tema.gradienti.sfondo} style={stili.sfondo}>
      <SafeAreaView style={stili.safe}>
        <View style={stili.barraTop}>
          <View style={stili.salutoGruppo}>
            <Pressable onPress={cambiaAvatar} disabled={caricando} hitSlop={6} style={stili.avatarWrap}>
              <Avatar nick={nick} nome={nome} cognome={cognome} avatarUrl={avatarUrl} dimensione={40} />
              {caricando && (
                <View style={stili.avatarOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
            </Pressable>
            <Text style={stili.saluto} numberOfLines={1}>
              Ciao, <Text style={stili.salutoNick}>{nick}</Text>
            </Text>
          </View>

          <View style={stili.destra}>
            {onApriImpostazioni && (
              <Pressable
                onPress={onApriImpostazioni}
                hitSlop={8}
                style={({ pressed }) => [stili.impostazioni, { opacity: pressed ? 0.7 : 1 }]}
              >
                <Text style={stili.impostazioniTesto}>⚙️</Text>
              </Pressable>
            )}
            <Pressable
              onPress={esci}
              hitSlop={8}
              style={({ pressed }) => [stili.esci, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={stili.esciTesto}>Esci</Text>
            </Pressable>
          </View>
        </View>

        <View style={stili.contenuto}>
          {/* Titolo serif con bagliore */}
          <View style={stili.intestazione}>
            <Text style={stili.logo}>Wordilo</Text>
            <Text style={stili.tagline}>Indovina la parola. Allena la mente.</Text>
            <View style={stili.divisore}>
              <View style={stili.divLinea} />
              <View style={stili.divRombo} />
              <View style={stili.divLinea} />
            </View>
          </View>

          {/* Card */}
          <View style={[stili.card, ombra(0.45, 26, 14, 12)]}>
            <Text style={stili.eyebrow}>IMPOSTA LA PARTITA</Text>
            <AnteprimaTessere lunghezza={lunghezza} stili={stili} />

            <Text style={stili.etichetta}>Lunghezza parola</Text>
            <View style={stili.riga}>
              {LUNGHEZZE.map((n) => (
                <Pillola
                  key={n}
                  label={`${n} lettere`}
                  attivo={lunghezza === n}
                  onPress={() => setLunghezza(n)}
                  stili={stili}
                  gradiente={tema.gradienti.accento}
                />
              ))}
            </View>

            <Text style={[stili.etichetta, stili.etichettaSpazio]}>Modalità</Text>
            <View style={stili.riga}>
              <Pillola
                label="Principiante"
                attivo={modalita === 'principiante'}
                onPress={() => setModalita('principiante')}
                stili={stili}
                gradiente={tema.gradienti.accento}
              />
              <Pillola
                label="Esperto"
                attivo={modalita === 'esperto'}
                onPress={() => setModalita('esperto')}
                stili={stili}
                gradiente={tema.gradienti.accento}
              />
            </View>

            <Pressable
              onPress={() => onGioca(modalita, lunghezza)}
              style={({ pressed }) => [stili.giocaWrap, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            >
              <LinearGradient
                colors={tema.gradienti.accento}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[stili.gioca, ombra(0.4, 14, 7, 8)]}
              >
                <Text style={stili.giocaTesto}>▶  Gioca</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Contatori */}
          <View style={stili.stats}>
            <CartaStat numero={giocate} label="Giocate" colore={tema.palette.accentoSoft} stili={stili} />
            <CartaStat numero={vinte} label="Vinte" colore={tema.palette.verde} stili={stili} />
            <CartaStat numero={perse} label="Perse" colore={tema.palette.arancione} stili={stili} />
          </View>

          {/* Azioni: Sfida online + Classifica (C6 + 1b) */}
          {(onSfidaOnline || onClassifiche) && (
            <View style={stili.azioni}>
              {onSfidaOnline && (
                <Pressable
                  onPress={() => onSfidaOnline(modalita, lunghezza)}
                  style={({ pressed }) => [stili.azioneBtn, { opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text style={stili.azioneTesto}>⚔️  Sfida online</Text>
                </Pressable>
              )}
              {onClassifiche && (
                <Pressable
                  onPress={onClassifiche}
                  style={({ pressed }) => [stili.azioneBtn, { opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text style={stili.azioneTesto}>🏆  Classifica</Text>
                </Pressable>
              )}
            </View>
          )}

          {/* Legenda */}
          <View style={stili.legenda}>
            {LEGENDA.map((v) => (
              <View key={v.colore} style={stili.legendaItem}>
                <View style={[stili.quadratino, { backgroundColor: coloreStato(v.colore) }]} />
                <Text style={stili.legendaTesto}>{v.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}
