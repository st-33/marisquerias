/**
 * 👁️ COMPONENTE: ModernAlertView
 * SOLO UI - Sin lógica
 * Vista de alertas modernas con animaciones
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { AlertConfig } from './useModernAlert';

type ModernAlertViewProps = {
  visible: boolean;
  config: AlertConfig | null;
  onConfirm: () => void;
  onCancel: () => void;
  onDismiss: () => void;
};

export function ModernAlertView({
  visible,
  config,
  onConfirm,
  onCancel,
  onDismiss,
}: ModernAlertViewProps) {
  const scaleAnim = useMemo(() => new Animated.Value(0), []);
  const opacityAnim = useMemo(() => new Animated.Value(0), []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 7,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  if (!config) return null;

  const getIcon = (): keyof typeof Ionicons.glyphMap => {
    switch (config.type) {
      case 'success':
        return 'checkmark-circle';
      case 'error':
        return 'close-circle';
      case 'warning':
        return 'warning';
      case 'info':
        return 'information-circle';
      case 'confirm':
        return 'help-circle';
    }
  };

  const getColor = () => {
    switch (config.type) {
      case 'success':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      case 'warning':
        return '#f59e0b';
      case 'info':
        return '#3b82f6';
      case 'confirm':
        return '#8b5cf6';
    }
  };

  const color = getColor();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onDismiss}>
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <Animated.View
          style={[
            styles.alertContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
              <Ionicons name={getIcon()} size={48} color={color} />
            </View>

            {/* Title */}
            <Text style={styles.title}>{config.title}</Text>

            {/* Message */}
            {config.message && <Text style={styles.message}>{config.message}</Text>}

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              {config.type === 'confirm' && (
                <Pressable onPress={onCancel} style={[styles.button, styles.buttonCancel]}>
                  <Text style={styles.buttonCancelText}>{config.cancelText || 'Cancelar'}</Text>
                </Pressable>
              )}
              <Pressable
                onPress={onConfirm}
                style={[styles.button, styles.buttonConfirm, { backgroundColor: color }]}
              >
                <Text style={styles.buttonConfirmText}>{config.confirmText || 'Aceptar'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  alertContainer: {
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    color: '#9ca3af',
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: '#1f2937',
  },
  buttonCancelText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '700',
  },
  buttonConfirm: {
    // backgroundColor dinámico
  },
  buttonConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
