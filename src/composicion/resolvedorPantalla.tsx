import React, { useMemo } from 'react';
import { useStore } from '../sistema/store';
import { PantallaAlternativa } from './PantallaAlternativa';
import { REGISTRO_PANTALLAS } from './registroPantallas';
import type { ScreenResuelto } from './tipos';

export function useResolvedorPantalla(roleKey: string): ScreenResuelto {
  const sesion = useStore((s) => s.sesion);

  return useMemo(() => {
    if (!roleKey) {
      return {
        Screen: () => (
          <PantallaAlternativa role={roleKey} message="No se especificó un rol válido." />
        ),
        props: {},
        loading: false,
        error: 'Key de rol inválida',
        niche: sesion.niche,
        category: sesion.category,
      };
    }

    const roleEntry = REGISTRO_PANTALLAS[roleKey];
    if (!roleEntry || !roleEntry.Screen) {
      return {
        Screen: () => (
          <PantallaAlternativa role={roleKey} niche={sesion.niche} category={sesion.category} />
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
