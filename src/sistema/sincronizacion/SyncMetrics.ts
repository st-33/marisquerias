/**
 * 📊 MÉTRICAS DE SINCRONIZACIÓN
 *
 * Sistema de observabilidad para validar y monitorear el sistema unificado.
 */

import { createLogger } from '../../sistema/utilidades/logger';

const log = createLogger('SyncMetrics');

export type SyncOperationType = 'add' | 'update' | 'remove' | 'clear';

export interface SyncMetric {
  operationType: SyncOperationType;
  latency: number; // ms
  success: boolean;
  itemCount: number;
  path: string;
  timestamp: number;
  error?: string;
}

class SyncMetricsCollector {
  private metrics: SyncMetric[] = [];
  private maxMetrics = 1000; // Limitar memoria

  /**
   * Registra una métrica de operación
   */
  record(metric: Omit<SyncMetric, 'timestamp'>): void {
    const fullMetric: SyncMetric = {
      ...metric,
      timestamp: Date.now(),
    };

    this.metrics.push(fullMetric);

    // Limitar tamaño para evitar memory leaks
    if (this.metrics.length > this.maxMetrics) {
      this.metrics.shift();
    }

    // Log según tipo
    if (metric.success) {
      log.debug(`✅ ${metric.operationType} completado en ${metric.latency}ms`, {
        path: metric.path,
        itemCount: metric.itemCount,
      });
    } else {
      log.error(`❌ ${metric.operationType} falló en ${metric.latency}ms`, {
        path: metric.path,
        error: metric.error,
      });
    }
  }

  /**
   * Obtiene métricas recientes
   */
  getRecent(limit = 50): SyncMetric[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Obtiene estadísticas agregadas
   */
  getStats(): {
    total: number;
    success: number;
    failed: number;
    avgLatency: number;
    maxLatency: number;
    minLatency: number;
  } {
    if (this.metrics.length === 0) {
      return {
        total: 0,
        success: 0,
        failed: 0,
        avgLatency: 0,
        maxLatency: 0,
        minLatency: 0,
      };
    }

    const success = this.metrics.filter((m) => m.success).length;
    const failed = this.metrics.length - success;
    const latencies = this.metrics.map((m) => m.latency);
    const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    const maxLatency = Math.max(...latencies);
    const minLatency = Math.min(...latencies);

    return {
      total: this.metrics.length,
      success,
      failed,
      avgLatency: Math.round(avgLatency),
      maxLatency,
      minLatency,
    };
  }

  /**
   * Limpia métricas antiguas (más de 1 hora)
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    this.metrics = this.metrics.filter((m) => m.timestamp > oneHourAgo);
  }

  /**
   * Limpia todas las métricas
   */
  clear(): void {
    this.metrics = [];
  }
}

export const syncMetrics = new SyncMetricsCollector();

// Cleanup automático cada hora
if (typeof setInterval !== 'undefined') {
  setInterval(
    () => {
      syncMetrics.cleanup();
    },
    60 * 60 * 1000
  );
}
