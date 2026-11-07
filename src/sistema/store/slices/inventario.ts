import type { Database } from 'firebase/database';
import { off, onValue, ref, update } from 'firebase/database';
import type { StateCreator } from 'zustand';
import {
  RepositorioInventario,
  convertirCantidadInventario,
  type AreaInventarioV2,
  type ItemInventarioV2,
  type SeccionInventarioV2,
  type UnidadFisicaInventario,
  type UsoArticuloInventario,
} from '../../persistencia/inventario.repositorio';
import { OfflinePrintFallback } from '../../servicios/RespaldoImpresionOffline';
import { SQLiteStorageAdapter } from '../../sin_conexion/almacenamiento/AdaptadorAlmacenamientoSQLite';
import { resolver_ruta_cajon, validar_ruta_negocio } from '../../rtdb/rutas/ruta_negocio';
import { assertValidRutaNegocio, sanitizeRtdbPayload } from '../../rtdb/guards';

export interface ContratoInventoryV2 {
  catalog: Record<string, ItemInventarioV2>;
  sections: Record<string, SeccionInventarioV2>;
  areas: Record<string, AreaInventarioV2>;
  missingAssignments: Record<string, any>;
  inventoryListenersActivos: boolean;
  ultimaActualizacion: number | null;
  normalizing: boolean;
}

export type PrediccionPlatillo = {
  productoId: string;
  productoNombre: string;
  cantidadPosible: number;
  ingredienteLimitante: string;
  stockSuficiente: boolean;
};

export interface AccionesInventoryV2 {
  inicializarInventoryV2Listeners: (db: Database, rutaNegocio: string) => () => void;

  seedPresets: (db: Database, rutaNegocio: string) => Promise<void>;

  normalizarItemsSinContenedor: (
    db: Database,
    rutaNegocio: string,
    areas: Record<string, AreaInventarioV2>
  ) => Promise<void>;

  crearItem: (
    db: Database,
    rutaNegocio: string,
    item: Omit<ItemInventarioV2, 'id' | 'updatedAt'>
  ) => Promise<string>;

  actualizarItem: (
    db: Database,
    rutaNegocio: string,
    itemId: string,
    patch: Partial<Omit<ItemInventarioV2, 'id'>>
  ) => Promise<void>;

  crearArea: (
    db: Database,
    rutaNegocio: string,
    area: Omit<AreaInventarioV2, 'id' | 'updatedAt'>
  ) => Promise<string>;

  crearContenedor: (
    db: Database,
    rutaNegocio: string,
    contenedor: Omit<AreaInventarioV2, 'id' | 'updatedAt' | 'stock'> & {
      stock?: Record<string, number>;
    }
  ) => Promise<string>;

  crearItemEnContenedor: (params: {
    db: Database;
    rutaNegocio: string;
    containerId: string;
    item: Omit<ItemInventarioV2, 'id' | 'updatedAt'>;
    initialQty?: number;
  }) => Promise<string>;

  crearItemEnSeccion: (params: {
    db: Database;
    rutaNegocio: string;
    sectionId: 'alimentos' | 'losa_cristaleria' | 'otros';
    item: Omit<ItemInventarioV2, 'id' | 'updatedAt'>;
    initialQty?: number;
  }) => Promise<string>;

  ajustarStockDelta: (params: {
    db: Database;
    rutaNegocio: string;
    containerId: string;
    itemId: string;
    delta: number;
    usuario?: string;
    razon?: string;
    allowNegative?: boolean;
  }) => Promise<void>;

  ajustarStockDeltaSeccion: (params: {
    db: Database;
    rutaNegocio: string;
    sectionId: 'alimentos' | 'losa_cristaleria' | 'otros';
    itemId: string;
    delta: number;
    usuario?: string;
    razon?: string;
    allowNegative?: boolean;
  }) => Promise<void>;

  registrarMerma: (params: {
    db: Database;
    rutaNegocio: string;
    areaId: string;
    itemId: string;
    cantidad: number;
    usuario?: string;
    razon: string;
  }) => Promise<void>;

  transferirStock: (params: {
    db: Database;
    rutaNegocio: string;
    itemId: string;
    cantidad: number;
    fromAreaId: string;
    toAreaId: string;
    usuario?: string;
    razon?: string;
  }) => Promise<void>;

  porcionarInsumo: (params: {
    db: Database;
    rutaNegocio: string;
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
  }) => Promise<{ itemDestinoId: string; costoUnitarioDestino: number }>;

  // === SELECTORES DERIVADOS ===
  getPredicciones: (productos: Record<string, any>) => PrediccionPlatillo[];
}

export const ESTADO_INICIAL_INVENTORY_V2: ContratoInventoryV2 = {
  catalog: {},
  sections: {},
  areas: {},
  missingAssignments: {},
  inventoryListenersActivos: false,
  ultimaActualizacion: null,
  normalizing: false,
};

export type InventoryV2Slice = ContratoInventoryV2 & AccionesInventoryV2;

function sonColeccionesEquivalentes(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

const normalizadosPorSesion = new Set<string>();

export const createInventoryV2Slice: StateCreator<InventoryV2Slice, [], [], InventoryV2Slice> = (
  set,
  getState
) => ({
  ...ESTADO_INICIAL_INVENTORY_V2,

  inicializarInventoryV2Listeners: (db: Database, rutaNegocio: string) => {
    if (!validar_ruta_negocio(rutaNegocio, { permitirRaiz: true })) {
      return () => {};
    }

    if (getState().inventoryListenersActivos) {
      return () => {};
    }

    const baseInv = resolver_ruta_cajon(rutaNegocio, 'inventario');
    const cleanupFunctions: (() => void)[] = [];

    const catalogRef = ref(db, `${baseInv}/catalog`);
    const catalogCb = onValue(catalogRef, (snap) => {
      const raw = snap.val() || {};
      const next: Record<string, ItemInventarioV2> = {};
      Object.entries(raw).forEach(([id, v]) => {
        if (v && typeof v === 'object') {
          next[id] = { id, uso: 'ambos', controlarExistencias: true, ...(v as any) };
        }
      });
      if (!sonColeccionesEquivalentes(getState().catalog, next)) {
        set({ catalog: next, ultimaActualizacion: Date.now() });
      }
    });
    cleanupFunctions.push(() => off(catalogRef, 'value', catalogCb as any));

    const sectionsRef = ref(db, `${baseInv}/sections`);
    const sectionsCb = onValue(sectionsRef, (snap) => {
      const raw = snap.val() || {};
      const next: Record<string, SeccionInventarioV2> = {};
      Object.entries(raw).forEach(([id, v]) => {
        if (v && typeof v === 'object') {
          next[id] = { id, ...(v as any) };
        }
      });
      if (!sonColeccionesEquivalentes(getState().sections, next)) {
        set({ sections: next, ultimaActualizacion: Date.now() });
      }
    });
    cleanupFunctions.push(() => off(sectionsRef, 'value', sectionsCb as any));

    const areasRef = ref(db, `${baseInv}/areas`);
    const areasCb = onValue(areasRef, (snap) => {
      const raw = snap.val() || {};
      const next: Record<string, AreaInventarioV2> = {};
      Object.entries(raw).forEach(([id, v]) => {
        if (v && typeof v === 'object') {
          next[id] = { id, ...(v as any) };
        }
      });
      if (!sonColeccionesEquivalentes(getState().areas, next)) {
        set({ areas: next, ultimaActualizacion: Date.now() });
      }

      if (!getState().normalizing) {
        void getState().normalizarItemsSinContenedor(db, rutaNegocio, next);
      }
    });
    cleanupFunctions.push(() => off(areasRef, 'value', areasCb as any));

    const missingRef = ref(db, `${baseInv}/missing_area_assignments`);
    const missingCb = onValue(missingRef, (snap) => {
      const next = snap.val() || {};
      if (!sonColeccionesEquivalentes(getState().missingAssignments, next)) {
        set({ missingAssignments: next, ultimaActualizacion: Date.now() });
      }
    });
    cleanupFunctions.push(() => off(missingRef, 'value', missingCb as any));

    set({ inventoryListenersActivos: true });

    let cleaned = false;
    return () => {
      if (cleaned) return;
      cleaned = true;
      cleanupFunctions.forEach((fn) => fn());
      set({ ...ESTADO_INICIAL_INVENTORY_V2 });
    };
  },

  async crearItem(db, rutaNegocio, item) {
    assertValidRutaNegocio(rutaNegocio);
    const repo = new RepositorioInventario(db, rutaNegocio);
    return repo.crearItem(item);
  },

  async actualizarItem(db, rutaNegocio, itemId, patch) {
    assertValidRutaNegocio(rutaNegocio);
    const repo = new RepositorioInventario(db, rutaNegocio);
    await repo.actualizarItem(itemId, patch);
  },

  async crearArea(db, rutaNegocio, area) {
    assertValidRutaNegocio(rutaNegocio);
    const repo = new RepositorioInventario(db, rutaNegocio);
    return repo.crearArea(area);
  },

  async crearContenedor(db, rutaNegocio, contenedor) {
    assertValidRutaNegocio(rutaNegocio);
    const baseInv = resolver_ruta_cajon(rutaNegocio, 'inventario');
    const { push, ref: rtdbRef, set: rtdbSet } = await import('firebase/database');
    const r = rtdbRef(db, `${baseInv}/areas`);
    const newRef = push(r);
    await rtdbSet(
      newRef,
      sanitizeRtdbPayload({ ...contenedor, stock: contenedor.stock || {}, updatedAt: Date.now() })
    );
    return newRef.key as string;
  },

  async crearItemEnContenedor(params) {
    const { db, rutaNegocio, containerId, item, initialQty = 0 } = params;
    assertValidRutaNegocio(rutaNegocio);
    const baseInv = resolver_ruta_cajon(rutaNegocio, 'inventario');
    const { push, ref: rtdbRef } = await import('firebase/database');

    const catalogRef = rtdbRef(db, `${baseInv}/catalog`);
    const newRef = push(catalogRef);
    const itemId = newRef.key as string;
    const now = Date.now();

    const updates: Record<string, any> = {};
    updates[`${baseInv}/catalog/${itemId}`] = sanitizeRtdbPayload({
      ...item,
      uso: item.uso || 'ambos',
      controlarExistencias: item.controlarExistencias ?? true,
      updatedAt: now,
    });
    if (item.controlarExistencias !== false) {
      updates[`${baseInv}/areas/${containerId}/stock/${itemId}`] = Number(initialQty || 0);
      updates[`${baseInv}/areas/${containerId}/updatedAt`] = now;
    }

    await update(rtdbRef(db), sanitizeRtdbPayload(updates));
    return itemId;
  },

  async crearItemEnSeccion(params) {
    const { db, rutaNegocio, sectionId, item, initialQty = 0 } = params;
    assertValidRutaNegocio(rutaNegocio);
    const baseInv = resolver_ruta_cajon(rutaNegocio, 'inventario');
    const { push, ref: rtdbRef } = await import('firebase/database');

    const catalogRef = rtdbRef(db, `${baseInv}/catalog`);
    const newRef = push(catalogRef);
    const itemId = newRef.key as string;
    const now = Date.now();

    const updates: Record<string, any> = {};
    updates[`${baseInv}/catalog/${itemId}`] = sanitizeRtdbPayload({
      ...item,
      uso: item.uso || 'ambos',
      controlarExistencias: item.controlarExistencias ?? true,
      updatedAt: now,
    });
    if (item.controlarExistencias !== false) {
      updates[`${baseInv}/sections/${sectionId}/stock/${itemId}`] = Number(initialQty || 0);
      updates[`${baseInv}/sections/${sectionId}/updatedAt`] = now;
    }

    await update(rtdbRef(db), sanitizeRtdbPayload(updates));
    return itemId;
  },

  async seedPresets(db, rutaNegocio) {
    assertValidRutaNegocio(rutaNegocio);
    const baseInv = resolver_ruta_cajon(rutaNegocio, 'inventario');
    const { get, ref: rtdbRef } = await import('firebase/database');

    const [catSnap, areasSnap, sectionsSnap] = await Promise.all([
      get(rtdbRef(db, `${baseInv}/catalog`)),
      get(rtdbRef(db, `${baseInv}/areas`)),
      get(rtdbRef(db, `${baseInv}/sections`)),
    ]);

    const hasCatalog = catSnap.exists() && Object.keys(catSnap.val() || {}).length > 0;
    const hasAreas = areasSnap.exists() && Object.keys(areasSnap.val() || {}).length > 0;
    const hasSections = sectionsSnap.exists() && Object.keys(sectionsSnap.val() || {}).length > 0;

    if (hasCatalog || hasAreas || hasSections) {
      return;
    }

    const now = Date.now();
    const updates: Record<string, any> = {};
    const niche = (getState() as any).sesion?.niche;
    const hubId = niche === 'venta_crudo' ? 'venta_crudo' : 'restaurante';

    updates[`${baseInv}/sections/alimentos`] = {
      nombre: 'Alimentos / Consumibles',
      icon: '🍲',
      stock: {},
      updatedAt: now,
    };
    updates[`${baseInv}/sections/losa_cristaleria`] = {
      nombre: 'Losa / Cristalería',
      icon: '🍽️',
      stock: {},
      updatedAt: now,
    };
    updates[`${baseInv}/sections/otros`] = {
      nombre: 'Otros',
      icon: '📦',
      stock: {},
      updatedAt: now,
    };

    const itemIds = {
      alimentos: {
        camaron: 'item_alim_camaron',
        pescado: 'item_alim_pescado_entero',
        filete: 'item_alim_filete_pescado',
        pulpo: 'item_alim_pulpo_cocido',
        calamar: 'item_alim_calamar_fresco',
        ostion: 'item_alim_ostion',
        jaiba_mixto: 'item_alim_marisco_mixto',
        aguacate: 'item_alim_aguacate',
        limon: 'item_alim_limon',
        verdura_coctel: 'item_alim_verdura_coctel',
        tostadas_empanadas: 'item_alim_tostadas_masa',
        insumos_flan: 'item_alim_base_flan',
        duraznos: 'item_alim_duraznos_almibar',
        flan_terminado: 'item_term_plat_flan_napolitano',
        coca_cola: 'item_alim_refresco',
        cerveza_xx: 'item_alim_cerveza',
        cerveza_victoria: 'item_alim_cerveza_victoria',
        cerveza_sol: 'item_alim_cerveza_sol',
        boing_mango: 'item_alim_boing_mango',
        boing_guayaba: 'item_alim_boing_guayaba',
        boing_tamarindo: 'item_alim_boing_tamarindo',
        boing_uva: 'item_alim_boing_uva',
      },
      losa_cristaleria: {
        plato: 'item_losa_plato',
        vaso: 'item_losa_vaso',
        copa: 'item_losa_copa',
        cubierto: 'item_losa_cubierto',
        charola: 'item_losa_charola',
        jarra: 'item_losa_jarra',
      },
      otros: {
        bolsas: 'item_otros_bolsas',
        servilletas: 'item_otros_servilletas',
        jabon: 'item_otros_jabon',
        cloro: 'item_otros_cloro',
        guantes: 'item_otros_guantes',
        papel: 'item_otros_papel',
      },
    };

    updates[`${baseInv}/catalog/${itemIds.alimentos.camaron}`] = {
      nombre: 'Camarón Cristal',
      sectionId: 'alimentos',
      unidad: 'kg',
      uso: 'ambos',
      controlarExistencias: true,
      costo: 165,
      minStock: 5,
      equivalencias: { piezasPorKg: 35, esAproximado: true },
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.pescado}`] = {
      nombre: 'Mojarra Entera Fresca',
      sectionId: 'alimentos',
      unidad: 'kg',
      uso: 'ambos',
      controlarExistencias: true,
      costo: 95,
      minStock: 6,
      equivalencias: { piezasPorKg: 2.5, pesoPromedioPiezaKg: 0.4, esAproximado: true },
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.filete}`] = {
      nombre: 'Filete de Pescado Blanco',
      sectionId: 'alimentos',
      unidad: 'kg',
      uso: 'ambos',
      controlarExistencias: true,
      costo: 135,
      minStock: 5,
      equivalencias: { piezasPorKg: 5, pesoPromedioPiezaKg: 0.2, esAproximado: true },
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.pulpo}`] = {
      nombre: 'Pulpo Cocido',
      sectionId: 'alimentos',
      unidad: 'kg',
      uso: 'ambos',
      controlarExistencias: true,
      costo: 210,
      minStock: 3,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.calamar}`] = {
      nombre: 'Calamar Fresco',
      sectionId: 'alimentos',
      unidad: 'kg',
      uso: 'ambos',
      controlarExistencias: true,
      costo: 140,
      minStock: 3,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.ostion}`] = {
      nombre: 'Ostión Fresco',
      sectionId: 'alimentos',
      unidad: 'kg',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 120,
      minStock: 2,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.jaiba_mixto}`] = {
      nombre: 'Surtido de Mariscos (Jaiba / Almeja / Mejillón)',
      sectionId: 'alimentos',
      unidad: 'kg',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 150,
      minStock: 3,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.aguacate}`] = {
      nombre: 'Aguacate Hass',
      sectionId: 'alimentos',
      unidad: 'kg',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 65,
      minStock: 3,
      equivalencias: { piezasPorKg: 4, pesoPromedioPiezaKg: 0.25, esAproximado: true },
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.limon}`] = {
      nombre: 'Limón Verde',
      sectionId: 'alimentos',
      unidad: 'kg',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 28,
      minStock: 4,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.verdura_coctel}`] = {
      nombre: 'Verdura Fresca (Jitomate, Cebolla, Pepino, Cilantro)',
      sectionId: 'alimentos',
      unidad: 'kg',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 26,
      minStock: 5,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.tostadas_empanadas}`] = {
      nombre: 'Tostadas y Masa para Empanadas',
      sectionId: 'alimentos',
      unidad: 'kg',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 32,
      minStock: 3,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.insumos_flan}`] = {
      nombre: 'Base Láctea y Huevo para Flan (Por Molde)',
      sectionId: 'alimentos',
      unidad: 'pza',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 95,
      minStock: 2,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.duraznos}`] = {
      nombre: 'Duraznos en Almíbar y Crema',
      sectionId: 'alimentos',
      unidad: 'kg',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 75,
      minStock: 2,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.flan_terminado}`] = {
      nombre: 'Flan Napolitano Casero (Rebanada)',
      sectionId: 'alimentos',
      unidad: 'pza',
      uso: 'producto_terminado',
      controlarExistencias: true,
      costo: 14.5,
      minStock: 4,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.coca_cola}`] = {
      nombre: 'Coca-Cola',
      sectionId: 'alimentos',
      unidad: 'pza',
      uso: 'venta_directa',
      imagenId: 'coca_cola',
      controlarExistencias: true,
      costo: 16,
      minStock: 12,
      equivalencias: { piezasPorCaja: 24, esAproximado: false },
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.cerveza_xx}`] = {
      nombre: 'Cerveza XX Lager',
      sectionId: 'alimentos',
      unidad: 'pza',
      uso: 'venta_directa',
      imagenId: 'xx_lager',
      controlarExistencias: true,
      costo: 21,
      minStock: 12,
      equivalencias: { piezasPorCaja: 24, esAproximado: false },
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.cerveza_victoria}`] = {
      nombre: 'Cerveza Victoria',
      sectionId: 'alimentos',
      unidad: 'pza',
      uso: 'venta_directa',
      imagenId: 'victoria',
      controlarExistencias: true,
      costo: 21,
      minStock: 12,
      equivalencias: { piezasPorCaja: 24, esAproximado: false },
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.cerveza_sol}`] = {
      nombre: 'Cerveza Sol',
      sectionId: 'alimentos',
      unidad: 'pza',
      uso: 'venta_directa',
      imagenId: 'sol',
      controlarExistencias: true,
      costo: 20,
      minStock: 12,
      equivalencias: { piezasPorCaja: 24, esAproximado: false },
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.boing_mango}`] = {
      nombre: 'Boing de Mango',
      sectionId: 'alimentos',
      unidad: 'pza',
      uso: 'venta_directa',
      imagenId: 'boing_mango',
      controlarExistencias: true,
      costo: 15,
      minStock: 12,
      equivalencias: { piezasPorCaja: 24, esAproximado: false },
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.boing_guayaba}`] = {
      nombre: 'Boing de Guayaba',
      sectionId: 'alimentos',
      unidad: 'pza',
      uso: 'venta_directa',
      imagenId: 'boing_guayava',
      controlarExistencias: true,
      costo: 15,
      minStock: 12,
      equivalencias: { piezasPorCaja: 24, esAproximado: false },
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.boing_tamarindo}`] = {
      nombre: 'Boing de Tamarindo',
      sectionId: 'alimentos',
      unidad: 'pza',
      uso: 'venta_directa',
      imagenId: 'boing_tamarindo',
      controlarExistencias: true,
      costo: 15,
      minStock: 12,
      equivalencias: { piezasPorCaja: 24, esAproximado: false },
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.alimentos.boing_uva}`] = {
      nombre: 'Boing de Uva',
      sectionId: 'alimentos',
      unidad: 'pza',
      uso: 'venta_directa',
      imagenId: 'boing_uva',
      controlarExistencias: true,
      costo: 15,
      minStock: 12,
      equivalencias: { piezasPorCaja: 24, esAproximado: false },
      updatedAt: now,
    };

    updates[`${baseInv}/catalog/${itemIds.losa_cristaleria.plato}`] = {
      nombre: 'Plato Trinche Marisquero',
      sectionId: 'losa_cristaleria',
      unidad: 'pza',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 45,
      minStock: 24,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.losa_cristaleria.vaso}`] = {
      nombre: 'Vaso Jaibolero / Chabela',
      sectionId: 'losa_cristaleria',
      unidad: 'pza',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 32,
      minStock: 24,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.losa_cristaleria.copa}`] = {
      nombre: 'Copa Coctelera (Chica / Mediana / Grande)',
      sectionId: 'losa_cristaleria',
      unidad: 'pza',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 55,
      minStock: 18,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.losa_cristaleria.cubierto}`] = {
      nombre: 'Juego de Cubiertos',
      sectionId: 'losa_cristaleria',
      unidad: 'pza',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 25,
      minStock: 30,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.losa_cristaleria.charola}`] = {
      nombre: 'Charola de Servicio',
      sectionId: 'losa_cristaleria',
      unidad: 'pza',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 85,
      minStock: 6,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.losa_cristaleria.jarra}`] = {
      nombre: 'Jarra de 2 Litros',
      sectionId: 'losa_cristaleria',
      unidad: 'pza',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 70,
      minStock: 6,
      updatedAt: now,
    };

    updates[`${baseInv}/catalog/${itemIds.otros.bolsas}`] = {
      nombre: 'Bolsas para Llevar',
      sectionId: 'otros',
      unidad: 'pza',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 1.5,
      minStock: 50,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.otros.servilletas}`] = {
      nombre: 'Paquete de Servilletas',
      sectionId: 'otros',
      unidad: 'caja',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 38,
      minStock: 4,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.otros.jabon}`] = {
      nombre: 'Detergente Líquido Cocina',
      sectionId: 'otros',
      unidad: 'l',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 35,
      minStock: 2,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.otros.cloro}`] = {
      nombre: 'Cloro Desinfectante',
      sectionId: 'otros',
      unidad: 'l',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 22,
      minStock: 2,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.otros.guantes}`] = {
      nombre: 'Guantes de Nitrilo Cocina',
      sectionId: 'otros',
      unidad: 'caja',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 145,
      minStock: 1,
      updatedAt: now,
    };
    updates[`${baseInv}/catalog/${itemIds.otros.papel}`] = {
      nombre: 'Rollo de Papel Aluminio / Emplaye',
      sectionId: 'otros',
      unidad: 'pza',
      uso: 'insumo',
      controlarExistencias: true,
      costo: 120,
      minStock: 2,
      updatedAt: now,
    };

    const areaIds = {
      alimentos: {
        cocina: 'area_alim_cocina',
        barra: 'area_alim_barra',
        almacen: 'area_alim_almacen',
        vc: 'area_alim_venta_crudo',
      },
      losa_cristaleria: {
        servicio: 'area_losa_servicio',
      },
      otros: {
        general: 'area_otros_general',
      },
    };

    updates[`${baseInv}/areas/${areaIds.alimentos.cocina}`] = {
      hubId,
      sectionId: 'alimentos',
      nombre: 'Cocina',
      icon: '🍳',
      tipo: 'cocina',
      updatedAt: now,
    };
    updates[`${baseInv}/areas/${areaIds.alimentos.barra}`] = {
      hubId,
      sectionId: 'alimentos',
      nombre: 'Barra y Bebidas',
      icon: '🍹',
      tipo: 'otro',
      updatedAt: now,
    };
    updates[`${baseInv}/areas/${areaIds.alimentos.almacen}`] = {
      hubId,
      sectionId: 'alimentos',
      nombre: 'Almacén General',
      icon: '📦',
      tipo: 'almacen',
      updatedAt: now,
    };
    updates[`${baseInv}/areas/${areaIds.alimentos.vc}`] = {
      hubId: 'venta_crudo',
      sectionId: 'alimentos',
      nombre: 'Mostrador',
      icon: '🦐',
      tipo: 'mostrador',
      updatedAt: now,
    };

    updates[`${baseInv}/areas/${areaIds.losa_cristaleria.servicio}`] = {
      hubId,
      sectionId: 'losa_cristaleria',
      nombre: 'Servicio de Salón',
      icon: '🍽️',
      tipo: 'otro',
      updatedAt: now,
    };

    updates[`${baseInv}/areas/${areaIds.otros.general}`] = {
      hubId,
      sectionId: 'otros',
      nombre: 'Bodega de Insumos',
      icon: '🧰',
      tipo: 'otro',
      updatedAt: now,
    };

    const defaultContainers = [
      {
        areaId: areaIds.alimentos.cocina,
        hubId,
        sectionId: 'alimentos' as const,
        nombre: 'Refri de Cocina',
        icon: '🧊',
        tipo: 'refri' as const,
        stock: {
          [itemIds.alimentos.camaron]: 24,
          [itemIds.alimentos.pescado]: 18,
          [itemIds.alimentos.filete]: 16,
          [itemIds.alimentos.pulpo]: 8,
          [itemIds.alimentos.calamar]: 7,
          [itemIds.alimentos.ostion]: 6,
          [itemIds.alimentos.jaiba_mixto]: 10,
          [itemIds.alimentos.aguacate]: 8,
          [itemIds.alimentos.limon]: 12,
          [itemIds.alimentos.verdura_coctel]: 15,
          [itemIds.alimentos.tostadas_empanadas]: 8,
          [itemIds.alimentos.flan_terminado]: 16,
        },
      },
      {
        areaId: areaIds.alimentos.barra,
        hubId,
        sectionId: 'alimentos' as const,
        nombre: 'Enfriador de Bebidas',
        icon: '🧊',
        tipo: 'refri' as const,
        stock: {
          [itemIds.alimentos.coca_cola]: 36,
          [itemIds.alimentos.cerveza_xx]: 36,
          [itemIds.alimentos.cerveza_victoria]: 36,
          [itemIds.alimentos.cerveza_sol]: 24,
          [itemIds.alimentos.boing_mango]: 24,
          [itemIds.alimentos.boing_guayaba]: 24,
          [itemIds.alimentos.boing_tamarindo]: 18,
          [itemIds.alimentos.boing_uva]: 18,
        },
      },
      {
        areaId: areaIds.alimentos.almacen,
        hubId,
        sectionId: 'alimentos' as const,
        nombre: 'Alacena y Secos',
        icon: '📦',
        tipo: 'almacen' as const,
        stock: {
          [itemIds.alimentos.insumos_flan]: 6,
          [itemIds.alimentos.duraznos]: 6,
        },
      },
      {
        areaId: areaIds.alimentos.vc,
        hubId: 'venta_crudo' as const,
        sectionId: 'alimentos' as const,
        nombre: 'Mostrador Principal',
        icon: '🧊',
        tipo: 'mostrador' as const,
        stock: {
          [itemIds.alimentos.camaron]: 12,
          [itemIds.alimentos.pescado]: 10,
          [itemIds.alimentos.filete]: 8,
          [itemIds.alimentos.pulpo]: 5,
          [itemIds.alimentos.calamar]: 5,
        },
      },
      {
        areaId: areaIds.losa_cristaleria.servicio,
        hubId,
        sectionId: 'losa_cristaleria' as const,
        nombre: 'Estación de Loza',
        icon: '🍽️',
        tipo: 'almacen' as const,
        stock: {
          [itemIds.losa_cristaleria.plato]: 60,
          [itemIds.losa_cristaleria.vaso]: 60,
          [itemIds.losa_cristaleria.copa]: 36,
          [itemIds.losa_cristaleria.cubierto]: 80,
          [itemIds.losa_cristaleria.charola]: 10,
          [itemIds.losa_cristaleria.jarra]: 12,
        },
      },
      {
        areaId: areaIds.otros.general,
        hubId,
        sectionId: 'otros' as const,
        nombre: 'Estante General',
        icon: '📦',
        tipo: 'almacen' as const,
        stock: {
          [itemIds.otros.bolsas]: 200,
          [itemIds.otros.servilletas]: 12,
          [itemIds.otros.cloro]: 6,
          [itemIds.otros.jabon]: 6,
          [itemIds.otros.guantes]: 3,
          [itemIds.otros.papel]: 4,
        },
      },
    ];

    for (const c of defaultContainers) {
      const containerId = `${c.areaId}__default`;
      updates[`${baseInv}/areas/${containerId}`] = {
        hubId: c.hubId,
        sectionId: c.sectionId,
        nombre: c.nombre,
        icon: c.icon,
        tipo: c.tipo,
        parentId: c.areaId,
        stock: c.stock,
        updatedAt: now,
      };
    }

    await update(rtdbRef(db), sanitizeRtdbPayload(updates));
  },

  async normalizarItemsSinContenedor(db, rutaNegocio, areas) {
    assertValidRutaNegocio(rutaNegocio);
    if (getState().normalizing) return;

    const baseInv = resolver_ruta_cajon(rutaNegocio, 'inventario');
    const niche = (getState() as any).sesion?.niche;
    const hubId = niche === 'venta_crudo' ? 'venta_crudo' : 'restaurante';

    const areaEntries = Object.entries(areas);
    const catalog = getState().catalog;

    const inferSectionByItemId: Record<string, 'alimentos' | 'losa_cristaleria' | 'otros'> = {};
    for (const a of Object.values(areas) as any[]) {
      const sectionId = (a?.sectionId as any) || 'otros';
      const stock = (a?.stock || {}) as Record<string, number>;
      for (const itemId of Object.keys(stock)) {
        if (!inferSectionByItemId[itemId]) {
          inferSectionByItemId[itemId] = sectionId;
        }
      }
    }

    const updates: Record<string, any> = {};
    const now = Date.now();

    for (const [id, a] of areaEntries) {
      const sectionId = (a as any)?.sectionId;
      const lockKey = `area:${rutaNegocio}:${id}`;
      if (!sectionId && !normalizadosPorSesion.has(lockKey)) {
        normalizadosPorSesion.add(lockKey);
        updates[`${baseInv}/areas/${id}/sectionId`] = 'otros';
        updates[`${baseInv}/areas/${id}/updatedAt`] = now;
      }
    }

    for (const [id, it] of Object.entries(catalog)) {
      const sectionId = (it as any)?.sectionId;
      const lockKey = `item:${rutaNegocio}:${id}`;
      if (!sectionId && !normalizadosPorSesion.has(lockKey)) {
        normalizadosPorSesion.add(lockKey);
        const inferred = inferSectionByItemId[id] || 'otros';
        updates[`${baseInv}/catalog/${id}/sectionId`] = inferred;
        updates[`${baseInv}/catalog/${id}/updatedAt`] = now;
        updates[`${baseInv}/missing_area_assignments/${id}`] = {
          hubId,
          itemId: id,
          fallbackAreaId: '__auto_section__',
          reason: 'auto_assign_section',
          actor: 'system',
          nombre: (it as any)?.nombre || id,
          lastTs: now,
          count: 1,
        };
      }
    }

    if (Object.keys(updates).length === 0) return;

    set({ normalizing: true });
    try {
      const { ref: rtdbRef } = await import('firebase/database');
      await update(rtdbRef(db), sanitizeRtdbPayload(updates));
    } finally {
      set({ normalizing: false });
    }
  },

  async ajustarStockDelta(params) {
    const { db, rutaNegocio, containerId, itemId, delta, usuario, razon, allowNegative } = params;
    assertValidRutaNegocio(rutaNegocio);
    const baseInv = resolver_ruta_cajon(rutaNegocio, 'inventario');
    const { get, push, ref: rtdbRef } = await import('firebase/database');

    const { isOnline } = OfflinePrintFallback.getStatus();
    const movementId = `inv_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)
      .toUpperCase()}`;

    if (!isOnline) {
      await SQLiteStorageAdapter.enqueueInventoryMovement({
        id: movementId,
        rutaNegocio,
        containerId,
        itemId,
        delta,
        usuario,
        razon,
        allowNegative: !!allowNegative,
      });

      const areas = getState().areas;
      const area = areas[containerId];
      if (area) {
        const currentStock = Number(area.stock?.[itemId] || 0);
        const nextStock = allowNegative ? currentStock + delta : Math.max(0, currentStock + delta);

        const nextAreas = {
          ...areas,
          [containerId]: {
            ...area,
            stock: {
              ...(area.stock || {}),
              [itemId]: nextStock,
            },
            updatedAt: Date.now(),
          },
        };
        set({ areas: nextAreas });
      }
      return;
    }

    const stockRef = rtdbRef(db, `${baseInv}/areas/${containerId}/stock/${itemId}`);
    const snap = await get(stockRef);
    const current = Number(snap.val() || 0);
    const next = allowNegative ? current + delta : Math.max(0, current + delta);

    const movRef = push(rtdbRef(db, `${baseInv}/movements`));

    const updates: Record<string, any> = {};
    updates[`${baseInv}/areas/${containerId}/stock/${itemId}`] = next;
    updates[`${baseInv}/movements/${movRef.key}`] = sanitizeRtdbPayload({
      tipo: delta >= 0 ? 'entrada' : 'salida',
      itemId,
      cantidad: Math.abs(delta),
      areaId: containerId,
      usuario,
      razon: razon || 'Ajuste manual',
      timestamp: Date.now(),
      permiteNegativo: allowNegative,
    });

    await update(rtdbRef(db), sanitizeRtdbPayload(updates));
  },

  async ajustarStockDeltaSeccion(params) {
    const { db, rutaNegocio, sectionId, itemId, delta, usuario, razon, allowNegative } = params;
    assertValidRutaNegocio(rutaNegocio);
    const baseInv = resolver_ruta_cajon(rutaNegocio, 'inventario');
    const { get, push, ref: rtdbRef } = await import('firebase/database');

    const { isOnline } = OfflinePrintFallback.getStatus();
    const movementId = `inv_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 9)
      .toUpperCase()}`;

    if (!isOnline) {
      await SQLiteStorageAdapter.enqueueInventoryMovement({
        id: movementId,
        rutaNegocio,
        containerId: `section:${sectionId}`,
        itemId,
        delta,
        usuario,
        razon,
        allowNegative: !!allowNegative,
      });

      const sections = getState().sections;
      const sec = sections[sectionId];
      if (sec) {
        const currentStock = Number(sec.stock?.[itemId] || 0);
        const nextStock = allowNegative ? currentStock + delta : Math.max(0, currentStock + delta);

        const nextSections = {
          ...sections,
          [sectionId]: {
            ...sec,
            stock: {
              ...(sec.stock || {}),
              [itemId]: nextStock,
            },
            updatedAt: Date.now(),
          },
        };
        set({ sections: nextSections });
      }
      return;
    }

    const stockRef = rtdbRef(db, `${baseInv}/sections/${sectionId}/stock/${itemId}`);
    const snap = await get(stockRef);
    const current = Number(snap.val() || 0);
    const next = allowNegative ? current + delta : Math.max(0, current + delta);

    const movRef = push(rtdbRef(db, `${baseInv}/movements`));

    const updates: Record<string, any> = {};
    updates[`${baseInv}/sections/${sectionId}/stock/${itemId}`] = next;
    updates[`${baseInv}/movements/${movRef.key}`] = sanitizeRtdbPayload({
      tipo: delta >= 0 ? 'entrada' : 'salida',
      itemId,
      cantidad: Math.abs(delta),
      areaId: `section:${sectionId}`,
      usuario,
      razon: razon || 'Ajuste manual',
      timestamp: Date.now(),
      permiteNegativo: allowNegative,
    });

    await update(rtdbRef(db), sanitizeRtdbPayload(updates));
  },

  async registrarMerma(params) {
    const { db, rutaNegocio, areaId, itemId, cantidad, usuario, razon } = params;
    const repo = new RepositorioInventario(db, rutaNegocio);
    await repo.registrarMerma({ areaId, itemId, cantidad, usuario, razon });
  },

  async transferirStock(params) {
    const { db, rutaNegocio, itemId, cantidad, fromAreaId, toAreaId, usuario, razon } = params;
    const repo = new RepositorioInventario(db, rutaNegocio);
    await repo.transferir({ itemId, cantidad, fromAreaId, toAreaId, usuario, razon });
  },

  async porcionarInsumo(params) {
    const { db, rutaNegocio, ...rest } = params;
    const repo = new RepositorioInventario(db, rutaNegocio);
    return repo.porcionarInsumo(rest);
  },

  getPredicciones: (productos) => {
    const { catalog, areas, sections } = getState();
    const prodsConReceta = Object.values(productos).filter(
      (p: any) => p.receta?.ingredientes && Object.keys(p.receta.ingredientes).length > 0
    );

    return prodsConReceta.map((producto: any) => {
      let cantidadPosible = Infinity;
      let ingredienteLimitante = '';

      const ingredientes = producto.receta?.ingredientes || {};

      for (const [itemId, valorIngrediente] of Object.entries(ingredientes)) {
        const itemInventario = catalog[itemId];
        const cantidadRequerida =
          typeof valorIngrediente === 'number'
            ? Number(valorIngrediente)
            : Number((valorIngrediente as any)?.cantidad || 0);
        const unidadReceta =
          typeof valorIngrediente === 'object' && valorIngrediente !== null
            ? String((valorIngrediente as any).unidad || itemInventario?.unidad || 'pza')
            : itemInventario?.unidad || 'pza';

        if (!itemInventario) {
          cantidadPosible = 0;
          ingredienteLimitante = 'Ingrediente desconocido';
          break;
        }

        if (itemInventario.controlarExistencias === false) {
          continue;
        }

        let stockConsolidado = 0;
        Object.values(areas).forEach((area: any) => {
          if (area.stock && area.stock[itemId]) {
            stockConsolidado += Number(area.stock[itemId] || 0);
          }
        });
        Object.values(sections).forEach((sec: any) => {
          if (sec.stock && sec.stock[itemId]) {
            stockConsolidado += Number(sec.stock[itemId] || 0);
          }
        });

        const conv = convertirCantidadInventario({
          cantidad: cantidadRequerida,
          unidadOrigen: unidadReceta,
          unidadDestino: itemInventario.unidad,
          equivalencias: itemInventario.equivalencias,
        });
        const requeridoEnUnidadBase = conv.posible ? conv.cantidadConvertida : cantidadRequerida;

        if (stockConsolidado <= 0 || requeridoEnUnidadBase <= 0) {
          cantidadPosible = 0;
          ingredienteLimitante = itemInventario.nombre;
          break;
        }

        const posibleConEsteIngrediente = Math.floor(stockConsolidado / requeridoEnUnidadBase);

        if (posibleConEsteIngrediente < cantidadPosible) {
          cantidadPosible = posibleConEsteIngrediente;
          ingredienteLimitante = itemInventario.nombre;
        }
      }

      return {
        productoId: producto.id,
        productoNombre: producto.nombre,
        cantidadPosible: cantidadPosible === Infinity ? 999 : cantidadPosible,
        ingredienteLimitante,
        stockSuficiente: cantidadPosible >= 5,
      };
    });
  },
});
