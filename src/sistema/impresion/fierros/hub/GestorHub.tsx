/**
 * 🖨️ GESTOR HUB (Componente Invisible)
 *
 * Orquesta la impresión remota cuando el dispositivo actúa como Hub Central.
 * Se monta globalmente en _layout.tsx y reacciona a la configuración cloud del tenant.
 *
 * La configuración cloud (`tenantPath/config/hub`) es la autoridad de habilitación,
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
  /** Path del tenant (ej: "tenants/miNegocio") */
  tenantPath: string;
}

type ConfiguracionHubRuntime = {
  tenantPath: string;
  config: Partial<HubConfig> | null;
};

export const GestorHub = ({ tenantPath }: PropiedadesGestorHub) => {
  // Estado local usado únicamente para conectividad del runtime.
  const { enLinea, setEnLinea } = useEstadoHub();
  const [configuracionRuntime, setConfiguracionRuntime] = useState<ConfiguracionHubRuntime | null>(
    null
  );

  const configuracionCloud =
    configuracionRuntime?.tenantPath === tenantPath ? configuracionRuntime.config : null;
  const habilitado = configuracionCloud?.enabled === true;
  const destino = configuracionCloud?.destination ?? null;
  const idDispositivo = configuracionCloud?.deviceId || 'hub_local';

  // La configuración del Hub se lee desde RTDB; no se toma de AsyncStorage ni se escribe aquí.
  useEffect(() => {
    if (!tenantPath) return;

    const db = getRtdb();
    const devicesRepo = new DevicesRepository(db, tenantPath);
    const unsubscribe = devicesRepo.suscribirHubConfig((config) => {
      setConfiguracionRuntime({ tenantPath, config });
    });

    return unsubscribe;
  }, [tenantPath]);

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
    const debeActivar = habilitado && Boolean(tenantPath) && enLinea && destino;

    if (debeActivar) {
      console.log('[GestorHub] 🟢 Activando modo HUB desde configuración cloud...');

      const db = getRtdb();
      if (!db) {
        console.error('[GestorHub] ❌ Firebase RTDB no disponible');
        return;
      }

      const canal = destino === 'venta_crudo' ? 'venta_crudo' : 'standard';
      const despachador = DespachadorCola.obtenerInstancia(
        db,
        tenantPath,
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

      const heartbeatPath = `${tenantPath}/config/hub/heartbeat`;
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
        DespachadorCola.destruirInstancia(tenantPath, 'hub');
      };
    }

    console.log('[GestorHub] 🔴 Hub en standby según configuración cloud', {
      habilitado,
      tenantPath: Boolean(tenantPath),
      enLinea,
      destino,
    });

    if (tenantPath) {
      DespachadorCola.destruirInstancia(tenantPath, 'hub');
    }

    return undefined;
  }, [habilitado, tenantPath, enLinea, destino, idDispositivo]);

  return null;
};

interface PropiedadesGestorHubGlobal {
  /** Función o hook para obtener tenantPath (ej: useSesion) */
  tenantPath: string | null;
}

/**
 * Componente global que se monta en _layout.tsx.
 * Solo monta GestorHub si hay tenantPath.
 */
export const GestorHubGlobal = ({ tenantPath }: PropiedadesGestorHubGlobal) => {
  if (!tenantPath) {
    return null;
  }

  return <GestorHub tenantPath={tenantPath} />;
};
