import { PantallaRoles } from '../ui/pantallas/PantallaRoles';
import { PantallaCocina } from '../ui/pantallas/PantallaCocina';
import { PantallaMesero } from '../ui/pantallas/PantallaMesero';
import { PantallaMetricasDatos } from '../ui/roles/administrador/metricas/PantallaMetricasDatos';
import { PantallaMenuAdmin } from '../ui/roles/administrador/menu/PantallaMenuAdmin';
import { PantallaMesas } from '../ui/roles/administrador/mesas/PantallaMesas';
import { PantallaInventario } from '../ui/roles/administrador/inventario/PantallaInventario';
import { PantallaReparto } from '../ui/roles/administrador/reparto/PantallaReparto';
import { MostradorPro } from '../ui/bloques/MostradorPro';
import { MostradorAdminScreen } from '../ui/roles/administrador/mostrador/PantallaMostradorAdmin';

import { PantallaAjustesAdmin } from '../ui/roles/administrador/ajustes/PantallaAjustesAdmin';

/**
 * 🏭 SCREEN REGISTRY GLOBAL (MARISQUERÍAS)
 * Mapa centralizado de resolución de vistas por rol.
 */
export const REGISTRO_PANTALLAS: Record<string, { Screen: React.ComponentType<any> }> = {
  selector_roles: {
    Screen: PantallaRoles,
  },
  cocina: {
    Screen: PantallaCocina,
  },
  mesero: {
    Screen: PantallaMesero,
  },
  mostrador: {
    Screen: MostradorPro,
  },
  admin_dashboard: {
    Screen: PantallaMetricasDatos,
  },
  admin_menu: {
    Screen: PantallaMenuAdmin,
  },
  admin_tables: {
    Screen: PantallaMesas,
  },
  admin_inventory: {
    Screen: PantallaInventario,
  },
  admin_repart: {
    Screen: PantallaReparto,
  },
  admin_mostrador: {
    Screen: MostradorAdminScreen,
  },
  admin_ajustes: {
    Screen: PantallaAjustesAdmin,
  },
};
