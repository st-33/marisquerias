import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';

import { useSesion } from '../../../src/sistema/store';
import { useFierros } from '../../../src/sistema/impresion/fierros';
import type { DispositivoFierro } from '../../../src/sistema/impresion/fierros/contratos/tipos';
import { useConfiguracionTenant } from '../../../src/sistema/proveedores/ProveedorConfiguracionTenant';
import { useDevicesManagement } from '../../../src/capacidades/admin';

type HubDestino = 'restaurante' | 'venta_crudo' | null;
type TabActiva = 'impresoras' | 'basculas';

export default function AdminDeviceSettings() {
  const {
    escanear,
    conectarImpresora,
    conectarBascula,
    desconectar,
    imprimirCuenta,
    imprimirTicketVenta,
    estaConectando,
    estaConectado,
    dispositivoActivo,
    basculaActiva,
    error: hardwareError,
  } = useFierros();
  const {
    config: tenantConfig,
    isLoading: isConfigLoading,
    error: configError,
  } = useConfiguracionTenant();

  const [scannedDevices, setScannedDevices] = useState<DispositivoFierro[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);

  // 🔌 MODO HUB DUAL
  const { tenantPath } = useSesion();
  const { hubConfig, actions: deviceActions } = useDevicesManagement();

  const [isHubEnabled, setIsHubEnabled] = useState(false);
  const [hubDeviceId, setHubDeviceId] = useState<string>('hub_local');
  const [hubDestino, setHubDestino] = useState<HubDestino>(null);

  // 📑 TABS
  const [tabActiva, setTabActiva] = useState<TabActiva>('impresoras');

  const cambiarTab = (tab: TabActiva) => {
    setTabActiva(tab);
    setScannedDevices([]);
    setIsScanning(false);
  };

  // Cargar estado del Hub al inicio
  useEffect(() => {
    (async () => {
      try {
        const [enabled, destino, deviceId] = await Promise.all([
          AsyncStorage.getItem('adi_hub_mode_enabled'),
          AsyncStorage.getItem('adi_hub_destino'),
          AsyncStorage.getItem('adi_hub_device_id'),
        ]);

        setIsHubEnabled(enabled === 'true');
        setHubDestino((destino as HubDestino) || null);

        if (deviceId) {
          setHubDeviceId(deviceId);
        } else {
          const generated = dispositivoActivo?.direccion
            ? `hub_${dispositivoActivo.direccion}`
            : `hub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}`;
          await AsyncStorage.setItem('adi_hub_device_id', generated);
          setHubDeviceId(generated);
        }
      } catch (e) {
        console.warn('No se pudo cargar config de Hub', e);
      }
    })();
  }, [dispositivoActivo?.direccion]);

  // Sincronizar con la nube cuando esté disponible
  useEffect(() => {
    if (hubConfig) {
      const enabled = !!hubConfig.enabled;
      if (isHubEnabled !== enabled) {
        /* eslint-disable-next-line react-hooks/set-state-in-effect */
        setIsHubEnabled(enabled);
      }
      if (hubConfig.destination !== undefined && hubDestino !== hubConfig.destination) {
        setHubDestino(hubConfig.destination);
      }
      if (hubConfig.deviceId && hubDeviceId !== hubConfig.deviceId) {
        setHubDeviceId(hubConfig.deviceId);
      }
    }
  }, [hubConfig, isHubEnabled, hubDestino, hubDeviceId]);

  const toggleHubMode = async (value: boolean) => {
    if (value && !hubDestino) {
      Alert.alert(
        'Selecciona destino',
        'Primero debes elegir si este Hub es para Restaurante o Mostrador'
      );
      return;
    }

    try {
      setIsHubEnabled(value);
      await AsyncStorage.setItem('adi_hub_mode_enabled', String(value));

      // 🔥 SYNC TO CLOUD via useDevicesManagement
      await deviceActions.establecerHubConfig({
        enabled: value,
        destination: hubDestino,
        updatedAt: Date.now(),
        deviceId: hubDeviceId,
      });
    } catch {
      Alert.alert('Error', 'No se pudo sincronizar el Hub con la nube');
    }
  };

  const selectHubDestino = async (destino: HubDestino) => {
    if (isHubEnabled) {
      Alert.alert('Hub activo', 'Desactiva el Hub Central antes de cambiar el destino');
      return;
    }
    setHubDestino(destino);
    await AsyncStorage.setItem('adi_hub_destino', destino || '');

    // Sync destination change to cloud via useDevicesManagement
    await deviceActions.actualizarHubConfig({
      destination: destino,
      updatedAt: Date.now(),
    });
  };

  const handleScan = async () => {
    setIsScanning(true);
    setScannedDevices([]);
    try {
      const devices = await escanear();
      setScannedDevices(devices);
    } catch (e: any) {
      Alert.alert('Error al escanear', e.message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleConnectPrinter = async (device: DispositivoFierro) => {
    try {
      await conectarImpresora(device);
    } catch (e: any) {
      Alert.alert('Error de Conexión', e.message);
    }
  };

  const handleConnectScale = async (device: DispositivoFierro) => {
    try {
      await conectarBascula(device);
    } catch (e: any) {
      Alert.alert('Error al conectar báscula', e.message);
    }
  };

  const handleTestPrint = useCallback(async () => {
    if (!estaConectado || !tenantConfig) {
      Alert.alert(
        'Error',
        'Asegúrese de que la impresora esté conectada y la configuración cargada.'
      );
      return;
    }

    const ticketConfig = {
      nombreNegocio: tenantConfig?.ticket?.header || 'Mi Negocio',
      mensajeFinal: tenantConfig?.ticket?.footer || 'Gracias',
    };

    try {
      Alert.alert('Imprimiendo...', 'Enviando un ticket de prueba.');

      if (hubDestino === 'venta_crudo') {
        // Test Mostrador format (Weighted items)
        await imprimirTicketVenta(
          {
            items: [
              {
                nombre: 'PRODUCTO PRUEBA KG',
                cantidad: 1.255,
                precio: 100,
                unidad: 'kg',
                subtotal: 125.5,
              },
              {
                nombre: 'PRODUCTO PRUEBA PZA',
                cantidad: 2,
                precio: 50,
                unidad: 'pza',
                subtotal: 100,
              },
            ],
            total: 225.5,
            timestamp: Date.now(),
          },
          {
            ...ticketConfig,
            encabezado: ticketConfig.nombreNegocio,
          }
        );
      } else {
        // Standard Restaurant format
        await imprimirCuenta(
          {
            mesaId: 'PRUEBA',
            tipo: 'local',
            items: [
              { nombre: 'Producto de Prueba 1', precio: 10.0, cantidad: 2 },
              { nombre: 'Producto de Prueba 2', precio: 5.5, cantidad: 1 },
            ],
            totales: { subtotal: 25.5, total: 25.5 },
            timestamp: Date.now(),
          },
          { rol: 'admin', nombreNegocio: ticketConfig.nombreNegocio }
        );
      }
    } catch (e: any) {
      Alert.alert('Error de Impresión', e.message);
    }
  }, [estaConectado, tenantConfig, imprimirCuenta, imprimirTicketVenta, hubDestino]);

  if (isConfigLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  // ===================== RENDER =====================

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      {/* HEADER CON TABS */}
      <View style={styles.header}>
        <Text style={styles.title}>Dispositivos</Text>
        <View style={styles.tabsContainer}>
          <Pressable
            style={[styles.tab, tabActiva === 'impresoras' && styles.tabActive]}
            onPress={() => cambiarTab('impresoras')}
          >
            <Ionicons
              name="print"
              size={20}
              color={tabActiva === 'impresoras' ? '#fff' : '#94a3b8'}
            />
          </Pressable>
          <Pressable
            style={[styles.tab, tabActiva === 'basculas' && styles.tabActive]}
            onPress={() => cambiarTab('basculas')}
          >
            <Ionicons
              name="scale"
              size={20}
              color={tabActiva === 'basculas' ? '#fff' : '#94a3b8'}
            />
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* ============== TAB IMPRESORAS ============== */}
        {tabActiva === 'impresoras' && (
          <>
            {/* 1. SELECTOR DE DESTINO HUB */}
            {tenantPath && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderCol}>
                  <Text style={styles.sectionTitle}>1. Destino del Hub</Text>
                  <Text style={styles.sectionDesc}>¿Qué rol operará este dispositivo?</Text>
                </View>

                <View style={styles.destinoContainer}>
                  <Pressable
                    style={[
                      styles.destinoBtn,
                      hubDestino === 'restaurante' && styles.destinoBtnActive,
                      isHubEnabled && styles.destinoBtnDisabled,
                    ]}
                    onPress={() => selectHubDestino('restaurante')}
                    disabled={isHubEnabled}
                  >
                    <Ionicons
                      name="restaurant"
                      size={24}
                      color={hubDestino === 'restaurante' ? '#fff' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.destinoText,
                        hubDestino === 'restaurante' && styles.destinoTextActive,
                      ]}
                    >
                      Restaurante
                    </Text>
                  </Pressable>
                  {/* MOSTRADOR OPTION - FEATURE GATED */}
                  {tenantConfig?.features?.module_venta_crudo !== false && (
                    <Pressable
                      style={[
                        styles.destinoBtn,
                        hubDestino === 'venta_crudo' && styles.destinoBtnActive,
                        isHubEnabled && styles.destinoBtnDisabled,
                      ]}
                      onPress={() => selectHubDestino('venta_crudo')}
                      disabled={isHubEnabled}
                    >
                      <Ionicons
                        name="storefront"
                        size={24}
                        color={hubDestino === 'venta_crudo' ? '#fff' : '#64748b'}
                      />
                      <Text
                        style={[
                          styles.destinoText,
                          hubDestino === 'venta_crudo' && styles.destinoTextActive,
                        ]}
                      >
                        Mostrador
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            )}

            {/* 2. MODO HUB SWITCH */}
            {tenantPath && (
              <View style={[styles.hubSection, !hubDestino && styles.hubSectionDisabled]}>
                <View style={styles.hubHeader}>
                  <View style={styles.hubIconContainer}>
                    <Ionicons name="server" size={24} color={hubDestino ? '#3b82f6' : '#475569'} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.hubTitle, !hubDestino && styles.textDisabled]}>
                      2. Modo Hub Central
                    </Text>
                    <Text style={[styles.hubDesc, !hubDestino && styles.textDisabled]}>
                      {hubDestino
                        ? `Convertir en servidor de impresión para ${
                            hubDestino === 'restaurante' ? 'Restaurante' : 'Mostrador'
                          }`
                        : 'Selecciona un destino arriba para activar'}
                    </Text>
                  </View>
                  <Switch
                    value={isHubEnabled}
                    onValueChange={toggleHubMode}
                    trackColor={{ false: '#334155', true: '#3b82f6' }}
                    thumbColor={isHubEnabled ? '#ffffff' : '#94a3b8'}
                    disabled={!hubDestino && !isHubEnabled} // Permite apagarlo siempre
                  />
                </View>
              </View>
            )}

            {/* 3. IMPRESORA BLUETOOTH */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>3. Impresora Bluetooth</Text>
                {isScanning && <ActivityIndicator size="small" color="#3b82f6" />}
              </View>

              {hardwareError && <Text style={styles.errorText}>{hardwareError}</Text>}

              {estaConectado && dispositivoActivo ? (
                <View style={styles.connectedView}>
                  <View style={styles.connectedInfo}>
                    <Ionicons name="checkmark-circle" size={24} color="#22c55e" />
                    <View>
                      <Text style={styles.successText}>{dispositivoActivo.nombre}</Text>
                      <Text style={styles.deviceAddress}>{dispositivoActivo.direccion}</Text>
                    </View>
                  </View>
                  <Pressable style={styles.buttonOutline} onPress={desconectar}>
                    <Text style={styles.buttonOutlineText}>Desconectar</Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable style={styles.button} onPress={handleScan} disabled={isScanning}>
                  <Ionicons name="search" size={20} color="#fff" />
                  <Text style={styles.buttonText}>
                    {isScanning ? 'Buscando...' : 'Buscar Impresoras'}
                  </Text>
                </Pressable>
              )}

              {!estaConectado &&
                scannedDevices.map((device) => (
                  <Pressable
                    key={device.direccion}
                    style={styles.deviceItem}
                    onPress={() => {
                      setConnectingDeviceId(device.direccion);
                      handleConnectPrinter(device).finally(() => setConnectingDeviceId(null));
                    }}
                    disabled={estaConectando}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deviceText}>{device.nombre}</Text>
                      <Text style={styles.deviceAddress}>{device.direccion}</Text>
                    </View>
                    {estaConectando && connectingDeviceId === device.direccion ? (
                      <ActivityIndicator color="#3b82f6" />
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color="#475569" />
                    )}
                  </Pressable>
                ))}
            </View>

            {/* 4. VISTA PREVIA TICKET */}
            {configError && (
              <Text style={styles.errorText}>Error al cargar config: {configError.message}</Text>
            )}
            {tenantConfig && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vista Previa del Ticket</Text>
                <View style={styles.ticketPreview}>
                  <Text style={styles.ticketText}>
                    {tenantConfig?.ticket?.header || 'Nombre del Negocio'}
                  </Text>
                  <Text style={styles.ticketText}>--------------------------------</Text>
                  <Text style={styles.ticketText}>PRODUCTO CANT X PRECIO</Text>
                  <Text style={styles.ticketText}>--------------------------------</Text>
                  <Text style={styles.ticketText}>Producto 1 1 x $10.00</Text>
                  <Text style={styles.ticketText}>Producto 2 2 x $5.00</Text>
                  <Text style={styles.ticketText}>--------------------------------</Text>
                  <Text style={styles.ticketText}>TOTAL: $20.00</Text>

                  <Text style={styles.ticketText}>
                    {tenantConfig?.ticket?.footer || 'Mensaje de Despedida'}
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* ============== TAB BÁSCULAS ============== */}
        {tabActiva === 'basculas' && (
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Básculas Conectadas</Text>
              {isScanning && <ActivityIndicator size="small" color="#3b82f6" />}
            </View>
            <Text style={styles.sectionDesc}>Conecta básculas digitales para Mostrador.</Text>

            {basculaActiva ? (
              <View style={styles.connectedView}>
                <View style={styles.connectedInfo}>
                  <Ionicons name="scale" size={24} color="#22c55e" />
                  <View>
                    <Text style={styles.successText}>{basculaActiva.nombre}</Text>
                    <Text style={styles.deviceAddress}>{basculaActiva.direccion}</Text>
                    <Text style={[styles.deviceAddress, { color: '#f59e0b' }]}>ID Lógico: #1</Text>
                  </View>
                </View>
                {/* TODO: Add desconectar scale method if available */}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="scale-outline" size={48} color="#475569" />
                <Text style={styles.emptyText}>No hay báscula activa</Text>
              </View>
            )}

            <Pressable style={styles.button} onPress={handleScan} disabled={isScanning}>
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.buttonText}>
                {isScanning ? 'Buscando disponiles...' : 'Buscar Básculas'}
              </Text>
            </Pressable>

            {scannedDevices.map((device) => (
              <Pressable
                key={device.direccion}
                style={styles.deviceItem}
                onPress={() => {
                  setConnectingDeviceId(device.direccion);
                  handleConnectScale(device).finally(() => setConnectingDeviceId(null));
                }}
                disabled={estaConectando}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.deviceText}>{device.nombre}</Text>
                  <Text style={styles.deviceAddress}>{device.direccion}</Text>
                </View>
                {estaConectando && connectingDeviceId === device.direccion ? (
                  <ActivityIndicator color="#3b82f6" />
                ) : (
                  <Ionicons name="add-circle-outline" size={24} color="#3b82f6" />
                )}
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>

      {/* FOOTER - SOLO EN TAB IMPRESORAS */}
      {tabActiva === 'impresoras' && (
        <View style={styles.footerActions}>
          <Pressable
            style={[styles.buttonSave, (!estaConectado || estaConectando) && styles.buttonDisabled]}
            onPress={handleTestPrint}
            disabled={!estaConectado || estaConectando}
          >
            <Ionicons name="receipt" size={20} color="#fff" />
            <Text style={styles.buttonText}>Imprimir Prueba</Text>
          </Pressable>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  // Gap handling in ScrollView is better than padding everything
  scrollContent: { padding: 16, paddingBottom: 100 },

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1e293b',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  title: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#0f172a',
    borderRadius: 8,
    padding: 3,
    gap: 4,
  },
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  tabActive: {
    backgroundColor: '#3b82f6',
  },

  // Sections
  section: {
    marginBottom: 24,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sectionHeaderCol: { marginBottom: 16 },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { color: '#f1f5f9', fontSize: 16, fontWeight: '700' },
  sectionDesc: { color: '#94a3b8', fontSize: 13, marginTop: 4 },

  // Destino Hub
  destinoContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  destinoBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#334155',
  },
  destinoBtnActive: {
    backgroundColor: '#1e3a5f',
    borderColor: '#3b82f6',
  },
  destinoBtnDisabled: {
    opacity: 0.5,
  },
  destinoText: { color: '#94a3b8', fontSize: 14, fontWeight: '600' },
  destinoTextActive: { color: '#fff' },

  // Hub Section
  hubSection: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
    marginBottom: 24,
  },
  hubSectionDisabled: {
    borderColor: '#334155',
    opacity: 0.8,
  },
  hubHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  hubIconContainer: { padding: 10, backgroundColor: '#1e3a5f', borderRadius: 8 },
  hubTitle: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  hubDesc: { color: '#94a3b8', fontSize: 13, marginTop: 2 },
  textDisabled: { color: '#64748b' },

  // Buttons
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#3b82f6',
    padding: 14,
    borderRadius: 10,
    marginTop: 8,
  },
  buttonText: { color: '#ffffff', fontSize: 14, fontWeight: '600' },
  buttonDisabled: { backgroundColor: '#334155', opacity: 0.5 },
  buttonOutline: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#ef4444',
  },
  buttonOutlineText: { color: '#ef4444', fontSize: 13, fontWeight: '600' },

  // Device Items
  deviceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
    backgroundColor: '#0f172a',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
    marginTop: 10,
  },
  deviceText: { color: '#f1f5f9', fontSize: 15, fontWeight: '500' },
  deviceAddress: { color: '#64748b', fontSize: 12, marginTop: 2 },

  // Connected
  connectedView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#22c55e',
    marginBottom: 16,
  },
  connectedInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  successText: { color: '#22c55e', fontSize: 16, fontWeight: '600' },
  errorText: { color: '#f87171', fontSize: 14, textAlign: 'center', marginBottom: 12 },

  // Ticket Preview
  ticketPreview: {
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  ticketText: {
    color: '#334155',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 16,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 8,
  },
  emptyText: { color: '#64748b', fontSize: 14 },

  // Footer
  footerActions: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: '#1e293b',
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  buttonSave: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#16a34a',
    padding: 16,
    borderRadius: 12,
  },
});
