import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Wordilo } from './src/screens/Wordilo';
import { LoadingScreen } from './src/LoadingScreen';
import { StatisticheProvider } from './src/stats/statistiche';

import { ConfigProvider } from './src/config/ConfigContext';
import { AuthProvider, useAuth } from './src/auth/AuthContext';
import { PortaAuth } from './src/auth/PortaAuth';
import { ProfiloProvider, useProfilo } from './src/profilo/ProfiloContext';
import { TemaProvider, useControlliTema } from './src/temi/TemaContext';
import { LinguaProvider, useControlliLingua } from './src/lingua/LinguaContext';
import { LinguaUIProvider, useControlliLinguaUI } from './src/i18n/LinguaUIContext';

// -----------------------------------------------------------------------------
// InizialiLingue — bridge tra ProfiloContext e i due provider lingua.
// Sta DENTRO tutti e tre i provider (profilo + lingua + linguaUI) e, non appena
// il profilo carica i valori salvati, li spinge nei due contesti. Si attiva una
// sola volta per sessione (quando i valori passano da null a un codice valido).
// -----------------------------------------------------------------------------
function InizialiLingue() {
  const { sessione } = useAuth();
  const { linguaUI, linguaGioco } = useProfilo();
  const { cambiaLingua } = useControlliLingua();
  const { cambiaLinguaUI } = useControlliLinguaUI();

  useEffect(() => {
    if (sessione && linguaGioco) cambiaLingua(linguaGioco);
  }, [sessione, linguaGioco]);

  useEffect(() => {
    if (sessione && linguaUI) cambiaLinguaUI(linguaUI);
  }, [sessione, linguaUI]);

  return null;
}

// -----------------------------------------------------------------------------
// InizialiTema — gemello di InizialiLingue, ma per il tema. Legge `tema` dal
// profilo (letto da ProfiloProvider) e lo spinge in TemaProvider con cambiaTema.
// TemaProvider è più esterno di ProfiloProvider nell'albero, ma va bene lo
// stesso: un componente dentro ProfiloProvider può comunque leggere un contesto
// definito più fuori, come qui useControlliTema().
// -----------------------------------------------------------------------------
function InizialiTema() {
  const { sessione } = useAuth();
  const { tema } = useProfilo();
  const { cambiaTema } = useControlliTema();

  useEffect(() => {
    if (sessione && tema) cambiaTema(tema);
  }, [sessione, tema]);

  return null;
}

export default function App() {
  // Carica i font Poppins, ma se falliscono non blocca l'app.
  const [caricati] = useFonts({
    Poppins_400Regular: require('./assets/fonts/Poppins_400Regular.ttf'),
    Poppins_600SemiBold: require('./assets/fonts/Poppins_600SemiBold.ttf'),
    Poppins_700Bold: require('./assets/fonts/Poppins_700Bold.ttf'),
    Poppins_800ExtraBold: require('./assets/fonts/Poppins_800ExtraBold.ttf'),
  });

  // Ordine dei provider:
  //   TemaProvider (sempre fuori — serve al cambio tema a runtime)
  //   └─ ConfigProvider → AuthProvider → SafeAreaProvider → StatisticheProvider
  //      └─ ProfiloProvider  ← legge lingua_ui / lingua_gioco / tema dal DB
  //         └─ LinguaUIProvider  ← lingua interfaccia (parte con 'it', poi InizialiLingue la aggiusta)
  //            └─ LinguaProvider ← lingua gioco (idem)
  //               └─ InizialiLingue  ← bridge: spinge le lingue del profilo nei due contesti
  //               └─ InizialiTema    ← bridge: spinge il tema del profilo in TemaProvider
  //                  └─ PortaAuth → Wordilo
  return (
    <TemaProvider>
      <ConfigProvider>
        <AuthProvider>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <StatisticheProvider>
              <ProfiloProvider>
                <LinguaUIProvider>
                <LinguaProvider>
                  <InizialiLingue />
                  <InizialiTema />
                  {caricati ? (
                    <PortaAuth>
                      <Wordilo />
                    </PortaAuth>
                  ) : (
                    <LoadingScreen />
                  )}
                </LinguaProvider>
                </LinguaUIProvider>
              </ProfiloProvider>
            </StatisticheProvider>
          </SafeAreaProvider>
        </AuthProvider>
      </ConfigProvider>
    </TemaProvider>
  );
}