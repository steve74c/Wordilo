import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { C, GRAD } from './theme';

// Schermata di caricamento (usa font di sistema: deve funzionare PRIMA che il
// font custom sia pronto). Mostra il wordmark e un anellino che gira.
export function LoadingScreen() {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.linear, useNativeDriver: true }),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
    ).start();
  }, [spin, pulse]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] });

  return (
    <LinearGradient colors={GRAD.sfondo} style={styles.root}>
      <Animated.Text style={[styles.logo, { transform: [{ scale }] }]}>Wordilo</Animated.Text>
      <Animated.View style={[styles.anello, { transform: [{ rotate }] }]} />
      <Text style={styles.sub}>Caricamento…</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 22 },
  logo: { color: C.accento, fontSize: 40, fontWeight: '900', letterSpacing: 1.5 },
  anello: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    borderColor: C.superficieAlta,
    borderTopColor: C.accento,
  },
  sub: { color: C.testoTenue, fontSize: 14 },
});
