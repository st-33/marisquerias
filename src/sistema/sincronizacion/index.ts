/**
 * 🔄 SISTEMA UNIFICADO DE SINCRONIZACIÓN
 *
 * Exporta todo lo necesario para sincronización multi-dispositivo
 */

export {
  ServicioSincronizacion,
  servicioSincronizacion,
  SynchronizationService,
  synchronizationService,
  type SyncConfig,
  type SynchronizableItem,
} from './ServicioSincronizacion';

export {
  useArregloSincronizado,
  useSynchronizedArray,
  type SynchronizedArrayResult,
  type UseSynchronizedArrayConfig,
  type ArregloSincronizadoResultado,
  type UseArregloSincronizadoConfig,
} from './useArregloSincronizado';

export {
  syncMetrics,
  metricasSincronizacion,
  MetricasSincronizacion,
  type SyncMetric,
  type SyncOperationType,
} from './MetricasSincronizacion';
