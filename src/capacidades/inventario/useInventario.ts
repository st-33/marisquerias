/**
 * 🧠 CEREBRO - GESTIÓN DE INVENTARIO PRO
 * Hook para administrar el inventario jerárquico (Áreas, Catálogo, Costos, Equivalencias, Porcionado y Transferencias)
 */

import type { Database } from 'firebase/database';
import { useMemo } from 'react';
import {
  useInventoryAreas,
  useInventoryCatalog,
  useInventorySections,
  useInventoryV2Store,
  useStore,
} from '../../sistema/store';
import { getRtdb } from '../../sistema/firebase';
import type {
  AreaInventario,
  InsumoInventario,
  UnidadFisicaInventario,
  UsoArticuloInventario,
} from '../../sistema/persistencia/contratos-inventario';

type PropsUseInventario = {
  db?: Database;
  rutaNegocio?: string;
};

export function useInventario(props: PropsUseInventario = {}) {
  const rutaNegocioStore = useStore((s) => s.sesion.rutaNegocio) || '';
  const ds = useStore((s) => s.dataSources);
  const rutaNegocio = props.rutaNegocio || rutaNegocioStore;
  const db = useMemo(
    () => props.db || getRtdb(ds?.operacionUrl || undefined),
    [props.db, ds?.operacionUrl]
  );
  const catalog = useInventoryCatalog();
  const sections = useInventorySections();
  const areas = useInventoryAreas();

  const inventoryListenersActivos = useInventoryV2Store((s) => s.inventoryListenersActivos);
  const loading = !rutaNegocio || !inventoryListenersActivos;

  // --- Helpers de Computación ---

  const catalogArray = useMemo(
    () => Object.entries(catalog).map(([id, item]) => ({ ...item, id })),
    [catalog]
  );

  const areasArray = useMemo(
    () => Object.entries(areas).map(([id, area]) => ({ ...area, id })),
    [areas]
  );

  /**
   * Calcula el stock total de un item sumando todas las áreas y secciones.
   */
  const getStockTotal = (itemId: string): number => {
    const enAreas = areasArray.reduce((acc, area) => acc + Number(area.stock?.[itemId] || 0), 0);
    const enSecciones = Object.values(sections || {}).reduce(
      (acc, sec: any) => acc + Number(sec?.stock?.[itemId] || 0),
      0
    );
    return enAreas + enSecciones;
  };

  /**
   * Obtiene el desglose de stock de un item por cada área.
   */
  const getStockByArea = (itemId: string) => {
    return areasArray
      .filter((area) => (area.stock?.[itemId] || 0) > 0)
      .map((area) => ({
        areaId: area.id,
        areaNombre: area.nombre,
        areaIcon: area.icon,
        cantidad: area.stock![itemId],
      }));
  };

  // --- Acciones ---

  const actions = {
    crearItem: (item: Omit<InsumoInventario, 'id' | 'updatedAt'>) =>
      useInventoryV2Store.getState().crearItem(db, rutaNegocio, item),

    actualizarItem: (itemId: string, patch: Partial<Omit<InsumoInventario, 'id'>>) =>
      useInventoryV2Store.getState().actualizarItem(db, rutaNegocio, itemId, patch),

    crearArea: (area: Omit<AreaInventario, 'id' | 'updatedAt'>) =>
      useInventoryV2Store.getState().crearArea(db, rutaNegocio, area),

    crearContenedor: (
      contenedor: Omit<AreaInventario, 'id' | 'updatedAt' | 'stock'> & {
        stock?: Record<string, number>;
      }
    ) => useInventoryV2Store.getState().crearContenedor(db, rutaNegocio, contenedor),

    crearItemEnContenedor: (params: {
      containerId: string;
      item: Omit<InsumoInventario, 'id' | 'updatedAt'>;
      initialQty?: number;
    }) =>
      useInventoryV2Store.getState().crearItemEnContenedor({
        db,
        rutaNegocio,
        ...params,
      }),

    crearItemEnSeccion: (params: {
      sectionId: 'alimentos' | 'losa_cristaleria' | 'otros';
      item: Omit<InsumoInventario, 'id' | 'updatedAt'>;
      initialQty?: number;
    }) =>
      useInventoryV2Store.getState().crearItemEnSeccion({
        db,
        rutaNegocio,
        ...params,
      }),

    seedPresets: () => useInventoryV2Store.getState().seedPresets(db, rutaNegocio),

    ajustarStockDelta: (params: {
      containerId: string;
      itemId: string;
      delta: number;
      usuario?: string;
      razon?: string;
      allowNegative?: boolean;
    }) =>
      useInventoryV2Store.getState().ajustarStockDelta({
        db,
        rutaNegocio,
        ...params,
      }),

    ajustarStockDeltaSeccion: (params: {
      sectionId: 'alimentos' | 'losa_cristaleria' | 'otros';
      itemId: string;
      delta: number;
      usuario?: string;
      razon?: string;
      allowNegative?: boolean;
    }) =>
      useInventoryV2Store.getState().ajustarStockDeltaSeccion({
        db,
        rutaNegocio,
        ...params,
      }),

    registrarMerma: (params: {
      areaId: string;
      itemId: string;
      cantidad: number;
      usuario?: string;
      razon: string;
    }) =>
      useInventoryV2Store.getState().registrarMerma({
        db,
        rutaNegocio,
        ...params,
      }),

    transferirStock: (params: {
      itemId: string;
      cantidad: number;
      fromAreaId: string;
      toAreaId: string;
      usuario?: string;
      razon?: string;
    }) =>
      useInventoryV2Store.getState().transferirStock({
        db,
        rutaNegocio,
        ...params,
      }),

    porcionarInsumo: (params: {
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
    }) =>
      useInventoryV2Store.getState().porcionarInsumo({
        db,
        rutaNegocio,
        ...params,
      }),
  };

  return {
    catalog: catalogArray,
    sections,
    areas: areasArray,
    loading,
    getStockTotal,
    getStockByArea,
    actions,
  };
}
