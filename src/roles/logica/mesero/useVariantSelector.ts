//Hook responsable  cálculo de precio final y envío en el ROL del Mesero

import { useCallback, useMemo, useState } from 'react';
import { computeVariantDeltaAndLabels } from './rules';
import type { PendingItem } from './useMeseroLogic';
import type { Product } from './useProductSelector';

type VariantSelections = Record<string, string[]>;

type UseVariantSelectorProps = {
  getProduct: (productId: string) => Product | null;
  getProductAsync?: (productId: string) => Promise<Product | null>;
};

type StartSelectionResult = {
  requiresVariants: boolean;
  pendingItem: PendingItem | null;
};

const buildPendingItem = (
  product: Product,
  selections: VariantSelections,
  delta: number,
  labels?: string[]
): PendingItem => {
  const basePrice = Number(product.precio || 0);
  const price = Math.max(0, basePrice + delta);
  const hasVariants = Object.keys(selections).length > 0;

  return {
    name: product.nombre,
    price,
    qty: 1,
    productId: product.id,
    variants: hasVariants ? selections : undefined,
    basePrice,
    variantDelta: delta,
    // Human-readable labels for printing and UX
    ...(labels && labels.length ? { variantLabels: labels } : {}),
    prepMin: (product as any)?.prepMin ?? undefined,
  };
};

export function useVariantSelector({ getProduct, getProductAsync }: UseVariantSelectorProps) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [variantSelections, setVariantSelections] = useState<VariantSelections>({});

  const variantGroups = useMemo(() => selectedProduct?.variantes?.grupos ?? {}, [selectedProduct]);

  const { delta, labels } = useMemo(() => {
    if (!selectedProduct) {
      return { delta: 0, labels: [] as string[] };
    }
    return computeVariantDeltaAndLabels(variantGroups, variantSelections);
  }, [selectedProduct, variantGroups, variantSelections]);

  const currentPrice = useMemo(() => {
    if (!selectedProduct) return 0;
    const basePrice = Number(selectedProduct.precio || 0);
    return Math.max(0, basePrice + delta);
  }, [selectedProduct, delta]);

  const reset = useCallback(() => {
    setVariantSelections({});
    setSelectedProduct(null);
  }, []);

  // 🔥 AHORA ES ASÍNCRONO para soportar fetch de variantes
  const startSelection = useCallback(
    async (productId: string): Promise<StartSelectionResult> => {
      let product: Product | null = null;

      // Preferir método asíncrono si está disponible (garantiza variantes)
      if (getProductAsync) {
        product = await getProductAsync(productId);
      } else {
        product = getProduct(productId);
      }

      if (!product) {
        return { requiresVariants: false, pendingItem: null };
      }

      const groups = product.variantes?.grupos || {};
      const hasVariants = Object.keys(groups).length > 0;

      if (!hasVariants) {
        const pendingItem = buildPendingItem(product, {}, 0, []);
        return { requiresVariants: false, pendingItem };
      }

      setSelectedProduct(product);
      setVariantSelections({});

      return { requiresVariants: true, pendingItem: null };
    },
    [getProduct, getProductAsync]
  );

  const toggleOption = useCallback(
    (groupId: string, optionId: string, mode: 'single' | 'multi') => {
      setVariantSelections((prev) => {
        const current = prev[groupId] || [];
        let next: string[];

        if (mode === 'single') {
          next = current.includes(optionId) ? [] : [optionId];
        } else {
          next = current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId];
        }

        const updated: VariantSelections = { ...prev };
        if (next.length > 0) {
          updated[groupId] = next;
        } else {
          delete updated[groupId];
        }

        return updated;
      });
    },
    []
  );

  const confirmSelection = useCallback((): PendingItem | null => {
    if (!selectedProduct) {
      return null;
    }

    const { delta: currentDelta, labels: currentLabels } = computeVariantDeltaAndLabels(
      variantGroups,
      variantSelections
    );
    const pendingItem = buildPendingItem(
      selectedProduct,
      variantSelections,
      currentDelta,
      currentLabels
    );
    reset();
    return pendingItem;
  }, [selectedProduct, variantGroups, variantSelections, reset]);

  const cancelSelection = useCallback(() => {
    reset();
  }, [reset]);

  return {
    selectedProduct,
    variantSelections,
    currentPrice,
    startSelection,
    toggleOption,
    confirmSelection,
    cancelSelection,
    reset,
  };
}
