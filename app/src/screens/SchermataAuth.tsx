import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../auth/AuthContext';
import { useControlliLingua } from '../lingua/LinguaContext';
import { useControlliLinguaUI, useT } from '../i18n/LinguaUIContext';
import { useControlliTema } from '../temi/TemaContext';
import { ombra } from '../theme';
import { useTema } from '../temi/TemaContext';
import { creaStili } from './SchermataAuth.stili';
import type { StiliAuth } from './SchermataAuth.stili';

type Modo = 'accedi' | 'registrati';

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

  const { accedi, registrati } = useAuth();
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

  const registra = modo === 'registrati';

  // Nomi leggibili dei temi (🪟 Vetro / ☀️ Giallo), stessi testi di Impostazioni.
  const opzioniTemi = temiDisponibili.map((nome) => ({
    codice: nome,
    nome: nome === 'vetro' ? t('temaVetro') : t('temaGiallo'),
  }));

  const cambiaModo = (m: Modo) => {
    setModo(m);
    setErrore(null);
  };

  const invia = async () => {
    if (busy) return;
    setErrore(null);

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
    const { errore: err } = registra
      ? await registrati(nick, email, password, linguaGioco, linguaUI, temaScelto)
      : await accedi(email, password);
    setBusy(false);
    if (err) setErrore(err);
  };

  return (
    <LinearGradient colors={tema.gradienti.sfondo} style={stili.sfondo}>
      <SafeAreaView style={stili.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={stili.centro}
        >
          <Text style={stili.titolo}>Wordilo</Text>

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

            {errore && <Text style={stili.errore}>{errore}</Text>}

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
                  <Text style={stili.bottoneTesto}>{registra ? 'Crea account' : 'Entra'}</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}