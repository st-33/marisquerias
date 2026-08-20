import React, { useMemo } from 'react';
import { useStore } from '../sistema/store';
import { descomponerRutaTenant } from '../sistema/rtdb/rutas/RutaTenant';
import { FallbackScreen } from './FallbackScreen';
import { SCREEN_REGISTRY } from './ScreenRegistry';
import type { ScreenRegistroEntrada, ScreenResuelto, TargetNichoEntrada } from './tipos';

export function useScreenResolver(roleKey: string): ScreenResuelto {
  const sesion = useStore((s) => s.sesion);

  return useMemo(() => {
    if (!roleKey) {
      return {
        Screen: () => <FallbackScreen role={roleKey} message="No se especificó un rol válido." />,
        props: {},
        loading: false,
        error: 'Key de rol inválida',
        niche: sesion.niche,
        category: sesion.category,
      };
    }

    const roleEntry = SCREEN_REGISTRY[roleKey];
    if (!roleEntry || !roleEntry.Screen) {
      return {
        Screen: () => (
          <FallbackScreen role={roleKey} niche={sesion.niche} category={sesion.category} />
        ),
        props: {},
        loading: false,
        error: `Rol '${roleKey}' no registrado en la Fábrica de Marisquerías`,
        niche: sesion.niche,
        category: sesion.category,
      };
    }

    const { Screen, staticProps } = roleEntry as any;

    return {
      Screen,
      props: {
        ...(staticProps || {}),
      },
      loading: false,
      error: null,
      niche: sesion.niche,
      category: sesion.category,
    };
  }, [roleKey, sesion.niche, sesion.category]);
}
