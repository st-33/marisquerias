/**
 * 📦 REPOSITORIO DE INVENTARIO V2
 * Soporta jerarquías de Áreas, Catálogo Global, Costeo, Equivalencias, Porcionado y Transferencias Internas.
 */

import type { Database } from 'firebase/database';
import {
  get,
  limitToLast,
  off,
  onValue,
  push,
  query,
  ref,
  runTransaction,
  set,
  update,
} from 'firebase/database';
import { z } from 'zod';
import { stripVoidDeep } from '../../logica/dominio/partidaCanonica';
import { assertValidRutaNegocio, sanitizeRtdbPayload } from '../rtdb/guards';
import { resolver_ruta_cajon } from '../rtdb/rutas/ruta_negocio';

// --- Esquemas de Datos ---

export type SeccionInventarioId = 'alimentos' | 'losa_cristaleria' | 'otros';

export type UnidadFisicaInventario = 'kg' | 'g' | 'l' | 'ml' | 'pza' | 'caja';

export type UsoArticuloInventario =
  | 'insumo'
  | 'venta_directa'
  | 'ambos'
  | 'producto_terminado';

export const EquivalenciaUnidadSchema = z.object({
  /** Si se compra en caja/paquete, cuántas unidades base contiene (ej. 1 caja = 24 pza) */
  piezasPorCaja: z.number().positive().optional(),
  /** Peso o volumen promedio de una pieza en kg o l (ej. 1 pepino ≈ 0.25 kg -> 4 piezas por kg) */
  pesoPromedioPiezaKg: z.number().positive().optional(),
  /** Piezas estimadas por kg (alternativa directa: ej. 4 pepinos por kg) */
  piezasPorKg: z.number().positive().optional(),
  /** Indica si la conversión peso <-> pieza es una aproximación operativa */
  esAproximado: z.boolean().default(false),
  /** Nota descriptiva de la equivalencia */
  nota: z.string().optional(),
});

export type EquivalenciaUnidad = z.infer<typeof EquivalenciaUnidadSchema>;

export const SeccionInventarioV2Schema = z.object({
  id: z.string(),
  nombre: z.string(),
  icon: z.string().optional(),
  stock: z.record(z.string(), z.number()).default({}),
  updatedAt: z.number(),
});

export type SeccionInventarioV2 = z.infer<typeof SeccionInventarioV2Schema>;

export const ItemInventarioV2Schema = z.object({
  id: z.string(),
  nombre: z.string(),
  sectionId: z.enum(['alimentos', 'losa_cristaleria', 'otros']).optional(),
  unidad: z.enum(['kg', 'g', 'l', 'ml', 'pza', 'caja']),
  /**
   * Condición explícita de uso del artículo:
   * - 'insumo': Se usa para preparar platillos o porcionar; no se vende directo.
   * - 'venta_directa': Se vende directamente (ej. cerveza, refresco).
   * - 'ambos': Se usa como ingrediente y también puede venderse directo.
   * - 'producto_terminado': Producido internamente en cocina (ej. flan por lote) o porcionado listo para venta.
   */
  uso: z.enum(['insumo', 'venta_directa', 'ambos', 'producto_terminado']).default('ambos'),
  /** Identificador de imagen desde el catálogo de imágenes de inventario */
  imagenId: z.string().optional(),
  /** Permite usar el artículo en recetas/menú sin controlar existencias físicas */
  controlarExistencias: z.boolean().default(true),
  minStock: z.number().default(0),
  /** Costo de adquisición o producción por unidad base (en MXN). NO es precio de venta. */
  costo: z.number().optional(),
  /** Alias compatible para lectores/escritores que consultan costoUnitario */
  costoUnitario: z.number().optional(),
  /** Reglas de conversión y equivalencia conocidas para este artículo */
  equivalencias: EquivalenciaUnidadSchema.optional(),
  /** Si fue generado por producción anticipada de un platillo o porcionado de otro insumo */
  platilloOrigenId: z.string().optional(),
  insumoOrigenId: z.string().optional(),
  proveedor: z.string().optional(),
  precio_negocio: z.number().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  updatedAt: z.number(),
});

export type ItemInventarioV2 = z.infer<typeof ItemInventarioV2Schema>;

export const AreaInventarioV2Schema = z.object({
  id: z.string(),
  hubId: z.enum(['restaurante', 'venta_crudo']).default('restaurante'),
  sectionId: z.enum(['alimentos', 'losa_cristaleria', 'otros']).optional(),
  nombre: z.string(),
  icon: z.string().optional(),
  tipo: z.enum(['almacen', 'refri', 'mostrador', 'cocina', 'otro']).default('almacen'),
  parentId: z.string().optional(),
  stock: z.record(z.string(), z.number()).default({}),
  updatedAt: z.number(),
});

export type AreaInventarioV2 = z.infer<typeof AreaInventarioV2Schema>;

export const MovimientoInventarioV2Schema = z.object({
  id: z.string(),
  operacionId: z.string().optional(),
  tipo: z.enum([
    'entrada',
    'salida',
    'ajuste',
    'transferencia',
    'merma',
    'produccion_consumo',
    'produccion_alta',
    'porcionado',
    'cancelacion_reverso',
  ]),
  itemId: z.string(),
  cantidad: z.number(),
  unidadMovimiento: z.string().optional(),
  costoUnitario: z.number().optional(),
  areaId: z.string().optional(),
  fromAreaId: z.string().optional(),
  toAreaId: z.string().optional(),
  razon: z.string().optional(),
  usuario: z.string().optional(),
  timestamp: z.number(),
  permiteNegativo: z.boolean().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type MovimientoInventarioV2 = z.infer<typeof MovimientoInventarioV2Schema>;

// --- Utilidades puras de conversión de unidades y costeo ---

export interface ResultadoConversionUnidad {
  posible: boolean;
  factor: number; // Multiplicar cantidadOrigen por factor da cantidad en unidadDestino
  cantidadConvertida: number;
  esAproximado: boolean;
  explicacion?: string;
}

/**
 * Convierte una cantidad de `unidadOrigen` a `unidadDestino` evaluando:
 * 1. Igualdad directa (`kg` -> `kg`).
 * 2. Conversión métrica exacta (`kg` <-> `g`, `l` <-> `ml`).
 * 3. Equivalencia declarada en el artículo (`caja` <-> `pza`, `kg`/`g` <-> `pza` con pesoPromedioPiezaKg o piezasPorKg).
 */
export function convertirCantidadInventario(params: {
  cantidad: number;
  unidadOrigen: string;
  unidadDestino: string;
  equivalencias?: EquivalenciaUnidad | null;
}): ResultadoConversionUnidad {
  const { cantidad, equivalencias } = params;
  const uOrig = String(params.unidadOrigen || 'pza').toLowerCase().trim();
  const uDest = String(params.unidadDestino || 'pza').toLowerCase().trim();

  if (uOrig === uDest) {
    return {
      posible: true,
      factor: 1,
      cantidadConvertida: cantidad,
      esAproximado: false,
    };
  }

  // Conversiones métricas exactas de masa
  if (uOrig === 'kg' && uDest === 'g') {
    return { posible: true, factor: 1000, cantidadConvertida: cantidad * 1000, esAproximado: false };
  }
  if (uOrig === 'g' && uDest === 'kg') {
    return {
      posible: true,
      factor: 0.001,
      cantidadConvertida: cantidad / 1000,
      esAproximado: false,
    };
  }

  // Conversiones métricas exactas de volumen
  if (uOrig === 'l' && uDest === 'ml') {
    return { posible: true, factor: 1000, cantidadConvertida: cantidad * 1000, esAproximado: false };
  }
  if (uOrig === 'ml' && uDest === 'l') {
    return {
      posible: true,
      factor: 0.001,
      cantidadConvertida: cantidad / 1000,
      esAproximado: false,
    };
  }

  // Equivalencias de caja <-> pieza
  const piezasPorCaja = equivalencias?.piezasPorCaja;
  if (piezasPorCaja && piezasPorCaja > 0) {
    if (uOrig === 'caja' && uDest === 'pza') {
      return {
        posible: true,
        factor: piezasPorCaja,
        cantidadConvertida: cantidad * piezasPorCaja,
        esAproximado: Boolean(equivalencias?.esAproximado),
        explicacion: `1 caja = ${piezasPorCaja} pza`,
      };
    }
    if (uOrig === 'pza' && uDest === 'caja') {
      const factor = 1 / piezasPorCaja;
      return {
        posible: true,
        factor,
        cantidadConvertida: cantidad * factor,
        esAproximado: Boolean(equivalencias?.esAproximado),
        explicacion: `${piezasPorCaja} pza = 1 caja`,
      };
    }
  }

  // Equivalencias entre peso (kg/g) y piezas (pza)
  const pesoPiezaKg =
    equivalencias?.pesoPromedioPiezaKg ||
    (equivalencias?.piezasPorKg && equivalencias.piezasPorKg > 0
      ? 1 / equivalencias.piezasPorKg
      : undefined);

  if (pesoPiezaKg && pesoPiezaKg > 0) {
    const esAprox = equivalencias?.esAproximado ?? true;
    if (uOrig === 'pza' && uDest === 'kg') {
      return {
        posible: true,
        factor: pesoPiezaKg,
        cantidadConvertida: cantidad * pesoPiezaKg,
        esAproximado: esAprox,
        explicacion: `1 pza ≈ ${pesoPiezaKg} kg`,
      };
    }
    if (uOrig === 'kg' && uDest === 'pza') {
      const factor = 1 / pesoPiezaKg;
      return {
        posible: true,
        factor,
        cantidadConvertida: cantidad * factor,
        esAproximado: esAprox,
        explicacion: `1 kg ≈ ${Number(factor.toFixed(2))} pza`,
      };
    }
    if (uOrig === 'pza' && uDest === 'g') {
      const factor = pesoPiezaKg * 1000;
      return {
        posible: true,
        factor,
        cantidadConvertida: cantidad * factor,
        esAproximado: esAprox,
        explicacion: `1 pza ≈ ${Math.round(factor)} g`,
      };
    }
    if (uOrig === 'g' && uDest === 'pza') {
      const factor = 1 / (pesoPiezaKg * 1000);
      return {
        posible: true,
        factor,
        cantidadConvertida: cantidad * factor,
        esAproximado: esAprox,
        explicacion: `${Math.round(pesoPiezaKg * 1000)} g ≈ 1 pza`,
      };
    }
  }

  return {
    posible: false,
    factor: 0,
    cantidadConvertida: 0,
    esAproximado: false,
    explicacion: `Sin equivalencia registrada entre ${uOrig.toUpperCase()} y ${uDest.toUpperCase()}`,
  };
}

/**
 * Determina si un artículo de inventario puede venderse directamente en Menú / Mostrador / Mesero.
 */
export function esArticuloVendibleDirecto(item?: Partial<ItemInventarioV2> | null): boolean {
  if (!item) return false;
  if (item.sectionId && item.sectionId !== 'alimentos') return false;
  const uso = item.uso || 'ambos';
  return uso === 'venta_directa' || uso === 'ambos' || uso === 'producto_terminado';
}

/**
 * Determina si un artículo de inventario puede utilizarse como insumo o ingrediente en Cocina.
 */
export function esArticuloInsumoCocina(item?: Partial<ItemInventarioV2> | null): boolean {
  if (!item) return false;
  const uso = item.uso || 'ambos';
  return uso === 'insumo' || uso === 'ambos';
}

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
  areaId: z.string(),
  usuario: z.string().optional(),
  timestamp: z.number(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type VentaV2 = z.infer<typeof VentaV2Schema>;

// --- Repositorio ---

export class RepositorioInventario {
  private baseRef: string;

  constructor(
    private db: Database,
    rutaNegocio: string
  ) {
    assertValidRutaNegocio(rutaNegocio);
    this.baseRef = resolver_ruta_cajon(rutaNegocio, 'inventario');
  }

  // ==================== CATÁLOGO (Global por Negocio) ====================

  async crearItem(item: Omit<ItemInventarioV2, 'id' | 'updatedAt'>): Promise<string> {
    const r = ref(this.db, `${this.baseRef}/catalog`);
    const newRef = push(r);
    const costoEfectivo = item.costo ?? item.costoUnitario;
    const payload = sanitizeRtdbPayload({
      ...item,
      ...(typeof costoEfectivo === 'number'
        ? { costo: costoEfectivo, costoUnitario: costoEfectivo }
        : {}),
      uso: item.uso || 'ambos',
      controlarExistencias: item.controlarExistencias ?? true,
      updatedAt: Date.now(),
    });
    await set(newRef, payload);
    return newRef.key!;
  }

  async actualizarItem(
    itemId: string,
    patch: Partial<Omit<ItemInventarioV2, 'id'>>
  ): Promise<void> {
    const r = ref(this.db, `${this.baseRef}/catalog/${itemId}`);
    const costoEfectivo = patch.costo ?? patch.costoUnitario;
    const payload = sanitizeRtdbPayload({
      ...patch,
      ...(typeof costoEfectivo === 'number'
        ? { costo: costoEfectivo, costoUnitario: costoEfectivo }
        : {}),
      updatedAt: Date.now(),
    });
    await update(r, payload);
  }

  async obtenerCatalogo(): Promise<Record<string, ItemInventarioV2>> {
    const snap = await get(ref(this.db, `${this.baseRef}/catalog`));
    return snap.val() || {};
  }

  suscribirCatalogo(callback: (items: Record<string, ItemInventarioV2>) => void): () => void {
    const r = ref(this.db, `${this.baseRef}/catalog`);
    const cb = onValue(r, (snap) => callback(snap.val() || {}));
    return () => off(r, 'value', cb);
  }

  // ==================== ÁREAS ====================

  async crearArea(area: Omit<AreaInventarioV2, 'id' | 'updatedAt'>): Promise<string> {
    const r = ref(this.db, `${this.baseRef}/areas`);
    const newRef = push(r);
    const payload = sanitizeRtdbPayload({
      ...area,
      updatedAt: Date.now(),
    });
    await set(newRef, payload);
    return newRef.key!;
  }

  async obtenerAreas(): Promise<Record<string, AreaInventarioV2>> {
    const snap = await get(ref(this.db, `${this.baseRef}/areas`));
    return snap.val() || {};
  }

  suscribirAreas(callback: (areas: Record<string, AreaInventarioV2>) => void): () => void {
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
   * Resuelve el contenedor o área efectiva donde reside el stock de un artículo.
   * Si `preferredAreaId` es un área padre cuyo stock real fue normalizado en un contenedor hijo
   * (`parentId === preferredAreaId`), selecciona automáticamente el contenedor hijo con mayor stock
   * (o `${preferredAreaId}__default`).
   */
  resolverContenedorEfectivo(
    areasMap: Record<string, AreaInventarioV2>,
    preferredAreaId: string,
    itemId: string
  ): { targetId: string; stockActual: number } {
    const areaDirecta = areasMap[preferredAreaId];
    const stockDirecto = Number(areaDirecta?.stock?.[itemId] || 0);
    if (stockDirecto > 0) {
      return { targetId: preferredAreaId, stockActual: stockDirecto };
    }

    // Buscar en contenedores hijos del área seleccionada
    const hijos = Object.entries(areasMap)
      .filter(([, a]) => a && a.parentId === preferredAreaId)
      .map(([id, a]) => ({ id, stock: Number(a.stock?.[itemId] || 0) }))
      .sort((a, b) => b.stock - a.stock);

    if (hijos.length > 0 && hijos[0].stock > 0) {
      return { targetId: hijos[0].id, stockActual: hijos[0].stock };
    }

    // Si ninguno en el área preferida tiene stock, buscar cualquier contenedor/área que sí tenga stock
    const cualquierConStock = Object.entries(areasMap)
      .map(([id, a]) => ({ id, stock: Number(a?.stock?.[itemId] || 0) }))
      .filter((x) => x.stock > 0)
      .sort((a, b) => b.stock - a.stock);

    if (cualquierConStock.length > 0) {
      return { targetId: cualquierConStock[0].id, stockActual: cualquierConStock[0].stock };
    }

    // Si todo está en 0, preferir el contenedor hijo default si existe, o el área directa
    if (hijos.length > 0) {
      return { targetId: hijos[0].id, stockActual: 0 };
    }
    return { targetId: preferredAreaId, stockActual: stockDirecto };
  }

  /**
   * Registra una transferencia interna entre áreas.
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

    const fromStockRef = ref(this.db, `${this.baseRef}/areas/${fromAreaId}/stock/${itemId}`);
    const toStockRef = ref(this.db, `${this.baseRef}/areas/${toAreaId}/stock/${itemId}`);

    const updates: Record<string, any> = {};

    const [fromSnap, toSnap] = await Promise.all([get(fromStockRef), get(toStockRef)]);
    const fromVal = Number(fromSnap.val() || 0);
    const toVal = Number(toSnap.val() || 0);

    if (fromVal < cantidad) throw new Error('Stock insuficiente en área origen');

    updates[`${this.baseRef}/areas/${fromAreaId}/stock/${itemId}`] = fromVal - cantidad;
    updates[`${this.baseRef}/areas/${toAreaId}/stock/${itemId}`] = toVal + cantidad;

    const movRef = push(ref(this.db, `${this.baseRef}/movements`));
    updates[`${this.baseRef}/movements/${movRef.key}`] = sanitizeRtdbPayload({
      tipo: 'transferencia',
      itemId,
      cantidad,
      fromAreaId,
      toAreaId,
      usuario,
      razon: razon || 'Transferencia interna',
      timestamp: Date.now(),
    });

    await update(ref(this.db), updates);
  }

  /**
   * Porciona o transforma un insumo a granel en porciones individuales medidas
   * (ej. 5 kg de camarón a granel -> 20 bolsas de 250 g en inventario).
   */
  async porcionarInsumo(params: {
    insumoOrigenId: string;
    cantidadOrigen: number;
    areaOrigenId: string;
    itemDestinoId?: string;
    nuevoItemDestino?: {
      nombre: string;
      unidad: UnidadFisicaInventario;
      uso?: UsoArticuloInventario;
      imagenId?: string;
    };
    cantidadPorcionesObtenidas: number;
    areaDestinoId?: string;
    mermaCantidad?: number;
    usuario?: string;
    razon?: string;
  }): Promise<{ itemDestinoId: string; costoUnitarioDestino: number }> {
    const {
      insumoOrigenId,
      cantidadOrigen,
      areaOrigenId,
      cantidadPorcionesObtenidas,
      areaDestinoId = areaOrigenId,
      mermaCantidad = 0,
      usuario,
      razon,
    } = params;

    if (cantidadOrigen <= 0 || cantidadPorcionesObtenidas <= 0) {
      throw new Error('Las cantidades de origen y de porciones obtenidas deben ser mayores a 0.');
    }

    const [catalogSnap, areasSnap] = await Promise.all([
      get(ref(this.db, `${this.baseRef}/catalog`)),
      get(ref(this.db, `${this.baseRef}/areas`)),
    ]);

    const catalog = (catalogSnap.val() || {}) as Record<string, ItemInventarioV2>;
    const areas = (areasSnap.val() || {}) as Record<string, AreaInventarioV2>;
    const itemOrigen = catalog[insumoOrigenId];
    if (!itemOrigen) {
      throw new Error(`El insumo origen (${insumoOrigenId}) no existe en el inventario.`);
    }

    const resueltoOrigen = this.resolverContenedorEfectivo(areas, areaOrigenId, insumoOrigenId);
    if (resueltoOrigen.stockActual < cantidadOrigen) {
      throw new Error(
        `Stock insuficiente de ${itemOrigen.nombre}. Disponible: ${resueltoOrigen.stockActual} ${itemOrigen.unidad}, requerido: ${cantidadOrigen} ${itemOrigen.unidad}.`
      );
    }

    const costoUnitarioOrigen = Number(itemOrigen.costo || 0);
    const costoTotalLote = costoUnitarioOrigen * cantidadOrigen;
    const costoUnitarioDestino =
      cantidadPorcionesObtenidas > 0
        ? Number((costoTotalLote / cantidadPorcionesObtenidas).toFixed(2))
        : 0;

    const now = Date.now();
    const updates: Record<string, any> = {};

    let destinoId = params.itemDestinoId;
    if (!destinoId) {
      const newRef = push(ref(this.db, `${this.baseRef}/catalog`));
      destinoId = newRef.key!;
      updates[`${this.baseRef}/catalog/${destinoId}`] = sanitizeRtdbPayload({
        nombre: params.nuevoItemDestino?.nombre || `${itemOrigen.nombre} (Porcionado)`,
        sectionId: itemOrigen.sectionId || 'alimentos',
        unidad: params.nuevoItemDestino?.unidad || 'pza',
        uso: params.nuevoItemDestino?.uso || 'ambos',
        imagenId: params.nuevoItemDestino?.imagenId || itemOrigen.imagenId,
        controlarExistencias: true,
        minStock: 0,
        costo: costoUnitarioDestino,
        insumoOrigenId,
        updatedAt: now,
      });
    } else if (costoUnitarioDestino > 0) {
      updates[`${this.baseRef}/catalog/${destinoId}/costo`] = costoUnitarioDestino;
      updates[`${this.baseRef}/catalog/${destinoId}/updatedAt`] = now;
    }

    const resueltoDestino = this.resolverContenedorEfectivo(areas, areaDestinoId, destinoId);

    // Descontar granel origen
    updates[`${this.baseRef}/areas/${resueltoOrigen.targetId}/stock/${insumoOrigenId}`] =
      Math.max(0, resueltoOrigen.stockActual - cantidadOrigen);

    // Sumar porciones obtenidas en destino
    const stockPrevioDestino = Number(
      areas[resueltoDestino.targetId]?.stock?.[destinoId] || 0
    );
    updates[`${this.baseRef}/areas/${resueltoDestino.targetId}/stock/${destinoId}`] =
      stockPrevioDestino + cantidadPorcionesObtenidas;

    // Registrar movimiento de porcionado
    const movRef = push(ref(this.db, `${this.baseRef}/movements`));
    updates[`${this.baseRef}/movements/${movRef.key}`] = sanitizeRtdbPayload({
      tipo: 'porcionado',
      itemId: insumoOrigenId,
      cantidad: cantidadOrigen,
      areaId: resueltoOrigen.targetId,
      toAreaId: resueltoDestino.targetId,
      costoUnitario: costoUnitarioDestino,
      usuario,
      razon:
        razon ||
        `Porcionado: ${cantidadOrigen} ${itemOrigen.unidad} -> ${cantidadPorcionesObtenidas} porciones`,
      timestamp: now,
      metadata: {
        itemDestinoId: destinoId,
        cantidadPorcionesObtenidas,
        mermaCantidad,
        costoTotalLote,
      },
    });

    await update(ref(this.db), sanitizeRtdbPayload(updates));
    return { itemDestinoId: destinoId, costoUnitarioDestino };
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

    const areasSnap = await get(ref(this.db, `${this.baseRef}/areas`));
    if (!areasSnap.exists()) throw new Error('Áreas de inventario no encontradas');
    const areasMap = (areasSnap.val() || {}) as Record<string, AreaInventarioV2>;

    if (!areasMap[areaId]) {
      throw new Error('Área de inventario no encontrada');
    }

    const updates: Record<string, any> = {};
    const timestamp = Date.now();

    for (const it of items) {
      const itemId = it.itemId;
      const cantidad = Number(it.cantidad) || 0;
      if (!itemId || cantidad <= 0) continue;

      const { targetId, stockActual } = this.resolverContenedorEfectivo(areasMap, areaId, itemId);
      if (!allowNegative && stockActual < cantidad) {
        throw new Error(`Stock insuficiente para itemId=${itemId}. Disponible: ${stockActual}`);
      }

      const newStock = allowNegative
        ? stockActual - cantidad
        : Math.max(0, stockActual - cantidad);
      updates[`${this.baseRef}/areas/${targetId}/stock/${itemId}`] = newStock;
      // Actualizar copia en memoria por si otro item de la misma lista toca el mismo contenedor
      if (areasMap[targetId]?.stock) {
        areasMap[targetId].stock[itemId] = newStock;
      }

      const movRef = push(ref(this.db, `${this.baseRef}/movements`));
      updates[`${this.baseRef}/movements/${movRef.key}`] = sanitizeRtdbPayload({
        tipo: 'salida',
        itemId,
        cantidad,
        areaId: targetId,
        usuario,
        razon: it.razon || razon || 'Salida',
        timestamp,
        permiteNegativo: allowNegative,
        metadata,
      });
    }

    if (Object.keys(updates).length === 0) return;
    await update(ref(this.db), sanitizeRtdbPayload(updates));
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
    const areasSnap = await get(ref(this.db, `${this.baseRef}/areas`));
    const areasMap = (areasSnap.val() || {}) as Record<string, AreaInventarioV2>;
    const { targetId, stockActual } = this.resolverContenedorEfectivo(areasMap, areaId, itemId);

    const updates: Record<string, any> = {};
    updates[`${this.baseRef}/areas/${targetId}/stock/${itemId}`] = Math.max(
      0,
      stockActual - cantidad
    );

    const movRef = push(ref(this.db, `${this.baseRef}/movements`));
    updates[`${this.baseRef}/movements/${movRef.key}`] = sanitizeRtdbPayload({
      tipo: 'merma',
      itemId,
      cantidad,
      areaId: targetId,
      usuario,
      razon,
      timestamp: Date.now(),
    });

    await update(ref(this.db), sanitizeRtdbPayload(updates));
  }

  /**
   * Venta operativa (Mostrador).
   */
  async registrarVenta(params: {
    itemId: string;
    areaId: string;
    cantidad: number;
    usuario?: string;
    allowNegative?: boolean;
  }): Promise<void> {
    const { itemId, areaId, cantidad, usuario, allowNegative = false } = params;
    const areasSnap = await get(ref(this.db, `${this.baseRef}/areas`));
    const areasMap = (areasSnap.val() || {}) as Record<string, AreaInventarioV2>;
    const { targetId, stockActual } = this.resolverContenedorEfectivo(areasMap, areaId, itemId);

    if (!allowNegative && stockActual < cantidad) {
      throw new Error(`Stock insuficiente. Disponible: ${stockActual}, Solicitado: ${cantidad}`);
    }

    const updates: Record<string, any> = {};
    const newStock = allowNegative
      ? stockActual - cantidad
      : Math.max(0, stockActual - cantidad);

    updates[`${this.baseRef}/areas/${targetId}/stock/${itemId}`] = newStock;

    const movRef = push(ref(this.db, `${this.baseRef}/movements`));
    updates[`${this.baseRef}/movements/${movRef.key}`] = sanitizeRtdbPayload({
      tipo: 'salida',
      itemId,
      cantidad,
      areaId: targetId,
      usuario,
      razon: 'Venta Mostrador',
      timestamp: Date.now(),
      permiteNegativo: allowNegative,
    });

    await update(ref(this.db), sanitizeRtdbPayload(updates));
  }

  /**
   * 🚀 REGISTRO DE VENTA POR LOTE (BATCH UPDATE)
   * Resuelve correctamente el `itemId` físico de inventario (por `origenId`, `itemId` o `productoId`)
   * y el contenedor hijo con existencias reales.
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
    const { items, areaId, usuario, allowNegative = false } = params;

    const [areasSnap, catalogSnap] = await Promise.all([
      get(ref(this.db, `${this.baseRef}/areas`)),
      get(ref(this.db, `${this.baseRef}/catalog`)),
    ]);
    if (!areasSnap.exists()) throw new Error('Área de inventario no encontrada');

    const rawAreas = (areasSnap.val() || {}) as Record<string, any>;
    const areasMap: Record<string, AreaInventarioV2> =
      rawAreas && typeof rawAreas.id === 'string' && rawAreas.id === areaId
        ? { [areaId]: rawAreas as AreaInventarioV2 }
        : (rawAreas as Record<string, AreaInventarioV2>);
    const catalogMap = (catalogSnap?.val?.() || {}) as Record<string, ItemInventarioV2>;
    if (!areasMap[areaId]) throw new Error('Área de inventario no encontrada');

    const updates: Record<string, any> = {};
    const timestamp = Date.now();
    const operacionId = push(ref(this.db, `${this.baseRef}/movements`)).key!;

    for (const item of items) {
      const candidateId = item.inventarioItemId || item.origenId || item.itemId || item.productoId;
      let resolvedItemId = candidateId;

      if (!catalogMap[resolvedItemId] && item.nombre) {
        const nombreNorm = String(item.nombre).trim().toLowerCase();
        const found = Object.entries(catalogMap).find(
          ([, catItem]) => String(catItem?.nombre || '').trim().toLowerCase() === nombreNorm
        );
        if (found) {
          resolvedItemId = found[0];
        }
      }

      const itemCat = catalogMap[resolvedItemId];
      if (itemCat && itemCat.controlarExistencias === false) {
        continue;
      }

      const cantidad = Number(item.cantidad) || 0;
      if (cantidad <= 0) continue;

      const { targetId, stockActual } = this.resolverContenedorEfectivo(
        areasMap,
        areaId,
        resolvedItemId
      );

      if (!allowNegative && stockActual < cantidad) {
        throw new Error(
          `Stock insuficiente para ${item.nombre || resolvedItemId}. Disponible: ${stockActual}`
        );
      }

      const newStock = allowNegative
        ? stockActual - cantidad
        : Math.max(0, stockActual - cantidad);
      updates[`${this.baseRef}/areas/${targetId}/stock/${resolvedItemId}`] = newStock;
      if (areasMap[targetId]?.stock) {
        areasMap[targetId].stock[resolvedItemId] = newStock;
      }

      const movRef = push(ref(this.db, `${this.baseRef}/movements`));
      updates[`${this.baseRef}/movements/${movRef.key}`] = sanitizeRtdbPayload({
        tipo: 'salida',
        operacionId,
        itemId: resolvedItemId,
        cantidad,
        areaId: targetId,
        usuario,
        razon: `Salida por venta de Mostrador #${operacionId}`,
        timestamp,
        permiteNegativo: allowNegative,
      });
    }

    if (Object.keys(updates).length > 0) {
      await update(ref(this.db), sanitizeRtdbPayload(updates));
    }

    return operacionId;
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
export { RepositorioInventario as InventoryV2Repository };

// Aliases retrocompatibles (inglés)
export type {
  SeccionInventarioId as InventorySectionId,
  SeccionInventarioV2 as InventorySectionV2,
  ItemInventarioV2 as InventoryItemV2,
  AreaInventarioV2 as InventoryAreaV2,
  MovimientoInventarioV2 as InventoryMovementV2,
};
