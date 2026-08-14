import { usePathname } from 'expo-router';
import { useEffect } from 'react';
import { logger } from '../../../core/monitoring';
import { useStore } from '../../../core/store';
import type { FabConfig } from '../../../core/types/contratos';

/**
 * Hook "puente" para que una pantalla configure el FAB global.
 *
 * Esta es la implementación arquitectónicamente correcta:
 * 1. La pantalla se vuelve agnóstica de la existencia de un FAB. Simplemente declara
 *    las "acciones rápidas" que ofrece.
 * 2. El hook no renderiza nada. Su única responsabilidad es comunicar la configuración
 *    de la pantalla actual al estado global (Zustand store).
 * 3. El `_layout` raíz leerá este estado global y decidirá si renderiza o no el
 *    componente `FabRadial`, pasándole la configuración.
 * 4. Usa `useEffect` para registrar la configuración al montar la pantalla y,
 *    CRUCIALMENTE, la limpia al desmontar. Esto previene que la configuración
 *    de una pantalla "persista" erróneamente en otra.
 *
 * @param config La configuración del FAB para la pantalla actual.
 */
export function usePuenteAccionesFlotantes(config: FabConfig) {
  const rawPathname = usePathname();
  const pathname = (rawPathname ? rawPathname.replace(/\/$/, '') : '') || '/';
  const setFabConfigForRoute = useStore((s) => s.setFabConfigForRoute);
  const clearFabConfigForRoute = useStore((s) => s.clearFabConfigForRoute);

  useEffect(() => {
    // 🛡️ VALIDACIÓN DEFENSIVA: Verificar que el store esté completamente inicializado
    if (!setFabConfigForRoute || !clearFabConfigForRoute) {
      logger.warn('FAB_BRIDGE', '⚠️ Store no inicializado completamente', {
        pathname,
        hasSetFabConfig: !!setFabConfigForRoute,
        hasClearFabConfig: !!clearFabConfigForRoute,
      });
      return;
    }

    // Si el FAB está deshabilitado para esta pantalla, no hacer nada.
    if (config.enabled === false) {
      // Asegurarse de que no haya una configuración previa para esta ruta
      clearFabConfigForRoute(pathname);
      return;
    }

    // Al montar la pantalla (o si la config cambia), registrarla en el store.
    logger.debug('FAB_BRIDGE', '🔧 Registrando config FAB', {
      pathname,
      itemsCount: config.items.length,
    });
    setFabConfigForRoute(pathname, config);

    // Al desmontar la pantalla, limpiar su configuración específica.
    return () => {
      if (clearFabConfigForRoute) {
        logger.debug('FAB_BRIDGE', '🧹 Limpiando config FAB', { pathname });
        clearFabConfigForRoute(pathname);
      }
    };
  }, [pathname, setFabConfigForRoute, clearFabConfigForRoute, config]); // Depender del objeto config para re-registrar si cambia
}
