/**
 * 🧭 RESOLVEDOR DE REDIRECCIÓN Y ROL POR DEFECTO
 *
 * Aplica la jerarquía estricta de redirección post-arranque O(1):
 * 1. administrador → /_role/admin/dashboard
 * 2. cajero → /_role/caja
 * 3. mostrador → /_role/venta-crudo
 * 4. mesero → /_role/mesero
 * 5. repartidor → /_role/repartidor
 * 6. cocina → /_role/cocina
 * 7. barman → /_role/barman
 * 8. barista → /_role/barista
 * 9. parrillero → /_role/parrillero
 * 10. empacador → /_role/empacador
 * 11. Sin roles activos → Error bloqueante explícito.
 */

import type { RolDispositivoCanonico } from './catalogoRoles';

export interface DestinoRol {
  rol: RolDispositivoCanonico;
  ruta: string;
}

export function obtenerRutaPorRol(rol: RolDispositivoCanonico): string {
  switch (rol) {
    case 'administrador':
      return '/_role/admin/dashboard';
    case 'cajero':
      return '/_role/caja';
    case 'mostrador':
      return '/_role/venta-crudo';
    case 'mesero':
      return '/_role/mesero';
    case 'repartidor':
      return '/_role/repartidor';
    case 'cocina':
      return '/_role/cocina';
    case 'barman':
      return '/_role/barman';
    case 'barista':
      return '/_role/barista';
    case 'parrillero':
      return '/_role/parrillero';
    case 'empacador':
      return '/_role/empacador';
    default:
      return '/_role/roles';
  }
}

export function resolverRolPorDefecto(rolesActivos: RolDispositivoCanonico[]): DestinoRol {
  if (!rolesActivos || rolesActivos.length === 0) {
    throw new Error('El NPB no activó ningún rol. Contacta soporte.');
  }

  // 1. Administrador prioritario
  if (rolesActivos.includes('administrador')) {
    return {
      rol: 'administrador',
      ruta: obtenerRutaPorRol('administrador'),
    };
  }

  // 2. Cajero prioritario
  if (rolesActivos.includes('cajero')) {
    return {
      rol: 'cajero',
      ruta: obtenerRutaPorRol('cajero'),
    };
  }

  // 3. Mostrador prioritario
  if (rolesActivos.includes('mostrador')) {
    return {
      rol: 'mostrador',
      ruta: obtenerRutaPorRol('mostrador'),
    };
  }

  // 4. Mesero prioritario
  if (rolesActivos.includes('mesero')) {
    return {
      rol: 'mesero',
      ruta: obtenerRutaPorRol('mesero'),
    };
  }

  // 5. Repartidor
  if (rolesActivos.includes('repartidor')) {
    return {
      rol: 'repartidor',
      ruta: obtenerRutaPorRol('repartidor'),
    };
  }

  // 6. Cocina general
  if (rolesActivos.includes('cocina')) {
    return {
      rol: 'cocina',
      ruta: obtenerRutaPorRol('cocina'),
    };
  }

  // 7. Estaciones KDS especializadas
  if (rolesActivos.includes('barman')) {
    return {
      rol: 'barman',
      ruta: obtenerRutaPorRol('barman'),
    };
  }

  if (rolesActivos.includes('barista')) {
    return {
      rol: 'barista',
      ruta: obtenerRutaPorRol('barista'),
    };
  }

  if (rolesActivos.includes('parrillero')) {
    return {
      rol: 'parrillero',
      ruta: obtenerRutaPorRol('parrillero'),
    };
  }

  if (rolesActivos.includes('empacador')) {
    return {
      rol: 'empacador',
      ruta: obtenerRutaPorRol('empacador'),
    };
  }

  // Fallback al primer rol activo disponible
  const primerRol = rolesActivos[0];
  return {
    rol: primerRol,
    ruta: obtenerRutaPorRol(primerRol),
  };
}
