/**
 * Persistencia sin conexión: datos estructurados y colas locales SQLite.
 *
 * Este barril traduce las exportaciones reales del adaptador
 * (`AdaptadorAlmacenamientoSQLite`) a los nombres canónicos en español,
 * preservando los alias ingleses para retrocompatibilidad.
 */
import { SQLiteStorageAdapter } from './almacenamiento/AdaptadorAlmacenamientoSQLite';

export { SQLiteStorageAdapter };
export { SQLiteStorageAdapter as AdaptadorAlmacenamientoSQLite };

export type {
  HistorialVenta,
  OfflineCategoria,
  OfflineMesa,
  OfflinePedido,
  OfflinePrintJob,
  OfflineProducto,
  OfflineVenta,
  OfflineInventoryMovement,
  // Alias canónicos en español
  OfflineCategoria as CategoriaSinConexion,
  OfflineMesa as MesaSinConexion,
  OfflineInventoryMovement as MovimientoInventarioSinConexion,
  OfflinePedido as PedidoSinConexion,
  OfflineProducto as ProductoSinConexion,
  OfflinePrintJob as TrabajoImpresionSinConexion,
  OfflineVenta as VentaSinConexion,
} from './almacenamiento/AdaptadorAlmacenamientoSQLite';
