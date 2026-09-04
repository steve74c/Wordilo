// -----------------------------------------------------------------------------
// Schermata di accesso / registrazione. Va salvato in:
//   app/src/screens/SchermataAuth.tsx
//
// Un unico schermo con due modalità (Accedi / Registrati) scelte da un toggle.
// In registrazione chiede anche il nickname. Al successo non fa nulla di
// speciale: cambia la sessione e PortaAuth mostra il gioco da solo.
// -----------------------------------------------------------------------------
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../auth/AuthContext';
import { C, FONT, GRAD, ombra, bagliore } from '../theme';

type Modo = 'accedi' | 'registrati';

export function SchermataAuth() {
  const { accedi, registrati } = useAuth();
  const [modo, setModo] = useState<Modo>('accedi');
  const [nick, setNick] = useState('');
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
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

    // Controlli minimi lato client, prima di chiamare la rete.
    if (registra && nick.trim().length < 3) {
      setErrore('Il nickname deve avere almeno 3 caratteri.');
      return;
    }
    if (registra && (!nome.trim() || !cognome.trim())) {
      setErrore('Inserisci nome e cognome.');
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
      ? await registrati(nick, nome, cognome, email, password)
      : await accedi(email, password);
    setBusy(false);
    if (err) setErrore(err);
    // Se va a buon fine, la sessione cambia e PortaAuth mostra il gioco.
  };

  return (
    <LinearGradient colors={GRAD.sfondo} style={styles.sfondo}>
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.centro}
        >
          <Text style={styles.titolo}>Wordilo</Text>

          <View style={[styles.card, ombra(0.4, 24, 12, 14)]}>
            {/* Toggle Accedi / Registrati */}
            <View style={styles.toggle}>
              <Pressable
                onPress={() => cambiaModo('accedi')}
                style={[styles.toggleBtn, !registra && styles.toggleAttivo]}
              >
                <Text style={[styles.toggleTesto, !registra && styles.toggleTestoAttivo]}>Accedi</Text>
              </Pressable>
              <Pressable
                onPress={() => cambiaModo('registrati')}
                style={[styles.toggleBtn, registra && styles.toggleAttivo]}
              >
                <Text style={[styles.toggleTesto, registra && styles.toggleTestoAttivo]}>Registrati</Text>
              </Pressable>
            </View>

            {registra && (
              <TextInput
                style={styles.input}
                placeholder="Nickname"
                placeholderTextColor={C.testoTenue}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
                value={nick}
                onChangeText={setNick}
              />
            )}
            {registra && (
              <TextInput
                style={styles.input}
                placeholder="Nome"
                placeholderTextColor={C.testoTenue}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={30}
                value={nome}
                onChangeText={setNome}
              />
            )}
            {registra && (
              <TextInput
                style={styles.input}
                placeholder="Cognome"
                placeholderTextColor={C.testoTenue}
                autoCapitalize="words"
                autoCorrect={false}
                maxLength={30}
                value={cognome}
                onChangeText={setCognome}
              />
            )}
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={C.testoTenue}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor={C.testoTenue}
              secureTextEntry
              autoCapitalize="none"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={invia}
              returnKeyType="go"
            />

            {errore && <Text style={styles.errore}>{errore}</Text>}

            <Pressable
              onPress={invia}
              disabled={busy}
              style={({ pressed }) => [{ transform: [{ scale: pressed ? 0.98 : 1 }], width: '100%' }]}
            >
              <LinearGradient
                colors={GRAD.accento}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.bottone, ombra(0.35, 10, 5, 6), busy && { opacity: 0.7 }]}
              >
                {busy ? (
                  <ActivityIndicator color="#052722" />
                ) : (
                  <Text style={styles.bottoneTesto}>{registra ? 'Crea account' : 'Entra'}</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  sfondo: { flex: 1 },
  safe: { flex: 1 },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  titolo: {
    color: C.accentoSoft,
    fontSize: 40,
    fontFamily: FONT.serif,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 22,
    ...bagliore(C.glow, 24),
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(16,40,47,0.97)',
    borderColor: C.hair,
    borderWidth: 1,
    borderRadius: 22,
    padding: 22,
    gap: 12,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 14,
    padding: 4,
    marginBottom: 4,
  },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  toggleAttivo: { backgroundColor: C.superficieAlta },
  toggleTesto: { color: C.testoTenue, fontSize: 15, fontFamily: FONT.medium, fontWeight: '600' },
  toggleTestoAttivo: { color: C.testo },
  input: {
    backgroundColor: C.superficieAlta,
    borderColor: C.hair,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === 'web' ? 12 : 14,
    color: C.testo,
    fontSize: 16,
    fontFamily: FONT.regular,
  },
  errore: { color: C.arancione, fontSize: 14, fontFamily: FONT.medium, fontWeight: '600', textAlign: 'center' },
  bottone: { width: '100%', paddingVertical: 15, borderRadius: 16, alignItems: 'center', marginTop: 4 },
  bottoneTesto: { color: '#052722', fontSize: 16, fontFamily: FONT.bold, fontWeight: '800' },
});
