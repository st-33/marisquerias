/**
 * 🧠 CEREBRO - SELECTOR DE PRODUCTOS
 *
 * Hook reutilizable para seleccionar productos del menú
 * Funciona en CUALQUIER negocio de alimentos
 *
 * ✅ OPTIMIZADO: Consume del store centralizado (NO crea listeners)
 */

import { useCallback, useMemo, useState } from 'react';
import { useCategorias, useProductos } from '../../../core/store';
import type { Product } from '../../../base/tipos/contratos';
export type { Product };

type UseProductSelectorProps = Record<string, never>;

export function useProductSelector(
  _props: UseProductSelectorProps = {} as UseProductSelectorProps
) {
  const [selectedCategoryState, setSelectedCategory] = useState<string | null>(null);

  // 🔌 DOGMA V2: Leer del store centralizado (NO crear listeners)
  const categoriasDelStore = useCategorias();
  const productosDelStore = useProductos();

  // Convertir a formato legacy (compatibilidad)
  const categories = useMemo(() => categoriasDelStore, [categoriasDelStore]);
  const products = useMemo(() => productosDelStore, [productosDelStore]);

  const firstCategory = useMemo(() => Object.keys(categories)[0] || null, [categories]);
  const selectedCategory = selectedCategoryState ?? firstCategory;
  const loading = Object.keys(categories).length === 0;

  // Productos de la categoría seleccionada
  const productsInCategory = useMemo(() => {
    if (!selectedCategory || !products) {
      return [];
    }

    // ✅ Filtrar por categoría y estado activo desde el store
    const allProducts = Object.entries(products);
    const filtered = allProducts.filter(([_, prod]) => {
      const isInCategory = prod.categoriaId === selectedCategory;
      const isActive = prod.activo !== false;
      // 🛡️ isolation: Respect mesero visibility flag
      const isVisible = prod.visible?.mesero !== false;
      return isInCategory && isActive && isVisible;
    });

    return filtered
      .map(([id, prod]) => ({ ...prod, id, categoriaId: prod.categoriaId || '' }))
      .sort((a, b) => (a.nombre || '').localeCompare(b.nombre || ''));
  }, [products, selectedCategory]);

  // Categorías activas ordenadas
  const activeCategories = useMemo(() => {
    return Object.entries(categories)
      .filter(([_, cat]) => {
        const isActive = cat.activo !== false;
        // 🛡️ isolation: Respect mesero visibility flag (inheritance)
        const isVisible = cat.herencia?.mesero !== false;
        return isActive && isVisible;
      })
      .map(([id, cat]) => ({ ...cat, id }))
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }, [categories]);

  // Acciones
  const selectCategory = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    console.log('[useProductSelector] 📂 Categoría seleccionada:', categoryId);
  }, []);

  // ✅ OPTIMIZADO: Leer producto directamente del store (sin fetch async)
  const getProduct = useCallback(
    (productId: string): Product | null => {
      const prod = products[productId];
      if (!prod) return null;
      return { ...prod, categoriaId: prod.categoriaId || '' };
    },
    [products]
  );

  // ✅ OPTIMIZADO: Versión async simplificada (lee del store inmediatamente)
  const getProductAsync = useCallback(
    async (productId: string): Promise<Product | null> => {
      const prod = products[productId];
      if (!prod) return null;
      return { ...prod, categoriaId: prod.categoriaId || '' };
    },
    [products]
  );

  return {
    // Estado
    categories: activeCategories,
    products: productsInCategory,
    selectedCategory,
    loading,

    // Acciones
    selectCategory,
    getProduct,
    getProductAsync,
  };
}
