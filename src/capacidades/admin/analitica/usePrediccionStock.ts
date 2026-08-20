/**
 * 🧠 HOOK: usePrediccionStock
 * Calcula stock automáticamente según recetas del menú.
 * Predice cuántos platillos se pueden hacer con el inventario actual.
 * ARQUITECTURA: Usa Store Centralizado, no Firebase directo.
 */

import { useMemo } from 'react';
import { useInventoryV2Store, useOperacionStore } from '../../../plataforma/core/store';
import type { PrediccionPlatillo } from '../../../plataforma/core/store/slices/inventoryV2';

export type { PrediccionPlatillo };

export type PrediccionStock = {
  predicciones: PrediccionPlatillo[];
  loading: boolean;
};

export function usePrediccionStock(): PrediccionStock {
  const productos = useOperacionStore((s) => s.productos);
  const loadingOperacion = useOperacionStore((s) => !s.listenersActivos);

  const getPredicciones = useInventoryV2Store((s) => s.getPredicciones);
  const loadingInventory = useInventoryV2Store((s) => !s.listenersActivos);

  const predicciones = useMemo(() => {
    if (loadingOperacion || loadingInventory) return [];
    return getPredicciones(productos);
  }, [productos, getPredicciones, loadingOperacion, loadingInventory]);

  return {
    predicciones,
    loading: loadingOperacion || loadingInventory,
  };
}
