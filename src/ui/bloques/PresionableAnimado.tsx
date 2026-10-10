import React, { useRef } from 'react';
import type { ViewStyle } from 'react-native';
import { Animated, Pressable } from 'react-native';

export type PresionableAnimadoProps = {
  onPress: () => void;
  style?: ViewStyle | ViewStyle[];
  children: React.ReactNode;
};
export type AnimatedPressableProps = PresionableAnimadoProps;

// Crear componente animado de Pressable
const AnimatedPressableComponent = Animated.createAnimatedComponent(Pressable);

/**
 * Pressable with subtle scale animation on press. Works on both native and web.
 */
export const PresionableAnimado: React.FC<PresionableAnimadoProps> = ({
  onPress,
  style,
  children,
}) => {
  const [scale] = React.useState(() => new Animated.Value(1));

  const handlePressIn = () => {
    Animated.timing(scale, {
      toValue: 0.95,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scale, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <AnimatedPressableComponent
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style, { transform: [{ scale }] }]}
    >
      {children}
    </AnimatedPressableComponent>
  );
};

export const AnimatedPressable = PresionableAnimado;

