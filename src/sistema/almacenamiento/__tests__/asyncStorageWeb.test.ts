import { AsyncStorageWeb } from '../asyncStorageWeb';

describe('AsyncStorageWeb', () => {
  let adapter: AsyncStorageWeb;

  beforeEach(() => {
    adapter = new AsyncStorageWeb();
  });

  describe('Con fallback en memoria (sin window.sessionStorage)', () => {
    it('debe almacenar y recuperar elementos correctamente', async () => {
      await adapter.setItem('test_key', 'test_value');
      const val = await adapter.getItem('test_key');
      expect(val).toBe('test_value');
    });

    it('debe devolver null para claves inexistentes', async () => {
      const val = await adapter.getItem('non_existent');
      expect(val).toBeNull();
    });

    it('debe eliminar elementos con removeItem', async () => {
      await adapter.setItem('key_to_remove', 'val');
      await adapter.removeItem('key_to_remove');
      const val = await adapter.getItem('key_to_remove');
      expect(val).toBeNull();
    });

    it('debe soportar multiSet, multiGet y multiRemove', async () => {
      await adapter.multiSet([
        ['k1', 'v1'],
        ['k2', 'v2'],
      ]);

      const res = await adapter.multiGet(['k1', 'k2', 'k3']);
      expect(res).toEqual([
        ['k1', 'v1'],
        ['k2', 'v2'],
        ['k3', null],
      ]);

      await adapter.multiRemove(['k1']);
      expect(await adapter.getItem('k1')).toBeNull();
      expect(await adapter.getItem('k2')).toBe('v2');
    });

    it('debe listar todas las claves con getAllKeys y limpiar con clear', async () => {
      await adapter.setItem('a', '1');
      await adapter.setItem('b', '2');
      const keys = await adapter.getAllKeys();
      expect(keys).toContain('a');
      expect(keys).toContain('b');

      await adapter.clear();
      const keysAfter = await adapter.getAllKeys();
      expect(keysAfter).toEqual([]);
    });

    it('debe soportar mergeItem para objetos JSON', async () => {
      await adapter.setItem('config', JSON.stringify({ a: 1, b: 2 }));
      await adapter.mergeItem('config', JSON.stringify({ b: 3, c: 4 }));
      const merged = JSON.parse((await adapter.getItem('config')) || '{}');
      expect(merged).toEqual({ a: 1, b: 3, c: 4 });
    });
  });

  describe('Con window.sessionStorage simulado', () => {
    const mockStorage: Record<string, string> = {};

    beforeAll(() => {
      (global as any).window = {
        sessionStorage: {
          getItem: jest.fn((k: string) => mockStorage[k] ?? null),
          setItem: jest.fn((k: string, v: string) => {
            mockStorage[k] = v;
          }),
          removeItem: jest.fn((k: string) => {
            delete mockStorage[k];
          }),
          clear: jest.fn(() => {
            Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
          }),
        },
      };
    });

    afterAll(() => {
      delete (global as any).window;
    });

    beforeEach(async () => {
      await adapter.clear();
    });

    it('debe utilizar window.sessionStorage cuando esté presente', async () => {
      await adapter.setItem('session_key', 'session_val');
      expect((global as any).window.sessionStorage.setItem).toHaveBeenCalledWith(
        'session_key',
        'session_val'
      );
      const val = await adapter.getItem('session_key');
      expect(val).toBe('session_val');
    });
  });
});
