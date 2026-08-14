/**
 * 🔄 OFFLINE SALES SYNC SERVICE
 *
 * Sincroniza ventas guardadas localmente (SQLite) hacia Firebase
 * cuando se restaura la conexión a internet.
 *
 * DOGMA V2: Este servicio es parte de la arquitectura offline-first.
 */

import NetInfo from '@react-native-community/netinfo';
import type { Database } from 'firebase/database';
import { SimpleSalesRepo } from '../../base/_persistencia/SimpleSalesRepo';
import { logger } from '../monitoring';
import { SQLiteStorageAdapter } from '../offline/storage/SQLiteStorageAdapter';
import { validarRutaTenant } from '../rtdb/rutas/RutaTenant';

class OfflineSalesSyncClass {
  private isRunning = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private salesRepo: SimpleSalesRepo | null = null;

  /**
   * Inicializa el servicio de sincronización.
   * Requiere referencia a la base de datos Firebase.
   */
  initialize(db: Database, tenantPath: string): void {
    if (this.salesRepo) return; // Ya inicializado

    if (!validarRutaTenant(tenantPath)) {
      logger.error(
        'OFFLINE_SYNC',
        'Intento de inicializar con tenantPath inválido o legacy',
        new Error(tenantPath)
      );
      return;
    }

    this.salesRepo = new SimpleSalesRepo(db, tenantPath);

    // Escuchar cambios de red
    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.isRunning) {
        logger.info('OFFLINE_SYNC', '🌐 Red restaurada, iniciando sincronización...');
        this.syncPendingSales();
      }
    });

    logger.info('OFFLINE_SYNC', '✅ Servicio de sincronización inicializado');
  }

  /**
   * Sincroniza todas las ventas pendientes en SQLite hacia Firebase.
   */
  async syncPendingSales(): Promise<{ synced: number; failed: number }> {
    if (this.isRunning || !this.salesRepo) {
      return { synced: 0, failed: 0 };
    }

    this.isRunning = true;
    let synced = 0;
    let failed = 0;

    try {
      const pendingVentas = await SQLiteStorageAdapter.getVentasPendientes();

      if (pendingVentas.length === 0) {
        logger.info('OFFLINE_SYNC', 'No hay ventas pendientes');
        this.isRunning = false;
        return { synced: 0, failed: 0 };
      }

      logger.info('OFFLINE_SYNC', `Sincronizando ${pendingVentas.length} ventas...`);

      for (const venta of pendingVentas) {
        try {
          // Parsear los datos de la venta
          const ventaData = JSON.parse(venta.data);

          // Enviar a Firebase
          await this.salesRepo.registrarVenta(ventaData);

          // Marcar como sincronizada
          await SQLiteStorageAdapter.markVentaSynced(venta.id);
          synced++;

          logger.info('OFFLINE_SYNC', `✅ Venta ${venta.id} sincronizada`);
        } catch (error: any) {
          failed++;
          logger.error('OFFLINE_SYNC', `❌ Error sincronizando ${venta.id}:`, error);

          // Si es error de conflicto o datos inválidos, marcar como conflicto
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

  /**
   * Obtiene el conteo de ventas pendientes de sincronizar
   */
  async getPendingCount(): Promise<number> {
    const pending = await SQLiteStorageAdapter.getVentasPendientes();
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
    this.salesRepo = null;
  }
}

// Singleton
export const OfflineSalesSync = new OfflineSalesSyncClass();
