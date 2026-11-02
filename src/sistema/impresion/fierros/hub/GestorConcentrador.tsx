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
import { getRtdb } from '../../../firebase';
import { DevicesRepository, type HubConfig } from '../../../persistencia/dispositivos.repositorio';
import { DespachadorCola } from '../cola/DespachadorCola';
import { useEstadoHub } from '../estado/EstadoConcentrador';

interface PropiedadesGestorHub {
  /** Path del negocio (ej: "negocios/miNegocio") */
  rutaNegocio: string;
}

export const GestorHub = ({ rutaNegocio }: PropiedadesGestorHub) => {
  const { enLinea, setEnLinea } = useEstadoHub();
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
          return;
        }
        const { resolverDeviceIdADI } = await import(
          '../../../instalacion/vinculacion/generar-device-id-adi'
        );
        const devId = await resolverDeviceIdADI();
        if (activo) {
          setLocalDeviceId(devId);
        }
      } catch (e) {
        console.warn('[GestorHub] Error resolviendo deviceId local:', e);
      }
    };
    void resolverId();
    return () => {
      activo = false;
    };
  }, []);

  // Escuchar configuración cloud de hubs
  useEffect(() => {
    if (!rutaNegocio) return;

    const db = getRtdb();
    const devicesRepo = new DevicesRepository(db, rutaNegocio);
    const unsubscribe = devicesRepo.suscribirConfiguracionHub((_config, hubs) => {
      setHubsMap(hubs || {});
    });

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

  // Ciclo de vida del Hub por rol asignado a ESTE dispositivo físico
  useEffect(() => {
    if (!rutaNegocio || !enLinea || !localDeviceId) {
      DespachadorCola.destruirInstancia(rutaNegocio, 'hub');
      return undefined;
    }

    // Identificar si este dispositivo es el Hub designado para restaurante o venta_crudo
    const esHubRestaurante =
      hubsMap.restaurante?.enabled === true &&
      hubsMap.restaurante?.deviceId === localDeviceId;

    const esHubVentaCrudo =
      hubsMap.venta_crudo?.enabled === true &&
      hubsMap.venta_crudo?.deviceId === localDeviceId;

    // Compatibilidad legacy si no hay partición
    const configLegacy = Object.values(hubsMap)[0];
    const esHubLegacy =
      configLegacy?.enabled === true &&
      (!configLegacy.deviceId || configLegacy.deviceId === localDeviceId);

    const activoRestaurante = esHubRestaurante || (esHubLegacy && configLegacy?.destination !== 'venta_crudo');
    const activoVentaCrudo = esHubVentaCrudo || (esHubLegacy && configLegacy?.destination === 'venta_crudo');

    if (!activoRestaurante && !activoVentaCrudo) {
      DespachadorCola.destruirInstancia(rutaNegocio, 'hub');
      return undefined;
    }

    console.log('[GestorHub] 🟢 Activando modo HUB para este dispositivo:', {
      localDeviceId,
      activoRestaurante,
      activoVentaCrudo,
    });

    const db = getRtdb();
    if (!db) return undefined;

    const canal = activoVentaCrudo ? 'venta_crudo' : 'standard';
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

    const heartbeatPath = `${rutaNegocio}/impresion/hubs/heartbeat`;
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
  }, [hubsMap, rutaNegocio, enLinea, localDeviceId]);

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
