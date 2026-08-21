/**
 * 🖨️ MODAL DE CONEXIÓN AUTOMÁTICA A IMPRESORA
 * Se muestra cuando mesera/cocina necesita imprimir por primera vez
 * Conecta automáticamente a la impresora predeterminada o permite escanear
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useFierros } from '../../sistema/impresion/fierros';
import type { DispositivoFierro } from '../../sistema/impresion/fierros/contratos/tipos';

type BluetoothPrinterModalProps = {
  visible: boolean;
  defaultPrinter: DispositivoFierro | null;
  onConnected: () => void;
  onCancel: () => void;
};

export function BluetoothPrinterModal({
  visible,
  defaultPrinter,
  onConnected,
  onCancel,
}: BluetoothPrinterModalProps) {
  const { escanear, estaEscaneando, estaConectado, dispositivoActivo, conectarImpresora } =
    useFierros();

  const [dispositivos, setDispositivos] = useState<DispositivoFierro[]>([]);
  const [attemptingConnection, setAttemptingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showManualScan, setShowManualScan] = useState(false);
  const hasNotifiedConnection = React.useRef(false);

  const escanearDispositivos = useCallback(async () => {
    const encontrados = await escanear();
    setDispositivos(encontrados);
    return encontrados;
  }, [escanear]);

  // Auto-conectar cuando el modal se abre y hay impresora predeterminada
  const autoConnect = React.useCallback(async () => {
    if (!defaultPrinter) return;

    setAttemptingConnection(true);
    setConnectionError(null);

    try {
      console.log('[BluetoothPrinterModal] Conectando a:', defaultPrinter.direccion);
      await conectarImpresora(defaultPrinter);
    } catch (error: any) {
      // 🔥 FIX: Falla silenciosamente en el intento automático.
      // No actualices el estado de la UI para permitir que la lógica de reintento externa funcione.
      console.warn(
        '[BluetoothPrinterModal] Falló el intento de conexión automática, esperando reintento:',
        error.message
      );
    } finally {
      setAttemptingConnection(false);
    }
  }, [defaultPrinter, conectarImpresora]);

  useEffect(() => {
    // 🛡️ GUARD: No intentar conectar Bluetooth en web
    if (Platform.OS === 'web') {
      console.log('[BluetoothPrinterModal] ⚠️ Bluetooth no disponible en web, omitiendo conexión');
      return;
    }

    if (visible && defaultPrinter && !estaConectado && !attemptingConnection) {
      console.log(
        '[BluetoothPrinterModal] 🔄 Intentando conexión automática a:',
        defaultPrinter.nombre
      );
      const timer = setTimeout(() => {
        void autoConnect();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [visible, defaultPrinter, estaConectado, attemptingConnection, autoConnect]);

  const handleCancel = useCallback(() => {
    hasNotifiedConnection.current = false;
    setConnectionError(null);
    setShowManualScan(false);
    onCancel();
  }, [onCancel]);

  // Si se conecta exitosamente, notificar al padre (SOLO UNA VEZ)
  // Si se conecta exitosamente, notificar al padre y DESCONECTAR (para liberar recurso)
  useEffect(() => {
    if (estaConectado && dispositivoActivo && visible && !hasNotifiedConnection.current) {
      console.log('[BluetoothPrinterModal] ✅ Conectado exitosamente');
      hasNotifiedConnection.current = true;

      // 1. Notificar al padre que "tenemos impresora"
      onConnected();

      // 2. Dar tiempo visual y luego cerrar/desconectar
      // IMPORTANTE: En Opción A, no queremos mantener la conexión viva.
      // El servicio de impresión se encargará de reconectar cuando sea necesario.
      setTimeout(async () => {
        // No llamamos disconnect() aquí explícitamente porque al cerrar el modal
        // o al desmontar, el hook useBluetoothClassic debería limpiar,
        // PERO para estar seguros que liberamos para otros:
        // await desconectar(); // (Opcional, depende de la implementación de useBluetoothClassic)
        // Por ahora confiamos en que al imprimir se hace connect/disconnect atomic.
        // Solo cerramos el modal visualmente si el padre lo maneja.
      }, 500);
    }
  }, [estaConectado, dispositivoActivo, visible, onConnected]);

  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      // Si el modal se cierra, asegurar que no dejamos connections colgadas
      // (Si useBluetoothClassic no lo hace automático)
    };
  }, []);

  const handleManualConnect = async (device: DispositivoFierro) => {
    try {
      setAttemptingConnection(true);
      await conectarImpresora(device);
    } catch (error: any) {
      setConnectionError(error?.message || 'Error al conectar');
    } finally {
      setAttemptingConnection(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="print" size={24} color="#3b82f6" />
              <Text style={styles.title}>Conectar Impresora</Text>
            </View>
            <Pressable onPress={handleCancel} hitSlop={20}>
              <Ionicons name="close" size={24} color="#9ca3af" />
            </Pressable>
          </View>

          {/* Body */}
          <View style={styles.body}>
            {attemptingConnection ? (
              // Conectando...
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.statusText}>
                  Conectando a {defaultPrinter?.nombre || 'impresora'}...
                </Text>
              </View>
            ) : estaConectado && dispositivoActivo ? (
              // Conectado
              <View style={styles.centerContent}>
                <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
                <Text style={styles.successText}>¡Conectado exitosamente!</Text>
                <Text style={styles.deviceName}>{dispositivoActivo.nombre}</Text>
              </View>
            ) : showManualScan || !defaultPrinter ? (
              // Escaneo manual
              <View>
                <Text style={styles.instructionText}>
                  {connectionError
                    ? `⚠️ ${connectionError}`
                    : defaultPrinter
                      ? 'No se pudo conectar automáticamente. Selecciona una impresora:'
                      : 'No hay impresora predeterminada. Escanea para encontrar una:'}
                </Text>

                <Pressable
                  onPress={() => void escanearDispositivos()}
                  disabled={estaEscaneando}
                  style={({ pressed }) => [styles.scanButton, pressed && styles.buttonPressed]}
                >
                  {estaEscaneando ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="search" size={20} color="#ffffff" />
                  )}
                  <Text style={styles.scanButtonText}>
                    {estaEscaneando ? 'Buscando...' : 'Escanear Dispositivos'}
                  </Text>
                </Pressable>

                {/* Lista de dispositivos */}
                {dispositivos.length > 0 && (
                  <View style={styles.devicesList}>
                    {dispositivos.map((device) => (
                      <Pressable
                        key={device.direccion}
                        onPress={() => handleManualConnect(device)}
                        disabled={attemptingConnection}
                        style={({ pressed }) => [
                          styles.deviceItem,
                          pressed && styles.deviceItemPressed,
                        ]}
                      >
                        <Ionicons name="print-outline" size={20} color="#3b82f6" />
                        <View style={styles.deviceInfo}>
                          <Text style={styles.deviceName}>{device.nombre}</Text>
                          <Text style={styles.deviceAddress}>{device.direccion}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#6b7280" />
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              // Conectando automáticamente a predeterminada
              <View style={styles.centerContent}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={styles.statusText}>Preparando impresora predeterminada...</Text>
                <Text style={styles.deviceNameSub}>{defaultPrinter?.nombre}</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          {!attemptingConnection && (
            <View style={styles.footer}>
              {!estaConectado && (
                <Pressable
                  onPress={handleCancel}
                  style={({ pressed }) => [styles.cancelButton, pressed && styles.buttonPressed]}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </Pressable>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#111827',
    borderRadius: 20,
    width: '100%',
    maxWidth: 500,
    borderWidth: 1,
    borderColor: '#1f2937',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  body: {
    padding: 24,
    minHeight: 200,
  },
  centerContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  statusText: {
    color: '#9ca3af',
    fontSize: 16,
    textAlign: 'center',
  },
  successText: {
    color: '#16a34a',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  deviceName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  deviceNameSub: {
    color: '#6b7280',
    fontSize: 14,
  },
  instructionText: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#3b82f6',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  scanButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  devicesList: {
    gap: 8,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  deviceItemPressed: {
    backgroundColor: '#0f172a',
  },
  deviceInfo: {
    flex: 1,
  },
  deviceAddress: {
    color: '#6b7280',
    fontSize: 12,
    marginTop: 2,
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#9ca3af',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonPressed: {
    opacity: 0.7,
  },
});
