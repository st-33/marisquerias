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

import { useSesion, useStore } from '../../../src/sistema/store';
import { useEstadoHub, useFierros } from '../../../src/sistema/impresion/fierros';
import type { DispositivoFierro } from '../../../src/sistema/impresion/fierros/contratos/tipos';
import { useConfiguracionNegocio } from '../../../src/sistema/proveedores/ProveedorConfiguracionNegocio';
import { useDevicesManagement } from '../../../src/capacidades/dispositivos';

type HubDestino = 'restaurante' | 'mostrador' | 'venta_crudo' | null;
type TabActiva = 'impresoras' | 'basculas';

const normalizarDestino = (d?: string | null): 'restaurante' | 'mostrador' =>
  d === 'venta_crudo' || d === 'mostrador' ? 'mostrador' : 'restaurante';

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
    config: negocioConfig,
    isLoading: isConfigLoading,
    error: configError,
  } = useConfiguracionNegocio();

  const [scannedDevices, setScannedDevices] = useState<DispositivoFierro[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [connectingDeviceId, setConnectingDeviceId] = useState<string | null>(null);

  // 🔌 MODO HUB POR DISPOSITIVO FÍSICO
  const { rutaNegocio } = useSesion();
  const { hubsMap, actions: deviceActions } = useDevicesManagement();
  const { activarHub, desactivarHub, setDestino: setDestinoLocalHub } = useEstadoHub();

  const [hubDeviceId, setHubDeviceId] = useState<string | null>(null);
  const [localDestino, setLocalDestino] = useState<HubDestino>(null);
  const esWeb = Platform.OS === 'web';

  const estadoEncendido = useStore((s) => s.estadoEncendido);
  const esPlantilla = estadoEncendido?.tipo_acceso === 'plantilla';
  const caps = (estadoEncendido?.capacidades_activas ||
    (estadoEncendido as any)?.activos?.capacidades ||
    []) as string[];
  const roles = (estadoEncendido?.roles_activos ||
    (estadoEncendido as any)?.activos?.roles ||
    []) as string[];
  const tieneMostrador = Boolean(
    estadoEncendido &&
    (esPlantilla ||
      caps.includes('mostrador_y_pos') ||
      caps.includes('mostrador') ||
      roles.includes('mostrador'))
  );

  // Determinar si ESTE dispositivo físico es el dueño de alguno de los Hubs en la nube
  const miHubActivoEnCloud: 'restaurante' | 'mostrador' | null =
    hubDeviceId &&
    (hubsMap?.mostrador?.enabled || hubsMap?.venta_crudo?.enabled) &&
    (hubsMap?.mostrador?.deviceId === hubDeviceId || hubsMap?.venta_crudo?.deviceId === hubDeviceId)
      ? 'mostrador'
      : hubDeviceId &&
          hubsMap?.restaurante?.enabled &&
          hubsMap?.restaurante?.deviceId === hubDeviceId
        ? 'restaurante'
        : null;

  const destinoSeleccionado: 'restaurante' | 'mostrador' = tieneMostrador
    ? normalizarDestino(localDestino || miHubActivoEnCloud || 'restaurante')
    : 'restaurante';

  const configDelDestinoActual =
    destinoSeleccionado === 'mostrador'
      ? hubsMap?.mostrador || hubsMap?.venta_crudo
      : hubsMap?.restaurante;

  const isHubEnabled = Boolean(
    !esWeb &&
      hubDeviceId &&
      configDelDestinoActual?.enabled === true &&
      configDelDestinoActual?.deviceId === hubDeviceId
  );
  const otroDispositivoEnDestino = Boolean(
    configDelDestinoActual?.enabled === true &&
      configDelDestinoActual?.deviceId &&
      hubDeviceId &&
      configDelDestinoActual.deviceId !== hubDeviceId
  );
  const effectiveHubDeviceId = hubDeviceId || '';

  // 🖨️ CONDICIÓN ESTRICTA: El Modo Hub solo puede activarse si ESTE dispositivo físico
  // tiene una impresora Bluetooth conectada y sincronizada en verde (estaConectado).
  const puedeActivarHub = Boolean(!esWeb && estaConectado && dispositivoActivo);

  // 📑 TABS
  const [tabActiva, setTabActiva] = useState<TabActiva>('impresoras');

  const cambiarTab = (tab: TabActiva) => {
    setTabActiva(tab);
    setScannedDevices([]);
    setIsScanning(false);
  };

  // Cargar identidad persistente y destino preferido del dispositivo físico local
  useEffect(() => {
    let activo = true;

    const cargarIdentidadLocal = async () => {
      try {
        const [storedDevId, storedDestino] = await Promise.all([
          AsyncStorage.getItem('adi_hub_device_id'),
          AsyncStorage.getItem('adi_hub_destino'),
        ]);
        let devId = storedDevId;
        if (!devId) {
          const { resolverDeviceIdADI } =
            await import('../../../src/sistema/instalacion/vinculacion/generar-device-id-adi');
          devId = await resolverDeviceIdADI();
          await AsyncStorage.setItem('adi_hub_device_id', devId);
        }
        if (activo) {
          setHubDeviceId(devId);
          if (storedDestino === 'restaurante' || storedDestino === 'mostrador' || storedDestino === 'venta_crudo') {
            setLocalDestino(normalizarDestino(storedDestino));
          }
        }
      } catch (e) {
        console.warn('No se pudo cargar identidad local de Hub', e);
      }
    };

    void cargarIdentidadLocal();
    return () => {
      activo = false;
    };
  }, []);

  const handleScan = useCallback(async () => {
    if (esWeb) return;
    setIsScanning(true);
    setScannedDevices([]);
    try {
      const devices = await escanear();
      setScannedDevices(devices);
    } catch (e: any) {
      console.warn('Error al escanear dispositivos:', e.message);
    } finally {
      setIsScanning(false);
    }
  }, [escanear, esWeb]);

  // Escaneo automático al montar la pantalla en Android para cargar emparejados al instante
  useEffect(() => {
    if (esWeb) return;
    let cancelado = false;
    const ejecutarEscaneo = async () => {
      try {
        const devices = await escanear();
        if (!cancelado) setScannedDevices(devices);
      } catch (e: any) {
        console.warn('Error al escanear dispositivos:', e.message);
      }
    };
    void ejecutarEscaneo();
    return () => {
      cancelado = true;
    };
  }, [escanear, esWeb]);

  const toggleHubMode = async (value: boolean) => {
    if (esWeb) {
      Alert.alert(
        'Exclusivo de Terminal Android',
        'El Modo Hub Bluetooth requiere una terminal física Android vinculada a la impresora o báscula.'
      );
      return;
    }

    if (value && !puedeActivarHub) {
      Alert.alert(
        'Impresora Requerida',
        'Para activar este dispositivo como Hub Central, primero debe conectar y sincronizar una impresora Bluetooth en el paso 3.'
      );
      return;
    }

    const destinoFinal = destinoSeleccionado || 'restaurante';
    if (!effectiveHubDeviceId) {
      Alert.alert('Espere', 'Resolviendo identidad física del dispositivo...');
      return;
    }
    try {
      if (value) {
        await activarHub(destinoFinal, effectiveHubDeviceId);
      } else {
        await desactivarHub();
      }
      await deviceActions.establecerHubConfig({
        enabled: value,
        destination: destinoFinal,
        updatedAt: Date.now(),
        deviceId: effectiveHubDeviceId,
      });
    } catch {
      Alert.alert('Error', 'No se pudo sincronizar el Hub con la nube');
    }
  };

  const liberarCanalColgado = async () => {
    if (esWeb) return;
    try {
      await deviceActions.establecerHubConfig({
        enabled: false,
        destination: destinoSeleccionado,
        deviceId: configDelDestinoActual?.deviceId || '',
        updatedAt: Date.now(),
      });
      await desactivarHub();
      Alert.alert(
        'Canal Liberado',
        `El canal de ${destinoSeleccionado === 'restaurante' ? 'Restaurante' : 'Mostrador'} ha sido liberado de registros colgados.`
      );
    } catch {
      Alert.alert('Error', 'No se pudo liberar el canal colgado');
    }
  };

  const selectHubDestino = async (destino: 'restaurante' | 'mostrador') => {
    if (!destino) return;
    setLocalDestino(destino);
    await setDestinoLocalHub(destino);
    if (esWeb || !effectiveHubDeviceId) return;

    // Si este dispositivo tenía activo el otro canal de Hub, mover su asignación activa al nuevo destino
    if (miHubActivoEnCloud && miHubActivoEnCloud !== destino) {
      try {
        await activarHub(destino, effectiveHubDeviceId);
        await deviceActions.establecerHubConfig({
          enabled: true,
          destination: destino,
          deviceId: effectiveHubDeviceId,
          updatedAt: Date.now(),
        });
      } catch (e: any) {
        console.warn('Error al cambiar destino de Hub:', e);
      }
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
    if (!estaConectado || !negocioConfig) {
      Alert.alert(
        'Error',
        'Asegúrese de que la impresora esté conectada y la configuración cargada.'
      );
      return;
    }

    const ticketConfig = {
      nombreNegocio: negocioConfig?.ticket?.header || 'Mi Negocio',
      mensajeFinal: negocioConfig?.ticket?.footer || 'Gracias',
    };

    try {
      Alert.alert('Imprimiendo...', 'Enviando un ticket de prueba.');

      if (destinoSeleccionado === 'mostrador') {
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
  }, [estaConectado, negocioConfig, imprimirCuenta, imprimirTicketVenta, destinoSeleccionado]);

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
            {rutaNegocio && tieneMostrador && (
              <View style={styles.section}>
                <View style={styles.sectionHeaderCol}>
                  <Text style={styles.sectionTitle}>1. Destino del Hub</Text>
                  <Text style={styles.sectionDesc}>¿Qué rol operará este dispositivo?</Text>
                </View>

                <View style={styles.destinoContainer}>
                  <Pressable
                    style={[
                      styles.destinoBtn,
                      destinoSeleccionado === 'restaurante' && styles.destinoBtnActive,
                    ]}
                    onPress={() => selectHubDestino('restaurante')}
                  >
                    <Ionicons
                      name="restaurant"
                      size={24}
                      color={destinoSeleccionado === 'restaurante' ? '#fff' : '#64748b'}
                    />
                    <Text
                      style={[
                        styles.destinoText,
                        destinoSeleccionado === 'restaurante' && styles.destinoTextActive,
                      ]}
                    >
                      Restaurante
                    </Text>
                  </Pressable>
                  {/* MOSTRADOR OPTION - FEATURE GATED */}
                  {negocioConfig?.features?.module_venta_crudo !== false && (
                    <Pressable
                      style={[
                        styles.destinoBtn,
                        destinoSeleccionado === 'mostrador' && styles.destinoBtnActive,
                      ]}
                      onPress={() => selectHubDestino('mostrador')}
                    >
                      <Ionicons
                        name="storefront"
                        size={24}
                        color={destinoSeleccionado === 'mostrador' ? '#fff' : '#64748b'}
                      />
                      <Text
                        style={[
                          styles.destinoText,
                          destinoSeleccionado === 'mostrador' && styles.destinoTextActive,
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
            {rutaNegocio && (
              <View
                style={[
                  styles.hubSection,
                  (esWeb || !puedeActivarHub) && styles.hubSectionDisabled,
                ]}
              >
                <View style={styles.hubHeader}>
                  <View style={styles.hubIconContainer}>
                    <Ionicons
                      name="server"
                      size={24}
                      color={esWeb || !puedeActivarHub ? '#64748b' : '#3b82f6'}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.hubTitle}>2. Modo Hub Central (Este Dispositivo)</Text>
                    <Text style={styles.hubDesc}>
                      {esWeb
                        ? 'En Web operas como supervisor. La conexión Bluetooth al Hub se activa directamente desde cada tableta o teléfono Android.'
                        : !puedeActivarHub
                          ? 'Paso requerido: primero conecte y sincronice una impresora Bluetooth en el paso 3 para poder activar el Modo Hub Central en este dispositivo.'
                          : isHubEnabled
                            ? `Este dispositivo es el Hub activo de ${
                                destinoSeleccionado === 'restaurante' ? 'Restaurante' : 'Mostrador'
                              }`
                            : otroDispositivoEnDestino
                              ? `Otro dispositivo Android atiende actualmente ${
                                  destinoSeleccionado === 'restaurante' ? 'Restaurante' : 'Mostrador'
                                }. Actívalo aquí para transferir el Hub a esta terminal.`
                              : `Convertir ESTE dispositivo en servidor de impresión para ${
                                  destinoSeleccionado === 'restaurante' ? 'Restaurante' : 'Mostrador'
                                }`}
                    </Text>
                    {otroDispositivoEnDestino && !isHubEnabled && !esWeb && (
                      <Pressable
                        style={{
                          marginTop: 8,
                          alignSelf: 'flex-start',
                          paddingVertical: 4,
                          paddingHorizontal: 10,
                          backgroundColor: 'rgba(239, 68, 68, 0.15)',
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: '#ef4444',
                        }}
                        onPress={liberarCanalColgado}
                      >
                        <Text style={{ color: '#f87171', fontSize: 12, fontWeight: '600' }}>
                          Liberar canal colgado
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  <Switch
                    value={isHubEnabled}
                    onValueChange={toggleHubMode}
                    disabled={esWeb || !puedeActivarHub}
                    trackColor={{ false: '#334155', true: '#3b82f6' }}
                    thumbColor={isHubEnabled ? '#ffffff' : puedeActivarHub ? '#94a3b8' : '#475569'}
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
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.successText} numberOfLines={1} ellipsizeMode="tail">
                        {dispositivoActivo.nombre}
                      </Text>
                      <Text style={styles.deviceAddress} numberOfLines={1}>
                        {dispositivoActivo.direccion}
                      </Text>
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
            {negocioConfig && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Vista Previa del Ticket</Text>
                <View style={styles.ticketPreview}>
                  <Text style={styles.ticketText}>
                    {negocioConfig?.ticket?.header || 'Nombre del Negocio'}
                  </Text>
                  <Text style={styles.ticketText}>--------------------------------</Text>
                  <Text style={styles.ticketText}>PRODUCTO CANT X PRECIO</Text>
                  <Text style={styles.ticketText}>--------------------------------</Text>
                  <Text style={styles.ticketText}>Producto 1 1 x $10.00</Text>
                  <Text style={styles.ticketText}>Producto 2 2 x $5.00</Text>
                  <Text style={styles.ticketText}>--------------------------------</Text>
                  <Text style={styles.ticketText}>TOTAL: $20.00</Text>

                  <Text style={styles.ticketText}>
                    {negocioConfig?.ticket?.footer || 'Mensaje de Despedida'}
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
  scrollContent: { padding: 16, paddingBottom: 130 },

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
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef4444',
    flexShrink: 0,
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
    gap: 10,
  },
  deviceText: { color: '#f1f5f9', fontSize: 15, fontWeight: '500' },
  deviceAddress: { color: '#64748b', fontSize: 12, marginTop: 2 },

  // Connected
  connectedView: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#22c55e',
    marginBottom: 16,
    gap: 12,
  },
  connectedInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    minWidth: 0,
  },
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
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
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
