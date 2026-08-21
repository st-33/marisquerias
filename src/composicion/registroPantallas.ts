import { RolesScreen } from '../ui/pantallas/RolesScreen';
import { CocinaScreen } from '../ui/pantallas/CocinaScreen';
import { MeseroScreen } from '../ui/pantallas/MeseroScreen';
import { AdminDashboardScreen } from '../ui/roles/administrador/metricas/AdminDashboardScreen';
import { AdminMenuScreen } from '../ui/pantallas/AdminMenuScreen';
import { AdminTablesScreen } from '../ui/pantallas/AdminTablesScreen';
import { AdminInventoryScreen } from '../ui/pantallas/AdminInventoryScreen';
import { MostradorPro } from '../ui/bloques/MostradorPro';
import { MostradorAdminScreen } from '../ui/pantallas/MostradorAdminScreen';

/**
 * 🏭 SCREEN REGISTRY GLOBAL (MARISQUERÍAS)
 * Mapa centralizado de resolución de vistas por rol.
 */
export const REGISTRO_PANTALLAS: Record<string, { Screen: React.ComponentType<any> }> = {
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
