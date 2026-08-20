/**
 * 🕐 HOOK - AUTO-HIDE DEL TOTAL
 *
 * Oculta el total automáticamente después de 3 segundos para dar más espacio a la comanda.
 * Se muestra nuevamente cuando cambia la mesa o cambia la cantidad de items.
 */

import { useEffect, useRef, useState } from 'react';

type UseTotalAutoHideProps = {
  mesaSeleccionada: string | null;
  pendingCount: number;
  liveItemsCount: number;
};

export function useTotalAutoHide({
  mesaSeleccionada,
  pendingCount,
  liveItemsCount,
}: UseTotalAutoHideProps) {
  const currentCount = pendingCount + liveItemsCount;
  const previousMesaRef = useRef(mesaSeleccionada);
  const previousCountRef = useRef(currentCount);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const mesaChanged = mesaSeleccionada !== previousMesaRef.current;
    const countChanged = currentCount !== previousCountRef.current;

    previousMesaRef.current = mesaSeleccionada;
    previousCountRef.current = currentCount;

    if (!mesaSeleccionada) {
      const hideId = setTimeout(() => setIsVisible(false), 0);
      return () => clearTimeout(hideId);
    }

    if (!mesaChanged && !countChanged) {
      return;
    }

    const showId = setTimeout(() => setIsVisible(true), 0);
    const hideId = setTimeout(() => setIsVisible(false), 3000);
    return () => {
      clearTimeout(showId);
      clearTimeout(hideId);
    };
  }, [mesaSeleccionada, currentCount]);

  return mesaSeleccionada !== null && isVisible;
}
