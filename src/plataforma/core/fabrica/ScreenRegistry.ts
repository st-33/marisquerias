import { RolesScreen } from '../../../catalogo/_compartido/pantallas/RolesScreen';
import { CocinaScreen } from '../../../catalogo/_compartido/pantallas/CocinaScreen';
import { MeseroScreen } from '../../../catalogo/_compartido/pantallas/MeseroScreen';
import { AdminDashboardScreen } from '../../dominios/marisqueria/administracion/dashboard/AdminDashboardScreen';
import { AdminMenuScreen } from '../../dominios/marisqueria/administracion/menu/AdminMenuScreen';
import { AdminTablesScreen } from '../../../catalogo/_compartido/pantallas/AdminTablesScreen';
import { AdminInventoryScreen } from '../../dominios/marisqueria/administracion/inventario/AdminInventoryScreen';
import { MostradorPro } from '../../../catalogo/_compartido/bloques/MostradorPro';
import { MostradorAdminScreen } from '../../../catalogo/marisqueria/pantallas/MostradorAdminScreen';

/**
 * 🏭 SCREEN REGISTRY GLOBAL (MARISQUERÍAS)
 * Mapa centralizado de resolución de vistas por rol.
 */
export const SCREEN_REGISTRY: Record<string, { Screen: React.ComponentType<any> }> = {
  selector_roles: {
    Screen: RolesScreen,
  },
  cocina: {
    Screen: CocinaScreen,
  },
  mesero: {
    Screen: MeseroScreen,
  },
  mostrador: {
    Screen: MostradorPro,
  },
  admin_dashboard: {
    Screen: AdminDashboardScreen,
  },
  admin_menu: {
    Screen: AdminMenuScreen,
  },
  admin_tables: {
    Screen: AdminTablesScreen,
  },
  admin_inventory: {
    Screen: AdminInventoryScreen,
  },
  admin_mostrador: {
    Screen: MostradorAdminScreen,
  },
};
