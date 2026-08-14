import { useEffect, useRef } from 'react';
import { logger } from '../../core/monitoring';
import type { EstadoInstalacion } from '../../core/store/slices/sesion';
import { validarRutaTenant } from '../../core/rtdb/rutas/RutaTenant';

interface Props {
  estadoInstalacion: EstadoInstalacion;
  tenantPath: string | null;
}

export function useInicializacionServiciosTenant({ estadoInstalacion, tenantPath }: Props) {
  const offlineInitialized = useRef(false);

  useEffect(() => {
    // Solo arrancar cuando la ruta es válida y la instalación está vinculada
    if (
      estadoInstalacion === 'VINCULADA' &&
      tenantPath &&
      validarRutaTenant(tenantPath) &&
      !offlineInitialized.current
    ) {
      offlineInitialized.current = true;

      const inicializar = async () => {
        try {
          const { getRtdb } = await import('../../core/firebase');
          const db = getRtdb();

          // 1. Garantizar bootstrap dinámico según la categoría del tenantPath
          const { ensureTenantBootstrap } = await import('../../core/bootstrap/ensureTenant');
          await ensureTenantBootstrap(db, tenantPath);

          const { SQLiteStorageAdapter } = await import(
            '../../core/offline/storage/SQLiteStorageAdapter'
          );
          await SQLiteStorageAdapter.initialize();

          const { OfflineSalesSync } = await import('../../core/services/OfflineSalesSync');
          OfflineSalesSync.initialize(db, tenantPath);

          const { OfflineInventorySync } = await import('../../core/services/OfflineInventorySync');
          OfflineInventorySync.initialize(db, tenantPath);

          // 2. Obtener Device ID de hardware y levantar Spooler
          const { deviceBinding } = await import('../../core/security/deviceBinding');
          const deviceId = (await deviceBinding.getStoredDeviceId()) || 'dispositivo_local';

          const { PrintSpooler } = await import('../../core/services/PrintSpooler');
          PrintSpooler.getInstance(db, tenantPath, deviceId, { autoProcess: true }, 'device');

          logger.info('OFFLINE_BOOT', '✅ Servicios Offline Inicializados', {
            tenantPath,
            deviceId,
          });
        } catch (err) {
          logger.error('OFFLINE_BOOT', '❌ Error al inicializar servicios offline', err as Error);
        }
      };

      void inicializar();
    }
  }, [estadoInstalacion, tenantPath]);
}
