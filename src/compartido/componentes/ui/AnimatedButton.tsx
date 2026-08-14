/**
 * 🎨 BOTÓN ANIMADO BRUTAL
 */

import React, { useMemo, useRef } from 'react';
import { Pressable, Text, Animated, Vibration, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'success' | 'danger' | 'warning';
  size?: 'medium' | 'large' | 'xlarge';
  icon?: any;
  disabled?: boolean;
};

const COLORS = {
  primary: '#3b82f6',
  success: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
};

export function AnimatedButton({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  icon,
  disabled,
}: Props) {
  const scale = useMemo(() => new Animated.Value(1), []);

  const handlePressIn = () => {
    Vibration.vibrate(10);
    Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }).start();
  };

  const padding = size === 'xlarge' ? 24 : size === 'large' ? 18 : 14;
  const fontSize = size === 'xlarge' ? 20 : size === 'large' ? 18 : 16;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={{
          backgroundColor: disabled ? '#6b7280' : COLORS[variant],
          paddingVertical: padding,
          paddingHorizontal: padding * 1.5,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        {icon && <Ionicons name={icon} size={fontSize + 6} color="white" />}
        <Text style={{ color: 'white', fontSize, fontWeight: '700' }}>{title}</Text>
      </Pressable>
    </Animated.View>
  );
}
