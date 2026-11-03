import AsyncStorage from '@react-native-async-storage/async-storage';
import { isDeviceRegistered } from '../vinculacionDispositivo';
import * as persistenciaO1 from '../../instalacion/npb/persistenciaSesionO1';
import * as servicioSesion from '../../usuarios/servicio_sesion_dispositivo';

jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn(async () => 'device-mock-123'),
  getDeviceId: jest.fn(() => 'mock-device'),
  getBrand: jest.fn(() => 'TestBrand'),
  getModel: jest.fn(() => 'TestModel'),
  getSystemVersion: jest.fn(() => '14'),
  getSystemName: jest.fn(() => 'Android'),
  isEmulator: jest.fn(async () => false),
}));

describe('vinculacionDispositivo - Resiliencia y Auto-reparación', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  it('retorna false si no existe vínculo ni sesión alguna', async () => {
    const registrado = await isDeviceRegistered();
    expect(registrado).toBe(false);
  });

  it('retorna true directamente si adi_dispositivo_vinculado está presente y activo', async () => {
    await AsyncStorage.setItem(
      'adi_dispositivo_vinculado',
      JSON.stringify({
        deviceIdADI: 'ADI-TEST-1234',
        estado: 'activo',
      })
    );

    const registrado = await isDeviceRegistered();
    expect(registrado).toBe(true);
  });

  it('auto-repara y retorna true si existe sesión O1 válida en persistencia', async () => {
    jest.spyOn(persistenciaO1, 'leerSesionO1').mockResolvedValueOnce({
      existe: true,
      valida: true,
      expirada: false,
      sesion: {
        negocio_id: 'puerto_libres',
        slug_categoria: 'marisquerias',
        version_npb_origen: 1,
        codigo_acceso_hash: 'hash123',
        rol_activo: 'administrador',
        timestamp_arranque: Date.now(),
        estadoEncendido: null,
      },
    });

    const registrado = await isDeviceRegistered();
    expect(registrado).toBe(true);

    // Debe haber auto-reparado el flag en AsyncStorage
    const guardadoRaw = await AsyncStorage.getItem('adi_dispositivo_vinculado');
    expect(guardadoRaw).not.toBeNull();
    const guardado = JSON.parse(guardadoRaw!);
    expect(guardado.estado).toBe('activo');
    expect(guardado.negocioId).toBe('puerto_libres');
  });

  it('auto-repara y retorna true si existe sesión operativa local activa', async () => {
    jest.spyOn(persistenciaO1, 'leerSesionO1').mockResolvedValueOnce({
      existe: false,
      valida: false,
      expirada: false,
      sesion: null,
    });

    jest.spyOn(servicioSesion, 'obtenerSesionOperativaLocal').mockResolvedValueOnce({
      dispositivo_id: 'ADI-DEV-5678',
      instalacion_id: 'ADI-DEV-5678',
      usuario_id: 'usr_alan',
      usuario_nombre: 'Alan',
      cargo: 'administrador',
      slot_id: '01',
      token_sesion: 'tok_123',
      plataforma: 'native',
      estado: 'activa',
      fecha_inicio: Date.now(),
      ultima_actividad: Date.now(),
    });

    const registrado = await isDeviceRegistered();
    expect(registrado).toBe(true);

    const guardadoRaw = await AsyncStorage.getItem('adi_dispositivo_vinculado');
    expect(guardadoRaw).not.toBeNull();
    const guardado = JSON.parse(guardadoRaw!);
    expect(guardado.estado).toBe('activo');
    expect(guardado.deviceIdADI).toBe('ADI-DEV-5678');
    expect(guardado.usuarioId).toBe('usr_alan');
  });
});
