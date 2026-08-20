import NetInfo from '@react-native-community/netinfo';
import type { Database } from 'firebase/database';
import { SimpleSalesRepo } from '../persistencia/SimpleSalesRepo';
import { logger } from '../monitoreo';
import { SQLiteStorageAdapter } from '../offline/storage/SQLiteStorageAdapter';
import {
  isCurrentTenantLifecycle,
  switchTenantLifecycle,
} from '../ciclo_de_vida/TenantLifecycleController';
import { validarRutaTenant } from '../rtdb/rutas/RutaTenant';

class OfflineSalesSyncClass {
  private isRunning = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private salesRepo: SimpleSalesRepo | null = null;
  private tenantPath: string | null = null;
  private lifecycleGeneration = 0;

  initialize(db: Database, tenantPath: string): void {
    if (!validarRutaTenant(tenantPath)) {
      logger.error(
        'OFFLINE_SYNC',
        'Intento de inicializar ventas con tenantPath inválido o legacy',
        new Error(tenantPath)
      );
      return;
    }

    if (this.salesRepo && this.tenantPath === tenantPath) return;
    if (this.salesRepo && this.tenantPath !== tenantPath) this.destroy();

    this.tenantPath = tenantPath;
    this.lifecycleGeneration = switchTenantLifecycle(tenantPath);
    this.salesRepo = new SimpleSalesRepo(db, tenantPath);

    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.isRunning && this.isCurrent()) {
        logger.info('OFFLINE_SYNC', '🌐 Red restaurada, iniciando sincronización...');
        void this.syncPendingSales();
      }
    });

    logger.info('OFFLINE_SYNC', '✅ Servicio de sincronización inicializado', { tenantPath });
  }

  private isCurrent(): boolean {
    return Boolean(
      this.tenantPath &&
      this.salesRepo &&
      isCurrentTenantLifecycle(this.tenantPath, this.lifecycleGeneration)
    );
  }

  async syncPendingSales(): Promise<{ synced: number; failed: number }> {
    const repo = this.salesRepo;
    const tenantPath = this.tenantPath;
    const generation = this.lifecycleGeneration;
    if (this.isRunning || !repo || !tenantPath || !this.isCurrent()) {
      return { synced: 0, failed: 0 };
    }

    this.isRunning = true;
    let synced = 0;
    let failed = 0;

    try {
      const pendingVentas = await SQLiteStorageAdapter.getVentasPendientes();
      if (!this.isCurrent()) return { synced, failed };

      if (pendingVentas.length === 0) {
        logger.info('OFFLINE_SYNC', 'No hay ventas pendientes');
        return { synced: 0, failed: 0 };
      }

      logger.info('OFFLINE_SYNC', `Sincronizando ${pendingVentas.length} ventas...`, {
        tenantPath,
        generation,
      });

      for (const venta of pendingVentas) {
        if (!this.isCurrent()) break;
        try {
          const ventaData = JSON.parse(venta.data);
          await repo.registrarVenta(ventaData);
          if (!this.isCurrent()) break;

          await SQLiteStorageAdapter.markVentaSynced(venta.id);
          synced++;
          logger.info('OFFLINE_SYNC', `✅ Venta ${venta.id} sincronizada`);
        } catch (error: any) {
          failed++;
          logger.error('OFFLINE_SYNC', `❌ Error sincronizando ${venta.id}:`, error);
          if (error?.message?.includes('conflict') || error?.message?.includes('invalid')) {
            await SQLiteStorageAdapter.markVentaConflict(venta.id);
          }
        }
      }

      logger.info('OFFLINE_SYNC', `Sincronización completa: ${synced} ok, ${failed} fallos`);
    } catch (error) {
      logger.error('OFFLINE_SYNC', '❌ Error en sincronización:', error);
    } finally {
      this.isRunning = false;
    }

    return { synced, failed };
  }

  async getPendingCount(): Promise<number> {
    const pending = await SQLiteStorageAdapter.getVentasPendientes();
    return pending.length;
  }

  destroy(): void {
    this.lifecycleGeneration += 1;
    this.isRunning = false;
    this.unsubscribeNetInfo?.();
    this.unsubscribeNetInfo = null;
    this.salesRepo = null;
    this.tenantPath = null;
  }
}

export const OfflineSalesSync = new OfflineSalesSyncClass();
