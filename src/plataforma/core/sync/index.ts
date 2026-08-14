/**
 * 🔄 SISTEMA UNIFICADO DE SINCRONIZACIÓN
 *
 * Exporta todo lo necesario para sincronización multi-dispositivo
 */

export {
  SynchronizationService,
  synchronizationService,
  type SyncConfig,
  type SynchronizableItem,
} from './SynchronizationService';

export {
  useSynchronizedArray,
  type SynchronizedArrayResult,
  type UseSynchronizedArrayConfig,
} from './useSynchronizedArray';

export { syncMetrics, type SyncMetric, type SyncOperationType } from './SyncMetrics';
