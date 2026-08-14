/**
 * 🔄 SERVICIO UNIFICADO DE SINCRONIZACIÓN
 *
 * ARQUITECTURA:
 * - Una fuente de verdad para sincronización multi-dispositivo
 * - Transacciones atómicas para evitar race conditions
 * - Detección inteligente de ecos
 * - Validación de integridad de datos
 * - Generación de IDs únicos
 *
 * REGLA DE ORO: Todos los módulos que necesiten sincronización usan este servicio.
 * No más duplicación de lógica.
 */

import { Database, onValue, ref, runTransaction } from 'firebase/database';
import { createLogger } from '../utils/logger';
import { syncDebugger, SyncDebugger } from '../utils/syncDebugger';
import { syncMetrics } from './SyncMetrics';

const log = createLogger('SynchronizationService');

/**
 * Item sincronizable con ID único obligatorio
 */
export interface SynchronizableItem {
  id: string;
  [key: string]: any;
}

/**
 * Configuración de sincronización
 */
export interface SyncConfig {
  /** Path completo en Firebase (ej: "tenant/mesas_pendientes/mesa1/items") */
  path: string;

  /** Tiempo en ms para detectar ecos locales (default: 150ms) */
  echoWindow?: number;

  /** Validar integridad de datos (default: true) */
  validateData?: boolean;

  /** Callback cuando hay cambios remotos */
  onRemoteChange?: (items: SynchronizableItem[]) => void;

  /** Callback cuando hay error */
  onError?: (error: Error) => void;
}

/**
 * Estado de una suscripción activa
 */
interface ActiveSubscription {
  path: string;
  unsubscribe: () => void;
  lastLocalOperation: {
    type: string;
    timestamp: number;
    items: SynchronizableItem[];
  } | null;
  currentItems: SynchronizableItem[];
}

/**
 * Servicio centralizado de sincronización
 */
export class SynchronizationService {
  private subscriptions = new Map<string, ActiveSubscription>();
  private idGenerator: () => string;
  private idCounter = 0;

  constructor() {
    // Generador de IDs únicos: timestamp + random
    // 🔥 FIX: IDs simples y cortos (i1, i2, i3...)
    // Reseteamos al iniciar para evitar colisiones entre sesiones
    this.idCounter = Math.floor(Date.now() % 10000); // Offset inicial basado en tiempo
    this.idGenerator = () => {
      this.idCounter++;
      return `i${this.idCounter}`;
    };
  }

  /**
   * Genera un ID único para un item
   */
  generateId(): string {
    return this.idGenerator();
  }

  /**
   * Asegura que un item tenga ID único
   */
  ensureId<T extends SynchronizableItem>(item: Omit<T, 'id'> & { id?: string }): T {
    if (item.id) {
      return item as T;
    }
    return { ...item, id: this.generateId() } as T;
  }

  /**
   * Suscribe a cambios en un path de Firebase
   */
  subscribe(
    db: Database,
    config: SyncConfig,
    onItemsChange: (items: SynchronizableItem[]) => void
  ): () => void {
    const { path, echoWindow = 150, validateData = true, onRemoteChange, onError } = config;

    // Si ya hay una suscripción activa, cancelarla primero
    if (this.subscriptions.has(path)) {
      log.warn(`Ya existe suscripción para ${path}, cancelando anterior`);
      this.unsubscribe(path);
    }

    const firebaseRef = ref(db, path);
    let currentItems: SynchronizableItem[] = [];
    let lastLocalOperation: ActiveSubscription['lastLocalOperation'] = null;

    log.debug(`🔗 Suscribiendo a: ${path}`);

    const unsubscribe = onValue(
      firebaseRef,
      (snapshot) => {
        const data = snapshot.val();
        const newItems: SynchronizableItem[] = Array.isArray(data)
          ? data.filter((item: any) => item && item.id)
          : [];

        // Validar integridad si está habilitado
        if (validateData) {
          const validation = SyncDebugger.validateData(newItems);
          if (!validation.valid) {
            log.error('❌ Datos inválidos recibidos:', validation.errors);
            onError?.(new Error(`Datos inválidos: ${validation.errors.join(', ')}`));
            return;
          }
        }

        // Detección de ecos: si el cambio viene de una operación local reciente, ignorarlo
        if (
          lastLocalOperation !== null &&
          lastLocalOperation !== undefined &&
          typeof lastLocalOperation === 'object' &&
          'timestamp' in lastLocalOperation
        ) {
          const lastOp = lastLocalOperation as {
            type: string;
            timestamp: number;
            items: SynchronizableItem[];
          };
          const timeSinceOp = Date.now() - (lastOp.timestamp || 0);
          const isEcho =
            timeSinceOp < echoWindow && this.areItemsEqual(lastOp.items || [], newItems);

          if (isEcho) {
            log.debug(`⏸️ Eco local detectado (${timeSinceOp}ms), ignorando`);
            return;
          }
        }

        // Actualizar estado
        currentItems = newItems;
        const subscription = this.subscriptions.get(path);
        if (subscription) {
          subscription.currentItems = newItems;
          subscription.lastLocalOperation = null; // Limpiar después de aplicar
        }

        log.debug(`⚡ Items actualizados: ${newItems.length} items`);
        syncDebugger.log({
          type: 'remote_snapshot',
          mesaId: path.split('/').pop() || 'unknown',
          items: newItems,
          operation: 'update',
        });

        onItemsChange(newItems);
        onRemoteChange?.(newItems);
      },
      (error) => {
        log.error('❌ Error en suscripción:', error);
        onError?.(error);
      }
    );

    // Guardar suscripción
    this.subscriptions.set(path, {
      path,
      unsubscribe,
      lastLocalOperation: null,
      currentItems: [],
    });

    // Retornar función de cleanup
    return () => {
      log.debug(`🔌 Desuscribiendo de: ${path}`);
      this.unsubscribe(path);
    };
  }

  /**
   * Cancela una suscripción
   */
  unsubscribe(path: string): void {
    const subscription = this.subscriptions.get(path);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(path);
      log.debug(`✅ Suscripción cancelada: ${path}`);
    }
  }

  /**
   * Agrega un item usando transacción atómica
   */
  async addItem<T extends SynchronizableItem>(
    db: Database,
    path: string,
    item: Omit<T, 'id'> & { id?: string }
  ): Promise<boolean> {
    const startTime = Date.now();
    const itemWithId = this.ensureId(item);
    const subscription = this.subscriptions.get(path);

    // Guardar operación local para detección de ecos
    if (subscription) {
      subscription.lastLocalOperation = {
        type: 'add',
        timestamp: Date.now(),
        items: [...subscription.currentItems, itemWithId],
      };
    }

    try {
      await runTransaction(ref(db, path), (currentItems) => {
        const current = Array.isArray(currentItems) ? currentItems : [];
        const nextItems = [...current, itemWithId];

        log.debug(`➕ Agregando item: ${itemWithId.id}`);
        return nextItems;
      });

      const latency = Date.now() - startTime;
      const itemCount = (subscription?.currentItems.length || 0) + 1;

      syncMetrics.record({
        operationType: 'add',
        latency,
        success: true,
        itemCount,
        path,
      });

      syncDebugger.log({
        type: 'local_operation',
        mesaId: path.split('/').pop() || 'unknown',
        items: subscription?.currentItems || [],
        operation: 'add',
      });

      return true;
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      syncMetrics.record({
        operationType: 'add',
        latency,
        success: false,
        itemCount: subscription?.currentItems.length || 0,
        path,
        error: errorMessage,
      });

      log.error('❌ Error agregando item:', error);
      // Limpiar operación local en caso de error
      if (subscription) {
        subscription.lastLocalOperation = null;
      }
      return false;
    }
  }

  /**
   * Actualiza un item por ID usando transacción atómica
   */
  async updateItemById<T extends SynchronizableItem>(
    db: Database,
    path: string,
    id: string,
    updates: Partial<Omit<T, 'id'>>
  ): Promise<boolean> {
    const startTime = Date.now();
    const subscription = this.subscriptions.get(path);

    // Guardar operación local
    if (subscription) {
      const updatedItems = subscription.currentItems.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      );
      subscription.lastLocalOperation = {
        type: 'update',
        timestamp: Date.now(),
        items: updatedItems,
      };
    }

    try {
      await runTransaction(ref(db, path), (currentItems) => {
        const current = Array.isArray(currentItems) ? currentItems : [];
        const nextItems = current.map((item: any) =>
          item.id === id ? { ...item, ...updates } : item
        );

        log.debug(`🔄 Actualizando item ${id}`);
        return nextItems;
      });

      const latency = Date.now() - startTime;
      syncMetrics.record({
        operationType: 'update',
        latency,
        success: true,
        itemCount: subscription?.currentItems.length || 0,
        path,
      });

      return true;
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      syncMetrics.record({
        operationType: 'update',
        latency,
        success: false,
        itemCount: subscription?.currentItems.length || 0,
        path,
        error: errorMessage,
      });

      log.error('❌ Error actualizando item:', error);
      if (subscription) {
        subscription.lastLocalOperation = null;
      }
      return false;
    }
  }

  /**
   * Elimina un item por ID usando transacción atómica
   */
  async removeItemById(db: Database, path: string, id: string): Promise<boolean> {
    const startTime = Date.now();
    const subscription = this.subscriptions.get(path);

    // Guardar operación local
    if (subscription) {
      const filteredItems = subscription.currentItems.filter((item) => item.id !== id);
      subscription.lastLocalOperation = {
        type: 'remove',
        timestamp: Date.now(),
        items: filteredItems,
      };
    }

    try {
      await runTransaction(ref(db, path), (currentItems) => {
        const current = Array.isArray(currentItems) ? currentItems : [];
        const nextItems = current.filter((item: any) => item.id !== id);

        log.debug(`➖ Removiendo item ${id}`);
        return nextItems;
      });

      const latency = Date.now() - startTime;
      syncMetrics.record({
        operationType: 'remove',
        latency,
        success: true,
        itemCount: (subscription?.currentItems.length || 1) - 1,
        path,
      });

      return true;
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      syncMetrics.record({
        operationType: 'remove',
        latency,
        success: false,
        itemCount: subscription?.currentItems.length || 0,
        path,
        error: errorMessage,
      });

      log.error('❌ Error removiendo item:', error);
      if (subscription) {
        subscription.lastLocalOperation = null;
      }
      return false;
    }
  }

  /**
   * Limpia todos los items usando transacción atómica
   */
  async clearItems(db: Database, path: string): Promise<boolean> {
    const startTime = Date.now();
    const subscription = this.subscriptions.get(path);
    const previousCount = subscription?.currentItems.length || 0;

    // Guardar operación local
    if (subscription) {
      subscription.lastLocalOperation = {
        type: 'clear',
        timestamp: Date.now(),
        items: [],
      };
    }

    try {
      await runTransaction(ref(db, path), () => {
        log.debug('🧽 Limpiando todos los items');
        return [];
      });

      const latency = Date.now() - startTime;
      syncMetrics.record({
        operationType: 'clear',
        latency,
        success: true,
        itemCount: 0,
        path,
      });

      return true;
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      syncMetrics.record({
        operationType: 'clear',
        latency,
        success: false,
        itemCount: previousCount,
        path,
        error: errorMessage,
      });

      log.error('❌ Error limpiando items:', error);
      if (subscription) {
        subscription.lastLocalOperation = null;
      }
      return false;
    }
  }

  /**
   * Compara dos arrays de items por ID y contenido
   */
  private areItemsEqual(items1: SynchronizableItem[], items2: SynchronizableItem[]): boolean {
    if (items1.length !== items2.length) return false;

    const map1 = new Map(items1.map((item) => [item.id, item]));
    const map2 = new Map(items2.map((item) => [item.id, item]));

    if (map1.size !== map2.size) return false;

    for (const [id, item1] of map1) {
      const item2 = map2.get(id);
      if (!item2) return false;

      // Comparación profunda (JSON.stringify para simplicidad, puede optimizarse)
      if (JSON.stringify(item1) !== JSON.stringify(item2)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Obtiene items actuales de una suscripción (sin hacer query)
   */
  getCurrentItems(path: string): SynchronizableItem[] {
    const subscription = this.subscriptions.get(path);
    return subscription?.currentItems || [];
  }

  /**
   * Limpia todas las suscripciones (útil para cleanup global)
   */
  cleanup(): void {
    for (const [path] of this.subscriptions) {
      this.unsubscribe(path);
    }
    log.debug('🧹 Cleanup completo de todas las suscripciones');
  }
}

// Instancia singleton del servicio
export const synchronizationService = new SynchronizationService();
