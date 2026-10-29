import { useFuncionalidadesAdmin } from '../useFuncionalidadesAdmin';
import { useStore } from '../../../sistema/store';

jest.mock('react', () => {
  const actual = jest.requireActual('react');
  return {
    ...actual,
    useState: jest.fn((initial: any) => [initial, jest.fn()]),
    useEffect: jest.fn((fn) => fn()),
    useMemo: jest.fn((fn) => fn()),
    useCallback: jest.fn((fn) => fn),
  };
});

// Mock del Zustand Store
jest.mock('../../../sistema/store', () => {
  return {
    useStore: jest.fn(),
  };
});

describe('useFuncionalidadesAdmin — Lectura de EstadoEncendido (NPB 00)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('habilita módulos admin cuando el rol administrador y capacidades están activas', () => {
    (useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        estadoEncendido: {
          activos: {
            roles: ['administrador'],
            capacidades: ['menu', 'inventario', 'control_mesas', 'metricas_y_cierres'],
            cajones: ['menu', 'inventario', 'mesas'],
          },
          roles_activos: ['administrador'],
          capacidades_activas: ['menu', 'inventario', 'control_mesas', 'metricas_y_cierres'],
        },
      })
    );

    const { features, loading, isEnabled } = useFuncionalidadesAdmin();

    expect(loading).toBe(false);
    expect(features.admin).toBe(true);
    expect(features.admin_menu).toBe(true);
    expect(features.admin_inventory).toBe(true);
    expect(features.admin_tables).toBe(true);
    expect(features.admin_dashboard).toBe(true);
    expect(features.admin_repart).toBe(false);
    expect(isEnabled('admin_menu')).toBe(true);
    expect(isEnabled('admin_repart')).toBe(false);
  });

  it('permite acceso a admin_dashboard aun cuando NO tiene la capacidad metricas_y_cierres', () => {
    (useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        estadoEncendido: {
          activos: {
            roles: ['administrador'],
            capacidades: ['control_mesas', 'comanda_cocina'],
            cajones: ['mesas'],
          },
          roles_activos: ['administrador'],
          capacidades_activas: ['control_mesas', 'comanda_cocina'],
        },
      })
    );

    const { features, isEnabled } = useFuncionalidadesAdmin();

    expect(features.admin).toBe(true);
    expect(features.admin_dashboard).toBe(true);
    expect(features.metricas_y_cierres).toBe(false);
    expect(features.admin_tables).toBe(true);
    expect(features.admin_menu).toBe(false);
    expect(isEnabled('admin_dashboard')).toBe(true);
    expect(isEnabled('metricas_y_cierres')).toBe(false);
  });

  it('deshabilita todos los módulos admin si el rol administrador no está activo', () => {
    (useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        estadoEncendido: {
          activos: {
            roles: ['mesero'],
            capacidades: ['menu', 'control_mesas'],
            cajones: ['menu', 'mesas'],
          },
          roles_activos: ['mesero'],
          capacidades_activas: ['menu', 'control_mesas'],
        },
      })
    );

    const { features, isEnabled } = useFuncionalidadesAdmin();

    expect(features.admin).toBe(false);
    expect(features.admin_menu).toBe(false);
    expect(isEnabled('admin_menu')).toBe(false);
  });
});
