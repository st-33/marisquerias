import NetInfo from '@react-native-community/netinfo';
import type { Database } from 'firebase/database';
import { useStore } from '../store';
import { logger } from '../monitoreo';
import { SQLiteStorageAdapter } from '../offline/storage/SQLiteStorageAdapter';
import {
  isCurrentTenantLifecycle,
  switchTenantLifecycle,
} from '../ciclo_de_vida/TenantLifecycleController';
import { validarRutaTenant } from '../rtdb/rutas/RutaTenant';

class OfflineInventorySyncClass {
  private isRunning = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private db: Database | null = null;
  private tenantPath: string | null = null;
  private lifecycleGeneration = 0;

  initialize(db: Database, tenantPath: string): void {
    if (!validarRutaTenant(tenantPath)) {
      logger.error(
        'OFFLINE_INV_SYNC',
        'Intento de inicializar inventario con tenantPath inválido o legacy',
        new Error(tenantPath)
      );
      return;
    }

    if (this.db && this.tenantPath === tenantPath) return;
    if (this.db && this.tenantPath !== tenantPath) this.destroy();

    this.db = db;
    this.tenantPath = tenantPath;
    this.lifecycleGeneration = switchTenantLifecycle(tenantPath);

    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.isRunning && this.isCurrent()) {
        logger.info(
          'OFFLINE_INV_SYNC',
          '🌐 Red restaurada, iniciando sincronización de inventario...'
        );
        void this.syncPendingMovements();
      }
    });

    logger.info('OFFLINE_INV_SYNC', '✅ Servicio de sincronización de inventario inicializado', {
      tenantPath,
    });
  }

  private isCurrent(): boolean {
    return Boolean(
      this.db &&
      this.tenantPath &&
      isCurrentTenantLifecycle(this.tenantPath, this.lifecycleGeneration)
    );
  }

  async syncPendingMovements(): Promise<{ synced: number; failed: number }> {
    const db = this.db;
    const tenantPath = this.tenantPath;
    const generation = this.lifecycleGeneration;
    if (this.isRunning || !db || !tenantPath || !this.isCurrent()) {
      return { synced: 0, failed: 0 };
    }

    this.isRunning = true;
    let synced = 0;
    let failed = 0;

    try {
      const pendingMovements = await SQLiteStorageAdapter.getPendingInventoryMovements();
      if (!this.isCurrent()) return { synced, failed };

      if (pendingMovements.length === 0) {
        logger.info('OFFLINE_INV_SYNC', 'No hay movimientos de inventario pendientes');
        return { synced: 0, failed: 0 };
      }

      logger.info(
        'OFFLINE_INV_SYNC',
        `Sincronizando ${pendingMovements.length} movimientos de inventario...`,
        { tenantPath, generation }
      );

      const store = useStore.getState();
      for (const mov of pendingMovements) {
        if (!this.isCurrent()) break;
        try {
          if (mov.tenantPath !== tenantPath) continue;

          if (mov.containerId.startsWith('section:')) {
            const sectionId = mov.containerId.replace('section:', '') as
              | 'alimentos'
              | 'losa_cristaleria'
              | 'otros';
            await store.ajustarStockDeltaSeccion({
              db,
              tenantPath,
              sectionId,
              itemId: mov.itemId,
              delta: mov.delta,
              usuario: mov.usuario,
              razon: mov.razon,
              allowNegative: mov.allowNegative === 1,
            });
          } else {
            await store.ajustarStockDelta({
              db,
              tenantPath,
              containerId: mov.containerId,
              itemId: mov.itemId,
              delta: mov.delta,
              usuario: mov.usuario,
              razon: mov.razon,
              allowNegative: mov.allowNegative === 1,
            });
          }

          if (!this.isCurrent()) break;
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

  async getPendingCount(): Promise<number> {
    const pending = await SQLiteStorageAdapter.getPendingInventoryMovements();
    return pending.length;
  }

  destroy(): void {
    this.lifecycleGeneration += 1;
    this.isRunning = false;
    this.unsubscribeNetInfo?.();
    this.unsubscribeNetInfo = null;
    this.db = null;
    this.tenantPath = null;
  }
}

export const OfflineInventorySync = new OfflineInventorySyncClass();
