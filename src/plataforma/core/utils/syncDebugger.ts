/**
 * 🔍 DEBUGGER DE SINCRONIZACIÓN MULTI-DISPOSITIVO
 *
 * Sistema completo para diagnosticar y corregir problemas de sincronización
 *
 * PROBLEMAS DETECTADOS:
 * 1. Closure stale en comparaciones
 * 2. Comparación por índice en lugar de ID único
 * 3. Ventana de detección demasiado larga
 * 4. Falta de IDs únicos para items
 * 5. No manejo de conflictos de escritura
 * 6. Comparación superficial de objetos
 */

export type SyncEvent = {
  type: 'local_operation' | 'remote_snapshot' | 'conflict_detected' | 'sync_complete';
  mesaId: string;
  deviceId: string;
  timestamp: number;
  items: any[];
  operation?: string;
  conflict?: {
    local: any;
    remote: any;
    resolution: string;
  };
};

export class SyncDebugger {
  private events: SyncEvent[] = [];
  private deviceId = `device_${Math.random().toString(36).substr(2, 9)}`;

  log(event: Omit<SyncEvent, 'deviceId' | 'timestamp'>) {
    const fullEvent: SyncEvent = {
      ...event,
      deviceId: this.deviceId,
      timestamp: Date.now(),
    };

    this.events.push(fullEvent);

    // Mantener solo últimos 100 eventos
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }

    console.log(`[SYNC_DEBUG] ${event.type}:`, {
      mesaId: event.mesaId,
      itemsCount: event.items?.length || 0,
      operation: event.operation,
      ...(event.conflict && { conflict: event.conflict }),
    });
  }

  getEvents(mesaId?: string): SyncEvent[] {
    return mesaId ? this.events.filter((e) => e.mesaId === mesaId) : this.events;
  }

  clear() {
    this.events = [];
  }

  // Helper para generar IDs únicos
  static generateItemId(): string {
    return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Helper para comparar arrays profundamente
  static deepCompareArrays<T>(arr1: T[], arr2: T[]): boolean {
    if (arr1.length !== arr2.length) return false;

    // Crear mapas por ID para comparación independiente del orden
    const map1 = new Map(arr1.map((item: any) => [item.id, item]));
    const map2 = new Map(arr2.map((item: any) => [item.id, item]));

    if (map1.size !== map2.size) return false;

    for (const [id, item1] of map1) {
      const item2 = map2.get(id);
      if (!item2) return false;

      // Comparación profunda de campos relevantes
      const keysToCompare = ['id', 'name', 'qty', 'price', 'productId', 'variants'];
      for (const key of keysToCompare) {
        if (JSON.stringify(item1[key]) !== JSON.stringify(item2[key])) {
          return false;
        }
      }
    }

    return true;
  }

  // Helper para detectar y resolver conflictos
  static resolveConflict(local: any[], remote: any[]): any[] {
    // Estrategia: merge con prioridad al más reciente
    const merged = new Map<string, any>();

    // Primero agregar locales
    local.forEach((item) => {
      merged.set(item.id, { ...item, source: 'local' });
    });

    // Luego sobreescribir con remotos (más recientes)
    remote.forEach((item) => {
      merged.set(item.id, { ...item, source: 'remote' });
    });

    return Array.from(merged.values());
  }

  // Helper para validar integridad de datos
  static validateData(items: any[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const seenIds = new Set<string>();

    items.forEach((item, index) => {
      if (!item.id) {
        errors.push(`Item ${index} sin ID`);
      }
      if (seenIds.has(item.id)) {
        errors.push(`ID duplicado: ${item.id}`);
      }
      if (item.qty === undefined || item.qty < 0) {
        errors.push(`Item ${item.id} tiene qty inválida: ${item.qty}`);
      }
      if (!item.name) {
        errors.push(`Item ${item.id} sin nombre`);
      }
      seenIds.add(item.id);
    });

    return { valid: errors.length === 0, errors };
  }
}

// Instancia global para debugging
export const syncDebugger = new SyncDebugger();
