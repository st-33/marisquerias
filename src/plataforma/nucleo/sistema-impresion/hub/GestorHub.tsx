/**
 * 🖨️ GESTOR HUB (Componente Invisible)
 *
 * Orquesta la impresión remota cuando el dispositivo actúa como Hub Central.
 * Se monta globalmente en _layout.tsx y reacciona al EstadoHub (Zustand).
 *
 * DIFERENCIAS CON HubManager.tsx LEGACY:
 * - ❌ No usa polling de AsyncStorage cada 5 segundos
 * - ✅ Reacciona instantáneamente via Zustand (useEstadoHub)
 * - ✅ Usa el nuevo ServicioFierros en lugar de HardwareService
 * - ✅ Nombres en español
 */

import NetInfo from '@react-native-community/netinfo';
import { ref, set } from 'firebase/database';
import { useEffect, useRef } from 'react';
import { getRtdb } from '../../../core/firebase';
import { DespachadorCola } from '../cola/DespachadorCola';
import { destinoACanal, useEstadoHub } from '../estado/EstadoHub';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

interface PropiedadesGestorHub {
  /** Path del tenant (ej: "tenants/miNegocio") */
  tenantPath: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPONENTE
// ═══════════════════════════════════════════════════════════════════════════

export const GestorHub = ({ tenantPath }: PropiedadesGestorHub) => {
  // Estado del Hub desde Zustand (REACTIVO, sin polling!)
  const { habilitado, destino, idDispositivo, enLinea, setEnLinea, inicializar } = useEstadoHub();

  // Refs para cleanup
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenerRedRef = useRef<(() => void) | null>(null);

  // Inicializar estado desde AsyncStorage al montar
  useEffect(() => {
    console.log('[GestorHub] 🔷 Componente MONTADO');
    console.log('[GestorHub] Estado inicial:', { habilitado, destino, idDispositivo, enLinea });
    inicializar();
  }, [inicializar]);

  // ═══════════════════════════════════════════════════════════════════════════
  // LISTENER DE RED
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const ahora = state.isConnected ?? false;
      setEnLinea(ahora);

      if (!ahora) {
        console.log('[GestorHub] 🔴 Red perdida, entrando en modo STANDBY');
      } else if (ahora && !enLinea) {
        console.log('[GestorHub] 🟢 Red restaurada');
      }
    });

    listenerRedRef.current = unsubscribe;

    return () => unsubscribe();
  }, [enLinea, setEnLinea]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CICLO DE VIDA DEL HUB
  // ═══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    // Condiciones para activar
    const debeActivar = habilitado && tenantPath && enLinea && destino;

    if (debeActivar) {
      console.log('[GestorHub] 🟢 Activando modo HUB...');

      const db = getRtdb();
      if (!db) {
        console.error('[GestorHub] ❌ Firebase RTDB no disponible');
        return;
      }

      const canal = destinoACanal(destino);

      // 🔥 INTEGRACIÓN: Iniciar DespachadorCola
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

      // Heartbeat: Avisar que estamos vivos cada 30 segundos
      heartbeatRef.current = setInterval(async () => {
        try {
          const heartbeatPath = ref(db, `${tenantPath}/config/hub/heartbeat`);
          await set(heartbeatPath, Date.now());
        } catch (e) {
          console.warn('[GestorHub] Error enviando heartbeat:', e);
        }
      }, 30000);

      // Enviar heartbeat inicial
      const heartbeatPath = ref(db, `${tenantPath}/config/hub/heartbeat`);
      set(heartbeatPath, Date.now()).catch(() => {});

      // Sincronizar config a la nube
      set(ref(db, `${tenantPath}/config/hub`), {
        enabled: true,
        destination: destino,
        deviceId: idDispositivo,
        updatedAt: Date.now(),
      }).catch((e) => console.warn('[GestorHub] Error sincronizando config:', e));
    } else {
      console.log(`[GestorHub] 🔴 Hub ${!habilitado ? 'desactivado' : 'en standby'}`, {
        habilitado,
        tenantPath: !!tenantPath,
        enLinea,
        destino,
      });

      // Si estaba activo y ahora no, detener despachador
      if (tenantPath) {
        DespachadorCola.destruirInstancia(tenantPath, 'hub');
      }
    }

    // Cleanup
    return () => {
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        heartbeatRef.current = null;
      }

      // Detener despachador al desmontar
      if (tenantPath) {
        DespachadorCola.destruirInstancia(tenantPath, 'hub');
      }
    };
  }, [habilitado, tenantPath, enLinea, destino, idDispositivo]);

  // Componente invisible
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════
// WRAPPER GLOBAL (para usar en _layout.tsx)
// ═══════════════════════════════════════════════════════════════════════════

interface PropiedadesGestorHubGlobal {
  /** Función o hook para obtener tenantPath (ej: useSesion) */
  tenantPath: string | null;
}

/**
 * Componente global que se monta en _layout.tsx
 * Solo monta GestorHub si hay tenantPath
 */
export const GestorHubGlobal = ({ tenantPath }: PropiedadesGestorHubGlobal) => {
  if (!tenantPath) {
    return null;
  }

  return <GestorHub tenantPath={tenantPath} />;
};
