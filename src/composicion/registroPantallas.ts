import { RolesScreen } from '../ui/pantallas/RolesScreen';
import { CocinaScreen } from '../ui/pantallas/CocinaScreen';
import { MeseroScreen } from '../ui/pantallas/MeseroScreen';
import { PantallaMetricasDatos } from '../ui/roles/administrador/metricas/PantallaMetricasDatos';
import { PantallaMenuAdmin } from '../ui/roles/administrador/menu/PantallaMenuAdmin';
import { PantallaMesas } from '../ui/roles/administrador/mesas/PantallaMesas';
import { PantallaInventario } from '../ui/roles/administrador/inventario/PantallaInventario';
import { PantallaReparto } from '../ui/roles/administrador/reparto/PantallaReparto';
import { MostradorPro } from '../ui/bloques/MostradorPro';
import { MostradorAdminScreen } from '../ui/roles/administrador/mostrador/MostradorAdminScreen';

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
};
