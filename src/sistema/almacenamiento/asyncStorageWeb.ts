/**
 * 📦 ADAPTADOR DE ALMACENAMIENTO PARA EXPO WEB (SESIONES AISLADAS POR PESTAÑA)
 *
 * Utiliza window.sessionStorage en lugar de window.localStorage.
 * Esto asegura que cada pestaña o ventana del navegador conserve su propia
 * sesión activa, dispositivo virtual y negocio vinculado sin colisionar
 * con otras pestañas en el mismo origen (ej: http://localhost:8081).
 */

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.sessionStorage) {
    return window.sessionStorage;
  }
  return null;
}

const memoryFallback = new Map<string, string>();

function createPromise<T>(
  getValue: () => T,
  callback?: (err: any, result?: T) => void
): Promise<T> {
  return new Promise((resolve, reject) => {
    try {
      const value = getValue();
      callback?.(null, value);
      resolve(value);
    } catch (err) {
      callback?.(err);
      reject(err);
    }
  });
}

const AsyncStorageWeb = {
  getItem: (
    key: string,
    callback?: (err: any, result?: string | null) => void
  ): Promise<string | null> => {
    return createPromise(() => {
      const storage = getStorage();
      if (storage) return storage.getItem(key);
      return memoryFallback.get(key) ?? null;
    }, callback);
  },

  setItem: (key: string, value: string, callback?: (err: any) => void): Promise<void> => {
    return createPromise(() => {
      const storage = getStorage();
      if (storage) {
        storage.setItem(key, value);
      } else {
        memoryFallback.set(key, value);
      }
    }, callback);
  },

  removeItem: (key: string, callback?: (err: any) => void): Promise<void> => {
    return createPromise(() => {
      const storage = getStorage();
      if (storage) {
        storage.removeItem(key);
      } else {
        memoryFallback.delete(key);
      }
    }, callback);
  },

  clear: (callback?: (err: any) => void): Promise<void> => {
    return createPromise(() => {
      const storage = getStorage();
      if (storage) {
        storage.clear();
      } else {
        memoryFallback.clear();
      }
    }, callback);
  },

  getAllKeys: (
    callback?: (err: any, result?: readonly string[]) => void
  ): Promise<readonly string[]> => {
    return createPromise(() => {
      const storage = getStorage();
      if (storage) {
        const keys: string[] = [];
        for (let i = 0; i < storage.length; i++) {
          const k = storage.key(i);
          if (k) keys.push(k);
        }
        return keys;
      }
      return Array.from(memoryFallback.keys());
    }, callback);
  },

  multiGet: (
    keys: readonly string[],
    callback?: (err: any, result?: readonly [string, string | null][]) => void
  ): Promise<readonly [string, string | null][]> => {
    return createPromise(() => {
      const storage = getStorage();
      return keys.map((key) => {
        const val = storage ? storage.getItem(key) : (memoryFallback.get(key) ?? null);
        return [key, val] as [string, string | null];
      });
    }, callback);
  },

  multiSet: (
    keyValuePairs: readonly (readonly [string, string])[],
    callback?: (err: any) => void
  ): Promise<void> => {
    return createPromise(() => {
      const storage = getStorage();
      for (const [key, val] of keyValuePairs) {
        if (storage) {
          storage.setItem(key, val);
        } else {
          memoryFallback.set(key, val);
        }
      }
    }, callback);
  },

  multiRemove: (keys: readonly string[], callback?: (err: any) => void): Promise<void> => {
    return createPromise(() => {
      const storage = getStorage();
      for (const key of keys) {
        if (storage) {
          storage.removeItem(key);
        } else {
          memoryFallback.delete(key);
        }
      }
    }, callback);
  },

  mergeItem: async (
    key: string,
    value: string,
    callback?: (err: any) => void
  ): Promise<void> => {
    const existing = await AsyncStorageWeb.getItem(key);
    let merged = value;
    if (existing) {
      try {
        const oldObj = JSON.parse(existing);
        const newObj = JSON.parse(value);
        merged = JSON.stringify({ ...oldObj, ...newObj });
      } catch {
        merged = value;
      }
    }
    await AsyncStorageWeb.setItem(key, merged, callback);
  },

  useAsyncStorage: (key: string) => ({
    getItem: (callback?: (err: any, result?: string | null) => void) =>
      AsyncStorageWeb.getItem(key, callback),
    setItem: (value: string, callback?: (err: any) => void) =>
      AsyncStorageWeb.setItem(key, value, callback),
    mergeItem: (value: string, callback?: (err: any) => void) =>
      AsyncStorageWeb.mergeItem(key, value, callback),
    removeItem: (callback?: (err: any) => void) =>
      AsyncStorageWeb.removeItem(key, callback),
  }),
};

export default AsyncStorageWeb;
