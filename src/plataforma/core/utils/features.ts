export type FlatFeatures = Record<string, boolean>;

function truthy(v: any): boolean {
  return v === true || v === 'true' || v === 1;
}

export function normalizeFeatures(input: any): FlatFeatures {
  const out: FlatFeatures = {};
  if (!input) return out;

  // Permitir que venga anidado bajo "caracteristicas" o directamente
  // en la raíz
  const src = input.caracteristicas ? input.caracteristicas : input;

  // Copiar las claves planas existentes tal cual
  for (const [k, v] of Object.entries(src)) {
    if (typeof v === 'boolean') out[k] = v;
  }

  // roles anidados
  const roles = (src as any).roles || {};

  // roles simples → claves planas
  if (roles.mesero !== undefined) out.waiter = truthy(roles.mesero);
  if (roles.cocina !== undefined) out.kitchen = truthy(roles.cocina);
  if (roles.ventas !== undefined) out.sales = truthy(roles.ventas);
  if (roles.tienda !== undefined && out.sales === undefined) out.sales = truthy(roles.tienda);

  // admin detallado
  const admin = roles.admin;
  if (typeof admin === 'boolean') {
    out.admin = truthy(admin);
  } else if (admin && typeof admin === 'object') {
    const map: Record<string, string> = {
      dashboard: 'admin_dashboard',
      menu: 'admin_menu',
      inventario: 'admin_inventory',
      mesas: 'admin_tables',
      dispositivos: 'admin_devices',
      repart: 'admin_repart',
      reparto: 'admin_repart',
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

  // otras claves conocidas
  if (src.menu_digital !== undefined) out.menu_digital = truthy(src.menu_digital);
  if (src.delivery !== undefined) out.delivery = truthy(src.delivery);
  if (src.inventory_auto_discount !== undefined)
    out.inventory_auto_discount = truthy(src.inventory_auto_discount);

  // 🦀 VENTA Y CRUDO FLAGS (Globales y del administrador)
  if (src.module_venta_crudo !== undefined) out.module_venta_crudo = truthy(src.module_venta_crudo);
  if (src.fastbutton_venta_crudo !== undefined)
    out.fastbutton_venta_crudo = truthy(src.fastbutton_venta_crudo);
  if (src.menu_editor_venta_crudo !== undefined)
    out.menu_editor_venta_crudo = truthy(src.menu_editor_venta_crudo);

  return out;
}
