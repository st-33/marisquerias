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

import NetInfo from '@react-native-community/netinfo';
import { useEffect, useRef, useState } from 'react';
import { getRtdb } from '../../../firebase';
import { DevicesRepository, type HubConfig } from '../../../persistencia/devices.repo';
import { DespachadorCola } from '../cola/DespachadorCola';
import { useEstadoHub } from '../estado/EstadoHub';

interface PropiedadesGestorHub {
  /** Path del negocio (ej: "negocios/miNegocio") */
  rutaNegocio: string;
}

type ConfiguracionHubRuntime = {
  rutaNegocio: string;
  config: Partial<HubConfig> | null;
};

export const GestorHub = ({ rutaNegocio }: PropiedadesGestorHub) => {
  // Estado local usado únicamente para conectividad del runtime.
  const { enLinea, setEnLinea } = useEstadoHub();
  const [configuracionRuntime, setConfiguracionRuntime] = useState<ConfiguracionHubRuntime | null>(
    null
  );

  const configuracionCloud =
    configuracionRuntime?.rutaNegocio === rutaNegocio ? configuracionRuntime.config : null;
  const habilitado = configuracionCloud?.enabled === true;
  const destino = configuracionCloud?.destination ?? null;
  const idDispositivo = configuracionCloud?.deviceId ?? null;

  // La configuración del Hub se lee desde RTDB; no se toma de AsyncStorage ni se escribe aquí.
  useEffect(() => {
    if (!rutaNegocio) return;

    const db = getRtdb();
    const devicesRepo = new DevicesRepository(db, rutaNegocio);
    const unsubscribe = devicesRepo.suscribirHubConfig((config) => {
      setConfiguracionRuntime({ rutaNegocio, config });
    });

    return unsubscribe;
  }, [rutaNegocio]);

  // Listener de red: conectividad local, no autoridad de configuración.
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

  // Ciclo de vida del Hub gobernado por la configuración cloud.
  useEffect(() => {
    if (habilitado && !idDispositivo) {
      console.warn(
        '[GestorHub] ⚠️ Hub habilitado en cloud pero sin deviceId válido; omitiendo activación.'
      );
    }

    const debeActivar = Boolean(habilitado && rutaNegocio && enLinea && destino && idDispositivo);

    if (!debeActivar || !idDispositivo || !rutaNegocio) {
      console.log('[GestorHub] 🔴 Hub en standby según configuración cloud', {
        habilitado,
        rutaNegocio: Boolean(rutaNegocio),
        enLinea,
        destino,
      });

      if (rutaNegocio) {
        DespachadorCola.destruirInstancia(rutaNegocio, 'hub');
      }

      return undefined;
    }

    console.log('[GestorHub] 🟢 Activando modo HUB desde configuración cloud...');

    const db = getRtdb();
    if (!db) {
      console.error('[GestorHub] ❌ Firebase RTDB no disponible');
      return;
    }

    const canal = destino === 'venta_crudo' ? 'venta_crudo' : 'standard';
    const despachador = DespachadorCola.obtenerInstancia(
      db,
      rutaNegocio,
      idDispositivo,
      {
        procesamientoAuto: true,
        maxReintentos: 1,
        canal,
      },
      'hub'
    );
    despachador.iniciar();

    console.log(
      `[GestorHub] ✅ Hub inicializado (canal: ${canal}, dispositivo: ${idDispositivo})`
    );

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
  }, [habilitado, rutaNegocio, enLinea, destino, idDispositivo]);

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
