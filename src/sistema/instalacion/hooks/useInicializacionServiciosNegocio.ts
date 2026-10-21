import { useEffect, useRef } from 'react';
import { logger } from '../../monitoreo';
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

    let cancelled = false;

    const destruirServicios = () => {
      void import('../../servicios/SincronizacionVentasOffline').then(({ OfflineSalesSync }) => {
        OfflineSalesSync.destroy();
      });
      void import('../../servicios/SincronizacionInventarioOffline').then(
        ({ OfflineInventorySync }) => {
          OfflineInventorySync.destroy();
        }
      );
      void import('../../impresion/fierros/cola/DespachadorCola').then(({ DespachadorCola }) => {
        DespachadorCola.destruirInstancia(rutaNegocio, 'dispositivo');
      });
      initializedNegocioRef.current = null;
    };

    const inicializar = async () => {
      if (initializedNegocioRef.current === rutaNegocio) return;
      initializedNegocioRef.current = rutaNegocio;

      try {
        const { getOperacionRtdb } = await import('../../firebase');
        const db = getOperacionRtdb();
        if (cancelled) return;

        const { SQLiteStorageAdapter } =
          await import('../../sin_conexion/almacenamiento/AdaptadorAlmacenamientoSQLite');
        await SQLiteStorageAdapter.initialize();
        if (cancelled) return;

        const { OfflineSalesSync } = await import('../../servicios/SincronizacionVentasOffline');
        OfflineSalesSync.initialize(db, rutaNegocio);

        const { OfflineInventorySync } =
          await import('../../servicios/SincronizacionInventarioOffline');
        OfflineInventorySync.initialize(db, rutaNegocio);
        if (cancelled) return;

        const { deviceBinding } = await import('../../seguridad/vinculacionDispositivo');
        const deviceId = await deviceBinding.getStoredDeviceId();
        if (cancelled) return;

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
      destruirServicios();
    };
  }, [estadoInstalacion, rutaNegocio]);
}
