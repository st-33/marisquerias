/**
 * 📦 ROL INVENTARIO DIRECTO CONTAINER
 * Permite acceder al módulo de Inventario directamente desde el selector de roles
 * o navegación directa (`/_role/inventario`), fuera o dentro de Administrador.
 */

import React from 'react';
import { useResolvedorPantalla } from '../../src/composicion';

export default function InventarioRoleContainer() {
  const resolved = useResolvedorPantalla('admin_inventory');

  if (resolved.loading || !resolved.Screen) {
    return null;
  }

  const Component = resolved.Screen;
  return <Component {...resolved.props} />;
}
