/**
 * COMPONENTE REUTILIZABLE: Toast Notifications
 * Notificaciones no intrusivas con auto-dismiss
 * Uso: Feedback visual rápido (item agregado, acción completada, etc.)
 */

import React, { useEffect, useState, useMemo } from 'react';
import { Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, TYPOGRAPHY, SHADOWS } from '../../constantes/theme';

type ToastType = 'success' | 'info' | 'warning' | 'error';

type ToastProps = {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss?: () => void;
};

export function Toast({
  visible,
  message,
  type = 'success',
  duration = 2000,
  onDismiss,
}: ToastProps) {
  const [translateY] = useState(new Animated.Value(-100));
  const [opacity] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      // Slide in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss
      const timer = setTimeout(() => {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: -100,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(opacity, {
            toValue: 0,
            duration: 200,
            useNativeDriver: true,
          }),
        ]).start(() => {
          onDismiss?.();
        });
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible, duration, translateY, opacity, onDismiss]);

  // Memoizar configuración de tipo
  const config = useMemo(() => {
    switch (type) {
      case 'success':
        return { icon: 'checkmark-circle' as const, bg: COLORS.success };
      case 'warning':
        return { icon: 'warning' as const, bg: COLORS.warning };
      case 'error':
        return { icon: 'close-circle' as const, bg: COLORS.error };
      default:
        return { icon: 'information-circle' as const, bg: COLORS.info };
    }
  }, [type]);

  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor: config.bg,
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Ionicons name={config.icon} size={20} color="#ffffff" />
      <Text style={styles.message}>{message}</Text>
    </Animated.View>
  );
}

// Hook para usar toast fácilmente
export function useToast() {
  const [toastConfig, setToastConfig] = useState<{
    visible: boolean;
    message: string;
    type?: ToastType;
  } | null>(null);

  const showToast = (message: string, type: ToastType = 'success') => {
    setToastConfig({ visible: true, message, type });
  };

  const hideToast = () => {
    setToastConfig(null);
  };

  const ToastComponent = toastConfig ? (
    <Toast
      visible={toastConfig.visible}
      message={toastConfig.message}
      type={toastConfig.type}
      onDismiss={hideToast}
    />
  ) : null;

  return { showToast, ToastComponent };
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 50,
    left: SPACING.xl,
    right: SPACING.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: 14,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    ...SHADOWS.lg,
    zIndex: 9999,
  },
  message: {
    color: COLORS.text.primary,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    flex: 1,
  },
});
