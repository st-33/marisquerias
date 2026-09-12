import NetInfo from '@react-native-community/netinfo';
import type { Database } from 'firebase/database';
import { useStore } from '../store';
import { logger } from '../monitoreo';
import { SQLiteStorageAdapter } from '../offline/storage/SQLiteStorageAdapter';
import {
  isCurrentNegocioLifecycle,
  switchNegocioLifecycle,
} from '../ciclo_de_vida/NegocioLifecycleController';
import { validar_ruta_negocio } from '../rtdb/rutas/ruta_negocio';

class OfflineInventorySyncClass {
  private isRunning = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private db: Database | null = null;
  private rutaNegocio: string | null = null;
  private lifecycleGeneration = 0;

  initialize(db: Database, rutaNegocio: string): void {
    if (!validar_ruta_negocio(rutaNegocio)) {
      logger.error(
        'OFFLINE_INV_SYNC',
        'Intento de inicializar inventario con rutaNegocio inválido o legacy',
        new Error(rutaNegocio)
      );
      return;
    }

    if (this.db && this.rutaNegocio === rutaNegocio) return;
    if (this.db && this.rutaNegocio !== rutaNegocio) this.destroy();

    this.db = db;
    this.rutaNegocio = rutaNegocio;
    this.lifecycleGeneration = switchNegocioLifecycle(rutaNegocio);

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
      rutaNegocio,
    });
  }

  private isCurrent(): boolean {
    return Boolean(
      this.db &&
      this.rutaNegocio &&
      isCurrentNegocioLifecycle(this.rutaNegocio, this.lifecycleGeneration)
    );
  }

  async syncPendingMovements(): Promise<{ synced: number; failed: number }> {
    const db = this.db;
    const rutaNegocio = this.rutaNegocio;
    const generation = this.lifecycleGeneration;
    if (this.isRunning || !db || !rutaNegocio || !this.isCurrent()) {
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
        { rutaNegocio, generation }
      );

      const store = useStore.getState();
      for (const mov of pendingMovements) {
        if (!this.isCurrent()) break;
        try {
          if (mov.rutaNegocio !== rutaNegocio) continue;

          if (mov.containerId.startsWith('section:')) {
            const sectionId = mov.containerId.replace('section:', '') as
              | 'alimentos'
              | 'losa_cristaleria'
              | 'otros';
            await store.ajustarStockDeltaSeccion({
              db,
              rutaNegocio,
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
              rutaNegocio,
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
    this.rutaNegocio = null;
  }
}

export const OfflineInventorySync = new OfflineInventorySyncClass();
