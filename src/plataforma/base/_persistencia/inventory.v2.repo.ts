/**
 * 📦 REPOSITORIO DE INVENTARIO V2
 * Soporta jerarquías de Áreas, Catálogo Global y Transferencias Internas.
 */

import type { Database } from 'firebase/database';
import {
  get,
  off,
  onValue,
  push,
  ref,
  runTransaction,
  set,
  update,
  query,
  limitToLast,
} from 'firebase/database';
import { z } from 'zod';
import { stripVoidDeep } from '../../core/domain/itemCanonical';
import { assertValidTenantPath, sanitizeRtdbPayload } from '../../core/rtdb/guards';

// --- Esquemas de Datos ---

export type InventorySectionId = 'alimentos' | 'losa_cristaleria' | 'otros';

export const InventorySectionV2Schema = z.object({
  id: z.string(),
  nombre: z.string(),
  icon: z.string().optional(),
  stock: z.record(z.string(), z.number()).default({}),
  updatedAt: z.number(),
});

export type InventorySectionV2 = z.infer<typeof InventorySectionV2Schema>;

export const InventoryItemV2Schema = z.object({
  id: z.string(),
  nombre: z.string(),
  sectionId: z.enum(['alimentos', 'losa_cristaleria', 'otros']).optional(),
  unidad: z.enum(['kg', 'g', 'l', 'ml', 'pza', 'caja']),
  minStock: z.number().default(0),
  costo: z.number().optional(),
  proveedor: z.string().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  updatedAt: z.number(),
});

export type InventoryItemV2 = z.infer<typeof InventoryItemV2Schema>;

export const InventoryAreaV2Schema = z.object({
  id: z.string(),
  hubId: z.enum(['restaurante', 'venta_crudo']).default('restaurante'), // 🔥 Vinculación física
  sectionId: z.enum(['alimentos', 'losa_cristaleria', 'otros']).optional(),
  nombre: z.string(),
  icon: z.string().optional(),
  tipo: z.enum(['almacen', 'refri', 'mostrador', 'cocina', 'otro']).default('almacen'),
  parentId: z.string().optional(), // Para jerarquía recursiva
  stock: z.record(z.string(), z.number()).default({}), // itemId -> cantidad
  updatedAt: z.number(),
});

export type InventoryAreaV2 = z.infer<typeof InventoryAreaV2Schema>;

export const InventoryMovementV2Schema = z.object({
  id: z.string(),
  tipo: z.enum(['entrada', 'salida', 'ajuste', 'transferencia', 'merma']),
  itemId: z.string(),
  cantidad: z.number(),
  areaId: z.string().optional(), // Para entrada/salida/ajuste/merma
  fromAreaId: z.string().optional(), // Para transferencia
  toAreaId: z.string().optional(), // Para transferencia
  razon: z.string().optional(),
  usuario: z.string().optional(),
  timestamp: z.number(),
  permiteNegativo: z.boolean().optional(),
});

export type InventoryMovementV2 = z.infer<typeof InventoryMovementV2Schema>;

// --- Esquema de Ventas (Historial) ---

export const VentaV2Schema = z.object({
  id: z.string(),
  items: z.array(
    z.object({
      productoId: z.string(),
      nombre: z.string(),
      precio: z.number(),
      cantidad: z.number(),
      unidad: z.string(),
      subtotal: z.number(),
    })
  ),
  total: z.number(),
  metodoPago: z.string(),
  areaId: z.string(), // De dónde salió el stock
  usuario: z.string().optional(),
  timestamp: z.number(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type VentaV2 = z.infer<typeof VentaV2Schema>;

// --- Repositorio ---

export class InventoryV2Repository {
  private baseRef: string;

  constructor(
    private db: Database,
    tenantPath: string
  ) {
    assertValidTenantPath(tenantPath);
    this.baseRef = `${tenantPath}/inventory_v2`;
  }

  // ==================== CATÁLOGO (Global por Tenant) ====================

  async crearItem(item: Omit<InventoryItemV2, 'id' | 'updatedAt'>): Promise<string> {
    const r = ref(this.db, `${this.baseRef}/catalog`);
    const newRef = push(r);
    const payload = sanitizeRtdbPayload({
      ...item,
      updatedAt: Date.now(),
    });
    await set(newRef, payload);
    return newRef.key!;
  }

  async obtenerCatalogo(): Promise<Record<string, InventoryItemV2>> {
    const snap = await get(ref(this.db, `${this.baseRef}/catalog`));
    return snap.val() || {};
  }

  suscribirCatalogo(callback: (items: Record<string, InventoryItemV2>) => void): () => void {
    const r = ref(this.db, `${this.baseRef}/catalog`);
    const cb = onValue(r, (snap) => callback(snap.val() || {}));
    return () => off(r, 'value', cb);
  }

  // ==================== ÁREAS ====================

  async crearArea(area: Omit<InventoryAreaV2, 'id' | 'updatedAt'>): Promise<string> {
    const r = ref(this.db, `${this.baseRef}/areas`);
    const newRef = push(r);
    const payload = {
      ...area,
      updatedAt: Date.now(),
    };
    await set(newRef, payload);
    return newRef.key!;
  }

  async obtenerAreas(): Promise<Record<string, InventoryAreaV2>> {
    const snap = await get(ref(this.db, `${this.baseRef}/areas`));
    return snap.val() || {};
  }

  suscribirAreas(callback: (areas: Record<string, InventoryAreaV2>) => void): () => void {
    const r = ref(this.db, `${this.baseRef}/areas`);
    const cb = onValue(r, (snap) => callback(snap.val() || {}));
    return () => off(r, 'value', cb);
  }

  async registrarMissingAreaAssignment(params: {
    hubId: 'restaurante' | 'venta_crudo';
    productoId?: string;
    itemId?: string;
    preferredAreaId?: string | null;
    fallbackAreaId: string;
    actor?: string;
    reason?: string;
    nombre?: string;
  }): Promise<void> {
    const key = params.productoId || params.itemId;
    if (!key) return;

    const r = ref(this.db, `${this.baseRef}/missing_area_assignments/${key}`);

    await runTransaction(r, (current: any) => {
      const prev = current || {};
      const next = stripVoidDeep({
        ...prev,
        hubId: params.hubId,
        productoId: params.productoId,
        itemId: params.itemId,
        preferredAreaId: params.preferredAreaId ?? undefined,
        fallbackAreaId: params.fallbackAreaId,
        actor: params.actor,
        reason: params.reason,
        nombre: params.nombre,
        lastTs: Date.now(),
        count: (typeof prev.count === 'number' ? prev.count : 0) + 1,
      });

      return next as any;
    });
  }

  // ==================== MOVIMIENTOS Y STOCK ====================

  /**
   * Registra una transferencia interna entre áreas.
   * 🔑 OPERACIÓN CRÍTICA: Descuenta de uno y suma en otro de forma atómica.
   */
  async transferir(params: {
    itemId: string;
    cantidad: number;
    fromAreaId: string;
    toAreaId: string;
    usuario?: string;
    razon?: string;
  }): Promise<void> {
    const { itemId, cantidad, fromAreaId, toAreaId, usuario, razon } = params;

    // Usar transacción para asegurar atomicidad
    const fromStockRef = ref(this.db, `${this.baseRef}/areas/${fromAreaId}/stock/${itemId}`);
    const toStockRef = ref(this.db, `${this.baseRef}/areas/${toAreaId}/stock/${itemId}`);

    // Nota: Firebase Transactions en múltiples nodos no son directas, pero podemos usar un atomo de movimiento
    // Para simplificar en RTDB, haremos un update batch
    const updates: Record<string, any> = {};

    // Obtener valores actuales (con precaución)
    const [fromSnap, toSnap] = await Promise.all([get(fromStockRef), get(toStockRef)]);
    const fromVal = fromSnap.val() || 0;
    const toVal = toSnap.val() || 0;

    if (fromVal < cantidad) throw new Error('Stock insuficiente en área origen');

    updates[`${this.baseRef}/areas/${fromAreaId}/stock/${itemId}`] = fromVal - cantidad;
    updates[`${this.baseRef}/areas/${toAreaId}/stock/${itemId}`] = toVal + cantidad;

    // Registrar el movimiento
    const movRef = push(ref(this.db, `${this.baseRef}/movements`));
    updates[`${this.baseRef}/movements/${movRef.key}`] = {
      tipo: 'transferencia',
      itemId,
      cantidad,
      fromAreaId,
      toAreaId,
      usuario,
      razon: razon || 'Transferencia interna',
      timestamp: Date.now(),
    };

    await update(ref(this.db), updates);
  }

  async registrarSalidaMultiple(params: {
    items: { itemId: string; cantidad: number; razon?: string }[];
    areaId: string;
    usuario?: string;
    razon?: string;
    allowNegative?: boolean;
    metadata?: any;
  }): Promise<void> {
    const { items, areaId, usuario, razon, allowNegative = false, metadata } = params;

    const areaRef = ref(this.db, `${this.baseRef}/areas/${areaId}`);
    const areaSnap = await get(areaRef);
    if (!areaSnap.exists()) throw new Error('Área de inventario no encontrada');
    const areaData = areaSnap.val() as InventoryAreaV2;
    const currentStock = areaData.stock || {};

    const updates: Record<string, any> = {};
    const timestamp = Date.now();

    for (const it of items) {
      const itemId = it.itemId;
      const cantidad = Number(it.cantidad) || 0;
      if (!itemId || cantidad <= 0) continue;

      const current = currentStock[itemId] || 0;
      if (!allowNegative && current < cantidad) {
        throw new Error(`Stock insuficiente para itemId=${itemId}. Disponible: ${current}`);
      }

      const newStock = allowNegative ? current - cantidad : Math.max(0, current - cantidad);
      updates[`${this.baseRef}/areas/${areaId}/stock/${itemId}`] = newStock;

      const movRef = push(ref(this.db, `${this.baseRef}/movements`));
      updates[`${this.baseRef}/movements/${movRef.key}`] = {
        tipo: 'salida',
        itemId,
        cantidad,
        areaId,
        usuario,
        razon: it.razon || razon || 'Salida',
        timestamp,
        permiteNegativo: allowNegative,
        metadata,
      };
    }

    if (Object.keys(updates).length === 0) return;
    await update(ref(this.db), updates);
  }

  /**
   * Registra mermas o desperdicios.
   */
  async registrarMerma(params: {
    itemId: string;
    areaId: string;
    cantidad: number;
    usuario?: string;
    razon: string;
  }): Promise<void> {
    const { itemId, areaId, cantidad, usuario, razon } = params;
    const stockRef = ref(this.db, `${this.baseRef}/areas/${areaId}/stock/${itemId}`);

    const snap = await get(stockRef);
    const current = snap.val() || 0;

    const updates: Record<string, any> = {};
    updates[`${this.baseRef}/areas/${areaId}/stock/${itemId}`] = Math.max(0, current - cantidad);

    const movRef = push(ref(this.db, `${this.baseRef}/movements`));
    updates[`${this.baseRef}/movements/${movRef.key}`] = {
      tipo: 'merma',
      itemId,
      cantidad,
      areaId,
      usuario,
      razon,
      timestamp: Date.now(),
    };

    await update(ref(this.db), updates);
  }

  /**
   * Venta operativa (Mostrador).
   * Descuenta stock de un área específica.
   * Valida stock antes de descontar si allowNegative es false.
   */
  async registrarVenta(params: {
    itemId: string;
    areaId: string;
    cantidad: number;
    usuario?: string;
    allowNegative?: boolean;
  }): Promise<void> {
    const { itemId, areaId, cantidad, usuario, allowNegative = false } = params;
    const stockRef = ref(this.db, `${this.baseRef}/areas/${areaId}/stock/${itemId}`);

    // Obtener snapshot actual
    const snap = await get(stockRef);
    const current = snap.val() || 0;

    // Validación estricta
    if (!allowNegative && current < cantidad) {
      throw new Error(`Stock insuficiente. Disponible: ${current}, Solicitado: ${cantidad}`);
    }

    const updates: Record<string, any> = {};

    // Calcular nuevo stock (permitiendo negativos si está habilitado)
    const newStock = allowNegative ? current - cantidad : Math.max(0, current - cantidad);

    updates[`${this.baseRef}/areas/${areaId}/stock/${itemId}`] = newStock;

    const movRef = push(ref(this.db, `${this.baseRef}/movements`));
    updates[`${this.baseRef}/movements/${movRef.key}`] = {
      tipo: 'salida',
      itemId,
      cantidad,
      areaId,
      usuario,
      razon: 'Venta Mostrador',
      timestamp: Date.now(),
      permiteNegativo: allowNegative,
    };

    await update(ref(this.db), updates);
  }

  /**
   * 🚀 REGISTRO DE VENTA POR LOTE (BATCH UPDATE)
   * Registra toda una venta en una sola transacción atómica:
   * 1. Descuenta stock de todos los items en el área.
   * 2. Registra movimientos individuales (logs).
   * 3. Guarda el registro maestro de la venta en /ventas_v2.
   */
  async registrarVentaMultiple(params: {
    items: any[];
    areaId: string;
    total: number;
    metodoPago: string;
    usuario?: string;
    allowNegative?: boolean;
    metadata?: any;
  }): Promise<string> {
    const { items, areaId, total, metodoPago, usuario, allowNegative = false, metadata } = params;

    // 1. Obtener snapshot actual del área para cálculos
    const areaRef = ref(this.db, `${this.baseRef}/areas/${areaId}`);
    const areaSnap = await get(areaRef);
    if (!areaSnap.exists()) throw new Error('Área de inventario no encontrada');

    const areaData = areaSnap.val() as InventoryAreaV2;
    const currentStock = areaData.stock || {};
    const updates: Record<string, any> = {};
    const timestamp = Date.now();

    // Generar ID de Venta
    const ventaRef = push(ref(this.db, `${this.baseRef.replace('inventory_v2', 'ventas_v2')}`));
    const ventaId = ventaRef.key!;

    // 2. Procesar cada item para el batch update
    for (const item of items) {
      const itemId = item.productoId;
      const cantidad = item.cantidad;
      const current = currentStock[itemId] || 0;

      // Validación (si no permite negativos)
      if (!allowNegative && current < cantidad) {
        throw new Error(`Stock insuficiente para ${item.nombre}. Disponible: ${current}`);
      }

      // Nuevo stock
      const newStock = allowNegative ? current - cantidad : Math.max(0, current - cantidad);
      updates[`${this.baseRef}/areas/${areaId}/stock/${itemId}`] = newStock;

      // Movimiento (Log)
      const movRef = push(ref(this.db, `${this.baseRef}/movements`));
      updates[`${this.baseRef}/movements/${movRef.key}`] = {
        tipo: 'salida',
        itemId,
        cantidad,
        areaId,
        usuario,
        razon: `Venta #${ventaId}`,
        timestamp,
        permiteNegativo: allowNegative,
      };
    }

    // 3. Registro de Venta Maestro
    const ventaPayload: VentaV2 = {
      id: ventaId,
      items: items.map((i) => ({
        productoId: i.productoId,
        nombre: i.nombre,
        precio: i.precio,
        cantidad: i.cantidad,
        unidad: i.unidad,
        subtotal: i.subtotal,
      })),
      total,
      metodoPago,
      areaId,
      usuario,
      timestamp,
      metadata,
    };

    updates[`${this.baseRef.replace('inventory_v2', 'ventas_v2')}/${ventaId}`] = ventaPayload;

    // 4. Ejecutar ráfaga atómica
    await update(ref(this.db), updates);
    console.log(`[InventoryRepo] ✅ Venta lote registrada con éxito: ${ventaId}`);

    return ventaId;
  }

  /**
   * Suscribirse a los movimientos recientes de inventario
   */
  suscribirMovimientosRecientes(
    limitCount: number,
    callback: (movements: Record<string, any>) => void
  ): () => void {
    const movementsRef = ref(this.db, `${this.baseRef}/movements`);
    const q = query(movementsRef, limitToLast(limitCount));
    const cb = onValue(q, (snap) => {
      callback(snap.val() || {});
    });
    return () => off(movementsRef, 'value', cb as any);
  }
}
