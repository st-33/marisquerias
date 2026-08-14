/**
 * SISTEMA DE ALERTAS MODERNAS
 * Reemplaza Alert.alert() nativo con diseño elegante y animado
 * Tipos: success, warning, error, info, confirm
 * Reutilizable en todo el ecosistema
 */

import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type AlertType = 'success' | 'warning' | 'error' | 'info' | 'confirm';

type ModernAlertProps = {
  visible: boolean;
  type?: AlertType;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
  onDismiss?: () => void;
};

export function ModernAlert({
  visible,
  type = 'info',
  title,
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  onDismiss,
}: ModernAlertProps) {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.9));

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, fadeAnim, scaleAnim]);

  const getIcon = () => {
    switch (type) {
      case 'success':
        return { name: 'checkmark-circle' as const, color: '#16a34a' };
      case 'warning':
        return { name: 'warning' as const, color: '#f59e0b' };
      case 'error':
        return { name: 'close-circle' as const, color: '#dc2626' };
      case 'confirm':
        return { name: 'help-circle' as const, color: '#3b82f6' };
      default:
        return { name: 'information-circle' as const, color: '#3b82f6' };
    }
  };

  const icon = getIcon();

  const handleConfirm = () => {
    onConfirm?.();
    onDismiss?.();
  };

  const handleCancel = () => {
    onCancel?.();
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={handleCancel}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <Pressable style={styles.backdropPress} onPress={handleCancel} />
        <Animated.View
          style={[
            styles.alertContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Icono */}
          <View style={[styles.iconContainer, { backgroundColor: `${icon.color}15` }]}>
            <Ionicons name={icon.name} size={32} color={icon.color} />
          </View>

          {/* Título */}
          <Text style={styles.title}>{title}</Text>

          {/* Mensaje */}
          {message && <Text style={styles.message}>{message}</Text>}

          {/* Botones */}
          <View style={styles.buttonContainer}>
            {type === 'confirm' && (
              <Pressable
                onPress={handleCancel}
                style={({ pressed }) => [
                  styles.button,
                  styles.cancelButton,
                  pressed && styles.buttonPressed,
                ]}
              >
                <Text style={styles.cancelButtonText}>{cancelText}</Text>
              </Pressable>
            )}
            <Pressable
              onPress={handleConfirm}
              style={({ pressed }) => [
                styles.button,
                styles.confirmButton,
                { backgroundColor: icon.color },
                pressed && styles.buttonPressed,
              ]}
            >
              <Text style={styles.confirmButtonText}>{confirmText}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  backdropPress: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  alertContainer: {
    backgroundColor: '#1f2937',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 15,
    color: '#9ca3af',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButton: {
    backgroundColor: '#374151',
  },
  confirmButton: {
    // Color dinámico según tipo
  },
  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  cancelButtonText: {
    color: '#d1d5db',
    fontSize: 16,
    fontWeight: '700',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});

// Hook para usar alertas fácilmente
export function useModernAlert() {
  const [alertConfig, setAlertConfig] = useState<ModernAlertProps | null>(null);

  const showAlert = (config: Omit<ModernAlertProps, 'visible' | 'onDismiss'>) => {
    setAlertConfig({
      ...config,
      visible: true,
      onDismiss: () => setAlertConfig(null),
    });
  };

  const AlertComponent = alertConfig ? <ModernAlert {...alertConfig} /> : null;

  return { showAlert, AlertComponent };
}
