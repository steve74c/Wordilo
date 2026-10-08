// -----------------------------------------------------------------------------
// Schermata "Scegli una nuova password". Va salvata in:
//   app/src/screens/SchermataNuovaPassword.tsx
//
// Compare (tramite PortaAuth) quando l'utente arriva dal link dell'email
// "reimposta password": a quel punto è GIÀ autenticato, quindi basta chiamare
// aggiornaPassword(). Appena salvata, inRecupero torna false e PortaAuth mostra
// il gioco. Riusa gli stili della schermata di accesso.
// -----------------------------------------------------------------------------
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
import { useT } from '../i18n/LinguaUIContext';
import { ombra } from '../theme';
import { useTema } from '../temi/TemaContext';
import { creaStili } from './SchermataAuth.stili';

export function SchermataNuovaPassword() {
  const tema = useTema();
  const stili = useMemo(() => creaStili(tema), [tema]);
  const t = useT();
  const { aggiornaPassword, esci } = useAuth();

  const [password, setPassword] = useState('');
  const [conferma, setConferma] = useState('');
  const [errore, setErrore] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const salva = async () => {
    if (busy) return;
    setErrore(null);
    if (password.length < 6) {
      setErrore(t('errPasswordCorta'));
      return;
    }
    if (password !== conferma) {
      setErrore(t('errPasswordDiverse'));
      return;
    }
    setBusy(true);
    const { errore: err } = await aggiornaPassword(password);
    setBusy(false);
    if (err) setErrore(err);
    // Successo: PortaAuth passa da solo al gioco.
  };

  return (
    <LinearGradient colors={tema.gradienti.sfondo} style={stili.sfondo}>
      <SafeAreaView style={stili.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={stili.centro}
        >
          <ScrollView
            style={stili.scroll}
            contentContainerStyle={stili.scrollInner}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={stili.titolo}>SpotLex</Text>

            <View style={[stili.card, ombra(0.4, 24, 12, 14)]}>
              <Text style={stili.sottotitolo}>{t('nuovaPasswordTitolo')}</Text>

              <TextInput
                style={stili.input}
                placeholder={t('nuovaPasswordPlaceholder')}
                placeholderTextColor={tema.palette.testoTenue}
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={setPassword}
                returnKeyType="next"
              />

              <TextInput
                style={stili.input}
                placeholder={t('confermaPasswordPlaceholder')}
                placeholderTextColor={tema.palette.testoTenue}
                secureTextEntry
                autoCapitalize="none"
                value={conferma}
                onChangeText={setConferma}
                onSubmitEditing={salva}
                returnKeyType="go"
              />

              {errore && <Text style={stili.errore}>{errore}</Text>}

              <Pressable
                onPress={salva}
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
                    <Text style={stili.bottoneTesto}>{t('salvaPasswordBtn')}</Text>
                  )}
                </LinearGradient>
              </Pressable>

              {/* Via d'uscita: annulla e torna al login. */}
              <Pressable onPress={esci} hitSlop={8}>
                <Text style={stili.link}>{t('recuperoTornaLogin')}</Text>
              </Pressable>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}
