/**
 * 🍞 TOAST DE NOTIFICACIÓN
 * Componente visual flash que aparece 2 segundos
 * Solo se muestra en rol mesero
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type NotificationToastProps = {
  message: string;
  subtitle?: string;
  duration?: number;
  onPress?: () => void;
  onDismiss: () => void;
};

export function NotificationToast({
  message,
  subtitle,
  duration = 2000,
  onPress,
  onDismiss,
}: NotificationToastProps) {
  const fadeAnim = useMemo(() => new Animated.Value(0), []);
  const translateY = useMemo(() => new Animated.Value(-100), []);

  useEffect(() => {
    // Animación de entrada
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto-dismiss después de duration
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => onDismiss());
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onDismiss]);

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <Pressable
        onPress={() => {
          onPress?.();
          onDismiss();
        }}
        style={({ pressed }) => [styles.toast, pressed && styles.toastPressed]}
      >
        <View style={styles.iconContainer}>
          <Ionicons name="checkmark-circle" size={24} color="#16a34a" />
        </View>
        <View style={styles.content}>
          <Text style={styles.message}>{message}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    zIndex: 9999,
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: '#16a34a',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    minWidth: 200,
    maxWidth: 400,
  },
  toastPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  iconContainer: {
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  message: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 2,
  },
});
