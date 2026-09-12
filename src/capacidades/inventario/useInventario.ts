/**
 * 🧠 CEREBRO - GESTIÓN DE INVENTARIO PRO
 * Hook para administrar el inventario jerárquico (Áreas, Catálogo, Transferencias)
 */

import type { Database } from 'firebase/database';
import { useMemo } from 'react';
import {
  useInventoryAreas,
  useInventoryCatalog,
  useInventorySections,
  useInventoryV2Store,
} from '../../sistema/store';
import type {
  AreaInventario,
  InsumoInventario,
} from '../../sistema/persistencia/contratos-inventario';

type PropsUseInventario = {
  db: Database;
  rutaNegocio: string;
};

export function useInventario({ db, rutaNegocio }: PropsUseInventario) {
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
   * Calcula el stock total de un item sumando todas las áreas.
   */
  const getStockTotal = (itemId: string): number => {
    return areasArray.reduce((acc, area) => acc + (area.stock?.[itemId] || 0), 0);
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
