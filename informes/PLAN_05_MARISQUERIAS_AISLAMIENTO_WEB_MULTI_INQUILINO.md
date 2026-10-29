# PLAN DE IMPLEMENTACIÓN 05: AISLAMIENTO MULTI-INQUILINO EN WEB (MARISQUERÍAS)

**Módulo**: Aplicación de Categoría (Marisquerías)  
**Ámbito**: Almacenamiento Local, Persistencia de Sesión y Aislamiento por Pestaña  
**Estado**: Listo para Ejecución  

---

## 1. Contexto y Objetivos
Durante las pruebas de auditoría concurrente con múltiples prospectos de negocios reales en el navegador Web (`http://localhost:8081`), se observó una colisión total de sesiones:
- Al abrir la Pestaña 1 con el Negocio A e iniciar la Pestaña 2 con el Negocio B, la Pestaña 2 sobrescribía silenciosamente la sesión de la Pestaña 1.
- Al recargar la Pestaña 1, esta mutaba instantáneamente al Negocio B, cambiando la URL de la base de datos operativa, el catálogo de productos y las mesas activas.

El objetivo de este plan es implementar una arquitectura de almacenamiento Web basada en `window.sessionStorage` para aislar estrictamente las sesiones de cada pestaña o ventana del navegador, permitiendo la operación simultánea de múltiples negocios y terminales en la misma máquina sin interferencia mutua.

---

## 2. Diagnóstico y Causa Raíz

### 2.1 Mapeo Global de AsyncStorage en Web
- En navegadores web, el paquete `@react-native-async-storage/async-storage` mapea todas sus llamadas (`getItem`, `setItem`, `multiSet`, etc.) directamente sobre `window.localStorage`.
- Como todas las pestañas de `http://localhost:8081` comparten el mismo origen, comparten el mismo bucket global de `localStorage`.

### 2.2 Claves Estáticas sin Espacio de Nombres
- **Archivo**: `src/sistema/store/slices/sesion.ts`
  - Escribe en `export const SESION_STORAGE_KEY = '@system:session:active';`.
- **Archivo**: `src/sistema/instalacion/npb/persistenciaSesionO1.ts`
  - Guarda la configuración en claves globales estáticas:
    - `@sesion:negocio_id`
    - `@sesion:db_url_operativa`
    - `@sesion:rol_activo`
    - `@sesion:ruta_configuracion_secundaria`
- **Archivo**: `src/sistema/instalacion/vinculacion/generar-device-id-adi.ts`
  - Escribe en `localStorage.setItem('@adi_device_id', devId)`. Ambas pestañas comparten el mismo `deviceIdADI`, colisionando en el rastro de presencia en RTDB.

### 2.3 Raíz Operativa Dedicada sin Prefijo
- En `getNegocioStorageKey(rutaNegocio, modulo, clave)`:
  Para negocios con base de datos dedicada, `rutaNegocio` es `''`, por lo que el scope evalúa a `'@raiz:...'` para todos los negocios en la misma máquina, provocando colisión cruzada de caché.

---

## 3. Reglas Arquitectónicas Innegociables
1. **Aislamiento Absoluto por Contexto de Navegación**: Cada pestaña o ventana del navegador debe poseer un almacenamiento completamente aislado e independiente de otras pestañas.
2. **Cero Impacto en Android/iOS Nativo**: La solución debe aplicar exclusivamente a la compilación Web (`Platform.OS === 'web'`). En plataformas móviles nativas, se mantiene intacto el almacenamiento seguro de SQLite provisto por `AsyncStorage`.
3. **Cero Contaminación de URLs**: No se deben forzar prefijos o parámetros en las URLs (`?tenant=...` o rutas dinámicas), respetando la arquitectura de rutas limpia de Expo Router.
4. **Persistencia Resiliente ante Recarga (F5)**: Si el usuario presiona F5 en la Pestaña 1, la sesión de la Pestaña 1 debe mantenerse intacta sin cerrarse ni cambiar de negocio.

---

## 4. Archivos Afectados
1. `src/sistema/almacenamiento/asyncStorageWeb.ts` (Nuevo adaptador de almacenamiento Web)
2. `metro.config.js` (Redirección de módulo para Web)
3. `src/sistema/instalacion/vinculacion/generar-device-id-adi.ts`
4. `src/sistema/store/slices/sesion.ts`

---

## 5. Procedimiento Paso a Paso

### Paso 1: Crear el Adaptador Web Basado en `sessionStorage`
Crear el archivo `src/sistema/almacenamiento/asyncStorageWeb.ts`:
1. Implementar la interfaz completa de `AsyncStorage` utilizando `window.sessionStorage` con fallback en memoria para entornos SSR/Jest:
   ```typescript
   class AsyncStorageWeb {
     private getStorage(): Storage | null {
       if (typeof window !== 'undefined' && window.sessionStorage) {
         return window.sessionStorage;
       }
       return null;
     }

     async getItem(key: string): Promise<string | null> {
       const storage = this.getStorage();
       return storage ? storage.getItem(key) : null;
     }

     async setItem(key: string, value: string): Promise<void> {
       const storage = this.getStorage();
       if (storage) storage.setItem(key, value);
     }

     async removeItem(key: string): Promise<void> {
       const storage = this.getStorage();
       if (storage) storage.removeItem(key);
     }

     async multiGet(keys: readonly string[]): Promise<[string, string | null][]> {
       const storage = this.getStorage();
       return keys.map((k) => [k, storage ? storage.getItem(k) : null]);
     }

     async multiSet(keyValuePairs: readonly [string, string][]): Promise<void> {
       const storage = this.getStorage();
       if (storage) {
         keyValuePairs.forEach(([k, v]) => storage.setItem(k, v));
       }
     }

     async multiRemove(keys: readonly string[]): Promise<void> {
       const storage = this.getStorage();
       if (storage) {
         keys.forEach((k) => storage.removeItem(k));
       }
     }

     async getAllKeys(): Promise<readonly string[]> {
       const storage = this.getStorage();
       if (!storage) return [];
       return Object.keys(storage);
     }

     async clear(): Promise<void> {
       const storage = this.getStorage();
       if (storage) storage.clear();
     }
   }

   const asyncStorageWebInstance = new AsyncStorageWeb();
   export default asyncStorageWebInstance;
   ```

### Paso 2: Configurar Resolución en Metro (`metro.config.js`)
En `metro.config.js`:
1. Configurar `resolveRequest` para redirigir `@react-native-async-storage/async-storage` al adaptador Web cuando la plataforma sea `'web'`:
   ```javascript
   const defaultResolveRequest = config.resolver.resolveRequest;
   config.resolver.resolveRequest = (context, moduleName, platform) => {
     if (platform === 'web' && moduleName === '@react-native-async-storage/async-storage') {
       return {
         type: 'sourceFile',
         filePath: path.resolve(__dirname, 'src/sistema/almacenamiento/asyncStorageWeb.ts'),
       };
     }
     if (defaultResolveRequest) {
       return defaultResolveRequest(context, moduleName, platform);
     }
     return context.resolveRequest(context, moduleName, platform);
   };
   ```

### Paso 3: Aislar Identificador de Dispositivo en Web
En `src/sistema/instalacion/vinculacion/generar-device-id-adi.ts`:
1. Actualizar la persistencia del ID para que en Web utilice `sessionStorage`:
   ```typescript
   if (typeof window !== 'undefined' && window.sessionStorage) {
     devId = window.sessionStorage.getItem('@adi_device_id');
     if (!devId) {
       devId = generarIdUnico();
       window.sessionStorage.setItem('@adi_device_id', devId);
     }
   }
   ```
2. Esto asegura que la Pestaña 1 y la Pestaña 2 tengan identificadores de dispositivo únicos ante la base de datos operativa y los servicios de auditoría.

---

## 6. Criterios de Verificación y Pruebas
1. **Prueba de Pestañas Concurrentes**:
   - Abrir Pestaña 1 e ingresar el código de acceso del Negocio A (ej. `PUERTO-01`).
   - Abrir Pestaña 2 e ingresar el código de acceso del Negocio B (ej. `ARRECIFE-02`).
   - En la Pestaña 1, verificar que se muestra el nombre y datos del Negocio A.
   - En la Pestaña 2, verificar que se muestra el nombre y datos del Negocio B.
2. **Prueba de Recarga (F5)**:
   - Recargar (F5) la Pestaña 1: debe continuar en el Negocio A, con su rol y mesas correspondientes.
   - Recargar (F5) la Pestaña 2: debe continuar en el Negocio B.
3. **Prueba de Cierre de Sesión Aislado**:
   - En la Pestaña 2, desvincular o cerrar sesión.
   - La Pestaña 1 debe permanecer completamente operativa en el Negocio A sin interrupciones.
