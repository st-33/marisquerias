/**
 * ⚙️ ENGINE - KITCHEN QUEUE ENGINE
 *
 * Servicio Ciego del KDS (Kitchen Display System).
 *
 * DOGMA ADI:
 * - NO contiene UI.
 * - NO se conecta a Firebase directamente (recibe por sockets LAN desde Admin o lee de DB local).
 * - Centraliza toda la lógica de ordenamiento, priorización y marcado de órdenes.
 */

import { ComandoPOS } from '../../plataforma/base/tipos/contratos';

export type ItemCocina = {
  id: string;
  nombre: string;
  productoId?: string;
  cantidad: number;
  precio: number;
  estado: 'nuevo' | 'en_cocina' | 'en_preparacion' | 'listo' | 'entregado';
  variantes?: Record<string, string | string[]>;
  variantLabels?: string[];
  notas?: string;
  prepMin?: number;
  startedAt?: number;
  draftId?: string;
  inventoryDeducted?: boolean;
  idsAgrupados?: string[];
};

export type OrdenCocina = {
  id: string;
  tipo: 'mesa' | 'para_llevar' | 'delivery';
  mesaId?: string;
  estatus: string;
  items: ItemCocina[];
  itemsTotal: number;
  itemsPendientes: number;
  itemsListos: number;
  tiempoTranscurrido: number;
  esUrgente: boolean;
  createdAt: number;
  sentToKitchenAt?: number;
};

export type EstadisticasCocina = {
  total: number;
  urgentes: number;
  itemsPendientes: number;
  itemsListos: number;
};

export class KitchenQueueEngine {
  private ordenes: Map<string, OrdenCocina> = new Map();
  private subscribers: Set<(ordenes: OrdenCocina[]) => void> = new Set();
  private urgentThresholdMs: number;

  constructor(urgentThresholdMinutes: number = 15) {
    this.urgentThresholdMs = urgentThresholdMinutes * 60 * 1000;
  }

  /**
   * Suscribe a cambios en la cola (para que la UI reaccione)
   */
  subscribe(callback: (ordenes: OrdenCocina[]) => void): () => void {
    this.subscribers.add(callback);
    callback(this.getOrdenesOrdenadas());
    return () => this.subscribers.delete(callback);
  }

  private notify() {
    const ordenes = this.getOrdenesOrdenadas();
    this.subscribers.forEach((cb) => cb(ordenes));
  }

  /**
   * Ingresa órdenes desde un Socket LAN o base de datos local
   */
  ingresarOrdenes(nuevasOrdenes: OrdenCocina[]) {
    nuevasOrdenes.forEach((orden) => {
      this.ordenes.set(orden.id, orden);
    });
    this.notify();
  }

  /**
   * Retorna las órdenes activas ordenadas (urgentes primero, luego más antiguas)
   */
  getOrdenesOrdenadas(): OrdenCocina[] {
    const now = Date.now();

    const activas = Array.from(this.ordenes.values())
      .map((o) => {
        const baseTime = o.sentToKitchenAt || o.createdAt || now;
        o.esUrgente = now - baseTime >= this.urgentThresholdMs;
        o.tiempoTranscurrido = Math.floor((now - baseTime) / 1000);
        return o;
      })
      .filter((o) => o.estatus === 'enviado_cocina' || o.estatus === 'en_preparacion');

    activas.sort((a, b) => {
      if (a.esUrgente !== b.esUrgente) return a.esUrgente ? -1 : 1;
      const timeA = a.sentToKitchenAt || a.createdAt;
      const timeB = b.sentToKitchenAt || b.createdAt;
      return timeA - timeB;
    });

    return activas;
  }

  getEstadisticas(): EstadisticasCocina {
    const activas = this.getOrdenesOrdenadas();
    return {
      total: activas.length,
      urgentes: activas.filter((o) => o.esUrgente).length,
      itemsPendientes: activas.reduce((sum, o) => sum + o.itemsPendientes, 0),
      itemsListos: activas.reduce((sum, o) => sum + o.itemsListos, 0),
    };
  }

  /**
   * Comienza a preparar un item (actualiza local y genera evento para LAN)
   */
  async startItem(ordenId: string, itemId: string): Promise<void> {
    const orden = this.ordenes.get(ordenId);
    if (!orden) throw new Error(`Orden ${ordenId} no encontrada`);

    const item = orden.items.find((i) => i.id === itemId);
    if (!item) throw new Error(`Item ${itemId} no encontrado`);

    item.estado = 'en_preparacion';
    item.startedAt = Date.now();

    // Si la orden estaba como 'enviado_cocina', pasa a 'en_preparacion'
    if (orden.estatus === 'enviado_cocina') {
      orden.estatus = 'en_preparacion';
    }

    // TODO: Emitir evento LAN/Update local DB (esto será interceptado por el host LAN)
    console.log(`[KitchenQueueEngine] Item started: ${itemId}`);

    this.notify();
  }

  /**
   * Finaliza la preparación de un item
   */
  async finishItem(ordenId: string, itemId: string): Promise<void> {
    const orden = this.ordenes.get(ordenId);
    if (!orden) throw new Error(`Orden ${ordenId} no encontrada`);

    const item = orden.items.find((i) => i.id === itemId);
    if (!item) throw new Error(`Item ${itemId} no encontrado`);

    item.estado = 'listo';

    // Check si toda la orden está lista
    const todosListos = orden.items.every((i) => i.estado === 'listo' || i.estado === 'entregado');
    if (todosListos) {
      orden.estatus = 'listo';
    }

    console.log(`[KitchenQueueEngine] Item finished: ${itemId}`);

    this.notify();
  }

  /**
   * Finaliza toda la orden
   */
  async finishOrder(ordenId: string): Promise<void> {
    const orden = this.ordenes.get(ordenId);
    if (!orden) throw new Error(`Orden ${ordenId} no encontrada`);

    orden.items.forEach((i) => {
      if (i.estado !== 'entregado') {
        i.estado = 'listo';
      }
    });
    orden.estatus = 'listo';

    console.log(`[KitchenQueueEngine] Order finished: ${ordenId}`);

    this.notify();
  }
}

export const kitchenEngine = new KitchenQueueEngine();
