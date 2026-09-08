import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Wordilo } from './src/screens/Wordilo';
import { LoadingScreen } from './src/LoadingScreen';
import { StatisticheProvider } from './src/stats/statistiche';

import { ConfigProvider } from './src/config/ConfigContext';
import { AuthProvider } from './src/auth/AuthContext';
import { PortaAuth } from './src/auth/PortaAuth';
import { ProfiloProvider } from './src/profilo/ProfiloContext';
import { TemaProvider } from './src/temi/TemaContext';
import { LinguaProvider } from './src/lingua/LinguaContext';

export default function App() {
  // Carica i font Poppins, ma se falliscono non blocca l'app
  const [caricati] = useFonts({
    Poppins_400Regular: require('./assets/fonts/Poppins_400Regular.ttf'),
    Poppins_600SemiBold: require('./assets/fonts/Poppins_600SemiBold.ttf'),
    Poppins_700Bold: require('./assets/fonts/Poppins_700Bold.ttf'),
    Poppins_800ExtraBold: require('./assets/fonts/Poppins_800ExtraBold.ttf'),
  });

  // <TemaProvider> avvolge TUTTO (serve al cambio tema). Il resto dei provider è
  // identico a prima: Config → Auth → SafeArea → Statistiche → Profilo → gioco.
  return (
    <TemaProvider>
      <LinguaProvider>
      <ConfigProvider>
        <AuthProvider>
          <SafeAreaProvider>
            <StatusBar style="light" />
            <StatisticheProvider>
              <ProfiloProvider>
                {caricati ? (
                  <PortaAuth>
                    <Wordilo />
                  </PortaAuth>
                ) : (
                  <LoadingScreen />
                )}
              </ProfiloProvider>
            </StatisticheProvider>
          </SafeAreaProvider>
        </AuthProvider>
      </ConfigProvider>
      </LinguaProvider>
    </TemaProvider>
  );
}
