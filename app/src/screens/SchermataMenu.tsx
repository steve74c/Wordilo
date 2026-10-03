import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import type { Colore, LunghezzaParola, Modalita } from '@SpotLex/core';
import type { FormatoSfida } from '../online/stanze';
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
import {
  COSTO_ONLINE,
  MONETE_SCONFITTA,
  MONETE_SFIDA,
  MONETE_VITTORIA,
  PUNTI_ONLINE,
  useSaldo,
} from '../economia/economia';

// -----------------------------------------------------------------------------
// Prima "finestra": titolo serif con bagliore, saldo (🪙 monete · ⭐ punti), card
// con selezione lunghezza/modalità, pulsante Gioca, contatori, azioni online
// (bloccate se monete < COSTO_ONLINE), legenda e tabella monete/punti (apribile).
// Nessuna logica di gioco.
// -----------------------------------------------------------------------------

type Props = {
  onGioca: (modalita: Modalita, lunghezza: LunghezzaParola) => void;
  onGiocaOnline?: (modalita: Modalita, lunghezza: LunghezzaParola, formato: FormatoSfida) => void; // 🎲 coda casuale
  onSfidaAmico?: (modalita: Modalita, lunghezza: LunghezzaParola, formato: FormatoSfida) => void; // (1b): lobby col codice
  onClassifiche?: () => void;         // (C6): apre la schermata classifiche
  onApriImpostazioni?: () => void;    // (Lotto 2): apre le Impostazioni (tema)
  avviso?: string | null;             // es. "Monete insufficienti"
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

// Formatta un premio col segno: +70, −20, 0 (meno tipografico, come nei pop-up).
function conSegno(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return '0';
}

// Tabella "quanto si guadagna": monete da solo (per tentativo e modalità) e, per
// le sfide online, monete (🪙) e punti classifica (⭐) per ogni esito.
// Solo visualizzazione: i valori arrivano da economia.ts (copia del server).
// Nella parte "da solo" la colonna della modalità scelta nel menu è evidenziata.
function TabellaPunteggi({ modalita, stili }: { modalita: Modalita; stili: StiliMenu }) {
  const tema = useTema();
  const t = useT();
  const colore = (n: number) =>
    n > 0 ? tema.palette.verde : n < 0 ? tema.palette.arancione : tema.palette.testoTenue;

  // Cella vuota (es. l'ingresso non dà punti): solo un trattino tenue.
  const vuota = () => (
    <Text style={[stili.tabCella, stili.tabNumero, { color: tema.palette.testoTenue }]}>—</Text>
  );

  const cella = (n: number, attiva: boolean, suffisso = '') => (
    <Text
      style={[
        stili.tabCella,
        stili.tabNumero,
        attiva && stili.tabCellaAttiva,
        { color: colore(n) },
      ]}
    >
      {conSegno(n)}
      {suffisso}
    </Text>
  );

  const princ = modalita === 'principiante';
  const esp = modalita === 'esperto';

  return (
    <View style={stili.tabCorpo}>
      {/* — Da solo: monete — */}
      <Text style={stili.tabSezione}>{t('tabSezioneSolo')}</Text>
      <View style={[stili.tabRiga, stili.tabRigaTitoli]}>
        <Text style={[stili.tabCella, stili.tabPrima, stili.tabTitolo]}>{t('tabTentativo')}</Text>
        <Text style={[stili.tabCella, stili.tabTitolo, princ && stili.tabTitoloAttivo]}>
          {t('labelPrincipiante')}
        </Text>
        <Text style={[stili.tabCella, stili.tabTitolo, esp && stili.tabTitoloAttivo]}>
          {t('labelEsperto')}
        </Text>
      </View>
      {MONETE_VITTORIA.principiante.map((_, i) => (
        <View key={i} style={stili.tabRiga}>
          <Text style={[stili.tabCella, stili.tabPrima]}>{i + 1}</Text>
          {cella(MONETE_VITTORIA.principiante[i], princ, ' 🪙')}
          {cella(MONETE_VITTORIA.esperto[i], esp, ' 🪙')}
        </View>
      ))}
      <View style={[stili.tabRiga, stili.tabRigaUltima]}>
        <Text style={[stili.tabCella, stili.tabPrima]}>{t('tabNonIndovinata')}</Text>
        {cella(MONETE_SCONFITTA.principiante, princ, ' 🪙')}
        {cella(MONETE_SCONFITTA.esperto, esp, ' 🪙')}
      </View>

      {/* — Online: monete e punti (uguali per tutte le modalità) — */}
      <Text style={[stili.tabSezione, stili.tabSezioneSpazio]}>{t('tabSezioneOnline')}</Text>
      <View style={[stili.tabRiga, stili.tabRigaTitoli]}>
        <Text style={[stili.tabCella, stili.tabPrima, stili.tabTitolo]} />
        <Text style={[stili.tabCella, stili.tabTitolo]}>🪙</Text>
        <Text style={[stili.tabCella, stili.tabTitolo]}>⭐</Text>
      </View>
      <View style={stili.tabRiga}>
        <Text style={[stili.tabCella, stili.tabPrima]}>{t('tabIngresso')}</Text>
        {cella(-COSTO_ONLINE, false)}
        {vuota()}
      </View>
      <View style={stili.tabRiga}>
        <Text style={[stili.tabCella, stili.tabPrima]}>{t('tabVittoria')}</Text>
        {cella(MONETE_SFIDA.vinta, false)}
        {cella(PUNTI_ONLINE.vinta, false)}
      </View>
      <View style={stili.tabRiga}>
        <Text style={[stili.tabCella, stili.tabPrima]}>{t('tabPareggio')}</Text>
        {cella(MONETE_SFIDA.pareggio, false)}
        {cella(PUNTI_ONLINE.pareggio, false)}
      </View>
      <View style={[stili.tabRiga, stili.tabRigaUltima]}>
        <Text style={[stili.tabCella, stili.tabPrima]}>{t('tabSconfitta')}</Text>
        {cella(MONETE_SFIDA.persa, false)}
        {cella(PUNTI_ONLINE.persa, false)}
      </View>
      <Text style={[stili.legendaTesto, { textAlign: 'center', marginTop: 8 }]}>
        {t('tabNotaSerie')}
      </Text>
    </View>
  );
}

export function SchermataMenu({
  onGioca,
  onGiocaOnline,
  onSfidaAmico,
  onClassifiche,
  onApriImpostazioni,
  avviso,
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
  const [formato, setFormato] = useState<FormatoSfida>(1); // sfide: singola o meglio di 3
  const { giocate, vinte, perse } = useStatistiche();
  const [tabellaAperta, setTabellaAperta] = useState(false); // tabella monete/punti
  const { sessione, esci } = useAuth();
  const { nick: nickProfilo, avatarUrl, nome, cognome, caricando, cambiaAvatar } = useProfilo();
  const nickMeta = sessione?.user?.user_metadata?.nick as string | undefined;
  const nick = nickProfilo ?? nickMeta ?? t('giocatore');

  // Saldo: il menu si rimonta a ogni ritorno, quindi si aggiorna da solo.
  const { monete, punti } = useSaldo();
  // Finché il saldo non è caricato non blocchiamo (il server controlla comunque).
  const moneteScarse = monete !== null && monete < COSTO_ONLINE;

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
            <Text style={stili.logo}>SpotLex</Text>
            <Text style={stili.tagline}>{t('headerMenu')}</Text>
            <View style={stili.divisore}>
              <View style={stili.divLinea} />
              <View style={stili.divRombo} />
              <View style={stili.divLinea} />
            </View>
          </View>

          {/* Saldo: 🪙 monete (da solo) · ⭐ punti (online) */}
          <View style={stili.saldoRiga}>
            <View style={stili.saldoChip}>
              <Text style={[stili.saldoTesto, monete !== null && monete < 0 && stili.saldoNegativo]}>
                🪙 {monete ?? '…'}
              </Text>
              <Text style={stili.saldoLabel}>{t('monete')}</Text>
            </View>
            <View style={stili.saldoChip}>
              <Text style={[stili.saldoTesto, punti !== null && punti < 0 && stili.saldoNegativo]}>
                ⭐ {punti ?? '…'}
              </Text>
              <Text style={stili.saldoLabel}>{t('puntiOnline')}</Text>
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

          {/* Avviso (es. monete insufficienti o errore d'ingresso online) */}
          {(avviso || moneteScarse) && (
            <Text style={stili.avviso}>{avviso ?? t('moneteInsufficienti')}</Text>
          )}

          {/* Azioni online: costano COSTO_ONLINE monete, bloccate se non bastano. */}
          {(onGiocaOnline || onSfidaAmico || onClassifiche) && (
            <View style={stili.azioniGruppo}>
              {/* Formato delle sfide online: singola o al meglio di 3 */}
              {(onGiocaOnline || onSfidaAmico) && (
                <>
                  <Text style={stili.etichetta}>{t('formatoSfida')}</Text>
                  <View style={stili.riga}>
                    <Pillola
                      label={t('formatoSingola')}
                      attivo={formato === 1}
                      onPress={() => setFormato(1)}
                      stili={stili}
                      gradiente={tema.gradienti.accento}
                    />
                    <Pillola
                      label={t('formatoMeglio3')}
                      attivo={formato === 3}
                      onPress={() => setFormato(3)}
                      stili={stili}
                      gradiente={tema.gradienti.accento}
                    />
                  </View>
                </>
              )}
              {(onGiocaOnline || onSfidaAmico) && (
                <View style={stili.azioni}>
                  {onGiocaOnline && (
                    <Pressable
                      onPress={() => onGiocaOnline(modalita, lunghezza, formato)}
                      disabled={moneteScarse}
                      style={({ pressed }) => [
                        stili.azioneBtn,
                        moneteScarse && stili.azioneDisabilitata,
                        { opacity: moneteScarse ? 0.45 : pressed ? 0.8 : 1 },
                      ]}
                    >
                      <Text style={stili.azioneTesto}>{t('giocaOnline')}</Text>
                      <Text style={stili.azioneCosto}>🪙 {COSTO_ONLINE}</Text>
                    </Pressable>
                  )}
                  {onSfidaAmico && (
                    <Pressable
                      onPress={() => onSfidaAmico(modalita, lunghezza, formato)}
                      disabled={moneteScarse}
                      style={({ pressed }) => [
                        stili.azioneBtn,
                        moneteScarse && stili.azioneDisabilitata,
                        { opacity: moneteScarse ? 0.45 : pressed ? 0.8 : 1 },
                      ]}
                    >
                      <Text style={stili.azioneTesto}>{t('sfidaAmico')}</Text>
                      <Text style={stili.azioneCosto}>🪙 {COSTO_ONLINE}</Text>
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

          {/* Tabella monete/punti: chiusa di default, si apre toccando il titolo */}
          <View style={stili.tabCard}>
            <Pressable
              onPress={() => setTabellaAperta((a) => !a)}
              hitSlop={6}
              style={({ pressed }) => [stili.tabIntestazione, { opacity: pressed ? 0.7 : 1 }]}
            >
              <Text style={stili.tabIntestazioneTesto}>{t('tabTitolo')}</Text>
              <Text style={stili.tabFreccia}>{tabellaAperta ? '▴' : '▾'}</Text>
            </Pressable>
            {tabellaAperta && <TabellaPunteggi modalita={modalita} stili={stili} />}
          </View>
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}
