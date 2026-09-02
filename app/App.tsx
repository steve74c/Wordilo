import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Wordilo } from './src/screens/Wordilo';
import { LoadingScreen } from './src/LoadingScreen';
import { StatisticheProvider } from './src/stats/statistiche';

export default function App() {
  // Carica i font Poppins, ma se falliscono non blocca l'app
  const [caricati] = useFonts({
    Poppins_400Regular: require('./assets/fonts/Poppins_400Regular.ttf'),
    Poppins_600SemiBold: require('./assets/fonts/Poppins_600SemiBold.ttf'),
    Poppins_700Bold: require('./assets/fonts/Poppins_700Bold.ttf'),
    Poppins_800ExtraBold: require('./assets/fonts/Poppins_800ExtraBold.ttf'),
  });

  // Il Provider sta SOPRA Wordilo: così i contatori sopravvivono quando si passa
  // dal gioco al menu e viceversa. Mostra il loading finché i font non sono pronti
  // (se il caricamento fallisce, si procede col font di sistema).
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <StatisticheProvider>
        {caricati ? <Wordilo /> : <LoadingScreen />}
      </StatisticheProvider>
    </SafeAreaProvider>
  );
}
