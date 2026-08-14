/**
 * 🎨 TARJETA CON PULSO Y ELEVACIÓN
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, Pressable, Vibration } from 'react-native';

type Props = {
  children: React.ReactNode;
  onPress?: () => void;
  urgent?: boolean;
  elevated?: boolean;
};

export function PulsingCard({ children, onPress, urgent, elevated }: Props) {
  const pulse = useMemo(() => new Animated.Value(1), []);
  const scale = useMemo(() => new Animated.Value(1), []);

  useEffect(() => {
    if (urgent) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse, { toValue: 1.02, duration: 800, useNativeDriver: true }),
          Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        ])
      ).start();
    }
  }, [urgent, pulse]);

  const handlePressIn = () => {
    if (onPress) {
      Vibration.vibrate(8);
      Animated.spring(scale, { toValue: 0.98, useNativeDriver: true }).start();
    }
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  };

  const Component = onPress ? Pressable : Animated.View;

  return (
    <Animated.View style={{ transform: [{ scale: urgent ? pulse : scale }] }}>
      <Component
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{
          backgroundColor: '#1f2937',
          borderRadius: 16,
          padding: 16,
          shadowColor: urgent ? '#ef4444' : '#000',
          shadowOffset: { width: 0, height: elevated ? 8 : 4 },
          shadowOpacity: elevated ? 0.4 : 0.2,
          shadowRadius: elevated ? 12 : 6,
          elevation: elevated ? 12 : 6,
          borderWidth: urgent ? 2 : 0,
          borderColor: urgent ? '#ef4444' : 'transparent',
        }}
      >
        {children}
      </Component>
    </Animated.View>
  );
}
