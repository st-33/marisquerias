import type { Database } from 'firebase/database';
import {
  admitirSesionDispositivo,
  cambiarOperadorResponsable,
  liberarSesionDispositivo,
  obtenerSesionOperativaLocal,
  listarAuditoriaOperadores,
  validarTokenSesion,
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
  runTransaction: jest.fn(async (refObj: { path: string }, updateFn: (curr: any) => any) => {
    const clean = (refObj.path || '').replace(/^\/+|\/+$/g, '');
    const currentVal = mockRtdb[clean] ? JSON.parse(JSON.stringify(mockRtdb[clean])) : {};
    const newVal = updateFn(currentVal);
    if (newVal === undefined) {
      return { committed: false, snapshot: { val: () => currentVal } };
    }
    mockRtdb[clean] = JSON.parse(JSON.stringify(newVal));
    return { committed: true, snapshot: { val: () => newVal } };
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
    it('1. Web se admite directamente sin consumir cupo en sesiones', async () => {
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

      // Confirma que NO escribió ninguna plaza en sesiones
      expect(mockRtdb['sesiones']).toBeUndefined();

      // Pero sí guardó sesión operativa local
      const sesionLocal = await obtenerSesionOperativaLocal();
      expect(sesionLocal).toBeDefined();
      expect(sesionLocal?.plataforma).toBe('web');
      expect(sesionLocal?.dispositivo_id).toBe('browser-tab-xyz');
    });

    it('2. Nativo consume plazas atómicas en /sesiones (01, 02...) con token_sesion y proyecta string en monitoreo', async () => {
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
      expect(res1.tokenSesion).toBeDefined();

      // Unidad Operativa: nodo rico en /sesiones/01
      const ses1 = mockRtdb['sesiones']['01'];
      expect(ses1).toBeDefined();
      expect(ses1.estado).toBe('activa');
      expect(ses1.dispositivo_id).toBe('tablet-piso-01');
      expect(ses1.token_sesion).toBe(res1.tokenSesion);

      // Proyección en monitoreo/dispositivos: string estricto 'activo'
      expect(mockRtdb['monitoreo/dispositivos/01']).toBe('activo');

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
      expect(mockRtdb['sesiones']['02'].dispositivo_id).toBe('tablet-cocina-02');
      expect(mockRtdb['monitoreo/dispositivos/02']).toBe('activo');
    });

    it('3. Nativo: Reingreso del mismo dispositivo reutiliza su plaza sin crear una nueva', async () => {
      const p1 = await admitirSesionDispositivo(dbMock, {
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
      expect(reingreso.slotId).toBe('01');
      expect(reingreso.tokenSesion).toBe(p1.tokenSesion); // Mismo token conservado
      expect(mockRtdb['sesiones']['02']).toBeUndefined(); // NO consumió segunda plaza
    });

    it('4. Nativo: Rechaza la admisión si se agotan las plazas disponibles', async () => {
      // Consumir 2 de 2 plazas
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

    it('4b. Presencia técnica vs Taps humanos: 45 min sin tocar pantalla NO desaloja si hay ping técnico', async () => {
      const ahora = Date.now();
      // Simular que el mesero no tocó la pantalla por 45 minutos (interacción humana vieja),
      // pero el latido técnico de fondo se envió hace 10 segundos.
      mockRtdb['sesiones'] = {
        '01': {
          plaza_id: '01',
          estado: 'activa',
          token_sesion: 'tok-mesero-vivo',
          dispositivo_id: 'tablet-mesero-vivo',
          operador_nombre: 'Ana',
          inicio: ahora - 45 * 60 * 1000,
          ultima_interaccion_humana: ahora - 45 * 60 * 1000,
          ultimo_latido_presencia: ahora - 10_000, // Ping hace 10s
        },
      };

      // Intentar admitir nueva terminal con límite 1
      const resNueva = await admitirSesionDispositivo(dbMock, {
        deviceId: 'tablet-intrusa',
        usuarioId: '02',
        cargo: 'mesero',
        limiteDispositivos: 1,
        esWebForzado: false,
      });

      // No debe desalojar: el mesero sigue en turno aunque no haya órdenes
      expect(resNueva.admitido).toBe(false);
      expect(mockRtdb['sesiones']['01'].dispositivo_id).toBe('tablet-mesero-vivo');
    });

    it('4c. Abandono Técnico prolongado (> 180s): Reclama plaza y nuevo token invalida al anterior', async () => {
      const ahora = Date.now();
      const haceCuatroMinutos = ahora - 240_000; // 240s sin ping técnico (> 180s)

      mockRtdb['sesiones'] = {
        '01': {
          plaza_id: '01',
          estado: 'activa',
          token_sesion: 'tok-antiguo-apagado',
          dispositivo_id: 'tablet-apagada-sin-bateria',
          operador_nombre: 'Ana',
          ultimo_latido_presencia: haceCuatroMinutos,
        },
      };

      const resNueva = await admitirSesionDispositivo(dbMock, {
        deviceId: 'tablet-nueva-reemplazo',
        usuarioId: '03',
        usuarioNombre: 'Elena',
        cargo: 'mesero',
        limiteDispositivos: 1,
        esWebForzado: false,
      });

      expect(resNueva.admitido).toBe(true);
      expect(resNueva.slotId).toBe('01');
      expect(resNueva.tokenSesion).not.toBe('tok-antiguo-apagado');

      const plazaActualizada = mockRtdb['sesiones']['01'];
      expect(plazaActualizada.dispositivo_id).toBe('tablet-nueva-reemplazo');
      expect(plazaActualizada.reclamada_de_dispositivo).toBe('tablet-apagada-sin-bateria');

      // Si la terminal antigua despierta y valida su token, es rechazada
      mockRtdb['sesiones/01'] = plazaActualizada;
      const sigueValido = await validarTokenSesion(dbMock, '01', 'tok-antiguo-apagado');
      expect(sigueValido).toBe(false);

      // El nuevo token sí es válido
      const nuevoEsValido = await validarTokenSesion(dbMock, '01', resNueva.tokenSesion!);
      expect(nuevoEsValido).toBe(true);
    });
  });

  describe('Instalaciones Compartidas y Cambio de Operador', () => {
    it('5. Cambiar operador en la misma terminal conserva la plaza y registra auditoría', async () => {
      await admitirSesionDispositivo(dbMock, {
        deviceId: 'tablet-compartida-barra',
        usuarioId: '01',
        usuarioNombre: 'Ana',
        cargo: 'mesero',
        limiteDispositivos: 3,
        esWebForzado: false,
      });

      expect(mockRtdb['sesiones']['01'].operador_nombre).toBe('Ana');

      // Beto toma la misma tablet
      await cambiarOperadorResponsable(dbMock, {
        deviceId: 'tablet-compartida-barra',
        slotId: '01',
        nuevoUsuarioId: '02',
        nuevoUsuarioNombre: 'Beto',
        nuevoCargo: 'cajero',
        motivo: 'Cambio de turno vespertino',
      });

      // Se actualizó en /sesiones/01
      expect(mockRtdb['sesiones/01'].operador_id).toBe('02');
      expect(mockRtdb['sesiones/01'].operador_nombre).toBe('Beto');
      expect(mockRtdb['sesiones/01'].rol_activo).toBe('cajero');

      // Auditoría local
      const auditoria = await listarAuditoriaOperadores();
      expect(auditoria.length).toBe(1);
      expect(auditoria[0].usuario_nombre_anterior).toBe('Ana');
      expect(auditoria[0].usuario_nombre_nuevo).toBe('Beto');
    });

    it('6. Liberar sesión marca la plaza inactiva en Operativa y string inactivo en monitoreo', async () => {
      await admitirSesionDispositivo(dbMock, {
        deviceId: 'tablet-01',
        usuarioId: '01',
        usuarioNombre: 'Ana',
        cargo: 'mesero',
        limiteDispositivos: 3,
        esWebForzado: false,
      });

      await liberarSesionDispositivo(dbMock, { slotId: '01' });

      expect(mockRtdb['sesiones/01'].estado).toBe('inactiva');
      expect(mockRtdb['monitoreo/dispositivos/01']).toBe('inactivo');

      const sesionLocal = await obtenerSesionOperativaLocal();
      expect(sesionLocal).toBeNull();
    });
  });
});
