import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
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
import { useT } from '../i18n/LinguaUIContext';
 
// -----------------------------------------------------------------------------
// Prima "finestra": titolo serif con bagliore, card con anteprima tessere +
// selezione lunghezza/modalità, pulsante Gioca, contatori (giocate/vinte/perse),
// azioni online (Sfida amico + Classifica) e legenda. Nessuna logica di gioco.
//
// Lotto 2: migrata al sistema temi (useTema + creaStili) e aggiunto il pulsante
// ⚙️ Impostazioni (accanto a Esci) che apre la scelta del tema.
// -----------------------------------------------------------------------------
 
type Props = {
  onGioca: (modalita: Modalita, lunghezza: LunghezzaParola) => void;
  onGiocaOnline?: (modalita: Modalita, lunghezza: LunghezzaParola) => void; // 🎲 coda casuale (trova avversario)
  onSfidaAmico?: (modalita: Modalita, lunghezza: LunghezzaParola) => void; // (1b): apre la lobby (col codice)
  onClassifiche?: () => void;         // (C6): apre la schermata classifiche
  onApriImpostazioni?: () => void;    // NEW (Lotto 2): apre le Impostazioni (tema)
  lunghezzaIniziale?: LunghezzaParola;
  modalitaIniziale?: Modalita;
};
 
const LUNGHEZZE: LunghezzaParola[] = [5, 6];
 

 
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
  onGiocaOnline,
  onSfidaAmico,
  onClassifiche,
  onApriImpostazioni,
  lunghezzaIniziale = 5,
  modalitaIniziale = 'principiante',
}: Props) {
  const tema = useTema();
  const t = useT();
  const LEGENDA: { colore: Colore; label: string }[] = [
  { colore: 'green', label: t('legendaGiusta') },
  { colore: 'orange', label: t('legendaSpostata') },
  { colore: 'grey', label: t('legendaAssente') },
	];
  const stili = useMemo(() => creaStili(tema), [tema]);
 
  const [lunghezza, setLunghezza] = useState<LunghezzaParola>(lunghezzaIniziale);
  const [modalita, setModalita] = useState<Modalita>(modalitaIniziale);
  const { giocate, vinte, perse } = useStatistiche();
  const { sessione, esci } = useAuth();
  const { nick: nickProfilo, avatarUrl, nome, cognome, caricando, cambiaAvatar } = useProfilo();
  // Il nick viene dal profilo (c'è per tutti, anche per gli utenti Google).
  const nickMeta = sessione?.user?.user_metadata?.nick as string | undefined;
  const nick = nickProfilo ?? nickMeta ?? t('giocatore');
 
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
              <Text style={stili.salutoNick}>{nick}</Text>
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
              <Text style={stili.esciTesto}>{t('esci')}</Text>
            </Pressable>
          </View>
        </View>
 
        <ScrollView
          style={stili.contenuto}
          contentContainerStyle={stili.contenutoInner}
          showsVerticalScrollIndicator={false}
        >
          {/* Titolo serif con bagliore */}
          <View style={stili.intestazione}>
            <Text style={stili.logo}>Wordilo</Text>
            <Text style={stili.tagline}>{t('headerMenu')}</Text>
            <View style={stili.divisore}>
              <View style={stili.divLinea} />
              <View style={stili.divRombo} />
              <View style={stili.divLinea} />
            </View>
          </View>
 
          {/* Card */}
          <View style={[stili.card, ombra(0.45, 26, 14, 12)]}>
            <Text style={[stili.eyebrow, { textAlign: 'center' }]}>{t('impostaPartita')}</Text>
 
            <Text style={stili.etichetta}>{t('lunghezzaParola')}</Text>
            <View style={stili.riga}>
              {LUNGHEZZE.map((n) => (
                <Pillola
                  key={n}
                  label={t('nLettere', { n })}
                  attivo={lunghezza === n}
                  onPress={() => setLunghezza(n)}
                  stili={stili}
                  gradiente={tema.gradienti.accento}
                />
              ))}
            </View>
 
            <Text style={[stili.etichetta, stili.etichettaSpazio]}>{t('modalita')}</Text>
            <View style={stili.riga}>
              <Pillola
                label={t('labelPrincipiante')}
                attivo={modalita === 'principiante'}
                onPress={() => setModalita('principiante')}
                stili={stili}
                gradiente={tema.gradienti.accento}
              />
              <Pillola
                label={t('labelEsperto')}
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
                <Text style={stili.giocaTesto}>{t('gioca')}</Text>
              </LinearGradient>
            </Pressable>
          </View>
 
          {/* Contatori */}
          <View style={stili.stats}>
            <CartaStat numero={giocate} label={t('giocate')} colore={tema.palette.accentoSoft} stili={stili} />
            <CartaStat numero={vinte} label={t('vinte')} colore={tema.palette.verde} stili={stili} />
            <CartaStat numero={perse} label={t('perse')} colore={tema.palette.arancione} stili={stili} />
          </View>
 
          {/* Azioni online (🎲 Gioca online = coda casuale · ⚔️ Sfida amico = col
              codice) su una riga; 🏆 Classifica sulla sua. La modalità/lunghezza
              scelte sopra valgono anche per l'online. */}
          {(onGiocaOnline || onSfidaAmico || onClassifiche) && (
            <View style={stili.azioniGruppo}>
              {(onGiocaOnline || onSfidaAmico) && (
                <View style={stili.azioni}>
                  {onGiocaOnline && (
                    <Pressable
                      onPress={() => onGiocaOnline(modalita, lunghezza)}
                      style={({ pressed }) => [stili.azioneBtn, { opacity: pressed ? 0.8 : 1 }]}
                    >
                      <Text style={stili.azioneTesto}>{t('giocaOnline')}</Text>
                    </Pressable>
                  )}
                  {onSfidaAmico && (
                    <Pressable
                      onPress={() => onSfidaAmico(modalita, lunghezza)}
                      style={({ pressed }) => [stili.azioneBtn, { opacity: pressed ? 0.8 : 1 }]}
                    >
                      <Text style={stili.azioneTesto}>{t('sfidaAmico')}</Text>
                    </Pressable>
                  )}
                </View>
              )}
              {onClassifiche && (
                <View style={stili.azioni}>
                  <Pressable
                    onPress={onClassifiche}
                    style={({ pressed }) => [stili.azioneBtn, { opacity: pressed ? 0.8 : 1 }]}
                  >
                    <Text style={stili.azioneTesto}>{t('classifica')}</Text>
                  </Pressable>
                </View>
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
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
 