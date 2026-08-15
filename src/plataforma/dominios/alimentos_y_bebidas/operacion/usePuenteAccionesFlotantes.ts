import { usePathname } from 'expo-router';
import { useEffect, useRef } from 'react';
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
  const configRef = useRef(config);
  configRef.current = config;

  // La configuración trae React nodes y callbacks, por lo que su identidad puede
  // cambiar aunque la definición operativa del FAB siga siendo la misma. El efecto
  // depende de esta firma estable, no del objeto completo.
  const configSignature = [
    config.enabled === false ? 'disabled' : 'enabled',
    config.initialKey ?? '',
    config.visibleCount ?? '',
    config.position ?? '',
    config.items
      .map((item) => `${item.key}:${item.label}:${item.color ?? ''}`)
      .join('|'),
  ].join('::');

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

    const currentConfig = configRef.current;

    // Si el FAB está deshabilitado para esta pantalla, no hacer nada.
    if (currentConfig.enabled === false) {
      // Asegurarse de que no haya una configuración previa para esta ruta
      clearFabConfigForRoute(pathname);
      return;
    }

    // Al montar la pantalla (o si la config cambia), registrarla en el store.
    logger.debug('FAB_BRIDGE', '🔧 Registrando config FAB', {
      pathname,
      itemsCount: currentConfig.items.length,
    });
    setFabConfigForRoute(pathname, currentConfig);

    // Al desmontar la pantalla, limpiar su configuración específica.
    return () => {
      if (clearFabConfigForRoute) {
        logger.debug('FAB_BRIDGE', '🧹 Limpiando config FAB', { pathname });
        clearFabConfigForRoute(pathname);
      }
    };
  }, [pathname, setFabConfigForRoute, clearFabConfigForRoute, configSignature]);
}
