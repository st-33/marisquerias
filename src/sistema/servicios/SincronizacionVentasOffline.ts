import NetInfo from '@react-native-community/netinfo';
import type { Database } from 'firebase/database';
import { RegistroVentasRepository } from '../persistencia/registroVentas.repositorio';
import { logger } from '../monitoreo';
import { SQLiteStorageAdapter } from '../sin_conexion/almacenamiento/AdaptadorAlmacenamientoSQLite';
import { validar_ruta_negocio } from '../rtdb/rutas/ruta_negocio';

class SincronizacionVentasOffline {
  private isRunning = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private salesRepo: RegistroVentasRepository | null = null;
  private rutaNegocio: string | null = null;
  private lifecycleGeneration = 0;

  initialize(db: Database, rutaNegocio: string): void {
    if (!validar_ruta_negocio(rutaNegocio, { permitirRaiz: true })) {
      logger.error(
        'OFFLINE_SYNC',
        'Intento de inicializar ventas con rutaNegocio inválido o legacy',
        new Error(rutaNegocio)
      );
      return;
    }

    if (this.salesRepo && this.rutaNegocio === rutaNegocio) return;
    if (this.salesRepo && this.rutaNegocio !== rutaNegocio) this.destroy();

    this.rutaNegocio = rutaNegocio;
    this.salesRepo = new RegistroVentasRepository(db, rutaNegocio);

    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected && !this.isRunning && this.isCurrent()) {
        logger.info('OFFLINE_SYNC', '🌐 Red restaurada, iniciando sincronización...');
        void this.syncPendingSales();
      }
    });

    logger.info('OFFLINE_SYNC', '✅ Servicio de sincronización inicializado', { rutaNegocio });
  }

  private isCurrent(): boolean {
    return Boolean(this.rutaNegocio !== null && this.salesRepo);
  }

  async syncPendingSales(): Promise<{ synced: number; failed: number }> {
    const repo = this.salesRepo;
    const rutaNegocio = this.rutaNegocio;
    if (this.isRunning || !repo || rutaNegocio === null || !this.isCurrent()) {
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
        rutaNegocio,
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
    this.rutaNegocio = null;
  }
}

export const sincronizacionVentasOffline = new SincronizacionVentasOffline();

// Aliases retrocompatibles (inglés)
export { SincronizacionVentasOffline as OfflineSalesSyncClass };
export { sincronizacionVentasOffline as OfflineSalesSync };
