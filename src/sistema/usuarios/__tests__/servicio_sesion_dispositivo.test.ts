import type { Database } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  admitirSesionDispositivo,
  cambiarOperadorResponsable,
  liberarSesionDispositivo,
  obtenerSesionOperativaLocal,
  listarAuditoriaOperadores,
} from '../servicio_sesion_dispositivo';

// Memoria local para simular AsyncStorage
const storageMemoria: Record<string, string> = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async (key: string, val: string) => {
    storageMemoria[key] = val;
  }),
  getItem: jest.fn(async (key: string) => storageMemoria[key] ?? null),
  removeItem: jest.fn(async (key: string) => {
    delete storageMemoria[key];
  }),
}));

// Mock de RTDB en memoria
let mockRtdb: Record<string, any> = {};

jest.mock('firebase/database', () => ({
  ref: jest.fn((_db: any, path: string) => ({ path })),
  get: jest.fn(async (refObj: { path: string }) => {
    const clean = (refObj.path || '').replace(/^\/+|\/+$/g, '');
    const val = mockRtdb[clean];
    return {
      exists: () => val !== undefined && val !== null,
      val: () => (val !== undefined ? val : null),
    };
  }),
  set: jest.fn(async (refObj: { path: string }, data: any) => {
    const clean = (refObj.path || '').replace(/^\/+|\/+$/g, '');
    mockRtdb[clean] = JSON.parse(JSON.stringify(data));
    const partes = clean.split('/');
    if (partes[0] === 'monitoreo' && partes[1] === 'dispositivos' && partes.length === 3) {
      if (!mockRtdb['monitoreo/dispositivos']) mockRtdb['monitoreo/dispositivos'] = {};
      mockRtdb['monitoreo/dispositivos'][partes[2]] = JSON.parse(JSON.stringify(data));
    }
  }),
  update: jest.fn(async (refObj: { path: string }, data: any) => {
    const clean = (refObj.path || '').replace(/^\/+|\/+$/g, '');
    mockRtdb[clean] = { ...(mockRtdb[clean] || {}), ...JSON.parse(JSON.stringify(data)) };
    const partes = clean.split('/');
    if (partes[0] === 'monitoreo' && partes[1] === 'dispositivos' && partes.length === 3) {
      if (!mockRtdb['monitoreo/dispositivos']) mockRtdb['monitoreo/dispositivos'] = {};
      mockRtdb['monitoreo/dispositivos'][partes[2]] = {
        ...(mockRtdb['monitoreo/dispositivos'][partes[2]] || {}),
        ...JSON.parse(JSON.stringify(data)),
      };
    }
  }),
}));

const dbMock = {} as Database;

describe('Servicio de Sesión de Dispositivo y Admisión (servicio_sesion_dispositivo)', () => {
  beforeEach(() => {
    mockRtdb = {};
    for (const k of Object.keys(storageMemoria)) {
      delete storageMemoria[k];
    }
  });

  describe('Separación Web vs Nativo', () => {
    it('1. Web se admite directamente sin consumir cupo en monitoreo/dispositivos', async () => {
      const res = await admitirSesionDispositivo(dbMock, {
        deviceId: 'browser-tab-xyz',
        usuarioId: '01',
        usuarioNombre: 'Ana',
        cargo: 'mesero',
        esWebForzado: true,
      });

      expect(res.admitido).toBe(true);
      expect(res.esWeb).toBe(true);
      expect(res.slotId).toBeUndefined();

      // Confirma que NO escribió ningún slot en monitoreo/dispositivos
      expect(mockRtdb['monitoreo/dispositivos']).toBeUndefined();

      // Pero sí guardó sesión operativa local
      const sesionLocal = await obtenerSesionOperativaLocal();
      expect(sesionLocal).toBeDefined();
      expect(sesionLocal?.plataforma).toBe('web');
      expect(sesionLocal?.dispositivo_id).toBe('browser-tab-xyz');
    });

    it('2. Nativo consume slots consecutivos en monitoreo/dispositivos (01, 02...)', async () => {
      const res1 = await admitirSesionDispositivo(dbMock, {
        deviceId: 'tablet-piso-01',
        usuarioId: '01',
        usuarioNombre: 'Ana',
        cargo: 'mesero',
        limiteDispositivos: 3,
        esWebForzado: false,
      });

      expect(res1.admitido).toBe(true);
      expect(res1.esWeb).toBe(false);
      expect(res1.slotId).toBe('01');
      expect(mockRtdb['monitoreo/dispositivos/01']).toBeDefined();
      expect(mockRtdb['monitoreo/dispositivos/01'].estado).toBe('activo');
      expect(mockRtdb['monitoreo/dispositivos/01'].dispositivo_id).toBe('tablet-piso-01');

      // Segunda terminal nativa
      const res2 = await admitirSesionDispositivo(dbMock, {
        deviceId: 'tablet-cocina-02',
        usuarioId: '02',
        usuarioNombre: 'Carlos',
        cargo: 'cocina',
        limiteDispositivos: 3,
        esWebForzado: false,
      });

      expect(res2.admitido).toBe(true);
      expect(res2.slotId).toBe('02');
      expect(mockRtdb['monitoreo/dispositivos/02'].dispositivo_id).toBe('tablet-cocina-02');
    });

    it('3. Nativo: Reingreso del mismo dispositivo reutiliza su slot sin crear uno nuevo', async () => {
      await admitirSesionDispositivo(dbMock, {
        deviceId: 'tablet-piso-01',
        usuarioId: '01',
        usuarioNombre: 'Ana',
        cargo: 'mesero',
        limiteDispositivos: 3,
        esWebForzado: false,
      });

      // Mismo dispositivo vuelve a ingresar
      const reingreso = await admitirSesionDispositivo(dbMock, {
        deviceId: 'tablet-piso-01',
        usuarioId: '01',
        usuarioNombre: 'Ana',
        cargo: 'mesero',
        limiteDispositivos: 3,
        esWebForzado: false,
      });

      expect(reingreso.admitido).toBe(true);
      expect(reingreso.slotId).toBe('01'); // Mismo slot conservado
      expect(mockRtdb['monitoreo/dispositivos/02']).toBeUndefined(); // NO consumió un segundo slot
    });

    it('4. Nativo: Rechaza la admisión si se agotan los slots disponibles', async () => {
      // Consumir 2 de 2 slots
      await admitirSesionDispositivo(dbMock, {
        deviceId: 'dev-1',
        usuarioId: '01',
        cargo: 'mesero',
        limiteDispositivos: 2,
        esWebForzado: false,
      });
      await admitirSesionDispositivo(dbMock, {
        deviceId: 'dev-2',
        usuarioId: '02',
        cargo: 'cocina',
        limiteDispositivos: 2,
        esWebForzado: false,
      });

      // Intento de admitir un 3er dispositivo
      const res3 = await admitirSesionDispositivo(dbMock, {
        deviceId: 'dev-3',
        usuarioId: '03',
        cargo: 'cajero',
        limiteDispositivos: 2,
        esWebForzado: false,
      });

      expect(res3.admitido).toBe(false);
      expect(res3.error).toContain('Límite de terminales simultáneas alcanzado');
    });

    it('4b. Latido oportunista: Reclama slot huérfano si una terminal previa superó los 120s de inactividad', async () => {
      const haceTresMinutos = Date.now() - 180_000;
      // Simular que el slot 01 tiene una terminal apagada/huérfana hace 3 minutos
      mockRtdb['monitoreo/dispositivos/01'] = {
        estado: 'activo',
        dispositivo_id: 'tablet-apagada-sin-bateria',
        rol: 'mesero',
        usuario_id: '01',
        usuario_nombre: 'Ana',
        ultima_actividad: haceTresMinutos,
      };

      // Simular slot 02 activo y transmitiendo
      mockRtdb['monitoreo/dispositivos/02'] = {
        estado: 'activo',
        dispositivo_id: 'tablet-cocina-viva',
        rol: 'cocina',
        usuario_id: '02',
        usuario_nombre: 'Carlos',
        ultima_actividad: Date.now(),
      };

      // Límite de 2 terminales simultáneas
      const resNuevaTerminal = await admitirSesionDispositivo(dbMock, {
        deviceId: 'tablet-nueva-reemplazo',
        usuarioId: '03',
        usuarioNombre: 'Elena',
        cargo: 'mesero',
        limiteDispositivos: 2,
        esWebForzado: false,
      });

      // Debe haber reclamado oportunistamente el slot 01
      expect(resNuevaTerminal.admitido).toBe(true);
      expect(resNuevaTerminal.slotId).toBe('01');
      expect(mockRtdb['monitoreo/dispositivos/01'].dispositivo_id).toBe('tablet-nueva-reemplazo');
      expect(mockRtdb['monitoreo/dispositivos/01'].usuario_nombre).toBe('Elena');
    });
  });

  describe('Instalaciones Compartidas y Cambio de Operador', () => {
    it('5. Cambiar operador en la misma terminal no consume un nuevo slot y registra auditoría', async () => {
      // 1. Ana inicia turno en la tablet
      await admitirSesionDispositivo(dbMock, {
        deviceId: 'tablet-compartida-barra',
        usuarioId: '01',
        usuarioNombre: 'Ana',
        cargo: 'mesero',
        limiteDispositivos: 3,
        esWebForzado: false,
      });

      expect(mockRtdb['monitoreo/dispositivos/01'].usuario_nombre).toBe('Ana');

      // 2. Beto toma la misma tablet (cambio de operador)
      await cambiarOperadorResponsable(dbMock, {
        deviceId: 'tablet-compartida-barra',
        slotId: '01',
        nuevoUsuarioId: '02',
        nuevoUsuarioNombre: 'Beto',
        nuevoCargo: 'cajero',
        motivo: 'Cambio de turno vespertino',
      });

      // Confirma que el slot 01 se actualizó con los datos de Beto
      expect(mockRtdb['monitoreo/dispositivos/01'].usuario_id).toBe('02');
      expect(mockRtdb['monitoreo/dispositivos/01'].usuario_nombre).toBe('Beto');
      expect(mockRtdb['monitoreo/dispositivos/01'].rol).toBe('cajero');

      // Confirma que NO se creó un slot 02
      expect(mockRtdb['monitoreo/dispositivos/02']).toBeUndefined();

      // Confirma que se registró la auditoría local con el historial
      const auditoria = await listarAuditoriaOperadores();
      expect(auditoria.length).toBe(1);
      expect(auditoria[0].usuario_nombre_anterior).toBe('Ana');
      expect(auditoria[0].usuario_nombre_nuevo).toBe('Beto');
      expect(auditoria[0].cargo_nuevo).toBe('cajero');
      expect(auditoria[0].dispositivo_id).toBe('tablet-compartida-barra');
    });

    it('6. Liberar sesión marca el slot como inactivo y limpia almacenamiento local', async () => {
      await admitirSesionDispositivo(dbMock, {
        deviceId: 'tablet-01',
        usuarioId: '01',
        usuarioNombre: 'Ana',
        cargo: 'mesero',
        limiteDispositivos: 3,
        esWebForzado: false,
      });

      await liberarSesionDispositivo(dbMock, { slotId: '01' });

      expect(mockRtdb['monitoreo/dispositivos/01'].estado).toBe('inactivo');

      const sesionLocal = await obtenerSesionOperativaLocal();
      expect(sesionLocal).toBeNull();
    });
  });
});
