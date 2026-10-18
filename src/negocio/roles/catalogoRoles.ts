/**
 * 👥 CATÁLOGO CERRADO DE ROLES DE DISPOSITIVO (10 ROLES CANÓNICOS)
 *
 * Define la matriz universal de roles de dispositivo para el Ecosistema.
 * Cada rol especifica sus pantallas visibles por defecto, sus capacidades
 * requeridas (condición sine qua non para activarse) y capacidades opcionales.
 */

import type { CapacidadCanonica } from '../../sistema/utilidades/caracteristicas';

export type RolDispositivoCanonico =
  | 'administrador'
  | 'mesero'
  | 'cocina'
  | 'mostrador'
  | 'cajero'
  | 'repartidor'
  | 'barman'
  | 'barista'
  | 'parrillero'
  | 'empacador';

export const ROLES_DISPOSITIVO_CANONICOS: readonly RolDispositivoCanonico[] = [
  'administrador',
  'mesero',
  'cocina',
  'mostrador',
  'cajero',
  'repartidor',
  'barman',
  'barista',
  'parrillero',
  'empacador',
] as const;

export interface DefinicionRolDispositivo {
  id: RolDispositivoCanonico;
  nombre: string;
  descripcion: string;
  pantalla: string;
  pantallas_visibles: string[];
  pantallas_visibles_default: string[];
  capacidades_requeridas: CapacidadCanonica[];
  capacidades_opcionales: CapacidadCanonica[];
}

export const CATALOGO_ROLES_DISPOSITIVO: Record<RolDispositivoCanonico, DefinicionRolDispositivo> =
  {
    administrador: {
      id: 'administrador',
      nombre: 'Administrador',
      descripcion: 'Puesto de mando global y configuración de negocio',
      pantalla: 'app/_role/admin/dashboard.tsx',
      pantallas_visibles: ['admin_dashboard'],
      pantallas_visibles_default: [
        '/_role/admin',
        '/_role/admin/dashboard',
        '/_role/admin/menu',
        '/_role/admin/inventario',
        '/_role/admin/mesas',
        '/_role/admin/dispositivos',
        '/_role/admin/reparto',
        '/_role/admin/venta-crudo',
      ],
      capacidades_requeridas: ['menu'],
      capacidades_opcionales: [
        'control_mesas',
        'comanda_cocina',
        'mostrador_y_pos',
        'inventario',
        'aparatos_conectados',
        'reparto_logistica',
        'metricas_y_cierres',
        'tickets_impresion',
      ],
    },
    mesero: {
      id: 'mesero',
      nombre: 'Mesero / Piso',
      descripcion: 'Toma de comandas, gestión de mesas y solicitud de cuentas',
      pantalla: 'app/_role/mesero.tsx',
      pantallas_visibles: ['comandas_piso'],
      pantallas_visibles_default: ['/_role/mesero'],
      capacidades_requeridas: ['control_mesas'],
      capacidades_opcionales: ['comanda_cocina', 'menu', 'tickets_impresion'],
    },
    cocina: {
      id: 'cocina',
      nombre: 'Cocina Central / KDS',
      descripcion: 'Display de comandas, preparación y despacho a piso',
      pantalla: 'app/_role/cocina.tsx',
      pantallas_visibles: ['kds_central'],
      pantallas_visibles_default: ['/_role/cocina'],
      capacidades_requeridas: ['comanda_cocina'],
      capacidades_opcionales: ['inventario', 'tickets_impresion'],
    },
    mostrador: {
      id: 'mostrador',
      nombre: 'Mostrador / POS',
      descripcion: 'Venta directa en mostrador y despacho inmediato',
      pantalla: 'app/_role/venta-crudo.tsx',
      pantallas_visibles: ['mostrador_pos'],
      pantallas_visibles_default: ['/_role/venta-crudo'],
      capacidades_requeridas: ['mostrador_y_pos'],
      capacidades_opcionales: ['inventario', 'tickets_impresion', 'reparto_logistica'],
    },
    cajero: {
      id: 'cajero',
      nombre: 'Cajero / Punto de Cobro',
      descripcion: 'Cobro de cuentas, cortes de caja y emisión de comprobantes',
      pantalla: 'app/_role/caja.tsx',
      pantallas_visibles: ['cobro_terminal'],
      pantallas_visibles_default: ['/_role/caja'],
      capacidades_requeridas: ['mostrador_y_pos'],
      capacidades_opcionales: ['tickets_impresion', 'metricas_y_cierres'],
    },
    repartidor: {
      id: 'repartidor',
      nombre: 'Repartidor / Logística',
      descripcion: 'Despacho de pedidos a domicilio y seguimiento logístico',
      pantalla: 'app/_role/repartidor.tsx',
      pantallas_visibles: ['reparto_movil'],
      pantallas_visibles_default: ['/_role/repartidor'],
      capacidades_requeridas: ['reparto_logistica'],
      capacidades_opcionales: ['tickets_impresion'],
    },
    barman: {
      id: 'barman',
      nombre: 'Barra / Barman',
      descripcion: 'Estación de preparación de bebidas y coctelería',
      pantalla: 'app/_role/barman.tsx',
      pantallas_visibles: ['comandas_estacion'],
      pantallas_visibles_default: ['/_role/barman'],
      capacidades_requeridas: ['comanda_cocina'],
      capacidades_opcionales: ['inventario'],
    },
    barista: {
      id: 'barista',
      nombre: 'Barista / Cafetería',
      descripcion: 'Estación de café y postres rápidos',
      pantalla: 'app/_role/barista.tsx',
      pantallas_visibles: ['comandas_estacion'],
      pantallas_visibles_default: ['/_role/barista'],
      capacidades_requeridas: ['comanda_cocina'],
      capacidades_opcionales: ['inventario'],
    },
    parrillero: {
      id: 'parrillero',
      nombre: 'Parrilla / Plancha',
      descripcion: 'Estación de carnes y mariscos a las brasas/plancha',
      pantalla: 'app/_role/parrillero.tsx',
      pantallas_visibles: ['comandas_estacion'],
      pantallas_visibles_default: ['/_role/parrillero'],
      capacidades_requeridas: ['comanda_cocina'],
      capacidades_opcionales: ['inventario'],
    },
    empacador: {
      id: 'empacador',
      nombre: 'Empaque / Despacho Final',
      descripcion: 'Control de empaque para pedidos de salida y domicilio',
      pantalla: 'app/_role/empacador.tsx',
      pantallas_visibles: ['comandas_estacion'],
      pantallas_visibles_default: ['/_role/empacador'],
      capacidades_requeridas: ['comanda_cocina'],
      capacidades_opcionales: ['reparto_logistica', 'tickets_impresion'],
    },
  };

export function esRolDispositivoCanonico(id: string): id is RolDispositivoCanonico {
  return (ROLES_DISPOSITIVO_CANONICOS as readonly string[]).includes(id);
}

export function obtenerDefinicionRol(id: string): DefinicionRolDispositivo | undefined {
  if (esRolDispositivoCanonico(id)) {
    return CATALOGO_ROLES_DISPOSITIVO[id];
  }
  return undefined;
}
