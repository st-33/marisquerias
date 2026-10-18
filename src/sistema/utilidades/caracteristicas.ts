import type { CajonOperativo } from '../rtdb/rutas/ruta_negocio';

export type CapacidadCanonica =
  | 'menu'
  | 'control_mesas'
  | 'comanda_cocina'
  | 'mostrador_y_pos'
  | 'inventario'
  | 'aparatos_conectados'
  | 'reparto_logistica'
  | 'metricas_y_cierres'
  | 'tickets_impresion';

export const CAPACIDADES_CANONICAS: readonly CapacidadCanonica[] = [
  'menu',
  'control_mesas',
  'comanda_cocina',
  'mostrador_y_pos',
  'inventario',
  'aparatos_conectados',
  'reparto_logistica',
  'metricas_y_cierres',
  'tickets_impresion',
] as const;

export const CAJONES_POR_CAPACIDAD: Record<CapacidadCanonica, readonly CajonOperativo[]> = {
  menu: ['menu'],
  control_mesas: ['mesas'],
  comanda_cocina: ['pedidos', 'mesas_pendientes'],
  mostrador_y_pos: ['ventas'],
  inventario: ['inventario'],
  aparatos_conectados: ['dispositivos'],
  reparto_logistica: ['reparto_ajustes', 'pedidos'],
  metricas_y_cierres: ['ventas'],
  tickets_impresion: ['tickets'],
};

export const ROLES_SUGERIDOS_POR_CAPACIDAD: Record<CapacidadCanonica, readonly string[]> = {
  menu: ['administrador', 'mesero', 'cocina', 'mostrador'],
  control_mesas: ['mesero'],
  comanda_cocina: ['cocina', 'mesero'],
  mostrador_y_pos: ['mostrador'],
  inventario: ['administrador', 'cocina'],
  aparatos_conectados: ['administrador'],
  reparto_logistica: ['repartidor'],
  metricas_y_cierres: ['administrador'],
  tickets_impresion: ['administrador', 'cocina', 'mostrador'],
};

export type CaracteristicasPlanas = Record<string, boolean>;

function truthy(v: any): boolean {
  return v === true || v === 'true' || v === 1;
}

export function normalizarCaracteristicas(input: any): CaracteristicasPlanas {
  const out: CaracteristicasPlanas = {};
  if (!input) return out;

  const src = input.caracteristicas ? input.caracteristicas : input;

  for (const [k, v] of Object.entries(src)) {
    if (typeof v === 'boolean') out[k] = v;
  }

  // 1. Capacidades canónicas declaradas
  const capacidades = src.capacidades || {};
  if (capacidades.menu !== undefined) out.menu = truthy(capacidades.menu);
  if (capacidades.control_mesas !== undefined)
    out.control_mesas = truthy(capacidades.control_mesas);
  if (capacidades.comanda_cocina !== undefined)
    out.comanda_cocina = truthy(capacidades.comanda_cocina);
  if (capacidades.mostrador_y_pos !== undefined)
    out.mostrador_y_pos = truthy(capacidades.mostrador_y_pos);
  if (capacidades.inventario !== undefined) out.inventario = truthy(capacidades.inventario);
  if (capacidades.aparatos_conectados !== undefined) {
    out.aparatos_conectados = truthy(capacidades.aparatos_conectados);
  }
  if (capacidades.reparto_logistica !== undefined) {
    out.reparto_logistica = truthy(capacidades.reparto_logistica);
  }
  if (capacidades.metricas_y_cierres !== undefined) {
    out.metricas_y_cierres = truthy(capacidades.metricas_y_cierres);
  }
  if (capacidades.tickets_impresion !== undefined) {
    out.tickets_impresion = truthy(capacidades.tickets_impresion);
  }

  // 2. Roles operativos
  const roles = (src as any).roles || {};
  if (roles.mesero !== undefined) out.waiter = truthy(roles.mesero);
  if (roles.cocina !== undefined) out.kitchen = truthy(roles.cocina);
  if (roles.ventas !== undefined) out.sales = truthy(roles.ventas);
  if (roles.tienda !== undefined && out.sales === undefined) out.sales = truthy(roles.tienda);

  const admin = roles.admin;
  if (typeof admin === 'boolean') {
    out.admin = truthy(admin);
  } else if (admin && typeof admin === 'object') {
    const map: Record<string, string> = {
      dashboard: 'admin_dashboard',
      metricas: 'admin_dashboard',
      metricas_y_cierres: 'admin_dashboard',
      menu: 'admin_menu',
      inventario: 'admin_inventory',
      mesas: 'admin_tables',
      control_mesas: 'admin_tables',
      dispositivos: 'admin_devices',
      aparatos_conectados: 'admin_devices',
      repart: 'admin_repart',
      reparto: 'admin_repart',
      reparto_logistica: 'admin_repart',
      mostrador: 'admin_mostrador',
      mostrador_y_pos: 'admin_mostrador',
      cocina: 'admin_cocina',
      comanda_cocina: 'admin_cocina',
      tickets: 'admin_tickets',
      tickets_impresion: 'admin_tickets',
    };
    let any = false;
    for (const [k, v] of Object.entries(admin)) {
      const key = map[k] || (k.startsWith('admin_') ? k : `admin_${k}`);
      if (truthy(v)) {
        out[key] = true;
        any = true;
      }
    }
    if (any) out.admin = true;
  }

  if (src.menu_digital !== undefined) out.menu_digital = truthy(src.menu_digital);
  if (src.delivery !== undefined) out.delivery = truthy(src.delivery);
  if (src.delivery_interno_adi_repart !== undefined) {
    out.delivery_interno_adi_repart = truthy(src.delivery_interno_adi_repart);
  }
  if (src.delivery_externo !== undefined) out.delivery_externo = truthy(src.delivery_externo);
  if (src.tracking_repartidor !== undefined) {
    out.tracking_repartidor = truthy(src.tracking_repartidor);
  }
  if (src.solicitudes_logisticas !== undefined) {
    out.solicitudes_logisticas = truthy(src.solicitudes_logisticas);
  }
  if (src.inventory_auto_discount !== undefined) {
    out.inventory_auto_discount = truthy(src.inventory_auto_discount);
  }
  if (src.module_venta_crudo !== undefined) out.module_venta_crudo = truthy(src.module_venta_crudo);
  if (src.fastbutton_venta_crudo !== undefined) {
    out.fastbutton_venta_crudo = truthy(src.fastbutton_venta_crudo);
  }
  if (src.menu_editor_venta_crudo !== undefined) {
    out.menu_editor_venta_crudo = truthy(src.menu_editor_venta_crudo);
  }

  // 3. Proyección recíproca entre canónicas y flags de UI
  if (out.menu || out.admin_menu) {
    out.menu = true;
    out.admin_menu = true;
  }
  if (out.control_mesas || out.admin_tables) {
    out.control_mesas = true;
    out.admin_tables = true;
  }
  if (out.comanda_cocina || out.kitchen) {
    out.comanda_cocina = true;
    out.kitchen = true;
  }
  if (out.mostrador_y_pos || out.sales || out.admin_mostrador || out.module_venta_crudo) {
    out.mostrador_y_pos = true;
    out.admin_mostrador = true;
  }
  if (out.inventario || out.admin_inventory) {
    out.inventario = true;
    out.admin_inventory = true;
  }
  if (out.aparatos_conectados || out.admin_devices) {
    out.aparatos_conectados = true;
    out.admin_devices = true;
  }
  if (out.reparto_logistica || out.admin_repart) {
    out.reparto_logistica = true;
    out.admin_repart = true;
  }
  if (out.metricas_y_cierres || out.admin_dashboard) {
    out.metricas_y_cierres = true;
    out.admin_dashboard = true;
  }
  if (out.tickets_impresion || out.admin_tickets) {
    out.tickets_impresion = true;
    out.admin_tickets = true;
  }

  return out;
}
