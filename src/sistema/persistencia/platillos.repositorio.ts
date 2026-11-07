/**
 * 📖 REPOSITORIO DEL LIBRO DE PLATILLOS Y PRODUCCIÓN DE COCINA
 *
 * Responsabilidad:
 * - Dueño único de los platillos del negocio (`modoPreparacion`: 'por_pedido' | 'produccion_anticipada').
 * - Dueño de la receta (ingredientes de Inventario, cantidades, unidades, rendimiento por porción o lote).
 * - Dueño del procedimiento paso a paso, tiempo estimado de preparación (`prepMin`), estación KDS y variantes físicas.
 * - Cálculo puro de costo de ingredientes y costo por unidad/porción producida (con alertas de costo incompleto o aproximado).
 * - Vínculo directo con el artículo terminado en Inventario (`itemTerminadoId`) para platillos de producción anticipada.
 * - Gestión de lotes de producción en Cocina (en preparación, pausados/interrumpidos, completados con rendimiento real y merma).
 */

import type { Database } from 'firebase/database';
import { get, off, onValue, push, ref, remove, set, update } from 'firebase/database';
import { assertValidRutaNegocio, sanitizeRtdbPayload } from '../rtdb/guards';
import { resolver_ruta_cajon } from '../rtdb/rutas/ruta_negocio';
import {
  RepositorioInventario,
  convertirCantidadInventario,
  type AreaInventarioV2,
  type ItemInventarioV2,
  type UnidadFisicaInventario,
} from './inventario.repositorio';
import type { VariantGroup } from './menu.repositorio';

export type ModoPreparacionPlatillo = 'por_pedido' | 'produccion_anticipada';

export type UnidadRendimientoPlatillo = 'porcion' | 'pza' | 'kg' | 'l';

export type NivelFlamaCoccion = 'sin_fuego' | 'baja' | 'media' | 'alta';

export interface TarifasGasCocina {
  /** Costo estimado por minuto a flama baja ($ MXN / min) */
  bajaPorMin: number;
  /** Costo estimado por minuto a flama media ($ MXN / min) */
  mediaPorMin: number;
  /** Costo estimado por minuto a flama alta ($ MXN / min) */
  altaPorMin: number;
}

export const TARIFAS_GAS_POR_DEFECTO: TarifasGasCocina = {
  bajaPorMin: 0.25,
  mediaPorMin: 0.45,
  altaPorMin: 0.75,
};

export interface IngredienteRecetaPlatillo {
  itemId: string;
  cantidad: number;
  unidad: UnidadFisicaInventario;
  notas?: string;
}

export interface RendimientoPlatillo {
  /** Cantidad de porciones o unidades que rinde esta receta (ej. 1 platillo o 8 flanes) */
  cantidad: number;
  unidad: UnidadRendimientoPlatillo;
  /** Etiqueta descriptiva opcional (ej. "1 molde de 8 rebanadas") */
  descripcion?: string;
}

export interface PlatilloCocina {
  id: string;
  nombre: string;
  descripcion?: string;
  /** Identificador de imagen desde assets/images/platillos/ o catálogo compartido */
  imagenId?: string;
  modoPreparacion: ModoPreparacionPlatillo;
  rendimiento: RendimientoPlatillo;
  /** Mapa itemId -> definición de ingrediente */
  ingredientes: Record<string, IngredienteRecetaPlatillo>;
  /** Pasos ordenados del procedimiento de cocina */
  procedimiento: string[];
  /** Tiempo estimado de preparación en minutos (activa alertas de demora en KDS) */
  prepMin: number;
  /** Nivel de flama para estimar consumo de gas ('sin_fuego' | 'baja' | 'media' | 'alta') */
  nivelFlama?: NivelFlamaCoccion;
  /** Tiempo efectivo de cocción al fuego en minutos (si difiere de prepMin) */
  minutosCoccion?: number;
  /** Estación o área de cocina asignada por el administrador */
  estacionPreparacion?: string;
  /** Área preferida de inventario de donde se descuentan los ingredientes */
  areaPreparacionId?: string;
  /** Variantes físicas o de preparación propias del platillo */
  variantes?: {
    grupos?: Record<string, VariantGroup>;
  };
  /**
   * Si `modoPreparacion === 'produccion_anticipada'`, referencia al artículo terminado
   * en `/inventario/catalog/{itemTerminadoId}` donde se depositan las unidades producidas.
   */
  itemTerminadoId?: string;
  activo: boolean;
  version: number;
  updatedAt: number;
}

export type EstadoLoteProduccion =
  | 'en_preparacion'
  | 'pausado'
  | 'completado'
  | 'cancelado';

export interface LoteProduccionCocina {
  id: string;
  platilloId: string;
  platilloNombre: string;
  versionReceta: number;
  /** Multiplicador de lotes respecto a la receta base (ej. 1 lote = 8 flanes, 2 lotes = 16 flanes) */
  multiplicadorLote: number;
  rendimientoEsperado: number;
  unidadRendimiento: UnidadRendimientoPlatillo;
  rendimientoObtenido?: number;
  mermaCantidad?: number;
  motivoDiferencia?: string;
  estado: EstadoLoteProduccion;
  /** Insumos consumidos al iniciar el lote (itemId -> cantidad en unidad base de inventario) */
  insumosConsumidos: Record<string, number>;
  costoTotalInsumos: number;
  costoUnitarioResultante?: number;
  itemTerminadoId?: string;
  areaOrigenId?: string;
  areaDestinoId?: string;
  operacionConsumoId?: string;
  operacionAltaId?: string;
  operador?: string;
  iniciadoEn: number;
  actualizadoEn: number;
  completadoEn?: number;
}

export interface DesgloseCostoIngrediente {
  itemId: string;
  nombre: string;
  cantidadReceta: number;
  unidadReceta: string;
  cantidadEnUnidadBase: number;
  unidadBaseInventario: string;
  costoUnitarioBase: number | null;
  subtotalCosto: number;
  esConversionAproximada: boolean;
  conversionPosible: boolean;
  explicacionConversion?: string;
  stockDisponibleBase: number;
  porcionesPosiblesConStock: number;
}

export interface ResumenCosteoPlatillo {
  /** Costo solo de ingredientes de la receta */
  costoIngredientesReceta: number;
  /** Costo estimado de gas LP / energía según minutos y nivel de flama */
  costoGasEstimado: number;
  /** Costo total de preparar la receta completa (ingredientes + gas estimado) */
  costoTotalReceta: number;
  /** Costo unitario por cada porción o pieza del rendimiento (`costoTotalReceta / rendimiento.cantidad`) */
  costoPorUnidadRendimiento: number;
  /** True si todos los ingredientes tienen costo conocido y conversión válida */
  costoCompleto: boolean;
  /** True si algún ingrediente utilizó una conversión aproximada o incluye estimado de gas */
  contieneAproximaciones: boolean;
  ingredientesSinCosto: string[];
  ingredientesSinConversion: string[];
  /** Cuántas unidades/porciones se pueden preparar hoy con el stock disponible */
  capacidadProduccionUnidades: number;
  ingredienteLimitante?: string;
  desglose: DesgloseCostoIngrediente[];
}

export function calcularCostoGasEstimado(params: {
  nivelFlama?: NivelFlamaCoccion;
  minutosCoccion?: number;
  prepMin?: number;
  tarifas?: TarifasGasCocina;
}): number {
  const { nivelFlama = 'sin_fuego', minutosCoccion, prepMin = 0, tarifas = TARIFAS_GAS_POR_DEFECTO } = params;
  if (!nivelFlama || nivelFlama === 'sin_fuego') return 0;
  const mins = Math.max(0, Number(minutosCoccion ?? prepMin ?? 0));
  if (mins <= 0) return 0;
  const tarifaMin =
    nivelFlama === 'alta'
      ? tarifas.altaPorMin
      : nivelFlama === 'media'
        ? tarifas.mediaPorMin
        : tarifas.bajaPorMin;
  return Number((mins * tarifaMin).toFixed(2));
}

/**
 * Calcula de forma pura el costo de una receta (ingredientes + gas estimado), el costo por unidad de rendimiento
 * y la capacidad de preparación según las existencias actuales en Inventario.
 */
export function calcularCosteoYCapacidadPlatillo(params: {
  platillo: Pick<PlatilloCocina, 'rendimiento' | 'ingredientes' | 'nivelFlama' | 'minutosCoccion' | 'prepMin'>;
  catalogoInventario: Record<string, ItemInventarioV2>;
  stockConsolidadoPorItem?: Record<string, number>;
  tarifasGas?: TarifasGasCocina;
}): ResumenCosteoPlatillo {
  const { platillo, catalogoInventario, stockConsolidadoPorItem = {}, tarifasGas } = params;
  const rendimientoCant = Math.max(1, Number(platillo.rendimiento?.cantidad || 1));
  const ingredientesEntries = Object.entries(platillo.ingredientes || {});
  const costoGasEstimado = calcularCostoGasEstimado({
    nivelFlama: platillo.nivelFlama,
    minutosCoccion: platillo.minutosCoccion,
    prepMin: platillo.prepMin,
    tarifas: tarifasGas,
  });

  if (ingredientesEntries.length === 0) {
    const totalConGas = Number(costoGasEstimado.toFixed(2));
    return {
      costoIngredientesReceta: 0,
      costoGasEstimado,
      costoTotalReceta: totalConGas,
      costoPorUnidadRendimiento: Number((totalConGas / rendimientoCant).toFixed(2)),
      costoCompleto: false,
      contieneAproximaciones: costoGasEstimado > 0,
      ingredientesSinCosto: [],
      ingredientesSinConversion: [],
      capacidadProduccionUnidades: 0,
      desglose: [],
    };
  }

  let costoIngredientesReceta = 0;
  let costoCompleto = true;
  let contieneAproximaciones = costoGasEstimado > 0;
  const ingredientesSinCosto: string[] = [];
  const ingredientesSinConversion: string[] = [];
  const desglose: DesgloseCostoIngrediente[] = [];

  let lotesPosibles = Infinity;
  let ingredienteLimitante: string | undefined;

  for (const [keyId, ing] of ingredientesEntries) {
    const itemId = ing.itemId || keyId;
    const cantReceta = Number(ing.cantidad || 0);
    if (cantReceta <= 0) continue;

    const itemInv = catalogoInventario[itemId];
    if (!itemInv) {
      costoCompleto = false;
      ingredientesSinCosto.push(itemId);
      lotesPosibles = 0;
      ingredienteLimitante = 'Ingrediente no encontrado';
      continue;
    }

    const unidadReceta = ing.unidad || itemInv.unidad || 'pza';
    const conv = convertirCantidadInventario({
      cantidad: cantReceta,
      unidadOrigen: unidadReceta,
      unidadDestino: itemInv.unidad,
      equivalencias: itemInv.equivalencias,
    });

    if (!conv.posible) {
      costoCompleto = false;
      ingredientesSinConversion.push(itemInv.nombre);
    }
    if (conv.esAproximado) {
      contieneAproximaciones = true;
    }

    const cantBase = conv.posible ? conv.cantidadConvertida : cantReceta;
    const valorCostoRaw = itemInv.costo ?? (itemInv as any).costoUnitario;
    const tieneCosto = typeof valorCostoRaw === 'number' && valorCostoRaw > 0;
    if (!tieneCosto) {
      costoCompleto = false;
      ingredientesSinCosto.push(itemInv.nombre);
    }

    const costoUnitarioBase = tieneCosto ? Number(valorCostoRaw) : null;
    const subtotalCosto = costoUnitarioBase !== null ? cantBase * costoUnitarioBase : 0;
    costoIngredientesReceta += subtotalCosto;

    const stockDisp = Number(stockConsolidadoPorItem[itemId] || 0);
    let lotesConEsteIng = Infinity;

    if (itemInv.controlarExistencias !== false) {
      if (!conv.posible || cantBase <= 0 || stockDisp < cantBase) {
        lotesConEsteIng = 0;
      } else {
        lotesConEsteIng = Math.floor(stockDisp / cantBase);
      }

      if (lotesConEsteIng < lotesPosibles) {
        lotesPosibles = lotesConEsteIng;
        ingredienteLimitante = itemInv.nombre;
      }
    }

    desglose.push({
      itemId,
      nombre: itemInv.nombre,
      cantidadReceta: cantReceta,
      unidadReceta,
      cantidadEnUnidadBase: Number(cantBase.toFixed(4)),
      unidadBaseInventario: itemInv.unidad,
      costoUnitarioBase,
      subtotalCosto: Number(subtotalCosto.toFixed(2)),
      esConversionAproximada: conv.esAproximado,
      conversionPosible: conv.posible,
      explicacionConversion: conv.explicacion,
      stockDisponibleBase: stockDisp,
      porcionesPosiblesConStock:
        lotesConEsteIng === Infinity ? 999 : lotesConEsteIng * rendimientoCant,
    });
  }

  const costoTotalReceta = Number((costoIngredientesReceta + costoGasEstimado).toFixed(2));
  const costoPorUnidadRendimiento = Number((costoTotalReceta / rendimientoCant).toFixed(2));
  const capacidadProduccionUnidades =
    lotesPosibles === Infinity ? 999 : Math.max(0, lotesPosibles * rendimientoCant);

  return {
    costoIngredientesReceta: Number(costoIngredientesReceta.toFixed(2)),
    costoGasEstimado,
    costoTotalReceta,
    costoPorUnidadRendimiento,
    costoCompleto,
    contieneAproximaciones,
    ingredientesSinCosto,
    ingredientesSinConversion,
    capacidadProduccionUnidades,
    ingredienteLimitante,
    desglose,
  };
}

/**
 * Normaliza un mapa de ingredientes legado (`Record<string, number>`) o nuevo
 * al contrato canónico `Record<string, IngredienteRecetaPlatillo>`.
 */
export function normalizarIngredientesReceta(
  raw: Record<string, any> | undefined | null,
  catalogoInventario?: Record<string, ItemInventarioV2>
): Record<string, IngredienteRecetaPlatillo> {
  if (!raw || typeof raw !== 'object') return {};
  const resultado: Record<string, IngredienteRecetaPlatillo> = {};

  for (const [key, val] of Object.entries(raw)) {
    if (typeof val === 'number') {
      if (val > 0) {
        const unidadBase = catalogoInventario?.[key]?.unidad || 'pza';
        resultado[key] = {
          itemId: key,
          cantidad: val,
          unidad: unidadBase,
        };
      }
    } else if (val && typeof val === 'object') {
      const itemId = String(val.itemId || key);
      const cantidad = Number(val.cantidad || 0);
      if (cantidad > 0) {
        const unidad = (val.unidad ||
          catalogoInventario?.[itemId]?.unidad ||
          'pza') as UnidadFisicaInventario;
        resultado[itemId] = {
          itemId,
          cantidad,
          unidad,
          ...(val.notas ? { notas: String(val.notas) } : {}),
        };
      }
    }
  }

  return resultado;
}

export class RepositorioLibroPlatillos {
  private baseMenuRef: string;
  private baseInvRef: string;

  constructor(
    private db: Database,
    private rutaNegocio: string
  ) {
    assertValidRutaNegocio(rutaNegocio);
    this.baseMenuRef = resolver_ruta_cajon(rutaNegocio, 'menu');
    this.baseInvRef = resolver_ruta_cajon(rutaNegocio, 'inventario');
  }

  private getPlatillosPath(): string {
    return `${this.baseMenuRef}/libro_platillos`;
  }

  private getProduccionPath(): string {
    return `${this.baseInvRef}/produccion_lotes`;
  }

  // ==================== LIBRO DE PLATILLOS ====================

  suscribirPlatillos(callback: (platillos: Record<string, PlatilloCocina>) => void): () => void {
    const r = ref(this.db, this.getPlatillosPath());
    const cb = onValue(r, (snap) => {
      const raw = (snap.val() || {}) as Record<string, any>;
      const normalizados: Record<string, PlatilloCocina> = {};
      for (const [id, p] of Object.entries(raw)) {
        if (!p || typeof p !== 'object') continue;
        normalizados[id] = {
          id,
          nombre: String(p.nombre || 'Platillo'),
          descripcion: p.descripcion,
          imagenId: p.imagenId || p.imagen,
          modoPreparacion:
            p.modoPreparacion === 'produccion_anticipada'
              ? 'produccion_anticipada'
              : 'por_pedido',
          rendimiento: {
            cantidad: Math.max(1, Number(p.rendimiento?.cantidad || 1)),
            unidad: p.rendimiento?.unidad || 'porcion',
            descripcion: p.rendimiento?.descripcion,
          },
          ingredientes: normalizarIngredientesReceta(p.ingredientes),
          procedimiento: Array.isArray(p.procedimiento)
            ? p.procedimiento.map(String)
            : typeof p.procedimiento === 'string' && p.procedimiento.trim()
              ? p.procedimiento
                  .split('\n')
                  .map((s: string) => s.trim())
                  .filter(Boolean)
              : [],
          prepMin: Number(p.prepMin ?? 15),
          nivelFlama: p.nivelFlama || 'media',
          minutosCoccion: p.minutosCoccion != null ? Number(p.minutosCoccion) : undefined,
          estacionPreparacion: p.estacionPreparacion || p.estacion_preparacion || 'cocina',
          areaPreparacionId: p.areaPreparacionId,
          variantes: p.variantes,
          itemTerminadoId: p.itemTerminadoId,
          activo: p.activo !== false,
          version: Number(p.version || 1),
          updatedAt: Number(p.updatedAt || 0),
        };
      }
      callback(normalizados);
    });
    return () => off(r, 'value', cb as any);
  }

  async obtenerPlatillos(): Promise<Record<string, PlatilloCocina>> {
    const snap = await get(ref(this.db, this.getPlatillosPath()));
    const raw = (snap.val() || {}) as Record<string, any>;
    const res: Record<string, PlatilloCocina> = {};
    for (const [id, p] of Object.entries(raw)) {
      if (p && typeof p === 'object') {
        res[id] = {
          id,
          ...p,
          ingredientes: normalizarIngredientesReceta(p.ingredientes),
        } as PlatilloCocina;
      }
    }
    return res;
  }

  /**
   * Crea o actualiza el artículo terminado en Inventario cuando un platillo
   * se configura como `produccion_anticipada` (ej. Flan napolitano por molde).
   * Así el operador no vuelve a escribir nombre ni imagen en otro módulo.
   */
  private async asegurarArticuloTerminadoEnInventario(params: {
    platilloId: string;
    nombre: string;
    imagenId?: string;
    unidadRendimiento: UnidadRendimientoPlatillo;
    itemTerminadoIdExistente?: string;
    costoUnitarioEstimado?: number;
  }): Promise<string> {
    const {
      platilloId,
      nombre,
      imagenId,
      unidadRendimiento,
      itemTerminadoIdExistente,
      costoUnitarioEstimado,
    } = params;
    const unidadInv: UnidadFisicaInventario =
      unidadRendimiento === 'kg' ? 'kg' : unidadRendimiento === 'l' ? 'l' : 'pza';

    const itemTerminadoId = itemTerminadoIdExistente || `item_term_${platilloId}`;
    const itemRef = ref(this.db, `${this.baseInvRef}/catalog/${itemTerminadoId}`);
    const snap = await get(itemRef);
    const prev = snap.val() || {};

    const payload = sanitizeRtdbPayload({
      ...prev,
      id: itemTerminadoId,
      nombre,
      sectionId: 'alimentos',
      unidad: unidadInv,
      uso: 'producto_terminado',
      imagenId: imagenId ?? prev.imagenId,
      controlarExistencias: true,
      minStock: prev.minStock ?? 0,
      costo:
        typeof costoUnitarioEstimado === 'number' && costoUnitarioEstimado > 0
          ? costoUnitarioEstimado
          : prev.costo,
      platilloOrigenId: platilloId,
      updatedAt: Date.now(),
    });

    await set(itemRef, payload);
    return itemTerminadoId;
  }

  async guardarPlatillo(
    datos: Omit<PlatilloCocina, 'id' | 'version' | 'updatedAt'> & {
      id?: string;
      costoUnitarioEstimado?: number;
    }
  ): Promise<PlatilloCocina> {
    const { id: existingId, costoUnitarioEstimado, ...resto } = datos;
    const colRef = ref(this.db, this.getPlatillosPath());
    const platilloId = existingId || push(colRef).key!;
    const docRef = ref(this.db, `${this.getPlatillosPath()}/${platilloId}`);

    let versionPrev = 0;
    let itemTerminadoPrev: string | undefined = resto.itemTerminadoId;
    if (existingId) {
      const prevSnap = await get(docRef);
      if (prevSnap.exists()) {
        const prevVal = prevSnap.val();
        versionPrev = Number(prevVal?.version || 1);
        itemTerminadoPrev = itemTerminadoPrev || prevVal?.itemTerminadoId;
      }
    }

    let itemTerminadoId = itemTerminadoPrev;
    if (resto.modoPreparacion === 'produccion_anticipada') {
      itemTerminadoId = await this.asegurarArticuloTerminadoEnInventario({
        platilloId,
        nombre: resto.nombre,
        imagenId: resto.imagenId,
        unidadRendimiento: resto.rendimiento?.unidad || 'pza',
        itemTerminadoIdExistente: itemTerminadoPrev,
        costoUnitarioEstimado,
      });
    }

    const platilloFinal: PlatilloCocina = {
      ...resto,
      id: platilloId,
      ingredientes: normalizarIngredientesReceta(resto.ingredientes),
      itemTerminadoId,
      version: versionPrev + 1,
      updatedAt: Date.now(),
    };

    await set(docRef, sanitizeRtdbPayload(platilloFinal));
    return platilloFinal;
  }

  async eliminarPlatillo(platilloId: string): Promise<void> {
    await remove(ref(this.db, `${this.getPlatillosPath()}/${platilloId}`));
  }

  // ==================== LOTES DE PRODUCCIÓN ====================

  suscribirLotesProduccion(
    callback: (lotes: Record<string, LoteProduccionCocina>) => void
  ): () => void {
    const r = ref(this.db, this.getProduccionPath());
    const cb = onValue(r, (snap) => {
      const raw = (snap.val() || {}) as Record<string, LoteProduccionCocina>;
      const fixed: Record<string, LoteProduccionCocina> = {};
      for (const [id, lote] of Object.entries(raw)) {
        if (lote && typeof lote === 'object') {
          fixed[id] = { ...lote, id };
        }
      }
      callback(fixed);
    });
    return () => off(r, 'value', cb as any);
  }

  /**
   * Inicia la preparación de un lote en Cocina:
   * 1. Valida y descuenta los ingredientes de Inventario según `multiplicadorLote`.
   * 2. Registra el lote en estado `'en_preparacion'` para que no quede invisible.
   */
  async iniciarLoteProduccion(params: {
    platillo: PlatilloCocina;
    multiplicadorLote: number;
    areaOrigenId?: string;
    areaDestinoId?: string;
    operador?: string;
    allowNegative?: boolean;
  }): Promise<LoteProduccionCocina> {
    const {
      platillo,
      multiplicadorLote = 1,
      areaOrigenId,
      areaDestinoId,
      operador,
      allowNegative = false,
    } = params;

    if (multiplicadorLote <= 0) {
      throw new Error('El multiplicador de lote debe ser mayor a 0.');
    }

    const [catSnap, areasSnap] = await Promise.all([
      get(ref(this.db, `${this.baseInvRef}/catalog`)),
      get(ref(this.db, `${this.baseInvRef}/areas`)),
    ]);

    const catalog = (catSnap.val() || {}) as Record<string, ItemInventarioV2>;
    const areas = (areasSnap.val() || {}) as Record<string, AreaInventarioV2>;
    const invRepo = new RepositorioInventario(this.db, this.rutaNegocio);

    // Determinar área origen por defecto (Cocina o primera área de alimentos)
    const defaultAreaId =
      areaOrigenId ||
      platillo.areaPreparacionId ||
      Object.keys(areas).find((id) => areas[id]?.tipo === 'cocina') ||
      Object.keys(areas)[0] ||
      'area_alim_cocina';

    const insumosConsumidos: Record<string, number> = {};
    let costoTotalInsumos = 0;
    const now = Date.now();
    const loteRef = push(ref(this.db, this.getProduccionPath()));
    const loteId = loteRef.key!;
    const operacionConsumoId = `op_prod_ini_${loteId}`;

    const updates: Record<string, any> = {};

    for (const [keyId, ing] of Object.entries(platillo.ingredientes || {})) {
      const itemId = ing.itemId || keyId;
      const itemInv = catalog[itemId];
      if (!itemInv) {
        throw new Error(`El ingrediente ${itemId} no existe en el inventario.`);
      }

      const conv = convertirCantidadInventario({
        cantidad: Number(ing.cantidad || 0) * multiplicadorLote,
        unidadOrigen: ing.unidad || itemInv.unidad,
        unidadDestino: itemInv.unidad,
        equivalencias: itemInv.equivalencias,
      });

      if (!conv.posible) {
        throw new Error(
          `No existe conversión válida para ${itemInv.nombre} (${ing.unidad} -> ${itemInv.unidad}).`
        );
      }

      const cantidadBaseRequerida = Number(conv.cantidadConvertida.toFixed(4));
      if (cantidadBaseRequerida <= 0) continue;

      insumosConsumidos[itemId] = cantidadBaseRequerida;
      costoTotalInsumos += cantidadBaseRequerida * Number(itemInv.costo || 0);

      if (itemInv.controlarExistencias !== false) {
        const { targetId, stockActual } = invRepo.resolverContenedorEfectivo(
          areas,
          defaultAreaId,
          itemId
        );

        if (!allowNegative && stockActual < cantidadBaseRequerida) {
          throw new Error(
            `Existencias insuficientes de ${itemInv.nombre}. Disponible: ${stockActual} ${itemInv.unidad}, requerido: ${cantidadBaseRequerida} ${itemInv.unidad}.`
          );
        }

        const nuevoStock = allowNegative
          ? stockActual - cantidadBaseRequerida
          : Math.max(0, stockActual - cantidadBaseRequerida);

        updates[`${this.baseInvRef}/areas/${targetId}/stock/${itemId}`] = nuevoStock;
        if (areas[targetId]?.stock) {
          areas[targetId].stock[itemId] = nuevoStock;
        }

        const movRef = push(ref(this.db, `${this.baseInvRef}/movements`));
        updates[`${this.baseInvRef}/movements/${movRef.key}`] = sanitizeRtdbPayload({
          tipo: 'produccion_consumo',
          operacionId: operacionConsumoId,
          itemId,
          cantidad: cantidadBaseRequerida,
          unidadMovimiento: itemInv.unidad,
          areaId: targetId,
          usuario: operador,
          razon: `Consumo lote producción: ${platillo.nombre} (x${multiplicadorLote})`,
          timestamp: now,
          metadata: {
            loteId,
            platilloId: platillo.id,
          },
        });
      }
    }

    // Asegurar que exista el artículo terminado en inventario
    const itemTerminadoId = await this.asegurarArticuloTerminadoEnInventario({
      platilloId: platillo.id,
      nombre: platillo.nombre,
      imagenId: platillo.imagenId,
      unidadRendimiento: platillo.rendimiento?.unidad || 'pza',
      itemTerminadoIdExistente: platillo.itemTerminadoId,
    });

    const rendimientoEsperado =
      Math.max(1, Number(platillo.rendimiento?.cantidad || 1)) * multiplicadorLote;

    const lote: LoteProduccionCocina = {
      id: loteId,
      platilloId: platillo.id,
      platilloNombre: platillo.nombre,
      versionReceta: platillo.version || 1,
      multiplicadorLote,
      rendimientoEsperado,
      unidadRendimiento: platillo.rendimiento?.unidad || 'pza',
      estado: 'en_preparacion',
      insumosConsumidos,
      costoTotalInsumos: Number(costoTotalInsumos.toFixed(2)),
      itemTerminadoId,
      areaOrigenId: defaultAreaId,
      areaDestinoId: areaDestinoId || defaultAreaId,
      operacionConsumoId,
      operador,
      iniciadoEn: now,
      actualizadoEn: now,
    };

    updates[`${this.getProduccionPath()}/${loteId}`] = sanitizeRtdbPayload(lote);
    await update(ref(this.db), sanitizeRtdbPayload(updates));
    return lote;
  }

  /**
   * Pausa o reanuda un lote en preparación para reflejar interrupciones reales de cocina.
   */
  async cambiarEstadoLote(
    loteId: string,
    nuevoEstado: 'en_preparacion' | 'pausado' | 'cancelado',
    motivo?: string
  ): Promise<void> {
    const loteRef = ref(this.db, `${this.getProduccionPath()}/${loteId}`);
    await update(
      loteRef,
      sanitizeRtdbPayload({
        estado: nuevoEstado,
        ...(motivo ? { motivoDiferencia: motivo } : {}),
        actualizadoEn: Date.now(),
      })
    );
  }

  /**
   * Finaliza un lote de producción:
   * 1. Registra la cantidad REAL obtenida (`rendimientoObtenido`) y la diferencia/merma si fue menor al esperado.
   * 2. Suma las unidades reales obtenidas al artículo terminado (`itemTerminadoId`) en Inventario.
   * 3. Actualiza el costo unitario del artículo terminado (`costoTotalInsumos / rendimientoObtenido`).
   */
  async completarLoteProduccion(params: {
    loteId: string;
    rendimientoObtenido: number;
    motivoDiferencia?: string;
    areaDestinoId?: string;
    operador?: string;
  }): Promise<LoteProduccionCocina> {
    const { loteId, rendimientoObtenido, motivoDiferencia, areaDestinoId, operador } = params;
    if (rendimientoObtenido < 0) {
      throw new Error('El rendimiento obtenido no puede ser negativo.');
    }

    const loteSnap = await get(ref(this.db, `${this.getProduccionPath()}/${loteId}`));
    if (!loteSnap.exists()) {
      throw new Error('Lote de producción no encontrado.');
    }
    const lote = { ...(loteSnap.val() as LoteProduccionCocina), id: loteId };
    if (lote.estado === 'completado') {
      return lote; // Idempotente: ya completado
    }

    const areasSnap = await get(ref(this.db, `${this.baseInvRef}/areas`));
    const areas = (areasSnap.val() || {}) as Record<string, AreaInventarioV2>;
    const invRepo = new RepositorioInventario(this.db, this.rutaNegocio);

    const itemTerminadoId = lote.itemTerminadoId || `item_term_${lote.platilloId}`;
    const targetAreaPref =
      areaDestinoId ||
      lote.areaDestinoId ||
      lote.areaOrigenId ||
      Object.keys(areas)[0] ||
      'area_alim_cocina';

    const { targetId, stockActual } = invRepo.resolverContenedorEfectivo(
      areas,
      targetAreaPref,
      itemTerminadoId
    );

    const diferencia = lote.rendimientoEsperado - rendimientoObtenido;
    const mermaCantidad = diferencia > 0 ? Number(diferencia.toFixed(2)) : 0;
    const costoUnitarioResultante =
      rendimientoObtenido > 0
        ? Number((lote.costoTotalInsumos / rendimientoObtenido).toFixed(2))
        : 0;

    const now = Date.now();
    const operacionAltaId = `op_prod_fin_${loteId}`;
    const updates: Record<string, any> = {};

    // 1. Sumar unidades obtenidas al stock del producto terminado
    if (rendimientoObtenido > 0) {
      updates[`${this.baseInvRef}/areas/${targetId}/stock/${itemTerminadoId}`] =
        stockActual + rendimientoObtenido;
    }

    // 2. Actualizar costo unitario del producto terminado en el catálogo de inventario
    if (costoUnitarioResultante > 0) {
      updates[`${this.baseInvRef}/catalog/${itemTerminadoId}/costo`] = costoUnitarioResultante;
      updates[`${this.baseInvRef}/catalog/${itemTerminadoId}/updatedAt`] = now;
    }

    // 3. Registrar movimiento de alta por producción
    const movAltaRef = push(ref(this.db, `${this.baseInvRef}/movements`));
    updates[`${this.baseInvRef}/movements/${movAltaRef.key}`] = sanitizeRtdbPayload({
      tipo: 'produccion_alta',
      operacionId: operacionAltaId,
      itemId: itemTerminadoId,
      cantidad: rendimientoObtenido,
      costoUnitario: costoUnitarioResultante,
      areaId: targetId,
      usuario: operador || lote.operador,
      razon: `Producción terminada: ${lote.platilloNombre} (${rendimientoObtenido}/${lote.rendimientoEsperado} ${lote.unidadRendimiento})`,
      timestamp: now,
      metadata: {
        loteId,
        platilloId: lote.platilloId,
        rendimientoEsperado: lote.rendimientoEsperado,
        rendimientoObtenido,
        mermaCantidad,
        motivoDiferencia,
      },
    });

    // 4. Si hubo merma (rendimientoObtenido < rendimientoEsperado), dejar constancia explícita
    if (mermaCantidad > 0) {
      const movMermaRef = push(ref(this.db, `${this.baseInvRef}/movements`));
      updates[`${this.baseInvRef}/movements/${movMermaRef.key}`] = sanitizeRtdbPayload({
        tipo: 'merma',
        operacionId: `${operacionAltaId}_merma`,
        itemId: itemTerminadoId,
        cantidad: mermaCantidad,
        areaId: targetId,
        usuario: operador || lote.operador,
        razon:
          motivoDiferencia ||
          `Merma en lote de producción (${lote.platilloNombre}): esperado ${lote.rendimientoEsperado}, obtenido ${rendimientoObtenido}`,
        timestamp: now,
      });
    }

    const loteActualizado: LoteProduccionCocina = {
      ...lote,
      rendimientoObtenido,
      mermaCantidad,
      motivoDiferencia,
      costoUnitarioResultante,
      operacionAltaId,
      estado: 'completado',
      actualizadoEn: now,
      completadoEn: now,
    };

    updates[`${this.getProduccionPath()}/${loteId}`] = sanitizeRtdbPayload(loteActualizado);
    await update(ref(this.db), sanitizeRtdbPayload(updates));

    return loteActualizado;
  }
}
