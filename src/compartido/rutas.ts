/**
 * 🗺️ MAPA DE NAVEGACIÓN MAESTRO
 * Fuente única de verdad para todas las rutas de la aplicación.
 *
 * DOGMA #3 (MODULARIDAD):
 * Las rutas no se queman en el código. Se centralizan aquí.
 * Si cambiamos la estructura de carpetas en 'app/', solo actualizamos este archivo.
 */

export const RUTAS = {
  // 🔒 ZONA PÚBLICA / AUTH
  AUTH: {
    LOGIN: '/(auth)/access',
    RECOVERY: '/(auth)/recovery',
  },

  // 🛡️ ZONA PROTEGIDA (ROLES)
  ROLES: {
    SELECTOR: '/_role/roles',

    // Módulos Específicos
    MESERO: '/_role/mesero',
    COCINA: '/_role/cocina',
    ADMIN: '/_role/admin',
    VENTA_CRUDO: '/_role/venta-crudo', // Punto de Venta (POS) / Venta en Crudo
    INVENTARIO: '/_role/inventory',
    REPARTIDOR: '/_role/repart',

    // Sub-rutas Admin
    ADMIN_DASHBOARD: '/_role/admin', // Index del admin
    // Aquí se pueden agregar más sub-rutas si existen
  },

  // ⚙️ UTILIDADES
  PRINTER: '/printer',
  INICIO: '/index',
} as const;

// Tipo derivado para asegurar tipado fuerte en el uso de rutas
export type RutaApp = (typeof RUTAS)[keyof typeof RUTAS][keyof (typeof RUTAS)[keyof typeof RUTAS]];
