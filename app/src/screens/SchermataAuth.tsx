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
import { ombra } from '../theme';
import { useTema } from '../temi/TemaContext';
import { creaStili } from './SchermataAuth.stili';

type Modo = 'accedi' | 'registrati';

export function SchermataAuth() {
  const tema = useTema();
  const stili = useMemo(() => creaStili(tema), [tema]);

  const { accedi, registrati } = useAuth();
  const [modo, setModo] = useState<Modo>('accedi');
  const [nick, setNick] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const registra = modo === 'registrati';

  const cambiaModo = (m: Modo) => {
    setModo(m);
    setErrore(null);
  };

  const invia = async () => {
    if (busy) return;
    setErrore(null);

    if (registra && nick.trim().length < 3) {
      setErrore('Il nickname deve avere almeno 3 caratteri.');
      return;
    }
    if (!email.trim() || !password) {
      setErrore('Inserisci email e password.');
      return;
    }
    if (password.length < 6) {
      setErrore('La password deve avere almeno 6 caratteri.');
      return;
    }

    setBusy(true);
    const { errore: err } = registra
      ? await registrati(nick, email, password)
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
                <Text style={[stili.toggleTesto, !registra && stili.toggleTestoAttivo]}>Accedi</Text>
              </Pressable>
              <Pressable
                onPress={() => cambiaModo('registrati')}
                style={[stili.toggleBtn, registra && stili.toggleAttivo]}
              >
                <Text style={[stili.toggleTesto, registra && stili.toggleTestoAttivo]}>Registrati</Text>
              </Pressable>
            </View>

            {registra && (
              <TextInput
                style={stili.input}
                placeholder="Nickname"
                placeholderTextColor={tema.palette.testoTenue}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                value={nick}
                onChangeText={setNick}
              />
            )}

            <TextInput
              style={stili.input}
              placeholder="Email"
              placeholderTextColor={tema.palette.testoTenue}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              style={stili.input}
              placeholder="Password"
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
