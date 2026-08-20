/**
 * 🚚 REPOSITORIO DE REPARTO (ADI-REPART)
 *
 * Capa de abstracción para operaciones de logística y reparto.
 *
 * ARQUITECTURA MULTI-RTDB:
 * Este repositorio usa getRtdb('reparto') para conectarse a una instancia
 * separada de Firebase RTDB dedicada a logística, separando la carga operacional
 * de la transaccional.
 *
 * TIPOS DE MISIONES:
 * 1. Pedido Cliente (Delivery): Entrega de pedido a cliente final
 * 2. Solicitud Insumos B2B (Reabastecimiento): Compra de insumos a proveedor
 *
 * REGLA DE ORO: Este repositorio NUNCA debe llamarse directamente desde la UI.
 * Solo desde hooks de lógica o servicios.
 */

import {
  ref,
  onValue,
  off,
  get,
  set,
  update,
  remove,
  runTransaction,
  query,
  orderByChild,
  equalTo,
} from 'firebase/database';
import type { Database } from 'firebase/database';
import { getRtdb } from '../firebase';

// ═══════════════════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Tipos de misiones soportadas
 */
export type TipoMision = 'delivery' | 'reabastecimiento';

/**
 * Estados de una misión
 */
export type EstadoMision =
  | 'pendiente' // Creada, esperando asignación
  | 'asignada' // Asignada a repartidor
  | 'en_camino' // Repartidor en camino
  | 'en_ubicacion' // Repartidor llegó al destino
  | 'completada' // Misión completada exitosamente
  | 'cancelada' // Misión cancelada
  | 'fallida'; // Misión fallida

/**
 * Prioridad de la misión
 */
export type PrioridadMision = 'baja' | 'media' | 'alta' | 'urgente';

/**
 * Ubicación geográfica
 */
export interface Ubicacion {
  lat: number;
  lng: number;
  direccion?: string;
  referencia?: string;
}

/**
 * Item de una misión (producto, insumo, etc.)
 */
export interface ItemMision {
  id: string;
  nombre: string;
  cantidad: number;
  unidad: 'pza' | 'kg' | 'lt' | 'caja' | 'otro';
  precio?: number;
  notas?: string;
}

/**
 * Repartidor asignado
 */
export interface Repartidor {
  id: string;
  nombre: string;
  telefono?: string;
  vehiculo?: string;
  ubicacionActual?: Ubicacion;
}

/**
 * Misión de Delivery (Pedido Cliente)
 */
export interface MisionDelivery {
  id: string;
  tipo: 'delivery';
  estado: EstadoMision;
  prioridad: PrioridadMision;

  /** Referencia al pedido original en la BD operacional */
  pedidoId: string;

  /** Tenant que generó la misión */
  tenantId: string;
  tenantPath: string;

  /** Cliente */
  cliente: {
    nombre: string;
    telefono?: string;
    ubicacion: Ubicacion;
  };

  /** Items a entregar */
  items: Record<string, ItemMision>;

  /** Totales */
  totales: {
    subtotal: number;
    total: number;
    costoEnvio?: number;
  };

  /** Repartidor asignado */
  repartidor?: Repartidor;

  /** Timestamps */
  createdAt: number;
  createdAtISO: string;
  asignadaAt?: number;
  completadaAt?: number;
  canceladaAt?: number;

  /** Notas adicionales */
  notas?: string;

  /** Metadata de seguimiento */
  metadata?: Record<string, any>;
}

/**
 * Misión de Reabastecimiento (Solicitud Insumos B2B)
 */
export interface MisionReabastecimiento {
  id: string;
  tipo: 'reabastecimiento';
  estado: EstadoMision;
  prioridad: PrioridadMision;

  /** Tenant que solicita el reabastecimiento */
  tenantId: string;
  tenantPath: string;

  /** Proveedor de donde se comprará */
  proveedor: {
    id: string;
    nombre: string;
    telefono?: string;
    ubicacion: Ubicacion;
  };

  /** Insumos a comprar */
  insumos: Record<string, ItemMision>;

  /** Total estimado */
  totalEstimado?: number;

  /** Repartidor asignado (el que irá a comprar) */
  repartidor?: Repartidor;

  /** Timestamps */
  createdAt: number;
  createdAtISO: string;
  asignadaAt?: number;
  completadaAt?: number;
  canceladaAt?: number;

  /** Notas adicionales */
  notas?: string;

  /** Comprobante de compra (URL de imagen) */
  comprobante?: string;

  /** Metadata de seguimiento */
  metadata?: Record<string, any>;
}

/**
 * Unión de tipos de misiones
 */
export type Mision = MisionDelivery | MisionReabastecimiento;

// ═══════════════════════════════════════════════════════════════════════════
// REPOSITORIO
// ═══════════════════════════════════════════════════════════════════════════

export class RepartoRepository {
  private db: Database;

  constructor() {
    // Usar RTDB de reparto (instancia separada)
    this.db = getRtdb('reparto');
  }

  private getBasePath() {
    return 'reparto/misiones';
  }

  private getSequencesPath() {
    return 'reparto/secuencias';
  }

  private formatDateYYYYMMDD(ts: number) {
    const d = new Date(ts);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
  }

  private toISO(ts: number) {
    return new Date(ts).toISOString();
  }

  /**
   * Genera un ID de misión legible y único por día: MIS-YYYYMMDD-###
   */
  private async generarIdMision(): Promise<string> {
    const now = Date.now();
    const ymd = this.formatDateYYYYMMDD(now);
    const seqRef = ref(this.db, `${this.getSequencesPath()}/misiones/${ymd}`);

    const { snapshot } = await runTransaction(seqRef, (current) => {
      const val = typeof current === 'number' ? current : 0;
      return val + 1;
    });

    const n = snapshot.val() as number;
    const seq = String(n).padStart(3, '0');
    return `MIS-${ymd}-${seq}`;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRUD - CREAR
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Crear misión de delivery (pedido cliente)
   */
  async crearMisionDelivery(
    mision: Omit<MisionDelivery, 'id' | 'createdAt' | 'createdAtISO' | 'estado'>
  ): Promise<string> {
    const now = Date.now();
    const id = await this.generarIdMision();

    const payload: MisionDelivery = {
      ...mision,
      id,
      tipo: 'delivery',
      estado: 'pendiente',
      createdAt: now,
      createdAtISO: this.toISO(now),
    };

    await set(ref(this.db, `${this.getBasePath()}/${id}`), payload);

    console.log(`[RepartoRepo] Misión delivery creada: ${id}`);
    return id;
  }

  /**
   * Crear misión de reabastecimiento (solicitud insumos B2B)
   */
  async crearMisionReabastecimiento(
    mision: Omit<MisionReabastecimiento, 'id' | 'createdAt' | 'createdAtISO' | 'estado'>
  ): Promise<string> {
    const now = Date.now();
    const id = await this.generarIdMision();

    const payload: MisionReabastecimiento = {
      ...mision,
      id,
      tipo: 'reabastecimiento',
      estado: 'pendiente',
      createdAt: now,
      createdAtISO: this.toISO(now),
    };

    await set(ref(this.db, `${this.getBasePath()}/${id}`), payload);

    console.log(`[RepartoRepo] Misión reabastecimiento creada: ${id}`);
    return id;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRUD - LEER
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Suscribirse a todas las misiones
   */
  suscribirTodas(callback: (misiones: Record<string, Mision>) => void): () => void {
    const r = ref(this.db, this.getBasePath());
    const cb = onValue(r, (snap) => {
      callback((snap.val() as any) || {});
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Suscribirse a misiones por estado
   */
  suscribirPorEstado(
    estado: EstadoMision,
    callback: (misiones: Record<string, Mision>) => void
  ): () => void {
    const q = query(ref(this.db, this.getBasePath()), orderByChild('estado'), equalTo(estado));
    const cb = onValue(q, (snap) => {
      callback((snap.val() as any) || {});
    });
    return () => off(q, 'value', cb as any);
  }

  /**
   * Suscribirse a misiones de un tenant específico
   */
  suscribirPorTenant(
    tenantId: string,
    callback: (misiones: Record<string, Mision>) => void
  ): () => void {
    const q = query(ref(this.db, this.getBasePath()), orderByChild('tenantId'), equalTo(tenantId));
    const cb = onValue(q, (snap) => {
      callback((snap.val() as any) || {});
    });
    return () => off(q, 'value', cb as any);
  }

  /**
   * Obtener una misión (una sola vez)
   */
  async obtenerPorId(misionId: string): Promise<Mision | null> {
    const snap = await get(ref(this.db, `${this.getBasePath()}/${misionId}`));
    return snap.val() as Mision | null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRUD - ACTUALIZAR
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Actualizar estado de una misión
   */
  async actualizarEstado(misionId: string, estado: EstadoMision): Promise<void> {
    const updates: Record<string, any> = { estado };

    const now = Date.now();
    if (estado === 'asignada') {
      updates.asignadaAt = now;
    } else if (estado === 'completada') {
      updates.completadaAt = now;
    } else if (estado === 'cancelada') {
      updates.canceladaAt = now;
    }

    await update(ref(this.db, `${this.getBasePath()}/${misionId}`), updates);
  }

  /**
   * Asignar repartidor a misión
   */
  async asignarRepartidor(misionId: string, repartidor: Repartidor): Promise<void> {
    await update(ref(this.db, `${this.getBasePath()}/${misionId}`), {
      repartidor,
      estado: 'asignada',
      asignadaAt: Date.now(),
    });
  }

  /**
   * Actualizar ubicación del repartidor en tiempo real
   */
  async actualizarUbicacionRepartidor(misionId: string, ubicacion: Ubicacion): Promise<void> {
    await update(ref(this.db, `${this.getBasePath()}/${misionId}/repartidor`), {
      ubicacionActual: ubicacion,
    });
  }

  /**
   * Actualizar misión (genérico)
   */
  async actualizar(misionId: string, datos: Partial<Mision>): Promise<void> {
    await update(ref(this.db, `${this.getBasePath()}/${misionId}`), datos as any);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // CRUD - ELIMINAR
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Eliminar misión
   */
  async eliminar(misionId: string): Promise<void> {
    await remove(ref(this.db, `${this.getBasePath()}/${misionId}`));
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Calcular distancia entre dos ubicaciones (fórmula de Haversine)
   */
  calcularDistancia(origen: Ubicacion, destino: Ubicacion): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRadians(destino.lat - origen.lat);
    const dLng = this.toRadians(destino.lng - origen.lng);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(origen.lat)) *
        Math.cos(this.toRadians(destino.lat)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance;
  }

  private toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * Calcular tiempo estimado de entrega (basado en distancia)
   */
  calcularTiempoEstimado(distanciaKm: number, velocidadPromedio: number = 30): number {
    // velocidadPromedio en km/h, retorna minutos
    return Math.ceil((distanciaKm / velocidadPromedio) * 60);
  }
}
