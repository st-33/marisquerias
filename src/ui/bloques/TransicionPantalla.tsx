import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';

type TransicionPantallaProps = {
  children: ReactNode;
  backgroundColor?: string;
};

/**
 * Entrada suave para pantallas resueltas por la fábrica.
 * En web evita el corte seco; en native el Stack conserva su transición nativa.
 */
export function TransicionPantalla({
  children,
  backgroundColor = 'transparent',
}: TransicionPantallaProps) {
  const [opacity] = useState(() => new Animated.Value(Platform.OS === 'web' ? 0 : 1));
  const [translateY] = useState(() => new Animated.Value(Platform.OS === 'web' ? 8 : 0));

  useEffect(() => {
    if (Platform.OS !== 'web') return;

    const animation = Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
    ]);

    animation.start();
    return () => animation.stop();
  }, [opacity, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          opacity,
          transform: [{ translateY }],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    minWidth: 0,
    minHeight: 0,
  },
});
