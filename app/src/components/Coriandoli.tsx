import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { C } from '../theme';

// Piccola festa alla vittoria: ~16 particelle che salgono e svaniscono UNA volta.
// Niente loop, niente librerie: costo trascurabile su mobile e web.
const N = 16;
const COLORI = [C.verde, C.arancione, C.accento, '#F2F5F8'];

function Particella({ ritardo }: { ritardo: number }) {
  const t = useRef(new Animated.Value(0)).current;
  const dx = useRef((Math.random() - 0.5) * 240).current;
  const rise = useRef(160 + Math.random() * 120).current;
  const size = useRef(6 + Math.random() * 6).current;
  const colore = useRef(COLORI[Math.floor(Math.random() * COLORI.length)]).current;
  const tondo = useRef(Math.random() > 0.5).current;

  useEffect(() => {
    Animated.timing(t, {
      toValue: 1,
      duration: 1100,
      delay: ritardo,
      useNativeDriver: true,
    }).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const translateY = t.interpolate({ inputRange: [0, 1], outputRange: [0, -rise] });
  const translateX = t.interpolate({ inputRange: [0, 1], outputRange: [0, dx] });
  const opacity = t.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] });
  const rotate = t.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '220deg'] });
  const scale = t.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.4, 1, 0.9] });

  return (
    <Animated.View
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        width: size,
        height: size,
        borderRadius: tondo ? size / 2 : 2,
        backgroundColor: colore,
        opacity,
        transform: [{ translateX }, { translateY }, { rotate }, { scale }],
      }}
    />
  );
}

export function Coriandoli({ attivo }: { attivo: boolean }) {
  if (!attivo) return null;
  return (
    <View style={styles.contenitore}>
      {Array.from({ length: N }).map((_, i) => (
        <Particella key={i} ritardo={i * 28} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  contenitore: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
