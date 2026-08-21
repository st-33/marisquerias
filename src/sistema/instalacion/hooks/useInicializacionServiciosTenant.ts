import { useEffect, useRef } from 'react';
import { logger } from '../../monitoreo';
import {
  isCurrentTenantLifecycle,
  registerTenantCleanup,
  switchTenantLifecycle,
} from '../../ciclo_de_vida/TenantLifecycleController';
import type { EstadoInstalacion } from '../../store/slices/sesion';
import { validarRutaTenant } from '../../rtdb/rutas/RutaTenant';

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
      void import('../../servicios/OfflineSalesSync').then(({ OfflineSalesSync }) => {
        OfflineSalesSync.destroy();
      });
      void import('../../servicios/OfflineInventorySync').then(({ OfflineInventorySync }) => {
        OfflineInventorySync.destroy();
      });
      void import('../../impresion/fierros/cola/DespachadorCola').then(({ DespachadorCola }) => {
        DespachadorCola.destruirInstancia(tenantPath, 'dispositivo');
      });
      initializedTenantRef.current = null;
    };

    const unregister = registerTenantCleanup(tenantPath, destruirServicios);

    const inicializar = async () => {
      if (initializedTenantRef.current === tenantPath) return;
      initializedTenantRef.current = tenantPath;

      try {
        const { getRtdb } = await import('../../firebase');
        const db = getRtdb();
        if (cancelled || !isCurrentTenantLifecycle(tenantPath, generation)) return;

        const { ensureTenantBootstrap } = await import('../../ciclo_de_vida/ensureTenant');
        await ensureTenantBootstrap(db, tenantPath);
        if (cancelled || !isCurrentTenantLifecycle(tenantPath, generation)) return;

        const { SQLiteStorageAdapter } = await import('../../offline/storage/SQLiteStorageAdapter');
        await SQLiteStorageAdapter.initialize();
        if (cancelled || !isCurrentTenantLifecycle(tenantPath, generation)) return;

        const { OfflineSalesSync } = await import('../../servicios/OfflineSalesSync');
        OfflineSalesSync.initialize(db, tenantPath);

        const { OfflineInventorySync } = await import('../../servicios/OfflineInventorySync');
        OfflineInventorySync.initialize(db, tenantPath);
        if (cancelled || !isCurrentTenantLifecycle(tenantPath, generation)) return;

        const { deviceBinding } = await import('../../seguridad/deviceBinding');
        const deviceId = (await deviceBinding.getStoredDeviceId()) || 'dispositivo_local';
        if (cancelled || !isCurrentTenantLifecycle(tenantPath, generation)) return;

        const { DespachadorCola } = await import('../../impresion/fierros/cola/DespachadorCola');
        DespachadorCola.obtenerInstancia(
          db,
          tenantPath,
          deviceId,
          { procesamientoAuto: true, canal: 'standard' },
          'dispositivo'
        );

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
