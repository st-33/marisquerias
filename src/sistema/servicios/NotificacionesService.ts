/**
 * 🔔 SERVICIO DE NOTIFICACIONES
 *
 * Sistema tonto y modular para notificaciones globales.
 * NO mezcla lógica de negocio, solo notifica.
 *
 * PROPÓSITO:
 * - Notificar cuando items de COCINA están listos
 * - Sonido + mensaje visual
 * - Se basa en mesaId, NO en usuarios
 */

import { Database, ref, onValue, off } from 'firebase/database';
import { resolver } from '../../plataforma/core/utils/paths';

export type NotificacionCocina = {
  mesaId: string;
  itemNombre: string;
  timestamp: number;
  pedidoId: string;
};

type NotificacionCallback = (notificacion: NotificacionCocina) => void;

class NotificacionesService {
  private listeners: Map<string, NotificacionCallback[]> = new Map();
  private unsubscribers: Map<string, () => void> = new Map();

  /**
   * Suscribirse a notificaciones de items listos en cocina
   *
   * @param db - Firebase Database
   * @param tenantPath - Path del tenant
   * @param callback - Función que se ejecuta cuando hay nueva notificación
   * @returns Función para desuscribirse
   */
  suscribirItemsListos(
    db: Database,
    tenantPath: string,
    callback: NotificacionCallback
  ): () => void {
    const key = `${tenantPath}/items_listos`;

    // Agregar callback a lista
    if (!this.listeners.has(key)) {
      this.listeners.set(key, []);
    }
    this.listeners.get(key)!.push(callback);

    // Si ya hay un listener activo, no crear otro
    if (this.unsubscribers.has(key)) {
      return () => {
        this.removerCallback(key, callback);
      };
    }

    // Crear listener de Firebase
    const pedidosRef = ref(db, `${tenantPath}/${resolver('pedidos')}`);
    const lastNotifiedItems = new Set<string>();

    const unsubscribe = onValue(pedidosRef, (snapshot) => {
      const pedidos = snapshot.val() || {};

      // Buscar items que cambiaron a estado 'listo'
      Object.entries(pedidos).forEach(([pedidoId, pedido]: [string, any]) => {
        if (!pedido.items) return;

        const mesaId = pedido.mesaId;
        if (!mesaId) return;

        Object.entries(pedido.items).forEach(([itemId, item]: [string, any]) => {
          if (item.estado !== 'listo') return;

          const notificationKey = `${pedidoId}:${itemId}`;

          // Solo notificar si es la primera vez que vemos este item listo
          if (!lastNotifiedItems.has(notificationKey)) {
            lastNotifiedItems.add(notificationKey);

            const notificacion: NotificacionCocina = {
              mesaId,
              itemNombre: item.nombre || 'Item',
              timestamp: Date.now(),
              pedidoId,
            };

            // Notificar a todos los callbacks
            const callbacks = this.listeners.get(key) || [];
            callbacks.forEach((cb) => cb(notificacion));

            console.log('[NotificacionesService] 🔔 Item listo:', {
              mesa: mesaId,
              item: item.nombre,
            });
          }
        });
      });
    });

    this.unsubscribers.set(key, () => {
      off(pedidosRef, 'value', unsubscribe as any);
    });

    return () => {
      this.removerCallback(key, callback);
    };
  }

  private removerCallback(key: string, callback: NotificacionCallback) {
    const callbacks = this.listeners.get(key);
    if (!callbacks) return;

    const index = callbacks.indexOf(callback);
    if (index > -1) {
      callbacks.splice(index, 1);
    }

    // Si no quedan callbacks, desuscribirse de Firebase
    if (callbacks.length === 0) {
      const unsub = this.unsubscribers.get(key);
      if (unsub) {
        unsub();
        this.unsubscribers.delete(key);
      }
      this.listeners.delete(key);
    }
  }

  /**
   * Limpiar todas las suscripciones
   */
  limpiar() {
    this.unsubscribers.forEach((unsub) => unsub());
    this.unsubscribers.clear();
    this.listeners.clear();
  }
}

// Singleton
export const notificacionesService = new NotificacionesService();
