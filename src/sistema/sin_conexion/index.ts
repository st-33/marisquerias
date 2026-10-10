/**
 * Persistencia sin conexión: datos estructurados y colas locales SQLite.
 *
 * Este barril reexporta las exportaciones canónicas del adaptador
 * (`AdaptadorAlmacenamientoSQLite`), preservando los alias ingleses
 * para retrocompatibilidad.
 */
import { SQLiteStorageAdapter } from './almacenamiento/AdaptadorAlmacenamientoSQLite';

export { SQLiteStorageAdapter };
export { SQLiteStorageAdapter as AdaptadorAlmacenamientoSQLite };

export type {
  HistorialVenta,
  // Alias ingleses (retrocompatibilidad)
  VentaSinConexion as OfflineVenta,
  TrabajoImpresionSinConexion as OfflinePrintJob,
  MovimientoInventarioSinConexion as OfflineInventoryMovement,
  ProductoSinConexion as OfflineProducto,
  CategoriaSinConexion as OfflineCategoria,
  MesaSinConexion as OfflineMesa,
  PedidoSinConexion as OfflinePedido,
  // Nombres canónicos en español
  CategoriaSinConexion,
  MesaSinConexion,
  MovimientoInventarioSinConexion,
  PedidoSinConexion,
  ProductoSinConexion,
  TrabajoImpresionSinConexion,
  VentaSinConexion,
} from './almacenamiento/AdaptadorAlmacenamientoSQLite';
