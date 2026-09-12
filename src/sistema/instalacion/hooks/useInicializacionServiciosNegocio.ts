import { useEffect, useRef } from 'react';
import { logger } from '../../monitoreo';
import {
  isCurrentNegocioLifecycle,
  registerNegocioCleanup,
  switchNegocioLifecycle,
} from '../../ciclo_de_vida/NegocioLifecycleController';
import type { EstadoInstalacion } from '../../store/slices/sesion';
import { validar_ruta_negocio } from '../../rtdb/rutas/ruta_negocio';

interface Props {
  estadoInstalacion: EstadoInstalacion;
  rutaNegocio: string | null;
}

export function useInicializacionServiciosNegocio({ estadoInstalacion, rutaNegocio }: Props) {
  const initializedNegocioRef = useRef<string | null>(null);

  useEffect(() => {
    if (estadoInstalacion !== 'VINCULADA' || !rutaNegocio || !validar_ruta_negocio(rutaNegocio)) {
      initializedNegocioRef.current = null;
      return;
    }

    const generation = switchNegocioLifecycle(rutaNegocio);
    let cancelled = false;

    const destruirServicios = () => {
      void import('../../servicios/OfflineSalesSync').then(({ OfflineSalesSync }) => {
        OfflineSalesSync.destroy();
      });
      void import('../../servicios/OfflineInventorySync').then(({ OfflineInventorySync }) => {
        OfflineInventorySync.destroy();
      });
      void import('../../impresion/fierros/cola/DespachadorCola').then(({ DespachadorCola }) => {
        DespachadorCola.destruirInstancia(rutaNegocio, 'dispositivo');
      });
      initializedNegocioRef.current = null;
    };

    const unregister = registerNegocioCleanup(rutaNegocio, destruirServicios);

    const inicializar = async () => {
      if (initializedNegocioRef.current === rutaNegocio) return;
      initializedNegocioRef.current = rutaNegocio;

      try {
        const { getRtdb } = await import('../../firebase');
        const db = getRtdb();
        if (cancelled || !isCurrentNegocioLifecycle(rutaNegocio, generation)) return;

        const { ensureNegocioBootstrap } = await import('../../ciclo_de_vida/ensureNegocio');
        await ensureNegocioBootstrap(db, rutaNegocio);
        if (cancelled || !isCurrentNegocioLifecycle(rutaNegocio, generation)) return;

        const { SQLiteStorageAdapter } = await import('../../offline/storage/SQLiteStorageAdapter');
        await SQLiteStorageAdapter.initialize();
        if (cancelled || !isCurrentNegocioLifecycle(rutaNegocio, generation)) return;

        const { OfflineSalesSync } = await import('../../servicios/OfflineSalesSync');
        OfflineSalesSync.initialize(db, rutaNegocio);

        const { OfflineInventorySync } = await import('../../servicios/OfflineInventorySync');
        OfflineInventorySync.initialize(db, rutaNegocio);
        if (cancelled || !isCurrentNegocioLifecycle(rutaNegocio, generation)) return;

        const { deviceBinding } = await import('../../seguridad/deviceBinding');
        const deviceId = await deviceBinding.getStoredDeviceId();
        if (cancelled || !isCurrentNegocioLifecycle(rutaNegocio, generation)) return;

        if (!deviceId || deviceId === 'unknown' || deviceId.includes('UNKNOWN_HW')) {
          logger.warn(
            'OFFLINE_BOOT',
            '⚠️ No hay un deviceId válido registrado; omitiendo inicialización de cola de impresión/spool',
            { rutaNegocio, deviceId }
          );
          return;
        }

        const { DespachadorCola } = await import('../../impresion/fierros/cola/DespachadorCola');
        DespachadorCola.obtenerInstancia(
          db,
          rutaNegocio,
          deviceId,
          { procesamientoAuto: true, canal: 'standard' },
          'dispositivo'
        );

        logger.info('OFFLINE_BOOT', '✅ Servicios Offline Inicializados', {
          rutaNegocio,
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
  }, [estadoInstalacion, rutaNegocio]);
}
