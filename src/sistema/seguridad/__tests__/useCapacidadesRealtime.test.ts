import { useCapacidadesRealtime } from '../useCapacidadesRealtime';
import { useStore } from '../../store';
import { getSecundariaRtdb } from '../../firebase';
import { ref, onValue, off } from 'firebase/database';
import { cargarNPB } from '../../instalacion/npb/cargarNPB';
import { encenderCapacidades } from '../../instalacion/npb/encenderCapacidades';

jest.mock('../../store', () => ({
  useStore: Object.assign(jest.fn(), {
    getState: jest.fn(),
  }),
}));

jest.mock('../../firebase', () => ({
  getSecundariaRtdb: jest.fn(),
}));

jest.mock('firebase/database', () => ({
  ref: jest.fn(),
  onValue: jest.fn(),
  off: jest.fn(),
}));

jest.mock('../../instalacion/npb/cargarNPB', () => ({
  cargarNPB: jest.fn(),
}));

jest.mock('../../instalacion/npb/encenderCapacidades', () => ({
  encenderCapacidades: jest.fn(),
}));

jest.mock('../../almacenamiento/storageSesion', () => ({
  storageSesion: {
    setItem: jest.fn().mockResolvedValue(undefined),
    getItem: jest.fn().mockResolvedValue(null),
    removeItem: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock('../../monitoreo', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('useCapacidadesRealtime — Sincronización en caliente Ecosistema -> Marisquerías', () => {
  let capturedCallback: ((snapshot: any) => void) | null = null;
  const mockSetEstadoEncendido = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    capturedCallback = null;

    (getSecundariaRtdb as jest.Mock).mockReturnValue({ _mockDb: true });
    (ref as jest.Mock).mockImplementation((_db, path) => ({ _path: path }));
    (onValue as jest.Mock).mockImplementation((_ref, cb) => {
      capturedCallback = cb;
      return cb;
    });

    (cargarNPB as jest.Mock).mockResolvedValue({
      version_npb: 1,
      roles: [{ clave: 'administrador' }, { clave: 'mesero' }, { clave: 'cocina' }],
      capacidades: [
        { clave: 'comanda_de_cocina', roles: ['cocina'] },
        { clave: 'mostrador_y_pos', roles: ['mesero'] },
      ],
      cajones: ['ordenes', 'mesas'],
    });

    (encenderCapacidades as jest.Mock).mockImplementation((_npb, config) => ({
      activos: {
        roles: ['mesero'],
        capacidades: config.capacidades_autorizadas || [],
        cajones: ['ordenes'],
      },
      roles_activos: ['mesero'],
      capacidades_activas: config.capacidades_autorizadas || [],
      capacidades_dormidas: [],
    }));

    (useStore as unknown as jest.Mock).mockImplementation((selector: any) =>
      selector({
        sesion: {
          ruta_negocio: 'restaurante/marisquerias/negocio/puerto-madero',
          category: 'marisquerias',
          negocio_id: '01',
        },
        setEstadoEncendido: mockSetEstadoEncendido,
      })
    );

    (useStore.getState as jest.Mock).mockReturnValue({
      sesion: {
        ruta_negocio: 'restaurante/marisquerias/negocio/puerto-madero',
        category: 'marisquerias',
        negocio_id: '01',
      },
      setEstadoEncendido: mockSetEstadoEncendido,
    });
  });

  it('suscribe onValue en ${ruta_negocio}/capacidades_autorizadas en Unidad Secundaria', async () => {
    const React = require('react');
    const effectCbs: (() => void)[] = [];
    const origUseEffect = React.useEffect;
    jest.spyOn(React, 'useEffect').mockImplementation((fn: any) => {
      effectCbs.push(fn());
    });

    useCapacidadesRealtime(true);

    // Wait microtasks
    await new Promise((r) => setTimeout(r, 10));

    expect(ref).toHaveBeenCalledWith(
      { _mockDb: true },
      'restaurante/marisquerias/negocio/puerto-madero/capacidades_autorizadas'
    );
    expect(onValue).toHaveBeenCalled();
    expect(capturedCallback).toBeInstanceOf(Function);

    // Clean up
    effectCbs.forEach((cleanup) => cleanup && cleanup());
  });

  it('recalcula EstadoEncendido y actualiza el store global cuando Ecosistema muta capacidades', async () => {
    const React = require('react');
    const effectCbs: (() => void)[] = [];
    jest.spyOn(React, 'useEffect').mockImplementation((fn: any) => {
      effectCbs.push(fn());
    });

    useCapacidadesRealtime(true);
    await new Promise((r) => setTimeout(r, 10));

    expect(capturedCallback).not.toBeNull();

    // Simular mutación emitida por Torre de Control desde Ecosistema:
    // Se activa comanda_de_cocina y mostrador_y_pos
    const mockSnapshot = {
      exists: () => true,
      val: () => ({
        comanda_de_cocina: true,
        mostrador_y_pos: true,
      }),
    };

    capturedCallback!(mockSnapshot);

    expect(encenderCapacidades).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        negocio_id: '01',
        capacidades_autorizadas: expect.arrayContaining(['comanda_de_cocina', 'mostrador_y_pos']),
      })
    );
    expect(mockSetEstadoEncendido).toHaveBeenCalledWith(
      expect.objectContaining({
        capacidades_activas: expect.arrayContaining(['comanda_de_cocina', 'mostrador_y_pos']),
      })
    );

    effectCbs.forEach((cleanup) => cleanup && cleanup());
  });

  it('desuscribe el listener de Firebase RTDB al desmontarse', async () => {
    const React = require('react');
    let cleanupFn: any = null;
    jest.spyOn(React, 'useEffect').mockImplementation((fn: any) => {
      cleanupFn = fn();
    });

    useCapacidadesRealtime(true);
    await new Promise((r) => setTimeout(r, 10));

    expect(off).not.toHaveBeenCalled();

    if (typeof cleanupFn === 'function') {
      cleanupFn();
    }

    expect(off).toHaveBeenCalledWith(
      expect.objectContaining({
        _path: 'restaurante/marisquerias/negocio/puerto-madero/capacidades_autorizadas',
      }),
      'value',
      expect.any(Function)
    );
  });
});
