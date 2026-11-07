/**
 * 🖨️ GESTOR HUB (Componente Invisible)
 *
 * Orquesta la impresión remota cuando el dispositivo actúa como Hub Central.
 * Se monta globalmente en _layout.tsx y reacciona a la configuración cloud del negocio.
 *
 * La configuración cloud (`rutaNegocio/impresion/hubs`) es la autoridad de habilitación,
 * destino e identidad del Hub. AsyncStorage solo conserva compatibilidad local y no
 * puede activar ni sobrescribir la configuración remota.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { getRtdb } from '../../../firebase';
import { DevicesRepository, type HubConfig } from '../../../persistencia/dispositivos.repositorio';
import { servicioFierros } from '../servicio/ServicioFierros';
import { DespachadorCola } from '../cola/DespachadorCola';
import { useEstadoHub } from '../estado/EstadoConcentrador';
import type { DestinoHub, EstadoFierros } from '../contratos/tipos';

interface PropiedadesGestorHub {
  /** Path del negocio (ej: "negocios/miNegocio") */
  rutaNegocio: string;
}

export const GestorHub = ({ rutaNegocio }: PropiedadesGestorHub) => {
  const { enLinea, setEnLinea, activarHub, desactivarHub, setIdDispositivo } = useEstadoHub();
  const [hubsMap, setHubsMap] = useState<Record<string, HubConfig>>({});
  const [localDeviceId, setLocalDeviceId] = useState<string>('');

  // Resolver ID del dispositivo local
  useEffect(() => {
    let activo = true;
    const resolverId = async () => {
      try {
        const stored = await AsyncStorage.getItem('adi_hub_device_id');
        if (stored && activo) {
          setLocalDeviceId(stored);
          void setIdDispositivo(stored);
          return;
        }
        const { resolverDeviceIdADI } =
          await import('../../../instalacion/vinculacion/generar-device-id-adi');
        const devId = await resolverDeviceIdADI();
        if (activo) {
          setLocalDeviceId(devId);
          void setIdDispositivo(devId);
        }
      } catch (e) {
        console.warn('[GestorHub] Error resolviendo deviceId local:', e);
      }
    };
    void resolverId();
    return () => {
      activo = false;
    };
  }, [setIdDispositivo]);

  // Escuchar configuración cloud de hubs
  useEffect(() => {
    if (!rutaNegocio) return;

    const db = getRtdb();
    const devicesRepo = new DevicesRepository(db, rutaNegocio);
    const unsubscribe = devicesRepo.suscribirConfiguracionHub(
      (_config: any, hubs?: Record<string, HubConfig>) => {
        setHubsMap(hubs || {});
      }
    );

    return unsubscribe;
  }, [rutaNegocio]);

  // Listener de red
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const ahora = state.isConnected ?? false;
      setEnLinea(ahora);

      if (!ahora) {
        console.log('[GestorHub] 🔴 Red perdida, entrando en modo STANDBY');
      }
    });

    return unsubscribe;
  }, [setEnLinea]);

  // 🖨️ AUTO-LIBERACIÓN: Si la impresora Bluetooth se apaga, desconecta o sale de rango,
  // liberar inmediatamente la asignación de Hub Central en la nube para no dejar el canal bloqueado.
  useEffect(() => {
    if (Platform.OS === 'web' || !rutaNegocio || !localDeviceId) return;

    const unsubFierros = servicioFierros.suscribir((estado: EstadoFierros) => {
      if (!estado.estaConectado) {
        const esHubRestauranteActivo =
          hubsMap.restaurante?.enabled === true && hubsMap.restaurante?.deviceId === localDeviceId;
        const configMostrador = hubsMap.mostrador || hubsMap.venta_crudo;
        const esHubMostradorActivo =
          configMostrador?.enabled === true && configMostrador?.deviceId === localDeviceId;

        if (esHubRestauranteActivo || esHubMostradorActivo) {
          console.log(
            '[GestorHub] ⚠️ Impresora Bluetooth desconectada. Liberando Hub automáticamente de la nube...'
          );
          const destinoLiberar: DestinoHub = esHubRestauranteActivo ? 'restaurante' : 'mostrador';
          const db = getRtdb();
          if (db) {
            const devicesRepo = new DevicesRepository(db, rutaNegocio);
            void devicesRepo.establecerConfiguracionHub({
              enabled: false,
              destination: destinoLiberar,
              deviceId: localDeviceId,
              updatedAt: Date.now(),
            });
          }
          void desactivarHub().catch(() => {});
        }
      }
    });

    return unsubFierros;
  }, [hubsMap, rutaNegocio, localDeviceId, desactivarHub]);

  // Ciclo de vida del Hub por rol asignado a ESTE dispositivo físico
  useEffect(() => {
    // Las terminales web son únicamente de supervisión/consulta y no operan como Hub de hardware Bluetooth
    if (Platform.OS === 'web' || !rutaNegocio || !enLinea || !localDeviceId) {
      DespachadorCola.destruirInstancia(rutaNegocio, 'hub');
      return undefined;
    }

    // Identificar si este dispositivo es el Hub designado para restaurante o mostrador
    const esHubRestaurante =
      hubsMap.restaurante?.enabled === true && hubsMap.restaurante?.deviceId === localDeviceId;

    const configMostrador = hubsMap.mostrador || hubsMap.venta_crudo;
    const esHubMostrador =
      configMostrador?.enabled === true && configMostrador?.deviceId === localDeviceId;

    const activoRestaurante = esHubRestaurante;
    const activoMostrador = esHubMostrador;

    if (!activoRestaurante && !activoMostrador) {
      DespachadorCola.destruirInstancia(rutaNegocio, 'hub');
      return undefined;
    }

    const destinoActivo: DestinoHub = activoMostrador ? 'mostrador' : 'restaurante';
    void activarHub(destinoActivo, localDeviceId).catch(() => {});

    console.log('[GestorHub] 🟢 Activando modo HUB para este dispositivo:', {
      localDeviceId,
      activoRestaurante,
      activoMostrador,
    });

    const db = getRtdb();
    if (!db) return undefined;

    const canal = activoMostrador ? 'venta_crudo' : 'standard';
    const despachador = DespachadorCola.obtenerInstancia(
      db,
      rutaNegocio,
      localDeviceId,
      {
        procesamientoAuto: true,
        maxReintentos: 1,
        canal,
      },
      'hub'
    );
    despachador.iniciar();

    console.log(`[GestorHub] ✅ Hub activo (canal: ${canal}, dispositivo: ${localDeviceId})`);

    const rutaLimpia = rutaNegocio ? rutaNegocio.replace(/^\/+|\/+$/g, '') : '';
    const heartbeatPath = rutaLimpia
      ? `${rutaLimpia}/impresion/hubs/${destinoActivo}/heartbeat`
      : `impresion/hubs/${destinoActivo}/heartbeat`;
    const enviarHeartbeat = async () => {
      try {
        const { ref, set } = await import('firebase/database');
        await set(ref(db, heartbeatPath), Date.now());
      } catch (e) {
        console.warn('[GestorHub] Error enviando heartbeat:', e);
      }
    };

    const heartbeat = setInterval(() => {
      void enviarHeartbeat();
    }, 30000);
    void enviarHeartbeat();

    return () => {
      clearInterval(heartbeat);
      DespachadorCola.destruirInstancia(rutaNegocio, 'hub');
    };
  }, [hubsMap, rutaNegocio, enLinea, localDeviceId, activarHub, desactivarHub]);

  return null;
};

interface PropiedadesGestorHubGlobal {
  /** Función o hook para obtener rutaNegocio (ej: useSesion) */
  rutaNegocio: string | null;
}

/**
 * Componente global que se monta en _layout.tsx.
 * Solo monta GestorHub si hay rutaNegocio.
 */
export const GestorHubGlobal = ({ rutaNegocio }: PropiedadesGestorHubGlobal) => {
  if (!rutaNegocio) {
    return null;
  }

  return <GestorHub rutaNegocio={rutaNegocio} />;
};
