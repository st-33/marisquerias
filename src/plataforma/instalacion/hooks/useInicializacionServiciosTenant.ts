import { useEffect, useRef } from 'react';
import { logger } from '../../core/monitoring';
import {
  isCurrentTenantLifecycle,
  registerTenantCleanup,
  switchTenantLifecycle,
} from '../../core/lifecycle/TenantLifecycleController';
import type { EstadoInstalacion } from '../../core/store/slices/sesion';
import { validarRutaTenant } from '../../core/rtdb/rutas/RutaTenant';

interface Props {
  estadoInstalacion: EstadoInstalacion;
  tenantPath: string | null;
}

export function useInicializacionServiciosTenant({ estadoInstalacion, tenantPath }: Props) {
  const initializedTenantRef = useRef<string | null>(null);

  useEffect(() => {
    if (estadoInstalacion !== 'VINCULADA' || !tenantPath || !validarRutaTenant(tenantPath)) {
      initializedTenantRef.current = null;
      return;
    }

    const generation = switchTenantLifecycle(tenantPath);
    let cancelled = false;

    const destruirServicios = () => {
      void import('../../core/services/OfflineSalesSync').then(({ OfflineSalesSync }) => {
        OfflineSalesSync.destroy();
      });
      void import('../../core/services/OfflineInventorySync').then(({ OfflineInventorySync }) => {
        OfflineInventorySync.destroy();
      });
      void import('../../core/services/PrintSpooler').then(({ PrintSpooler }) => {
        PrintSpooler.destroyInstance(tenantPath, 'device');
      });
      initializedTenantRef.current = null;
    };

    const unregister = registerTenantCleanup(tenantPath, destruirServicios);

    const inicializar = async () => {
      if (initializedTenantRef.current === tenantPath) return;
      initializedTenantRef.current = tenantPath;

      try {
        const { getRtdb } = await import('../../core/firebase');
        const db = getRtdb();
        if (cancelled || !isCurrentTenantLifecycle(tenantPath, generation)) return;

        const { ensureTenantBootstrap } = await import('../../core/bootstrap/ensureTenant');
        await ensureTenantBootstrap(db, tenantPath);
        if (cancelled || !isCurrentTenantLifecycle(tenantPath, generation)) return;

        const { SQLiteStorageAdapter } =
          await import('../../core/offline/storage/SQLiteStorageAdapter');
        await SQLiteStorageAdapter.initialize();
        if (cancelled || !isCurrentTenantLifecycle(tenantPath, generation)) return;

        const { OfflineSalesSync } = await import('../../core/services/OfflineSalesSync');
        OfflineSalesSync.initialize(db, tenantPath);

        const { OfflineInventorySync } = await import('../../core/services/OfflineInventorySync');
        OfflineInventorySync.initialize(db, tenantPath);
        if (cancelled || !isCurrentTenantLifecycle(tenantPath, generation)) return;

        const { deviceBinding } = await import('../../core/security/deviceBinding');
        const deviceId = (await deviceBinding.getStoredDeviceId()) || 'dispositivo_local';
        if (cancelled || !isCurrentTenantLifecycle(tenantPath, generation)) return;

        const { PrintSpooler } = await import('../../core/services/PrintSpooler');
        PrintSpooler.getInstance(db, tenantPath, deviceId, { autoProcess: true }, 'device');

        logger.info('OFFLINE_BOOT', '✅ Servicios Offline Inicializados', {
          tenantPath,
          deviceId,
          generation,
        });
      } catch (err) {
        if (!cancelled) {
          logger.error('OFFLINE_BOOT', '❌ Error al inicializar servicios offline', err as Error);
        }
      }
    };

    void inicializar();

    return () => {
      cancelled = true;
      unregister();
      destruirServicios();
    };
  }, [estadoInstalacion, tenantPath]);
}
