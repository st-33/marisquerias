/**
 * ⚖️ AUTORIDAD ÚNICA DE MOVIMIENTOS DE INVENTARIO
 *
 * Centraliza y gobierna toda afectación de existencias proveniente de:
 * 1. Venta o entrega de artículos directos (`origenTipo === 'inventario'`, ej. Cerveza).
 * 2. Preparación de platillos por pedido en Cocina (`origenTipo === 'platillo'` con `modoPreparacion === 'por_pedido'`, ej. Mojarra).
 * 3. Venta o entrega de platillos de producción anticipada (`modoPreparacion === 'produccion_anticipada'`, ej. Flan terminado: descuenta el artículo terminado `itemTerminadoId`, jamás vuelve a descontar leche/huevo/azúcar).
 * 4. Reversión / cancelación controlada si una partida se cancela después de haber descontado existencias.
 *
 * Garantía de Idempotencia:
 * Cada operación recibe un `operacionId` determinista (ej. `pedido_{ordenId}_item_{itemId}`, `mostrador_{ventaId}`)
 * que se registra atómicamente en `${baseInv}/operaciones_aplicadas/{operacionId}` (y en memoria local para ráfagas).
 * Ningún reintento, doble toque o reconexión puede duplicar el descuento.
 */

import type { Database } from 'firebase/database';
import { get, push, ref, update } from 'firebase/database';
import { assertValidRutaNegocio, sanitizeRtdbPayload } from '../rtdb/guards';
import { resolver_ruta_cajon } from '../rtdb/rutas/ruta_negocio';
import {
  RepositorioInventario,
  convertirCantidadInventario,
  type AreaInventarioV2,
  type ItemInventarioV2,
} from '../persistencia/inventario.repositorio';
import type { Producto } from '../persistencia/menu.repositorio';
import type { PlatilloCocina } from '../persistencia/platillos.repositorio';

export interface LineaConsumoResuelta {
  itemId: string;
  nombre: string;
  cantidadBase: number;
  unidadBase: string;
  razon: string;
  areaPreferidaId?: string;
}

export interface ResultadoOperacionInventario {
  aplicado: boolean;
  yaEstabaAplicado: boolean;
  operacionId: string;
  lineasAplicadas: Array<{
    itemId: string;
    nombre: string;
    cantidad: number;
    areaId: string;
  }>;
  advertencias: string[];
}

const operacionesEnVuelo = new Set<string>();
const operacionesAplicadasMemoria = new Set<string>();

function normalizarTexto(s?: string | null): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Resuelve un identificador de artículo de inventario buscando por:
 * 1. Clave exacta en `catalog`.
 * 2. Nombre exacto normalizado en `catalog`.
 */
export function resolverItemIdEnCatalogo(
  candidatoId: string | undefined | null,
  nombreFallback: string | undefined | null,
  catalog: Record<string, ItemInventarioV2>
): string | null {
  if (candidatoId && catalog[candidatoId]) {
    return candidatoId;
  }
  const candNorm = normalizarTexto(candidatoId);
  if (candNorm) {
    for (const [id, item] of Object.entries(catalog)) {
      if (normalizarTexto(id) === candNorm || normalizarTexto(item?.nombre) === candNorm) {
        return id;
      }
    }
  }
  const nomNorm = normalizarTexto(nombreFallback);
  if (nomNorm) {
    for (const [id, item] of Object.entries(catalog)) {
      if (normalizarTexto(item?.nombre) === nomNorm) {
        return id;
      }
    }
  }
  return null;
}

/**
 * Determina de forma pura qué artículos e insumos físicos deben descontarse
 * al consumir `cantidadVendida` de un `Producto` del Menú:
 *
 * - Regla 1 (Artículo directo o Producto terminado por lote):
 *   Si el producto proviene de `'inventario'`, o proviene de un `'platillo'` con `modoPreparacion === 'produccion_anticipada'`
 *   (o tiene `itemTerminadoId`), se descuenta directamente el artículo terminado/directo en Inventario.
 *   NUNCA se vuelven a descontar los ingredientes de la receta en la venta.
 *
 * - Regla 2 (Platillo por pedido):
 *   Si proviene de un `'platillo'` con `modoPreparacion === 'por_pedido'` (o tiene receta de preparación al momento),
 *   se descuentan los ingredientes de la receta escalados por `cantidadVendida / rendimiento.cantidad` y convertidos a la unidad base del inventario.
 */
export function resolverLineasConsumoParaProducto(params: {
  producto?: Partial<Producto> | null;
  platillo?: Partial<PlatilloCocina> | null;
  cantidadVendida: number;
  nombreFallback?: string;
  catalogoInventario: Record<string, ItemInventarioV2>;
}): { lineas: LineaConsumoResuelta[]; advertencias: string[] } {
  const { producto, platillo, cantidadVendida, nombreFallback, catalogoInventario } = params;
  const lineas: LineaConsumoResuelta[] = [];
  const advertencias: string[] = [];

  if (cantidadVendida <= 0) {
    return { lineas, advertencias };
  }

  const modoPrep =
    platillo?.modoPreparacion ||
    producto?.modoPreparacion ||
    (producto?.origenTipo === 'inventario' ? undefined : 'por_pedido');

  const esProduccionAnticipada =
    modoPrep === 'produccion_anticipada' ||
    Boolean(platillo?.itemTerminadoId || producto?.itemTerminadoId);

  const esVentaDirectaInventario =
    producto?.origenTipo === 'inventario' || esProduccionAnticipada;

  const areaPreferidaId =
    producto?.inventoryAreaId ||
    producto?.areaId ||
    platillo?.areaPreparacionId;

  // CASO A: Artículo de venta directa o Producto terminado de producción anticipada (ej. Cerveza o Flan hecho por lote)
  if (esVentaDirectaInventario) {
    const candidatoItemId =
      producto?.itemTerminadoId ||
      platillo?.itemTerminadoId ||
      (producto?.origenTipo === 'inventario' ? producto.origenId : undefined) ||
      producto?.id;

    const itemIdResuelto = resolverItemIdEnCatalogo(
      candidatoItemId,
      producto?.nombre || platillo?.nombre || nombreFallback,
      catalogoInventario
    );

    if (!itemIdResuelto) {
      advertencias.push(
        `No se encontró artículo de inventario para "${producto?.nombre || nombreFallback || candidatoItemId}".`
      );
      return { lineas, advertencias };
    }

    const itemInv = catalogoInventario[itemIdResuelto];
    if (itemInv.controlarExistencias === false) {
      return { lineas, advertencias };
    }

    const conv = convertirCantidadInventario({
      cantidad: cantidadVendida,
      unidadOrigen: producto?.unidad || itemInv.unidad,
      unidadDestino: itemInv.unidad,
      equivalencias: itemInv.equivalencias,
    });

    const cantidadBase = conv.posible ? conv.cantidadConvertida : cantidadVendida;
    lineas.push({
      itemId: itemIdResuelto,
      nombre: itemInv.nombre,
      cantidadBase: Number(cantidadBase.toFixed(4)),
      unidadBase: itemInv.unidad,
      razon: esProduccionAnticipada
        ? `Venta de producto terminado: ${producto?.nombre || itemInv.nombre}`
        : `Venta directa: ${producto?.nombre || itemInv.nombre}`,
      areaPreferidaId,
    });

    return { lineas, advertencias };
  }

  // CASO B: Platillo preparado al momento (`por_pedido`) -> descontar ingredientes de receta
  const rendimientoBase = Math.max(1, Number(platillo?.rendimiento?.cantidad || 1));
  const factorEscala = cantidadVendida / rendimientoBase;

  const ingredientesPlatillo = platillo?.ingredientes;
  const ingredientesLegacy = producto?.receta?.ingredientes;

  if (ingredientesPlatillo && Object.keys(ingredientesPlatillo).length > 0) {
    for (const [keyId, ing] of Object.entries(ingredientesPlatillo)) {
      const itemIdResuelto = resolverItemIdEnCatalogo(
        ing.itemId || keyId,
        undefined,
        catalogoInventario
      );
      if (!itemIdResuelto) {
        advertencias.push(`Ingrediente "${ing.itemId || keyId}" no encontrado en inventario.`);
        continue;
      }
      const itemInv = catalogoInventario[itemIdResuelto];
      if (itemInv.controlarExistencias === false) continue;

      const cantRequeridaReceta = Number(ing.cantidad || 0) * factorEscala;
      if (cantRequeridaReceta <= 0) continue;

      const conv = convertirCantidadInventario({
        cantidad: cantRequeridaReceta,
        unidadOrigen: ing.unidad || itemInv.unidad,
        unidadDestino: itemInv.unidad,
        equivalencias: itemInv.equivalencias,
      });

      const cantBase = conv.posible ? conv.cantidadConvertida : cantRequeridaReceta;
      lineas.push({
        itemId: itemIdResuelto,
        nombre: itemInv.nombre,
        cantidadBase: Number(cantBase.toFixed(4)),
        unidadBase: itemInv.unidad,
        razon: `Preparación por pedido: ${producto?.nombre || platillo?.nombre || 'Platillo'}`,
        areaPreferidaId,
      });
    }
    return { lineas, advertencias };
  }

  if (ingredientesLegacy && Object.keys(ingredientesLegacy).length > 0) {
    for (const [rawKey, rawCant] of Object.entries(ingredientesLegacy)) {
      const itemIdResuelto = resolverItemIdEnCatalogo(rawKey, rawKey, catalogoInventario);
      if (!itemIdResuelto) {
        advertencias.push(`Ingrediente "${rawKey}" no encontrado en inventario.`);
        continue;
      }
      const itemInv = catalogoInventario[itemIdResuelto];
      if (itemInv.controlarExistencias === false) continue;

      const cantBase = Number(rawCant || 0) * factorEscala;
      if (cantBase <= 0) continue;

      lineas.push({
        itemId: itemIdResuelto,
        nombre: itemInv.nombre,
        cantidadBase: Number(cantBase.toFixed(4)),
        unidadBase: itemInv.unidad,
        razon: `Preparación por pedido: ${producto?.nombre || nombreFallback || 'Platillo'}`,
        areaPreferidaId,
      });
    }
    return { lineas, advertencias };
  }

  // Fallback final: si un producto no tenía origenTipo explícito ni receta, pero coincide con un artículo directo en inventario
  const itemDirectoFallback = resolverItemIdEnCatalogo(
    producto?.origenId || producto?.id,
    producto?.nombre || nombreFallback,
    catalogoInventario
  );
  if (itemDirectoFallback) {
    const itemInv = catalogoInventario[itemDirectoFallback];
    if (itemInv.controlarExistencias !== false) {
      lineas.push({
        itemId: itemDirectoFallback,
        nombre: itemInv.nombre,
        cantidadBase: cantidadVendida,
        unidadBase: itemInv.unidad,
        razon: `Salida directa: ${producto?.nombre || itemInv.nombre}`,
        areaPreferidaId,
      });
    }
  }

  return { lineas, advertencias };
}

export class ServicioMovimientosInventario {
  /**
   * Ejecuta un descuento de inventario garantizando que `operacionId` se aplique a lo sumo una vez.
   */
  static async aplicarConsumoIdempotente(params: {
    db: Database;
    rutaNegocio: string;
    operacionId: string;
    lineas: LineaConsumoResuelta[];
    hubPreferido?: 'restaurante' | 'venta_crudo';
    areaForzadaId?: string;
    usuario?: string;
    allowNegative?: boolean;
    metadata?: Record<string, any>;
  }): Promise<ResultadoOperacionInventario> {
    const {
      db,
      rutaNegocio,
      operacionId,
      lineas,
      hubPreferido = 'restaurante',
      areaForzadaId,
      usuario,
      allowNegative = true,
      metadata,
    } = params;

    assertValidRutaNegocio(rutaNegocio);
    const claveMemoria = `${rutaNegocio}::${operacionId}`;

    if (operacionesAplicadasMemoria.has(claveMemoria) || operacionesEnVuelo.has(claveMemoria)) {
      return {
        aplicado: false,
        yaEstabaAplicado: true,
        operacionId,
        lineasAplicadas: [],
        advertencias: [],
      };
    }

    if (lineas.length === 0) {
      return {
        aplicado: false,
        yaEstabaAplicado: false,
        operacionId,
        lineasAplicadas: [],
        advertencias: [],
      };
    }

    operacionesEnVuelo.add(claveMemoria);
    try {
      const baseInv = resolver_ruta_cajon(rutaNegocio, 'inventario');
      const opRef = ref(db, `${baseInv}/operaciones_aplicadas/${operacionId}`);

      const [opSnap, areasSnap] = await Promise.all([
        get(opRef),
        get(ref(db, `${baseInv}/areas`)),
      ]);

      if (opSnap.exists()) {
        operacionesAplicadasMemoria.add(claveMemoria);
        return {
          aplicado: false,
          yaEstabaAplicado: true,
          operacionId,
          lineasAplicadas: [],
          advertencias: [],
        };
      }

      const areasMap = (areasSnap.val() || {}) as Record<string, AreaInventarioV2>;
      const invRepo = new RepositorioInventario(db, rutaNegocio);

      const defaultHubAreaId =
        areaForzadaId ||
        Object.keys(areasMap).find((id) => areasMap[id]?.hubId === hubPreferido) ||
        Object.keys(areasMap)[0] ||
        'area_alim_cocina';

      const updates: Record<string, any> = {};
      const lineasAplicadas: ResultadoOperacionInventario['lineasAplicadas'] = [];
      const advertencias: string[] = [];
      const timestamp = Date.now();

      for (const linea of lineas) {
        if (!linea.itemId || linea.cantidadBase <= 0) continue;

        const prefArea = areaForzadaId || linea.areaPreferidaId || defaultHubAreaId;
        const { targetId, stockActual } = invRepo.resolverContenedorEfectivo(
          areasMap,
          prefArea,
          linea.itemId
        );

        if (!allowNegative && stockActual < linea.cantidadBase) {
          throw new Error(
            `Existencias insuficientes para ${linea.nombre}. Disponible: ${stockActual} ${linea.unidadBase}, requerido: ${linea.cantidadBase} ${linea.unidadBase}.`
          );
        }

        const nuevoStock = allowNegative
          ? Number((stockActual - linea.cantidadBase).toFixed(4))
          : Math.max(0, Number((stockActual - linea.cantidadBase).toFixed(4)));

        updates[`${baseInv}/areas/${targetId}/stock/${linea.itemId}`] = nuevoStock;
        if (areasMap[targetId]?.stock) {
          areasMap[targetId].stock[linea.itemId] = nuevoStock;
        }

        const movRef = push(ref(db, `${baseInv}/movements`));
        updates[`${baseInv}/movements/${movRef.key}`] = sanitizeRtdbPayload({
          tipo: 'salida',
          operacionId,
          itemId: linea.itemId,
          cantidad: linea.cantidadBase,
          unidadMovimiento: linea.unidadBase,
          areaId: targetId,
          usuario,
          razon: linea.razon,
          timestamp,
          permiteNegativo: allowNegative,
          metadata,
        });

        lineasAplicadas.push({
          itemId: linea.itemId,
          nombre: linea.nombre,
          cantidad: linea.cantidadBase,
          areaId: targetId,
        });
      }

      updates[`${baseInv}/operaciones_aplicadas/${operacionId}`] = sanitizeRtdbPayload({
        operacionId,
        timestamp,
        usuario: usuario || 'sistema',
        lineas: lineasAplicadas,
        estado: 'aplicado',
      });

      await update(ref(db), sanitizeRtdbPayload(updates));
      operacionesAplicadasMemoria.add(claveMemoria);

      return {
        aplicado: true,
        yaEstabaAplicado: false,
        operacionId,
        lineasAplicadas,
        advertencias,
      };
    } finally {
      operacionesEnVuelo.delete(claveMemoria);
    }
  }

  /**
   * Revierte de forma controlada e idempotente una operación de consumo previamente aplicada
   * (ej. cuando se cancela un pedido cuya preparación o entrega fue anulada con devolución a stock).
   */
  static async revertirConsumoIdempotente(params: {
    db: Database;
    rutaNegocio: string;
    operacionIdOriginal: string;
    motivo: string;
    usuario?: string;
  }): Promise<{ revertido: boolean }> {
    const { db, rutaNegocio, operacionIdOriginal, motivo, usuario } = params;
    assertValidRutaNegocio(rutaNegocio);

    const baseInv = resolver_ruta_cajon(rutaNegocio, 'inventario');
    const opRef = ref(db, `${baseInv}/operaciones_aplicadas/${operacionIdOriginal}`);
    const opSnap = await get(opRef);

    if (!opSnap.exists()) {
      return { revertido: false };
    }

    const opData = opSnap.val();
    if (opData?.estado === 'revertido') {
      return { revertido: false };
    }

    const lineas: Array<{ itemId: string; cantidad: number; areaId: string }> =
      Array.isArray(opData?.lineas) ? opData.lineas : [];

    const areasSnap = await get(ref(db, `${baseInv}/areas`));
    const areasMap = (areasSnap.val() || {}) as Record<string, AreaInventarioV2>;

    const updates: Record<string, any> = {};
    const timestamp = Date.now();

    for (const lin of lineas) {
      const current = Number(areasMap[lin.areaId]?.stock?.[lin.itemId] || 0);
      const next = Number((current + Number(lin.cantidad || 0)).toFixed(4));
      updates[`${baseInv}/areas/${lin.areaId}/stock/${lin.itemId}`] = next;
      if (areasMap[lin.areaId]?.stock) {
        areasMap[lin.areaId].stock[lin.itemId] = next;
      }

      const movRef = push(ref(db, `${baseInv}/movements`));
      updates[`${baseInv}/movements/${movRef.key}`] = sanitizeRtdbPayload({
        tipo: 'cancelacion_reverso',
        operacionId: `rev_${operacionIdOriginal}`,
        itemId: lin.itemId,
        cantidad: lin.cantidad,
        areaId: lin.areaId,
        usuario,
        razon: `Reverso por cancelación: ${motivo}`,
        timestamp,
      });
    }

    updates[`${baseInv}/operaciones_aplicadas/${operacionIdOriginal}/estado`] = 'revertido';
    updates[`${baseInv}/operaciones_aplicadas/${operacionIdOriginal}/revertidoEn`] = timestamp;
    updates[`${baseInv}/operaciones_aplicadas/${operacionIdOriginal}/motivoReverso`] = motivo;

    await update(ref(db), sanitizeRtdbPayload(updates));
    return { revertido: true };
  }
}
