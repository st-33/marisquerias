import { useEmpaquetadorRoles } from '../empaquetadorRoles';
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

jest.mock('../../../sistema/store', () => ({
  useStore: jest.fn(),
}));

describe('useEmpaquetadorRoles — Lectura directa de EstadoEncendido (O(1))', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('retorna lista vacía si no hay roles activos en EstadoEncendido', () => {
    (useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        modulosBloqueados: [],
        estadoEncendido: {
          activos: { roles: [], capacidades: [], cajones: [] },
          roles_activos: [],
          capacidades_activas: [],
        },
      })
    );

    const { getRolesHabilitados } = useEmpaquetadorRoles();
    expect(getRolesHabilitados()).toEqual([]);
  });

  it('proyecta roles habilitados desde estadoEncendido.activos.roles y capacidades', () => {
    (useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        modulosBloqueados: [],
        estadoEncendido: {
          activos: {
            roles: ['mesero', 'administrador'],
            capacidades: ['menu', 'control_mesas'],
            cajones: ['menu', 'mesas'],
          },
          roles_activos: ['mesero', 'administrador'],
          capacidades_activas: ['menu', 'control_mesas'],
        },
      })
    );

    const { getRolesHabilitados, isRolHabilitado, isModuloHabilitado } = useEmpaquetadorRoles();
    const rolesHabilitados = getRolesHabilitados();

    expect(rolesHabilitados.length).toBe(2);
    expect(rolesHabilitados.map((r) => r.nombre)).toEqual(['Mesero', 'Admin']);
    expect(isRolHabilitado('mesero')).toBe(true);
    expect(isRolHabilitado('cocina')).toBe(false);
    expect(isModuloHabilitado('admin', 'menu')).toBe(true);
    expect(isModuloHabilitado('admin', 'reparto_logistica')).toBe(false);
  });

  it('excluye roles que estén en modulosBloqueados', () => {
    (useStore as unknown as jest.Mock).mockImplementation((selector) =>
      selector({
        modulosBloqueados: ['mesero'],
        estadoEncendido: {
          activos: {
            roles: ['mesero', 'cocina'],
            capacidades: ['comanda_cocina'],
            cajones: ['pedidos'],
          },
          roles_activos: ['mesero', 'cocina'],
          capacidades_activas: ['comanda_cocina'],
        },
      })
    );

    const { getRolesHabilitados, isRolHabilitado } = useEmpaquetadorRoles();
    const roles = getRolesHabilitados();

    expect(roles.length).toBe(1);
    expect(roles[0].nombre).toBe('Cocina');
    expect(isRolHabilitado('mesero')).toBe(false);
    expect(isRolHabilitado('cocina')).toBe(true);
  });
});
