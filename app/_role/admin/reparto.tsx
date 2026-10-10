/**
 * 🚚 ADMIN REPART CONTAINER
 * Adaptador fino de Expo Router; delega a la fábrica de pantallas.
 * La UI vive en `src/ui/roles/administrador/reparto/PantallaReparto.tsx`.
 */

import React from 'react';
import { useResolvedorPantalla } from '../../../src/composicion';

export default function PantallaRepartoContainer() {
  const resolved = useResolvedorPantalla('admin_repart');

  if (resolved.loading || !resolved.Screen) {
    return null;
  }

  const Component = resolved.Screen;
  return <Component {...resolved.props} />;
}
