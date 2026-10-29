/**
 * Adaptador de almacenamiento Web basado en window.sessionStorage.
 *
 * Provee aislamiento estricto por pestaña/ventana en navegadores web,
 * evitando la colisión cruzada entre múltiples negocios o terminales
 * que comparten el mismo origen en desarrollo o producción web.
 *
 * Mantiene compatibilidad total con la API de AsyncStorage.
 */

class AsyncStorageWeb {
  private inMemoryFallback: Map<string, string> = new Map();

  private getStorage(): Storage | null {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
    return null;
  }

  async getItem(key: string): Promise<string | null> {
    const storage = this.getStorage();
    if (storage) {
      return storage.getItem(key);
    }
    return this.inMemoryFallback.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    const storage = this.getStorage();
    if (storage) {
      storage.setItem(key, value);
    } else {
      this.inMemoryFallback.set(key, value);
    }
  }

  async removeItem(key: string): Promise<void> {
    const storage = this.getStorage();
    if (storage) {
      storage.removeItem(key);
    } else {
      this.inMemoryFallback.delete(key);
    }
  }

  async multiGet(keys: readonly string[]): Promise<[string, string | null][]> {
    const storage = this.getStorage();
    return keys.map((k) => [
      k,
      storage ? storage.getItem(k) : (this.inMemoryFallback.get(k) ?? null),
    ]);
  }

  async multiSet(keyValuePairs: readonly [string, string][]): Promise<void> {
    const storage = this.getStorage();
    if (storage) {
      keyValuePairs.forEach(([k, v]) => storage.setItem(k, v));
    } else {
      keyValuePairs.forEach(([k, v]) => this.inMemoryFallback.set(k, v));
    }
  }

  async multiRemove(keys: readonly string[]): Promise<void> {
    const storage = this.getStorage();
    if (storage) {
      keys.forEach((k) => storage.removeItem(k));
    } else {
      keys.forEach((k) => this.inMemoryFallback.delete(k));
    }
  }

  async getAllKeys(): Promise<readonly string[]> {
    const storage = this.getStorage();
    if (storage) {
      return Object.keys(storage);
    }
    return Array.from(this.inMemoryFallback.keys());
  }

  async clear(): Promise<void> {
    const storage = this.getStorage();
    if (storage) {
      storage.clear();
    } else {
      this.inMemoryFallback.clear();
    }
  }

  async mergeItem(key: string, value: string): Promise<void> {
    const existing = await this.getItem(key);
    if (!existing) {
      await this.setItem(key, value);
      return;
    }
    try {
      const merged = JSON.stringify({
        ...JSON.parse(existing),
        ...JSON.parse(value),
      });
      await this.setItem(key, merged);
    } catch {
      await this.setItem(key, value);
    }
  }
}

const asyncStorageWebInstance = new AsyncStorageWeb();

export default asyncStorageWebInstance;
export { AsyncStorageWeb };
