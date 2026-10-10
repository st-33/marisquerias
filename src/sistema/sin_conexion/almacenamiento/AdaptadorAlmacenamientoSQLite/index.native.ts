/**
 * 🗃️ SQLITE STORAGE ADAPTER
 * Adaptador basado en expo-sqlite para persistencia estructurada.
 *
 * DOGMA V2: Este adaptador maneja datos estructurados que requieren
 * queries SQL (ventas, cola de impresión, etc.). Para datos
 * simples de config, se puede seguir usando el HybridStorageAdapter.
 *
 * NOTA: expo-sqlite solo funciona en nativo. En web usamos fallback vacío.
 */

import { Platform } from 'react-native';
import { logger } from '../../../monitoreo';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS PARA OFFLINE POS
// ═══════════════════════════════════════════════════════════════════════════

export interface OfflineVenta {
  id: string;
  canal: 'venta_crudo' | 'restaurante';
  data: string;
  syncStatus: 'pending' | 'synced' | 'conflict';
  createdAt: number;
  syncedAt: number | null;
}

export interface OfflinePrintJob {
  id: string;
  ticketData: string;
  target: 'hub' | 'bluetooth';
  status: 'pending' | 'printed' | 'failed';
  createdAt: number;
  attempts: number;
}

export interface OfflineInventoryMovement {
  id: string;
  rutaNegocio: string;
  containerId: string;
  itemId: string;
  delta: number;
  usuario?: string;
  razon?: string;
  allowNegative: number; // 0 or 1
  createdAt: number;
  status: 'pending' | 'completed' | 'failed';
  attempts: number;
}

export interface OfflineProducto {
  id: string;
  data: string;
  updatedAt: number;
}

export interface OfflineCategoria {
  id: string;
  data: string;
  updatedAt: number;
}

export interface OfflineMesa {
  id: string;
  data: string;
  updatedAt: number;
}

export interface OfflinePedido {
  id: string;
  data: string;
  updatedAt: number;
}

export interface HistorialVenta {
  id: string;
  negocio_id: string;
  tipo: 'pedido_cerrado' | 'registro_ventas' | 'venta_suelto';
  fecha: string; // ISO o YYYY/MM/DD
  timestamp: number;
  total: number;
  metodo_pago: string | null;
  datos_json: string;
  sincronizado?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// SQLITE ADAPTER CLASS
// ═══════════════════════════════════════════════════════════════════════════

class SQLiteStorageAdapterClass {
  // Using 'any' to avoid type conflicts with dynamic import
  private db: any = null;
  private isInitialized = false;
  private isWeb = Platform.OS === 'web';
  private webFallbackHistorial = new Map<string, HistorialVenta>();

  /**
   * Inicializa la base de datos y crea las tablas.
   * En web, no hace nada (fallback vacío).
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (this.isWeb) {
      logger.warn('SQLITE_STORAGE', 'SQLite not available on web, using empty fallback');
      this.isInitialized = true;
      return;
    }

    try {
      // Dynamic import to prevent bundler errors on web
      const SQLite = await import('expo-sqlite');
      this.db = await SQLite.openDatabaseAsync('adi_pos_offline.db');

      await this.db.execAsync(`
        PRAGMA journal_mode = WAL;
        
        CREATE TABLE IF NOT EXISTS config (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updatedAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS menu_productos (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updatedAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS menu_categorias (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updatedAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS mesas (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updatedAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS pedidos (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updatedAt INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS ventas_offline (
          id TEXT PRIMARY KEY,
          canal TEXT NOT NULL,
          data TEXT NOT NULL,
          syncStatus TEXT NOT NULL DEFAULT 'pending',
          createdAt INTEGER NOT NULL,
          syncedAt INTEGER
        );

        CREATE TABLE IF NOT EXISTS print_queue (
          id TEXT PRIMARY KEY,
          ticketData TEXT NOT NULL,
          target TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          createdAt INTEGER NOT NULL,
          attempts INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS inventory_queue (
          id TEXT PRIMARY KEY,
          rutaNegocio TEXT NOT NULL,
          containerId TEXT NOT NULL,
          itemId TEXT NOT NULL,
          delta REAL NOT NULL,
          usuario TEXT,
          razon TEXT,
          allowNegative INTEGER NOT NULL DEFAULT 0,
          createdAt INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          attempts INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS historial_ventas (
          id TEXT PRIMARY KEY,
          negocio_id TEXT NOT NULL,
          tipo TEXT NOT NULL,
          fecha TEXT NOT NULL,
          timestamp INTEGER NOT NULL,
          total REAL NOT NULL,
          metodo_pago TEXT,
          datos_json TEXT NOT NULL,
          sincronizado INTEGER DEFAULT 1
        );

        CREATE INDEX IF NOT EXISTS idx_ventas_sync ON ventas_offline(syncStatus);
        CREATE INDEX IF NOT EXISTS idx_print_status ON print_queue(status);
        CREATE INDEX IF NOT EXISTS idx_inv_queue_status ON inventory_queue(status);
        CREATE INDEX IF NOT EXISTS idx_historial_negocio_fecha ON historial_ventas(negocio_id, fecha);
        CREATE INDEX IF NOT EXISTS idx_historial_tipo ON historial_ventas(tipo);
      `);

      this.isInitialized = true;
      logger.info('SQLITE_STORAGE', '✅ SQLite database initialized');
    } catch (error) {
      logger.error('SQLITE_STORAGE', '❌ Failed to initialize SQLite:', error);
      // Mark as initialized anyway to prevent repeated failures
      this.isInitialized = true;
    }
  }

  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('[SQLiteStorage] Not initialized. Call initialize() first.');
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MENU (Productos/Categorías) - Para carga offline
  // ─────────────────────────────────────────────────────────────────────────

  async saveProductosBulk(productos: Record<string, object>): Promise<void> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    const now = Date.now();
    await this.db.withTransactionAsync(async () => {
      await this.db!.runAsync('DELETE FROM menu_productos');
      for (const [id, data] of Object.entries(productos)) {
        await this.db!.runAsync(
          'INSERT INTO menu_productos (id, data, updatedAt) VALUES (?, ?, ?)',
          [id, JSON.stringify(data), now]
        );
      }
    });
    logger.info('SQLITE_STORAGE', `Saved ${Object.keys(productos).length} productos`);
  }

  async getProductos(): Promise<Record<string, object>> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return {};

    const rows = (await this.db.getAllAsync('SELECT * FROM menu_productos')) as OfflineProducto[];
    const result: Record<string, object> = {};
    for (const row of rows) {
      try {
        result[row.id] = JSON.parse(row.data);
      } catch {
        logger.warn('SQLITE_STORAGE', `Failed to parse producto ${row.id}`);
      }
    }
    return result;
  }

  async saveCategoriasBulk(categorias: Record<string, object>): Promise<void> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    const now = Date.now();
    await this.db.withTransactionAsync(async () => {
      await this.db!.runAsync('DELETE FROM menu_categorias');
      for (const [id, data] of Object.entries(categorias)) {
        await this.db!.runAsync(
          'INSERT INTO menu_categorias (id, data, updatedAt) VALUES (?, ?, ?)',
          [id, JSON.stringify(data), now]
        );
      }
    });
    logger.info('SQLITE_STORAGE', `Saved ${Object.keys(categorias).length} categorías`);
  }

  async getCategorias(): Promise<Record<string, object>> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return {};

    const rows = (await this.db.getAllAsync('SELECT * FROM menu_categorias')) as OfflineCategoria[];
    const result: Record<string, object> = {};
    for (const row of rows) {
      try {
        result[row.id] = JSON.parse(row.data);
      } catch {
        logger.warn('SQLITE_STORAGE', `Failed to parse categoria ${row.id}`);
      }
    }
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MESAS / PEDIDOS - Para estado operativo
  // ─────────────────────────────────────────────────────────────────────────

  async saveMesasBulk(mesas: Record<string, object>): Promise<void> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    const now = Date.now();
    await this.db.withTransactionAsync(async () => {
      await this.db!.runAsync('DELETE FROM mesas');
      for (const [id, data] of Object.entries(mesas)) {
        await this.db!.runAsync('INSERT INTO mesas (id, data, updatedAt) VALUES (?, ?, ?)', [
          id,
          JSON.stringify(data),
          now,
        ]);
      }
    });
  }

  async getMesas(): Promise<Record<string, object>> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return {};

    const rows = (await this.db.getAllAsync('SELECT * FROM mesas')) as OfflineMesa[];
    const result: Record<string, object> = {};
    for (const row of rows) {
      try {
        result[row.id] = JSON.parse(row.data);
      } catch {
        /* ignore */
      }
    }
    return result;
  }

  async savePedidosBulk(pedidos: Record<string, object>): Promise<void> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    const now = Date.now();
    await this.db.withTransactionAsync(async () => {
      await this.db!.runAsync('DELETE FROM pedidos');
      for (const [id, data] of Object.entries(pedidos)) {
        await this.db!.runAsync('INSERT INTO pedidos (id, data, updatedAt) VALUES (?, ?, ?)', [
          id,
          JSON.stringify(data),
          now,
        ]);
      }
    });
  }

  async getPedidos(): Promise<Record<string, object>> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return {};

    const rows = (await this.db.getAllAsync('SELECT * FROM pedidos')) as OfflinePedido[];
    const result: Record<string, object> = {};
    for (const row of rows) {
      try {
        result[row.id] = JSON.parse(row.data);
      } catch {
        /* ignore */
      }
    }
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VENTAS OFFLINE - Cola de sincronización
  // ─────────────────────────────────────────────────────────────────────────

  async createVentaOffline(
    id: string,
    canal: 'venta_crudo' | 'restaurante',
    data: object
  ): Promise<void> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    await this.db.runAsync(
      `INSERT INTO ventas_offline (id, canal, data, syncStatus, createdAt, syncedAt) 
       VALUES (?, ?, ?, 'pending', ?, NULL)`,
      [id, canal, JSON.stringify(data), Date.now()]
    );
    logger.info('SQLITE_STORAGE', `Created offline venta ${id} for ${canal}`);
  }

  async getVentasPendientes(): Promise<OfflineVenta[]> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return [];

    return (await this.db.getAllAsync(
      "SELECT * FROM ventas_offline WHERE syncStatus = 'pending' ORDER BY createdAt ASC"
    )) as OfflineVenta[];
  }

  async markVentaSynced(id: string): Promise<void> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    await this.db.runAsync(
      "UPDATE ventas_offline SET syncStatus = 'synced', syncedAt = ? WHERE id = ?",
      [Date.now(), id]
    );
  }

  async markVentaConflict(id: string): Promise<void> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    await this.db.runAsync("UPDATE ventas_offline SET syncStatus = 'conflict' WHERE id = ?", [id]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRINT QUEUE - Cola de impresión local
  // ─────────────────────────────────────────────────────────────────────────

  async enqueuePrintJob(
    id: string,
    ticketData: object,
    target: 'hub' | 'bluetooth'
  ): Promise<void> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    await this.db.runAsync(
      `INSERT INTO print_queue (id, ticketData, target, status, createdAt, attempts) 
       VALUES (?, ?, ?, 'pending', ?, 0)`,
      [id, JSON.stringify(ticketData), target, Date.now()]
    );
    logger.info('SQLITE_STORAGE', `Enqueued print job ${id} for ${target}`);
  }

  async getPendingPrintJobs(): Promise<OfflinePrintJob[]> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return [];

    return (await this.db.getAllAsync(
      "SELECT * FROM print_queue WHERE status = 'pending' ORDER BY createdAt ASC"
    )) as OfflinePrintJob[];
  }

  async markPrintJobCompleted(id: string): Promise<void> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    await this.db.runAsync("UPDATE print_queue SET status = 'printed' WHERE id = ?", [id]);
  }

  async incrementPrintJobAttempts(id: string): Promise<void> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    await this.db.runAsync('UPDATE print_queue SET attempts = attempts + 1 WHERE id = ?', [id]);
  }

  async markPrintJobFailed(id: string): Promise<void> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    await this.db.runAsync("UPDATE print_queue SET status = 'failed' WHERE id = ?", [id]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INVENTORY QUEUE - Cola de movimientos de inventario local
  // ─────────────────────────────────────────────────────────────────────────

  async enqueueInventoryMovement(params: {
    id: string;
    rutaNegocio: string;
    containerId: string;
    itemId: string;
    delta: number;
    usuario?: string;
    razon?: string;
    allowNegative: boolean;
  }): Promise<void> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    const { id, rutaNegocio, containerId, itemId, delta, usuario, razon, allowNegative } = params;
    await this.db.runAsync(
      `INSERT INTO inventory_queue (id, rutaNegocio, containerId, itemId, delta, usuario, razon, allowNegative, createdAt, status, attempts) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0)`,
      [
        id,
        rutaNegocio,
        containerId,
        itemId,
        delta,
        usuario || null,
        razon || null,
        allowNegative ? 1 : 0,
        Date.now(),
      ]
    );
    logger.info(
      'SQLITE_STORAGE',
      `Enqueued inventory movement ${id} for ${itemId} in ${containerId}`
    );
  }

  async getPendingInventoryMovements(): Promise<OfflineInventoryMovement[]> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return [];

    return (await this.db.getAllAsync(
      "SELECT * FROM inventory_queue WHERE status = 'pending' ORDER BY createdAt ASC"
    )) as OfflineInventoryMovement[];
  }

  async markInventoryMovementSynced(id: string): Promise<void> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    await this.db.runAsync("UPDATE inventory_queue SET status = 'completed' WHERE id = ?", [id]);
  }

  async incrementInventoryMovementAttempts(id: string): Promise<void> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    await this.db.runAsync('UPDATE inventory_queue SET attempts = attempts + 1 WHERE id = ?', [id]);
  }

  async markInventoryMovementFailed(id: string): Promise<void> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    await this.db.runAsync("UPDATE inventory_queue SET status = 'failed' WHERE id = ?", [id]);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONFIG
  // ─────────────────────────────────────────────────────────────────────────

  async setConfig(key: string, value: object): Promise<void> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    await this.db.runAsync(
      'INSERT OR REPLACE INTO config (key, value, updatedAt) VALUES (?, ?, ?)',
      [key, JSON.stringify(value), Date.now()]
    );
  }

  async getConfig<T>(key: string): Promise<T | null> {
    this.ensureInitialized();
    if (this.isWeb || !this.db) return null;

    const result = (await this.db.getFirstAsync('SELECT value FROM config WHERE key = ?', [
      key,
    ])) as { value: string } | null;
    if (!result) return null;
    try {
      return JSON.parse(result.value) as T;
    } catch {
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // HISTORIAL VENTAS
  // ─────────────────────────────────────────────────────────────────────────

  async guardarHistorialVenta(registro: HistorialVenta): Promise<void> {
    if (this.isWeb) {
      this.webFallbackHistorial.set(registro.id, registro);
      return;
    }
    this.ensureInitialized();
    if (!this.db) return;

    await this.db.runAsync(
      `INSERT OR REPLACE INTO historial_ventas (id, negocio_id, tipo, fecha, timestamp, total, metodo_pago, datos_json, sincronizado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        registro.id,
        registro.negocio_id,
        registro.tipo,
        registro.fecha,
        registro.timestamp,
        registro.total,
        registro.metodo_pago,
        registro.datos_json,
        registro.sincronizado ?? 1,
      ]
    );
  }

  async guardarHistorialVentasBulk(registros: HistorialVenta[]): Promise<void> {
    if (this.isWeb) {
      for (const r of registros) {
        this.webFallbackHistorial.set(r.id, r);
      }
      return;
    }
    this.ensureInitialized();
    if (!this.db || registros.length === 0) return;

    await this.db.withTransactionAsync(async () => {
      for (const r of registros) {
        await this.db.runAsync(
          `INSERT OR REPLACE INTO historial_ventas (id, negocio_id, tipo, fecha, timestamp, total, metodo_pago, datos_json, sincronizado)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [
            r.id,
            r.negocio_id,
            r.tipo,
            r.fecha,
            r.timestamp,
            r.total,
            r.metodo_pago,
            r.datos_json,
            r.sincronizado ?? 1,
          ]
        );
      }
    });
  }

  async obtenerHistorialVentas(
    negocioId?: string,
    filtro?: { fecha?: string; tipo?: string; desde?: number; hasta?: number }
  ): Promise<HistorialVenta[]> {
    if (this.isWeb || !this.db) {
      let list = Array.from(this.webFallbackHistorial.values());
      if (negocioId) list = list.filter((r) => r.negocio_id === negocioId);
      if (filtro?.fecha) list = list.filter((r) => r.fecha === filtro.fecha);
      if (filtro?.tipo) list = list.filter((r) => r.tipo === filtro.tipo);
      if (filtro?.desde !== undefined) list = list.filter((r) => r.timestamp >= filtro.desde!);
      if (filtro?.hasta !== undefined) list = list.filter((r) => r.timestamp <= filtro.hasta!);
      return list.sort((a, b) => a.timestamp - b.timestamp);
    }
    this.ensureInitialized();

    const conditions: string[] = [];
    const params: any[] = [];

    if (negocioId) {
      conditions.push('negocio_id = ?');
      params.push(negocioId);
    }
    if (filtro?.fecha) {
      conditions.push('fecha = ?');
      params.push(filtro.fecha);
    }
    if (filtro?.tipo) {
      conditions.push('tipo = ?');
      params.push(filtro.tipo);
    }
    if (filtro?.desde !== undefined) {
      conditions.push('timestamp >= ?');
      params.push(filtro.desde);
    }
    if (filtro?.hasta !== undefined) {
      conditions.push('timestamp <= ?');
      params.push(filtro.hasta);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const query = `SELECT * FROM historial_ventas ${whereClause} ORDER BY timestamp ASC;`;
    const rows = await this.db.getAllAsync(query, params);
    return rows as HistorialVenta[];
  }

  async contarHistorialVentas(negocioId?: string): Promise<number> {
    if (this.isWeb || !this.db) {
      const list = await this.obtenerHistorialVentas(negocioId);
      return list.length;
    }
    this.ensureInitialized();
    const where = negocioId ? 'WHERE negocio_id = ?' : '';
    const params = negocioId ? [negocioId] : [];
    const row = (await this.db.getFirstAsync(
      `SELECT COUNT(*) as cnt FROM historial_ventas ${where};`,
      params
    )) as { cnt: number } | null;
    return row?.cnt || 0;
  }

  async sumarTotalHistorialVentas(negocioId?: string): Promise<number> {
    if (this.isWeb || !this.db) {
      const list = await this.obtenerHistorialVentas(negocioId);
      return list.reduce((sum, r) => sum + Number(r.total || 0), 0);
    }
    this.ensureInitialized();
    const where = negocioId ? 'WHERE negocio_id = ?' : '';
    const params = negocioId ? [negocioId] : [];
    const row = (await this.db.getFirstAsync(
      `SELECT COALESCE(SUM(total), 0) as total FROM historial_ventas ${where};`,
      params
    )) as { total: number } | null;
    return row?.total || 0;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────

  async clearAll(): Promise<void> {
    this.webFallbackHistorial.clear();
    this.ensureInitialized();
    if (this.isWeb || !this.db) return;

    await this.db.execAsync(`
      DELETE FROM config;
      DELETE FROM menu_productos;
      DELETE FROM menu_categorias;
      DELETE FROM mesas;
      DELETE FROM pedidos;
      DELETE FROM ventas_offline;
      DELETE FROM print_queue;
      DELETE FROM inventory_queue;
      DELETE FROM historial_ventas;
    `);
    logger.info('SQLITE_STORAGE', 'All tables cleared');
  }

  isAvailable(): boolean {
    return !this.isWeb && this.isInitialized;
  }
}

// Singleton
export const SQLiteStorageAdapter = new SQLiteStorageAdapterClass();
