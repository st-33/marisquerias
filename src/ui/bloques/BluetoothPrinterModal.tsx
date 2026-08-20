/**
 * 🖨️ MODAL DE CONEXIÓN AUTOMÁTICA A IMPRESORA
 * Se muestra cuando mesera/cocina necesita imprimir por primera vez
 * Conecta automáticamente a la impresora predeterminada o permite escanear
 */

import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ---- REPARACIÓN TEMPORAL ---
// El hook 'useBluetoothClassic' ha sido eliminado.
// Se inyecta un hook falso para prevenir errores de compilación.
// TODO: Reemplazar esto con el futuro 'useHardware()' del ProveedorHardware.
type PlaceholderBluetoothDevice = {
  id: string;
  name: string;
  address: string;
};

type PlaceholderConnectArgs = {
  id: string;
  name: string;
};

const useBluetoothClassic_placeholder = () => ({
  devices: [] as PlaceholderBluetoothDevice[],
  isScanning: false,
  isConnected: false,
  connectedDevice: null as PlaceholderBluetoothDevice | null,
  scan: async () => {
    console.warn("Función 'scan' no implementada.");
  },
  connect: async (_args: PlaceholderConnectArgs) => {
    console.warn("Función 'connect' no implementada.");
    return false;
  },
});
// -----------------------------

type BluetoothPrinterModalProps = {
  visible: boolean;
  defaultPrinter: { address: string; name: string } | null;
  onConnected: () => void;
  onCancel: () => void;
};

export function BluetoothPrinterModal({
  visible,
  defaultPrinter,
  onConnected,
  onCancel,
}: BluetoothPrinterModalProps) {
  const { devices, isScanning, isConnected, connectedDevice, scan, connect } =
    useBluetoothClassic_placeholder();

  const [attemptingConnection, setAttemptingConnection] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showManualScan, setShowManualScan] = useState(false);
  const hasNotifiedConnection = React.useRef(false);

  // Auto-conectar cuando el modal se abre y hay impresora predeterminada
  const autoConnect = React.useCallback(async () => {
    if (!defaultPrinter) return;

    setAttemptingConnection(true);
    setConnectionError(null);

    try {
      console.log('[BluetoothPrinterModal] Conectando a:', defaultPrinter.address);
      const success = await connect({
        id: defaultPrinter.address,
        name: defaultPrinter.name,
      });

      if (!success) {
        // No lanzar un error, solo registrarlo. La lógica de reintento se encargará.
        console.warn('[BluetoothPrinterModal] Intento de conexión no exitoso.');
      }
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
  }, [defaultPrinter, connect]);

  useEffect(() => {
    // 🛡️ GUARD: No intentar conectar Bluetooth en web
    if (Platform.OS === 'web') {
      console.log('[BluetoothPrinterModal] ⚠️ Bluetooth no disponible en web, omitiendo conexión');
      return;
    }

    if (visible && defaultPrinter && !isConnected && !attemptingConnection) {
      console.log(
        '[BluetoothPrinterModal] 🔄 Intentando conexión automática a:',
        defaultPrinter.name
      );
      autoConnect();
    }
  }, [visible, defaultPrinter, isConnected, attemptingConnection, autoConnect]);

  // Resetear flag cuando el modal se cierra
  useEffect(() => {
    if (!visible) {
      hasNotifiedConnection.current = false;
      setConnectionError(null);
      setShowManualScan(false);
    }
  }, [visible]);

  // Si se conecta exitosamente, notificar al padre (SOLO UNA VEZ)
  // Si se conecta exitosamente, notificar al padre y DESCONECTAR (para liberar recurso)
  useEffect(() => {
    if (isConnected && connectedDevice && visible && !hasNotifiedConnection.current) {
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
        // await disconnect(connectedDevice.address); // (Opcional, depende de la implementación de useBluetoothClassic)
        // Por ahora confiamos en que al imprimir se hace connect/disconnect atomic.
        // Solo cerramos el modal visualmente si el padre lo maneja.
      }, 500);
    }
  }, [isConnected, connectedDevice, visible, onConnected]);

  // Clean up on unmount or close
  useEffect(() => {
    return () => {
      // Si el modal se cierra, asegurar que no dejamos connections colgadas
      // (Si useBluetoothClassic no lo hace automático)
    };
  }, []);

  const handleManualConnect = async (device: { id: string; name: string; address: string }) => {
    try {
      setAttemptingConnection(true);
      const success = await connect({
        id: device.address,
        name: device.name,
      });
      if (!success) {
        setConnectionError('No se pudo conectar');
      }
    } catch (error: any) {
      setConnectionError(error?.message || 'Error al conectar');
    } finally {
      setAttemptingConnection(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Ionicons name="print" size={24} color="#3b82f6" />
              <Text style={styles.title}>Conectar Impresora</Text>
            </View>
            <Pressable onPress={onCancel} hitSlop={20}>
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
                  Conectando a {defaultPrinter?.name || 'impresora'}...
                </Text>
              </View>
            ) : isConnected && connectedDevice ? (
              // Conectado
              <View style={styles.centerContent}>
                <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
                <Text style={styles.successText}>¡Conectado exitosamente!</Text>
                <Text style={styles.deviceName}>{connectedDevice.name}</Text>
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
                  onPress={scan}
                  disabled={isScanning}
                  style={({ pressed }) => [styles.scanButton, pressed && styles.buttonPressed]}
                >
                  {isScanning ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Ionicons name="search" size={20} color="#ffffff" />
                  )}
                  <Text style={styles.scanButtonText}>
                    {isScanning ? 'Buscando...' : 'Escanear Dispositivos'}
                  </Text>
                </Pressable>

                {/* Lista de dispositivos */}
                {devices.length > 0 && (
                  <View style={styles.devicesList}>
                    {devices.map((device) => (
                      <Pressable
                        key={device.id}
                        onPress={() => handleManualConnect(device)}
                        disabled={attemptingConnection}
                        style={({ pressed }) => [
                          styles.deviceItem,
                          pressed && styles.deviceItemPressed,
                        ]}
                      >
                        <Ionicons name="print-outline" size={20} color="#3b82f6" />
                        <View style={styles.deviceInfo}>
                          <Text style={styles.deviceName}>{device.name}</Text>
                          <Text style={styles.deviceAddress}>{device.address}</Text>
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
                <Text style={styles.deviceNameSub}>{defaultPrinter?.name}</Text>
              </View>
            )}
          </View>

          {/* Footer */}
          {!attemptingConnection && (
            <View style={styles.footer}>
              {!isConnected && (
                <Pressable
                  onPress={onCancel}
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
