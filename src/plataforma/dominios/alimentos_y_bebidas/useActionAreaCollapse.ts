/**
 * 🧠 LÓGICA - Auto-colapso de ActionArea
 *
 * Maneja el estado de colapso/expansión de la barra de acción
 * basado en el tamaño de la comanda y gestos del usuario.
 *
 * REGLAS:
 * - Se colapsa automáticamente cuando hay 5+ items en comanda
 * - Se expande temporalmente (2s) al agregar un nuevo item
 * - Se expande con gesto de 2 deslizadas largas consecutivas
 * - Vuelve a colapsar tras 2s si la comanda sigue llena
 */

import { useCallback, useEffect, useRef, useState } from 'react';

type UseActionAreaCollapseProps = {
  itemCount: number;
  threshold?: number; // Número de items para activar auto-colapso (default: 5)
};

export function useActionAreaCollapse({ itemCount, threshold = 5 }: UseActionAreaCollapseProps) {
  const [userExpanded, setUserExpanded] = useState(false);
  const previousItemCount = useRef(itemCount);
  const collapseTimer = useRef<NodeJS.Timeout | null>(null);

  const shouldAutoCollapse = itemCount >= threshold;
  const isCollapsed = shouldAutoCollapse && !userExpanded;

  // Detectar cuando se agrega un nuevo item (después del threshold)
  useEffect(() => {
    const itemAdded = itemCount > previousItemCount.current;
    previousItemCount.current = itemCount;

    if (itemAdded && itemCount >= threshold) {
      // Expandir temporalmente
      setUserExpanded(true);

      // Limpiar timer anterior
      if (collapseTimer.current) {
        clearTimeout(collapseTimer.current);
      }

      // Colapsar después de 2 segundos
      collapseTimer.current = setTimeout(() => {
        setUserExpanded(false);
      }, 2000);
    }

    return () => {
      if (collapseTimer.current) {
        clearTimeout(collapseTimer.current);
      }
    };
  }, [itemCount, threshold]);

  // Función para expandir temporalmente con gesto
  const expandWithGesture = useCallback(() => {
    if (!shouldAutoCollapse) return;

    setUserExpanded(true);

    // Limpiar timer anterior
    if (collapseTimer.current) {
      clearTimeout(collapseTimer.current);
    }

    // Colapsar después de 2 segundos
    collapseTimer.current = setTimeout(() => {
      setUserExpanded(false);
    }, 2000);
  }, [shouldAutoCollapse]);

  return {
    isCollapsed,
    shouldAutoCollapse,
    expandWithGesture,
  };
}
