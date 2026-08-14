/**
 * 🕐 HOOK - AUTO-HIDE DEL TOTAL
 *
 * Oculta el total automáticamente después de 3 segundos para dar más espacio a la comanda.
 * Se muestra nuevamente cuando:
 * - La mesera selecciona una mesa
 * - Se agrega un nuevo item
 */

import { useState, useEffect, useRef } from 'react';

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
  const [prevMesa, setPrevMesa] = useState(mesaSeleccionada);
  const [prevCount, setPrevCount] = useState(currentCount);
  const [showUntil, setShowUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  if (mesaSeleccionada !== prevMesa) {
    setPrevMesa(mesaSeleccionada);
    setShowUntil(mesaSeleccionada ? Date.now() + 3000 : 0);
  } else if (currentCount > prevCount) {
    setPrevCount(currentCount);
    if (mesaSeleccionada) {
      setShowUntil(Date.now() + 3000);
    }
  } else if (currentCount !== prevCount) {
    setPrevCount(currentCount);
  }

  useEffect(() => {
    if (showUntil > Date.now()) {
      const timer = setTimeout(() => setNow(Date.now()), Math.max(0, showUntil - Date.now() + 50));
      return () => clearTimeout(timer);
    }
  }, [showUntil]);

  return mesaSeleccionada !== null && now < showUntil;
}
