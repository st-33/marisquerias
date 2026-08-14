/**
 * 🔄 OFFLINE INVENTORY SYNC SERVICE
 *
 * Sincroniza movimientos de inventario guardados localmente (SQLite) hacia Firebase
 * cuando se restaura la conexión a internet.
 */

import NetInfo from '@react-native-community/netinfo';
import type { Database } from 'firebase/database';
import { useStore } from '../store';
import { logger } from '../monitoring';
import { SQLiteStorageAdapter } from '../offline/storage/SQLiteStorageAdapter';
import { validarRutaTenant } from '../rtdb/rutas/RutaTenant';

class OfflineInventorySyncClass {
  private isRunning = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private db: Database | null = null;
  private tenantPath: string | null = null;

  /**
   * Inicializa el servicio de sincronización.
   * Requiere referencia a la base de datos Firebase.
   */
  initialize(db: Database, tenantPath: string): void {
    if (this.db) return; // Ya inicializado

    if (!validarRutaTenant(tenantPath)) {
      logger.error(
        'OFFLINE_INV_SYNC',
        'Intento de inicializar inventario con tenantPath inválido o legacy',
        new Error(tenantPath)
      );
      return;
    }

    this.db = db;
    this.tenantPath = tenantPath;

    // Escuchar cambios de red
    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.isRunning) {
        logger.info(
          'OFFLINE_INV_SYNC',
          '🌐 Red restaurada, iniciando sincronización de inventario...'
        );
        void this.syncPendingMovements();
      }
    });

    logger.info('OFFLINE_INV_SYNC', '✅ Servicio de sincronización de inventario inicializado');
  }

  /**
   * Sincroniza todos los movimientos de inventario pendientes en SQLite hacia Firebase.
   */
  async syncPendingMovements(): Promise<{ synced: number; failed: number }> {
    if (this.isRunning || !this.db || !this.tenantPath) {
      return { synced: 0, failed: 0 };
    }

    this.isRunning = true;
    let synced = 0;
    let failed = 0;

    try {
      const pendingMovements = await SQLiteStorageAdapter.getPendingInventoryMovements();

      if (pendingMovements.length === 0) {
        logger.info('OFFLINE_INV_SYNC', 'No hay movimientos de inventario pendientes');
        this.isRunning = false;
        return { synced: 0, failed: 0 };
      }

      logger.info(
        'OFFLINE_INV_SYNC',
        `Sincronizando ${pendingMovements.length} movimientos de inventario...`
      );

      const store = useStore.getState();

      for (const mov of pendingMovements) {
        try {
          if (mov.containerId.startsWith('section:')) {
            const sectionId = mov.containerId.replace('section:', '') as
              | 'alimentos'
              | 'losa_cristaleria'
              | 'otros';
            await store.ajustarStockDeltaSeccion({
              db: this.db,
              tenantPath: this.tenantPath,
              sectionId,
              itemId: mov.itemId,
              delta: mov.delta,
              usuario: mov.usuario,
              razon: mov.razon,
              allowNegative: mov.allowNegative === 1,
            });
          } else {
            await store.ajustarStockDelta({
              db: this.db,
              tenantPath: this.tenantPath,
              containerId: mov.containerId,
              itemId: mov.itemId,
              delta: mov.delta,
              usuario: mov.usuario,
              razon: mov.razon,
              allowNegative: mov.allowNegative === 1,
            });
          }

          // Marcar como sincronizado
          await SQLiteStorageAdapter.markInventoryMovementSynced(mov.id);
          synced++;
          logger.info('OFFLINE_INV_SYNC', `✅ Movimiento ${mov.id} sincronizado`);
        } catch (error: any) {
          failed++;
          logger.error('OFFLINE_INV_SYNC', `❌ Error sincronizando movimiento ${mov.id}:`, error);
          await SQLiteStorageAdapter.incrementInventoryMovementAttempts(mov.id);

          if (mov.attempts >= 5) {
            await SQLiteStorageAdapter.markInventoryMovementFailed(mov.id);
          }
        }
      }

      logger.info(
        'OFFLINE_INV_SYNC',
        `Sincronización de inventario completa: ${synced} ok, ${failed} fallos`
      );
    } catch (error) {
      logger.error('OFFLINE_INV_SYNC', '❌ Error en sincronización de inventario:', error);
    } finally {
      this.isRunning = false;
    }

    return { synced, failed };
  }

  /**
   * Obtiene el conteo de movimientos de inventario pendientes de sincronizar
   */
  async getPendingCount(): Promise<number> {
    const pending = await SQLiteStorageAdapter.getPendingInventoryMovements();
    return pending.length;
  }

  /**
   * Detiene el servicio
   */
  destroy(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
    this.db = null;
    this.tenantPath = null;
  }
}

export const OfflineInventorySync = new OfflineInventorySyncClass();
