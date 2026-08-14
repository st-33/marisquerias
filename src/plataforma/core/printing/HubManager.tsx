import NetInfo from '@react-native-community/netinfo';
import { ref, set } from 'firebase/database';
import { useEffect, useRef, useState } from 'react';
import { getRtdb } from '../firebase';
import { OfflinePrintFallback } from '../services/OfflinePrintFallback';
import { PrintSpooler } from '../services/PrintSpooler';

type HubManagerProps = {
  enabled: boolean;
  tenantPath: string;
  deviceId: string;
  channel?: string;
};

export const HubManager = (props: HubManagerProps) => {
  const { enabled, tenantPath, deviceId, channel } = props;
  const spoolerRef = useRef<PrintSpooler | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const [isStandby, setIsStandby] = useState(false);

  // 🔌 Network status listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const wasOffline = !isOnline;
      const nowOnline = state.isConnected ?? false;
      setIsOnline(nowOnline);

      if (!nowOnline && !isStandby) {
        console.log('[HubManager] 🔴 Network lost, entering STANDBY mode...');
        setIsStandby(true);
        // Detener spooler para no intentar leer de Firebase
        if (spoolerRef.current) {
          spoolerRef.current.stop();
        }
      } else if (nowOnline && isStandby) {
        console.log('[HubManager] 🟢 Network restored, exiting STANDBY mode...');
        setIsStandby(false);
        // Reiniciar spooler
        if (spoolerRef.current && enabled) {
          spoolerRef.current.start();
        }
        // Procesar cola local de impresión
        OfflinePrintFallback.processLocalQueue();
      }
    });

    return () => unsubscribe();
  }, [isOnline, isStandby, enabled]);

  // 🖨️ Spooler lifecycle
  useEffect(() => {
    if (enabled && tenantPath && isOnline) {
      console.log('[HubManager] 🟢 Activando modo HUB...');

      const db = getRtdb();

      const spooler = PrintSpooler.getInstance(
        db,
        tenantPath,
        deviceId,
        {
          autoProcess: true,
          maxRetries: 1,
          channel: props.channel,
        },
        'hub'
      );

      spoolerRef.current = spooler;
      spooler.start();

      console.log('[HubManager] ✅ Spooler HUB inicializado');

      // 🔥 HEARTBEAT: Avisar que estamos vivos cada 30 segundos
      const heartbeatInterval = setInterval(async () => {
        if (enabled && tenantPath && isOnline) {
          const heartbeatRef = ref(db, `${tenantPath}/config/hub/heartbeat`);
          await set(heartbeatRef, Date.now());
        }
      }, 30000);

      return () => {
        clearInterval(heartbeatInterval);
        if (spoolerRef.current) {
          console.log('[HubManager] 🛑 Deteniendo spooler en cleanup');
          spoolerRef.current.stop();
        }
      };
    } else if (!enabled || !isOnline) {
      console.log(`[HubManager] 🔴 Hub ${!enabled ? 'desactivado' : 'en standby (sin red)'}`);
      if (spoolerRef.current) {
        spoolerRef.current.stop();
      }
    }

    return () => {
      if (spoolerRef.current) {
        console.log('[HubManager] 🛑 Deteniendo spooler en cleanup');
        spoolerRef.current.stop();
      }
    };
  }, [enabled, tenantPath, deviceId, channel, isOnline]);

  return null; // Componente invisible
};

/**
 * Hook para obtener el estado del Hub desde otros componentes
 */
export const useHubStatus = () => {
  const [status, setStatus] = useState<{
    isOnline: boolean;
    pendingLocalJobs: number;
  }>({ isOnline: true, pendingLocalJobs: 0 });

  useEffect(() => {
    const checkStatus = async () => {
      const fallbackStatus = OfflinePrintFallback.getStatus();
      const pendingCount = await OfflinePrintFallback.getPendingCount();
      setStatus({
        isOnline: fallbackStatus.isOnline,
        pendingLocalJobs: pendingCount,
      });
    };

    checkStatus();
    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return status;
};
