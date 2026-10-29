import {
  obtenerDeviceIdResiliente,
  resolverDeviceIdADI,
} from '../generar-device-id-adi';

describe('generar-device-id-adi', () => {
  const originalWindow = (global as any).window;

  afterEach(() => {
    (global as any).window = originalWindow;
  });

  describe('En entorno Web con sessionStorage', () => {
    let mockSessionStorage: Record<string, string>;

    beforeEach(() => {
      mockSessionStorage = {};
      (global as any).window = {
        document: {},
        sessionStorage: {
          getItem: jest.fn((k: string) => mockSessionStorage[k] ?? null),
          setItem: jest.fn((k: string, v: string) => {
            mockSessionStorage[k] = v;
          }),
        },
      };
    });

    it('debe generar y persistir un ID nuevo en sessionStorage si no existe', () => {
      const id = obtenerDeviceIdResiliente();
      expect(id).toMatch(/^ADI-web-/);
      expect((global as any).window.sessionStorage.setItem).toHaveBeenCalledWith(
        '@adi_device_id',
        id
      );
    });

    it('debe reutilizar el ID ya almacenado en sessionStorage', () => {
      mockSessionStorage['@adi_device_id'] = 'ADI-web-PESTANA1-123456';
      const id = obtenerDeviceIdResiliente();
      expect(id).toBe('ADI-web-PESTANA1-123456');
    });

    it('resolverDeviceIdADI debe llamar a obtenerDeviceIdResiliente en entorno web', async () => {
      mockSessionStorage['@adi_device_id'] = 'ADI-web-PESTANA2-789012';
      const id = await resolverDeviceIdADI();
      expect(id).toBe('ADI-web-PESTANA2-789012');
    });
  });
});
