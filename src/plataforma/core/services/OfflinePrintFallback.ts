/**
 * 🔌 OFFLINE PRINT FALLBACK
 *
 * Servicio que maneja la impresión cuando no hay conexión a Firebase.
 * Prioridades:
 * 1. Hub Firebase (cuando online)
 * 2. Bluetooth directo (cuando offline pero BT disponible)
 * 3. Cola local SQLite (cuando no hay nada más)
 *
 * DOGMA V2: Este servicio es independiente del PrintSpooler principal.
 * Se activa automáticamente cuando detecta pérdida de conexión.
 */

import NetInfo from '@react-native-community/netinfo';
import { logger } from '../monitoring';
import { SQLiteStorageAdapter } from '../offline/storage/SQLiteStorageAdapter';
import { hardwareService } from './HardwareService';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

export interface OfflinePrintJob {
  id: string;
  type: 'comanda' | 'cuenta' | 'venta_crudo';
  payload: any;
  createdAt: number;
}

export type PrintResult = {
  success: boolean;
  method: 'hub' | 'bluetooth' | 'queued';
  message?: string;
};

// ═══════════════════════════════════════════════════════════════════════════
// SERVICIO
// ═══════════════════════════════════════════════════════════════════════════

class OfflinePrintFallbackClass {
  private isOnline = true;
  private isBluetoothConnected = false;
  private unsubscribeNetInfo: (() => void) | null = null;

  /**
   * Inicializa el servicio de fallback.
   * Debe llamarse al inicio de la app.
   */
  async initialize(): Promise<void> {
    // Inicializar SQLite
    await SQLiteStorageAdapter.initialize();

    // Escuchar cambios de red
    this.unsubscribeNetInfo = NetInfo.addEventListener((state) => {
      const wasOffline = !this.isOnline;
      this.isOnline = state.isConnected ?? false;

      if (wasOffline && this.isOnline) {
        logger.info('OFFLINE_PRINT', '🌐 Network restored, processing local queue...');
        this.processLocalQueue();
      }
    });

    // Verificar estado inicial de Bluetooth
    this.checkBluetoothStatus();

    logger.info('OFFLINE_PRINT', '✅ Offline print fallback initialized');
  }

  /**
   * Detiene el servicio
   */
  destroy(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }
  }

  /**
   * Verifica si hay impresora Bluetooth conectada
   */
  private async checkBluetoothStatus(): Promise<void> {
    try {
      // Usar el hardwareService existente para verificar conexión
      const status = hardwareService.getState();
      this.isBluetoothConnected = status.isConnected;
    } catch (error) {
      this.isBluetoothConnected = false;
    }
  }

  /**
   * Imprime un ticket con fallback automático.
   * @returns El método usado para imprimir
   */
  async print(job: OfflinePrintJob): Promise<PrintResult> {
    await this.checkBluetoothStatus();

    // 1. Si hay internet, delegar al Hub (el caller usará PrintSpooler)
    if (this.isOnline) {
      return { success: true, method: 'hub', message: 'Delegado a Hub' };
    }

    // 2. Si hay Bluetooth, imprimir directo
    if (this.isBluetoothConnected) {
      try {
        const result = await this.printViaBluetooth(job);
        if (result.success) {
          return { success: true, method: 'bluetooth', message: 'Impreso vía Bluetooth' };
        }
      } catch (error: any) {
        logger.warn('OFFLINE_PRINT', `Bluetooth print failed: ${error?.message}`);
      }
    }

    // 3. Último recurso: encolar en SQLite
    await this.enqueueLocally(job);
    return { success: true, method: 'queued', message: 'Encolado para cuando haya conexión' };
  }

  /**
   * Imprime directamente vía Bluetooth usando el hardware service existente
   */
  private async printViaBluetooth(job: OfflinePrintJob): Promise<{ success: boolean }> {
    const { type, payload } = job;

    switch (type) {
      case 'comanda':
        await hardwareService.imprimirComanda(payload, { rol: 'cocina' });
        break;
      case 'cuenta':
        await hardwareService.imprimirCuenta(payload, {
          rol: 'caja',
          tenantName: payload.businessName || 'Restaurante',
        });
        break;
      case 'venta_crudo':
        await hardwareService.imprimirTicketVenta(payload, {
          nombreNegocio: payload.businessName || 'NEGOCIO',
          encabezado: payload.businessName || 'TICKET',
          mensajeFinal: payload.footer || '¡Gracias!',
        });
        break;
      default:
        throw new Error(`Tipo de impresión no soportado: ${type}`);
    }

    logger.info('OFFLINE_PRINT', `✅ Impreso vía Bluetooth: ${job.id}`);
    return { success: true };
  }

  /**
   * Encola un job en SQLite para procesarlo después
   */
  private async enqueueLocally(job: OfflinePrintJob): Promise<void> {
    await SQLiteStorageAdapter.enqueuePrintJob(
      job.id,
      { type: job.type, payload: job.payload },
      'hub' // Target es hub porque cuando haya red se reenviará
    );
    logger.info('OFFLINE_PRINT', `📦 Encolado localmente: ${job.id}`);
  }

  /**
   * Procesa la cola local cuando vuelve la conexión
   */
  async processLocalQueue(): Promise<void> {
    if (!this.isOnline) return;

    const pendingJobs = await SQLiteStorageAdapter.getPendingPrintJobs();

    if (pendingJobs.length === 0) {
      logger.info('OFFLINE_PRINT', 'No hay jobs pendientes en cola local');
      return;
    }

    logger.info('OFFLINE_PRINT', `Procesando ${pendingJobs.length} jobs de cola local...`);

    for (const job of pendingJobs) {
      try {
        // Parsear el ticket data
        const data = JSON.parse(job.ticketData);

        // Intentar imprimir vía Bluetooth primero (más rápido que esperar Hub)
        await this.checkBluetoothStatus();

        if (this.isBluetoothConnected) {
          await this.printViaBluetooth({
            id: job.id,
            type: data.type,
            payload: data.payload,
            createdAt: job.createdAt,
          });
        }

        // Marcar como completado
        await SQLiteStorageAdapter.markPrintJobCompleted(job.id);
        logger.info('OFFLINE_PRINT', `✅ Job local procesado: ${job.id}`);
      } catch (error: any) {
        logger.error('OFFLINE_PRINT', `❌ Error procesando job local ${job.id}:`, error);
        await SQLiteStorageAdapter.incrementPrintJobAttempts(job.id);

        // Si excede 3 intentos, marcar como fallido
        if (job.attempts >= 3) {
          await SQLiteStorageAdapter.markPrintJobFailed(job.id);
        }
      }
    }
  }

  /**
   * Obtiene el número de jobs pendientes en cola local
   */
  async getPendingCount(): Promise<number> {
    const jobs = await SQLiteStorageAdapter.getPendingPrintJobs();
    return jobs.length;
  }

  /**
   * Verifica el estado actual del servicio
   */
  getStatus(): { isOnline: boolean; isBluetoothConnected: boolean } {
    return {
      isOnline: this.isOnline,
      isBluetoothConnected: this.isBluetoothConnected,
    };
  }
}

// Singleton
export const OfflinePrintFallback = new OfflinePrintFallbackClass();
