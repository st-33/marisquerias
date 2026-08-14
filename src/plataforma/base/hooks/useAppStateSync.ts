/**
 * 🔄 HOOK DE SINCRONIZACIÓN CON APP STATE
 *
 * Detecta cuando la app pasa a background/foreground y fuerza re-sincronización.
 *
 * PROBLEMA (Socket Sordo):
 * - Firebase listeners se "duermen" cuando app va a background
 * - Al volver, los datos pueden estar desactualizados
 * - Usuarios ven estados diferentes en múltiples dispositivos
 *
 * SOLUCIÓN:
 * - Detectar cambio de AppState (background → active)
 * - Forzar callback de re-sincronización
 * - Listeners se "despiertan" y actualizan datos
 *
 * USO:
 * ```typescript
 * useAppStateSync(() => {
 *   // Forzar recarga de datos
 *   refetch();
 * });
 * ```
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { logger } from '../../core/monitoring';

export function useAppStateSync(onBecomeActive?: () => void) {
  const [currentAppState, setCurrentAppState] = useState(AppState.currentState);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      // Detectar transición de background/inactive a active
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        logger.info('APP_STATE', '🔄 App volvió a foreground, forzando sincronización');

        // Llamar callback de sincronización
        onBecomeActive?.();
      }

      appState.current = nextAppState;
      setCurrentAppState(nextAppState);
      logger.debug('APP_STATE', `Estado cambió a: ${nextAppState}`);
    });

    return () => {
      subscription.remove();
    };
  }, [onBecomeActive]);

  return currentAppState;
}
