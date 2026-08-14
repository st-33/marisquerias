/**
 * 🗃️ SQLITE STORAGE ADAPTER - WEB FALLBACK
 * En web, expo-sqlite no está disponible.
 * Este archivo proporciona un fallback vacío para evitar errores de bundler.
 */

import { logger } from '../../../monitoring';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS (compartidos con nativo)
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
  tenantPath: string;
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

// ═══════════════════════════════════════════════════════════════════════════
// WEB FALLBACK (No-op implementation)
// ═══════════════════════════════════════════════════════════════════════════

class SQLiteStorageAdapterWebClass {
  private isInitialized = false;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    logger.warn('SQLITE_STORAGE', 'SQLite not available on web - using empty fallback');
    this.isInitialized = true;
  }

  // Menu
  async saveProductosBulk(_productos: Record<string, object>): Promise<void> {}
  async getProductos(): Promise<Record<string, object>> {
    return {};
  }
  async saveCategoriasBulk(_categorias: Record<string, object>): Promise<void> {}
  async getCategorias(): Promise<Record<string, object>> {
    return {};
  }

  // Mesas/Pedidos
  async saveMesasBulk(_mesas: Record<string, object>): Promise<void> {}
  async getMesas(): Promise<Record<string, object>> {
    return {};
  }
  async savePedidosBulk(_pedidos: Record<string, object>): Promise<void> {}
  async getPedidos(): Promise<Record<string, object>> {
    return {};
  }

  // Ventas Offline
  async createVentaOffline(
    _id: string,
    _canal: 'venta_crudo' | 'restaurante',
    _data: object
  ): Promise<void> {}
  async getVentasPendientes(): Promise<OfflineVenta[]> {
    return [];
  }
  async markVentaSynced(_id: string): Promise<void> {}
  async markVentaConflict(_id: string): Promise<void> {}

  // Print Queue
  async enqueuePrintJob(
    _id: string,
    _ticketData: object,
    _target: 'hub' | 'bluetooth'
  ): Promise<void> {}
  async getPendingPrintJobs(): Promise<OfflinePrintJob[]> {
    return [];
  }
  async markPrintJobCompleted(_id: string): Promise<void> {}
  async incrementPrintJobAttempts(_id: string): Promise<void> {}
  async markPrintJobFailed(_id: string): Promise<void> {}

  // Inventory Queue (web no-op)
  async enqueueInventoryMovement(_params: {
    id: string;
    tenantPath: string;
    containerId: string;
    itemId: string;
    delta: number;
    usuario?: string;
    razon?: string;
    allowNegative: boolean;
  }): Promise<void> {}
  async getPendingInventoryMovements(): Promise<OfflineInventoryMovement[]> {
    return [];
  }
  async markInventoryMovementSynced(_id: string): Promise<void> {}
  async incrementInventoryMovementAttempts(_id: string): Promise<void> {}
  async markInventoryMovementFailed(_id: string): Promise<void> {}

  // Config
  async setConfig(_key: string, _value: object): Promise<void> {}
  async getConfig<T>(_key: string): Promise<T | null> {
    return null;
  }

  // Utils
  async clearAll(): Promise<void> {}
  isAvailable(): boolean {
    return false;
  }
}

export const SQLiteStorageAdapter = new SQLiteStorageAdapterWebClass();
