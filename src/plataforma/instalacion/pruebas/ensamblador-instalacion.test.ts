import AsyncStorage from '@react-native-async-storage/async-storage';
import { set, get, update } from 'firebase/database';
import { resolverDeviceIdADI } from '../vinculacion/generar-device-id-adi';
import { resolverAccessCode } from '../vinculacion/resolver-access-code';
import { resolverConfiguracionInicial } from '../runtime/resolver-configuracion-inicial';
import { EnsambladorInstalacion } from '../ensambladores/EnsambladorInstalacion';
import type { Database } from 'firebase/database';

// Mock de Dependencias Nativas y de Almacenamiento
jest.mock('@react-native-async-storage/async-storage', () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn(async (key: string) => store[key] || null),
    setItem: jest.fn(async (key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn(async (key: string) => {
      delete store[key];
    }),
    clear: jest.fn(async () => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
  };
});

jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn().mockResolvedValue('HW-UNIQUE-1234'),
}));

jest.mock('firebase/database', () => ({
  ref: jest.fn((db: any, path: string) => ({ db, path })),
  set: jest.fn(),
  get: jest.fn(),
  update: jest.fn(),
  serverTimestamp: jest.fn(() => 1234567890),
}));

jest.mock('../../core/monitoring', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
  },
  setUser: jest.fn(),
}));

jest.mock('../../core/bootstrap/ensureTenant', () => ({
  ensureTenantBootstrap: jest.fn().mockResolvedValue(undefined),
}));

describe('Módulo de Instalación y Device Binding - Hardened', () => {
  const dbMock = {} as unknown as Database;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generar-device-id-adi', () => {
    it('debe generar un nuevo deviceIdADI y persistirlo si no existe', async () => {
      const generatedId = await resolverDeviceIdADI();

      expect(generatedId).toContain('ADI-HW-UNIQUE-1234');
      expect(AsyncStorage.setItem).toHaveBeenCalledWith('adi_device_id_persistent', generatedId);
    });
  });

  describe('resolver-access-code - Restricciones de Seguridad', () => {
    it('debe resolver un código de acceso válido simplificado (legacy)', async () => {
      const snapMock = {
        exists: () => true,
        val: () => 'marisquerias/puerto-libres',
      };
      (get as jest.Mock).mockResolvedValueOnce(snapMock);

      const result = await resolverAccessCode(dbMock, 'PUEBLA-01');

      expect(result.tenantPath).toBe('marisquerias/puerto-libres');
      expect(result.estado).toBe('activo');
    });

    it('debe rechazar access code revocado', async () => {
      const snapMock = {
        exists: () => true,
        val: () => ({
          tenantPath: 'marisquerias/puerto-libres',
          estado: 'revocado',
        }),
      };
      (get as jest.Mock).mockResolvedValueOnce(snapMock);

      await expect(resolverAccessCode(dbMock, 'REVOKED-CODE')).rejects.toThrow(
        'El código de acceso ha sido revocado'
      );
    });

    it('debe rechazar access code expirado', async () => {
      const snapMock = {
        exists: () => true,
        val: () => ({
          tenantPath: 'marisquerias/puerto-libres',
          estado: 'expirado',
        }),
      };
      (get as jest.Mock).mockResolvedValueOnce(snapMock);

      await expect(resolverAccessCode(dbMock, 'EXPIRED-CODE')).rejects.toThrow(
        'El código de acceso ha expirado'
      );
    });

    it('debe rechazar access code con fecha de expiración temporal vencida', async () => {
      const snapMock = {
        exists: () => true,
        val: () => ({
          tenantPath: 'marisquerias/puerto-libres',
          estado: 'activo',
          expiraEn: Date.now() - 1000, // Hace 1 segundo
        }),
      };
      (get as jest.Mock).mockResolvedValueOnce(snapMock);

      await expect(resolverAccessCode(dbMock, 'EXPIRED-TIME-CODE')).rejects.toThrow(
        'El código de acceso ha expirado temporalmente'
      );
    });

    it('debe rechazar access code sin usos disponibles', async () => {
      const snapMock = {
        exists: () => true,
        val: () => ({
          tenantPath: 'marisquerias/puerto-libres',
          estado: 'activo',
          maxUsos: 3,
          usosActuales: 3,
        }),
      };
      (get as jest.Mock).mockResolvedValueOnce(snapMock);

      await expect(resolverAccessCode(dbMock, 'NO-USES-CODE')).rejects.toThrow(
        'El código de acceso ha agotado su límite de usos'
      );
    });

    it('debe aceptar access code multiuso dentro del límite', async () => {
      const snapMock = {
        exists: () => true,
        val: () => ({
          tenantPath: 'marisquerias/puerto-libres',
          estado: 'activo',
          maxUsos: 5,
          usosActuales: 2,
        }),
      };
      (get as jest.Mock).mockResolvedValueOnce(snapMock);

      const result = await resolverAccessCode(dbMock, 'MULTIUSE-CODE');

      expect(result.tenantPath).toBe('marisquerias/puerto-libres');
      expect(result.usosActuales).toBe(2);
    });
  });

  describe('resolver-configuracion-inicial', () => {
    it('debe permitir segundo_al_mando como nivel operativo', async () => {
      const caractSnapMock = { exists: () => false };
      const featSnapMock = { exists: () => false };
      const deviceSnapMock = {
        exists: () => true,
        val: () => ({
          rolActivo: 'mesero',
          estado: 'activo',
          nivelOperativo: 'segundo_al_mando',
          puedeCambiarRol: false,
        }),
      };

      (get as jest.Mock)
        .mockResolvedValueOnce(caractSnapMock)
        .mockResolvedValueOnce(featSnapMock)
        .mockResolvedValueOnce(deviceSnapMock);

      const result = await resolverConfiguracionInicial(dbMock, 'tenants/1', 'ADI-DEV-1');

      expect(result.dispositivoConfig.nivelOperativo).toBe('segundo_al_mando');
      expect(result.dispositivoConfig.puedeCambiarRol).toBe(false);
    });
  });

  describe('EnsambladorInstalacion', () => {
    let ensamblador: EnsambladorInstalacion;

    beforeEach(() => {
      ensamblador = new EnsambladorInstalacion(dbMock);
    });

    it('debe permitir bypass si vínculo local existe y RTDB confirma estado activo', async () => {
      const localData = {
        deviceIdADI: 'ADI-DEV-1',
        tenantPath: 'marisquerias/puerto-libres',
        tenantId: 'marisquerias/puerto-libres',
        niche: '2 alimentos_y_bebidas',
        rolActivo: 'mesero',
        rolesPermitidos: ['mesero'],
        modulosPermitidos: {},
        estado: 'activo',
        puedeCambiarRol: true,
        vinculadoEn: 1234,
        actualizadoEn: 1234,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(localData));

      const dbSnapMock = {
        exists: () => true,
        val: () => ({ estado: 'activo', rolActivo: 'mesero', puedeCambiarRol: true }),
      };
      (get as jest.Mock).mockResolvedValueOnce(dbSnapMock);

      const result = await ensamblador.obtenerVinculacionLocal();

      expect(result).toBeDefined();
      expect(result!.deviceIdADI).toBe('ADI-DEV-1');
      expect(result!.estado).toBe('activo');
      expect(AsyncStorage.setItem).toHaveBeenCalled(); // Se guardó el estado sincronizado
    });

    it('bloquea dispositivo desde RTDB y limpia vínculo local', async () => {
      const localData = {
        deviceIdADI: 'ADI-DEV-1',
        tenantPath: 'marisquerias/puerto-libres',
        tenantId: 'marisquerias/puerto-libres',
        niche: '2 alimentos_y_bebidas',
        rolActivo: 'mesero',
        rolesPermitidos: ['mesero'],
        modulosPermitidos: {},
        estado: 'activo',
        puedeCambiarRol: true,
        vinculadoEn: 1234,
        actualizadoEn: 1234,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(localData));

      // Simulamos que en RTDB el estado ahora es 'bloqueado'
      const dbSnapMock = {
        exists: () => true,
        val: () => ({ estado: 'bloqueado' }),
      };
      (get as jest.Mock).mockResolvedValueOnce(dbSnapMock);

      const result = await ensamblador.obtenerVinculacionLocal();

      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('adi_dispositivo_vinculado');
    });

    it('detecta dispositivo reemplazado y limpia vínculo local', async () => {
      const localData = {
        deviceIdADI: 'ADI-DEV-1',
        tenantPath: 'marisquerias/puerto-libres',
        tenantId: 'marisquerias/puerto-libres',
        niche: '2 alimentos_y_bebidas',
        rolActivo: 'mesero',
        rolesPermitidos: ['mesero'],
        modulosPermitidos: {},
        estado: 'activo',
        puedeCambiarRol: true,
        vinculadoEn: 1234,
        actualizadoEn: 1234,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(localData));

      // Simulamos que en RTDB el estado ahora es 'reemplazado'
      const dbSnapMock = {
        exists: () => true,
        val: () => ({ estado: 'reemplazado', reemplazadoPorDeviceId: 'ADI-DEV-2' }),
      };
      (get as jest.Mock).mockResolvedValueOnce(dbSnapMock);

      const result = await ensamblador.obtenerVinculacionLocal();

      expect(result).toBeNull();
      expect(AsyncStorage.removeItem).toHaveBeenCalledWith('adi_dispositivo_vinculado');
    });

    it('permite cargar la vinculación si está en mantenimiento sin invalidarla del todo (pero inoperativa)', async () => {
      const localData = {
        deviceIdADI: 'ADI-DEV-1',
        tenantPath: 'marisquerias/puerto-libres',
        tenantId: 'marisquerias/puerto-libres',
        niche: '2 alimentos_y_bebidas',
        rolActivo: 'mesero',
        rolesPermitidos: ['mesero'],
        modulosPermitidos: {},
        estado: 'activo',
        puedeCambiarRol: true,
        vinculadoEn: 1234,
        actualizadoEn: 1234,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(JSON.stringify(localData));

      // Simulamos que en RTDB el estado es 'mantenimiento'
      const dbSnapMock = {
        exists: () => true,
        val: () => ({ estado: 'mantenimiento' }),
      };
      (get as jest.Mock).mockResolvedValueOnce(dbSnapMock);

      const result = await ensamblador.obtenerVinculacionLocal();

      expect(result).toBeDefined();
      expect(result!.estado).toBe('mantenimiento');
      expect(AsyncStorage.removeItem).not.toHaveBeenCalled(); // No se limpia para que pueda reanudar al salir del mantenimiento
    });

    it('evita crear tenant desde cliente (falla la instalación si el tenant no existe)', async () => {
      // Mock del resolvedor del access code
      const codeSnapMock = {
        exists: () => true,
        val: () => 'marisquerias/puerto-libres',
      };
      // Mock de la presencia del tenant en la base de datos (exists: false)
      const tenantSnapMock = {
        exists: () => false, // EL TENANT NO EXISTE PREVIAMENTE
      };

      (get as jest.Mock).mockResolvedValueOnce(codeSnapMock).mockResolvedValueOnce(tenantSnapMock);

      const result = await ensamblador.instalar('PUEBLA-01', 'Tablet Fails');

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error).toContain('no está registrado en el sistema central');
      }
    });

    it('debe completar exitosamente la instalación e incrementar usos del access code', async () => {
      // 1. resolverAccessCode (get access_codes/PUEBLA-01)
      const codeSnapMock = {
        exists: () => true,
        val: () => ({
          tenantPath: 'marisquerias/puerto-libres',
          estado: 'activo',
          maxUsos: 10,
          usosActuales: 4,
        }),
      };
      // 2. tenantRef check
      const tenantSnapMock = {
        exists: () => true,
      };
      // 3. resolverConfiguracionInicial (caract, features, device)
      const caractSnapMock = {
        exists: () => true,
        val: () => ({ roles: { mesero: true } }),
      };
      const featSnapMock = { exists: () => false };
      const deviceSnapMock = { exists: () => false };

      (get as jest.Mock)
        .mockResolvedValueOnce(codeSnapMock) // resolverAccessCode
        .mockResolvedValueOnce(tenantSnapMock) // tenant check
        .mockResolvedValueOnce(caractSnapMock) // resolverConfiguracion (caract)
        .mockResolvedValueOnce(featSnapMock) // resolverConfiguracion (features)
        .mockResolvedValueOnce(deviceSnapMock) // resolverConfiguracion (device)
        .mockResolvedValueOnce(codeSnapMock) // update usos (get actual de nuevo)
        .mockResolvedValueOnce(caractSnapMock); // 7. Cargar features (caracteristicas)

      (set as jest.Mock).mockResolvedValue(undefined);
      (update as jest.Mock).mockResolvedValue(undefined);

      const result = await ensamblador.instalar('PUEBLA-01', 'Tablet Caja');

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.dispositivo.estado).toBe('activo');
        expect(result.dispositivo.nivelOperativo).toBe('operador');
        expect(update).toHaveBeenCalledWith(
          expect.objectContaining({ path: 'access_codes/PUEBLA-01' }),
          expect.objectContaining({ usosActuales: 5 })
        );
      }
    });
  });
});
