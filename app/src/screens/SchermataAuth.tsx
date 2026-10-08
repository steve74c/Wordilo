import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../auth/AuthContext';
import { useControlliLingua } from '../lingua/LinguaContext';
import { useControlliLinguaUI, useT } from '../i18n/LinguaUIContext';
import { useControlliTema } from '../temi/TemaContext';
import { ombra } from '../theme';
import { useTema } from '../temi/TemaContext';
import { creaStili } from './SchermataAuth.stili';
import type { StiliAuth } from './SchermataAuth.stili';

type Modo = 'accedi' | 'registrati' | 'recupero';

// Selettore compatto a due (o più) opzioni, riusa lo stile "toggle" della card.
function SelettoreLingua({
  label,
  opzioni,
  valore,
  onScegli,
  stili,
}: {
  label: string;
  opzioni: { codice: string; nome: string }[];
  valore: string;
  onScegli: (codice: string) => void;
  stili: StiliAuth;
}) {
  return (
    <View style={stili.campo}>
      <Text style={stili.campoLabel}>{label}</Text>
      <View style={stili.toggle}>
        {opzioni.map((o) => {
          const attivo = valore === o.codice;
          return (
            <Pressable
              key={o.codice}
              onPress={() => onScegli(o.codice)}
              style={[stili.toggleBtn, attivo && stili.toggleAttivo]}
            >
              <Text style={[stili.toggleTesto, attivo && stili.toggleTestoAttivo]}>{o.nome}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function SchermataAuth() {
  const tema = useTema();
  const stili = useMemo(() => creaStili(tema), [tema]);

  const { accedi, registrati, recuperaPassword } = useAuth();
  const { lingua: linguaGiocoAttuale, lingueDisponibili } = useControlliLingua();
  const { linguaUI: linguaUIAttuale, lingueUIDisponibili } = useControlliLinguaUI();
  const { nomeTema, temiDisponibili } = useControlliTema();
  const [modo, setModo] = useState<Modo>('accedi');
  const [nick, setNick] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Preferenze scelte in registrazione (default = valori attuali dell'app).
  const [linguaGioco, setLinguaGioco] = useState<string>(linguaGiocoAttuale);
  const [linguaUI, setLinguaUI] = useState<string>(linguaUIAttuale);
  const [temaScelto, setTemaScelto] = useState<string>(nomeTema);
  const t = useT();
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [avviso, setAvviso] = useState<string | null>(null); // messaggio di conferma (verde)

  const registra = modo === 'registrati';

  // Nomi leggibili dei temi (🪟 Vetro / ☀️ Giallo), stessi testi di Impostazioni.
  const opzioniTemi = temiDisponibili.map((nome) => ({
    codice: nome,
    nome: nome === 'vetro' ? t('temaVetro') : t('temaGiallo'),
  }));

  const cambiaModo = (m: Modo) => {
    setModo(m);
    setErrore(null);
    setAvviso(null);
  };

  // "Password dimenticata?": manda l'email con il link di reset.
  const inviaRecupero = async () => {
    if (busy) return;
    setErrore(null);
    setAvviso(null);
    if (!email.trim()) {
      setErrore(t('errSoloEmail'));
      return;
    }
    setBusy(true);
    const { errore: err } = await recuperaPassword(email);
    setBusy(false);
    if (err) setErrore(err);
    else setAvviso(t('recuperoInviato'));
  };

  const invia = async () => {
    if (busy) return;
    setErrore(null);
    setAvviso(null);

    if (registra && nick.trim().length < 3) {
      setErrore(t('errNickCorto'));
      return;
    }
    if (!email.trim() || !password) {
      setErrore(t('errEmailPassword'));
      return;
    }
    if (password.length < 6) {
      setErrore(t('errPasswordCorta'));
      return;
    }

    setBusy(true);
    const res = registra
      ? await registrati(nick, email, password, linguaGioco, linguaUI, temaScelto)
      : await accedi(email, password);
    setBusy(false);
    if (res.errore) setErrore(res.errore);
    else if (res.daConfermare) {
      // Account creato ma da attivare: torna su "Accedi" e spiega cosa fare.
      setModo('accedi');
      setPassword('');
      setAvviso(t('confermaEmailInviata'));
    }
  };

  return (
    <LinearGradient colors={tema.gradienti.sfondo} style={stili.sfondo}>
      <SafeAreaView style={stili.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={stili.centro}
        >
          {/* ScrollView: la card di registrazione può essere più alta del display. */}
          <ScrollView
            style={stili.scroll}
            contentContainerStyle={stili.scrollInner}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={stili.titolo}>SpotLex</Text>

            {modo === 'recupero' ? (
            <View style={[stili.card, ombra(0.4, 24, 12, 14)]}>
              <Text style={stili.sottotitolo}>{t('recuperoTitolo')}</Text>
              <Text style={stili.spiega}>{t('recuperoSpiega')}</Text>

              <TextInput
                style={stili.input}
                placeholder={t('emailPlaceholder')}
                placeholderTextColor={tema.palette.testoTenue}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
                onSubmitEditing={inviaRecupero}
                returnKeyType="send"
              />

              {errore && <Text style={stili.errore}>{errore}</Text>}
              {avviso && <Text style={stili.avviso}>{avviso}</Text>}

              <Pressable
                onPress={inviaRecupero}
                disabled={busy}
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }], width: '100%' }]}
              >
                <LinearGradient
                  colors={tema.gradienti.accento}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[stili.bottone, ombra(0.35, 10, 5, 6), busy && { opacity: 0.7 }]}
                >
                  {busy ? (
                    <ActivityIndicator color={tema.palette.testoSuAccento} />
                  ) : (
                    <Text style={stili.bottoneTesto}>{t('recuperoInviaBtn')}</Text>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable onPress={() => cambiaModo('accedi')} hitSlop={8}>
                <Text style={stili.link}>{t('recuperoTornaLogin')}</Text>
              </Pressable>
            </View>
            ) : (
            <View style={[stili.card, ombra(0.4, 24, 12, 14)]}>
              <View style={stili.toggle}>
                <Pressable
                  onPress={() => cambiaModo('accedi')}
                  style={[stili.toggleBtn, !registra && stili.toggleAttivo]}
                >
                  <Text style={[stili.toggleTesto, !registra && stili.toggleTestoAttivo]}>{t('accedi')}</Text>
                </Pressable>
                <Pressable
                  onPress={() => cambiaModo('registrati')}
                  style={[stili.toggleBtn, registra && stili.toggleAttivo]}
                >
                  <Text style={[stili.toggleTesto, registra && stili.toggleTestoAttivo]}>{t('registrati')}</Text>
                </Pressable>
              </View>

              {registra && (
                <TextInput
                  style={stili.input}
                  placeholder={t('nickname')}
                  placeholderTextColor={tema.palette.testoTenue}
                  autoCapitalize="none"
                  autoCorrect={false}
                  maxLength={20}
                  value={nick}
                  onChangeText={setNick}
                />
              )}

              {registra && (
                <SelettoreLingua
                  label={t('labelLinguaGioco')}
                  opzioni={lingueDisponibili}
                  valore={linguaGioco}
                  onScegli={setLinguaGioco}
                  stili={stili}
                />
              )}

              {registra && (
                <SelettoreLingua
                  label={t('labelLinguaApp')}
                  opzioni={lingueUIDisponibili}
                  valore={linguaUI}
                  onScegli={setLinguaUI}
                  stili={stili}
                />
              )}

              {registra && (
                <SelettoreLingua
                  label={t('sezioneTema')}
                  opzioni={opzioniTemi}
                  valore={temaScelto}
                  onScegli={setTemaScelto}
                  stili={stili}
                />
              )}

              <TextInput
                style={stili.input}
                placeholder={t('emailPlaceholder')}
                placeholderTextColor={tema.palette.testoTenue}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />

              <TextInput
                style={stili.input}
                placeholder={t('passwordPlaceholder')}
                placeholderTextColor={tema.palette.testoTenue}
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                onSubmitEditing={invia}
                returnKeyType="go"
              />

              {!registra && (
                <Pressable onPress={() => cambiaModo('recupero')} hitSlop={8}>
                  <Text style={stili.link}>{t('passwordDimenticata')}</Text>
                </Pressable>
              )}

              {errore && <Text style={stili.errore}>{errore}</Text>}
              {avviso && <Text style={stili.avviso}>{avviso}</Text>}

              <Pressable
                onPress={invia}
                disabled={busy}
                style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }], width: '100%' }]}
              >
                <LinearGradient
                  colors={tema.gradienti.accento}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[stili.bottone, ombra(0.35, 10, 5, 6), busy && { opacity: 0.7 }]}
                >
                  {busy ? (
                    <ActivityIndicator color={tema.palette.testoSuAccento} />
                  ) : (
                    <Text style={stili.bottoneTesto}>{registra ? t('creaAccountBtn') : t('entraBtn')}</Text>
                  )}
                </LinearGradient>
              </Pressable>
            </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
