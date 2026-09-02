// -----------------------------------------------------------------------------
// "Cancello" di autenticazione. Va salvato in:  app/src/auth/PortaAuth.tsx
//
// Login obbligatorio: se non c'è sessione mostra la schermata di accesso;
// appena l'utente entra, `onAuthStateChange` aggiorna la sessione e qui
// compare il gioco (i `children`, cioè <Wordilo />). Nessuna navigazione
// manuale: la UI reagisce da sola al cambio di sessione.
// -----------------------------------------------------------------------------
import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from './AuthContext';
import { SchermataAuth } from '../screens/SchermataAuth';
import { C, GRAD } from '../theme';

export function PortaAuth({ children }: { children: React.ReactNode }) {
  const { sessione, caricata } = useAuth();

  // Breve attesa mentre leggiamo la sessione salvata (di norma è istantanea).
  if (!caricata) {
    return (
      <LinearGradient colors={GRAD.sfondo} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={C.accento} />
      </LinearGradient>
    );
  }

  return sessione ? <>{children}</> : <SchermataAuth />;
}
