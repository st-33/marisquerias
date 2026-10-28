import { normalizarFeaturesAdmin } from '../useFuncionalidadesAdmin';

jest.mock('../../../sistema/monitoreo', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));
jest.mock('../../../sistema/store', () => ({
  useStore: Object.assign(jest.fn(), { getState: jest.fn() }),
}));
jest.mock('../../../sistema/firebase', () => ({
  getRtdb: jest.fn(),
}));

describe('normalizarFeaturesAdmin', () => {
  test('el flag padre admin=false bloquea todos los módulos administrativos', () => {
    const features = normalizarFeaturesAdmin({
      roles: {
        admin: false,
      },
      module_venta_crudo: true,
      fastbutton_venta_crudo: true,
      menu_editor_venta_crudo: true,
    });

    expect(features).toEqual({
      menu: false,
      control_mesas: false,
      comanda_cocina: false,
      mostrador_y_pos: false,
      inventario: false,
      aparatos_conectados: false,
      reparto_logistica: false,
      metricas_y_cierres: false,
      tickets_impresion: false,
      admin: false,
      admin_dashboard: false,
      admin_menu: false,
      admin_inventory: false,
      admin_tables: false,
      admin_devices: false,
      admin_repart: false,
      admin_mostrador: false,
      admin_tickets: false,
      admin_menu_add_category: false,
      module_venta_crudo: false,
      fastbutton_venta_crudo: false,
      menu_editor_venta_crudo: false,
    });
  });

  test('un admin habilitado conserva el gating individual de sus módulos y capacidades canónicas', () => {
    const features = normalizarFeaturesAdmin({
      roles: {
        admin: {
          dashboard: false,
          menu: true,
          inventario: false,
          mesas: true,
          tickets: true,
        },
      },
    });

    expect(features.admin).toBe(true);
    expect(features.admin_dashboard).toBe(false);
    expect(features.metricas_y_cierres).toBe(false);
    expect(features.admin_menu).toBe(true);
    expect(features.menu).toBe(true);
    expect(features.admin_inventory).toBe(false);
    expect(features.inventario).toBe(false);
    expect(features.admin_tables).toBe(true);
    expect(features.control_mesas).toBe(true);
    expect(features.admin_tickets).toBe(true);
    expect(features.tickets_impresion).toBe(true);
  });
});
