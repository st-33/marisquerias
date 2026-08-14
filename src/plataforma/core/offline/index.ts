/**
 * 🗃️ SISTEMA OFFLINE - PUNTO DE ENTRADA (Capa Depurada)
 *
 * Mantiene exclusivamente la infraestructura SQLite activa y real,
 * purgando los stubs y stores offline sin persistencia real.
 */

// SQLite Storage (para datos estructurados POS y cola de impresión)
export { SQLiteStorageAdapter } from './storage/SQLiteStorageAdapter';
export type {
  OfflinePrintJob,
  OfflineCategoria,
  OfflineMesa,
  OfflinePedido,
  OfflineProducto,
  OfflineVenta,
} from './storage/SQLiteStorageAdapter';
