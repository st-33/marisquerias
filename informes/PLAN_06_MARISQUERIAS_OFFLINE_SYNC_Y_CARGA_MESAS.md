# PLAN DE IMPLEMENTACIÓN 06: SINCRONIZACIÓN OFFLINE Y CARGA DE MESAS (MARISQUERÍAS)

**Módulo**: Aplicación de Categoría (Marisquerías)  
**Ámbito**: Servicios de Sincronización, Raíz Operativa Dedicada y Vista de Mesero  
**Estado**: Listo para Ejecución  

---

## 1. Contexto y Objetivos
Durante el arranque de la aplicación en el rol de mesero con bases de datos dedicadas recién aprovisionadas, se presentaron dos fallas críticas:
1. **Toast Rojo Emergente de Error**: La aplicación arrojaba inmediatamente un banner de error `[ERROR] [OFFLINE_SYNC: Intento de inicializar ventas con rutaNegocio inválido o legacy]`.
2. **Bloqueo Perpetuo en "Cargando mesas…"**: La vista del mesero se quedaba congelada en un spinner infinito con el texto "Cargando mesas…", impidiendo el acceso a la cuadrícula de atención y bloqueando los pedidos para llevar (*takeaway*).

El objetivo de este plan es corregir la validación de rutas para bases de datos dedicadas en los servicios de sincronización offline y eliminar la condición de bloqueo en la lógica de mesas para soportar bases de datos vacías (0 mesas).

---

## 2. Diagnóstico y Causa Raíz

### 2.1 Causa Raíz del Error de Sincronización Offline
- **Contexto (Regla 9 - Raíz Operativa Dedicada)**: En negocios con RTDB propia exclusiva, los cajones operativos (`/mesas`, `/pedidos`, `/ventas`) residen directamente en la raíz de la base de datos, por lo que la sesión opera con `rutaNegocio = ''`.
- **Inconsistencia de Validación**:
  - En `src/sistema/instalacion/hooks/useInicializacionServiciosNegocio.ts:18`, el hook invoca `validar_ruta_negocio(rutaNegocio, { permitirRaiz: true })`, permitiendo la cadena vacía.
  - Sin embargo, en `src/sistema/servicios/SincronizacionVentasOffline.ts:16-22`:
    ```typescript
    initialize(db: Database, rutaNegocio: string): void {
      if (!validar_ruta_negocio(rutaNegocio)) {
        logger.error(
          'OFFLINE_SYNC',
          'Intento de inicializar ventas con rutaNegocio inválido o legacy',
          new Error(rutaNegocio)
        );
        return;
      }
    ```
    Se invoca `validar_ruta_negocio(rutaNegocio)` **sin** la opción `{ permitirRaiz: true }`.
  - Como `ruta_negocio.ts:85` exige `{ permitirRaiz: true }` para aceptar la raíz `''`, la validación falla y dispara `logger.error`, mostrando el banner rojo en la interfaz.
  - Idéntica omisión ocurre en `src/sistema/servicios/SincronizacionInventarioOffline.ts:15`.

### 2.2 Causa Raíz del Bloqueo Perpetuo en "Cargando mesas…"
- **Archivo**: `src/roles/logica/mesero/gestionarMesas.ts`
  - Líneas 27 y 76-83:
    ```typescript
    const [loading, setLoading] = useState(true);
    ...
    useEffect(() => {
      tablesRef.current = tables;
      if (tables.length > 0 || Object.keys(mesasDelStore).length > 0) {
        setTimeout(() => {
          setLoading(false);
        }, 0);
      }
    }, [tables, mesasDelStore]);
    ```
  - `loading` se inicializa en `true`.
  - Cuando un negocio es nuevo, no tiene mesas en `/mesas`. La RTDB emite `null` y el store inicializa `mesas: {}`.
  - Como `tables.length` es 0 y `Object.keys(mesasDelStore).length` es 0, la condición `0 > 0 || 0 > 0` es `false`.
  - **`setLoading(false)` NUNCA se ejecuta**.
- **Propagación a la UI**:
  - `PuestoMando.tsx:193-209` evalúa `if (showGridLoading)`. Al ser `loading === true` permanentemente, renderiza el spinner infinito en lugar de montar `<CuadriculaMesas />`.
  - Al no montarse `CuadriculaMesas`, el mesero ni siquiera puede ver la tarjeta de pedidos "Para Llevar" (`takeaway`), quedando totalmente inoperante.

---

## 3. Reglas Arquitectónicas Innegociables
1. **Soporte Canónico de Raíz Operativa Dedicada**: Todo servicio, repositorio o sincronizador que reciba `rutaNegocio` debe invocar `validar_ruta_negocio(rutaNegocio, { permitirRaiz: true })`.
2. **Tolerancia a Estado Inicial Vacío**: Una base de datos sin registros (0 mesas, 0 productos, 0 pedidos) es un estado válido del ciclo de vida del negocio. Ninguna pantalla o hook debe bloquearse indefinidamente esperando registros preexistentes.
3. **Respuesta Rápida de Interfaz**: Al completarse la primera sincronización con RTDB (incluso si retorna vacío o snapshot nulo), el indicador de carga debe apagarse inmediatamente para habilitar la interfaz operativa.

---

## 4. Archivos Afectados
1. `src/sistema/servicios/SincronizacionVentasOffline.ts`
2. `src/sistema/servicios/SincronizacionInventarioOffline.ts`
3. `src/roles/logica/mesero/gestionarMesas.ts`
4. `src/sistema/store/slices/operacion.ts`

---

## 5. Procedimiento Paso a Paso

### Paso 1: Permitir Raíz en Servicios de Sincronización
1. En `src/sistema/servicios/SincronizacionVentasOffline.ts` (línea 16):
   ```typescript
   initialize(db: Database, rutaNegocio: string): void {
     if (!validar_ruta_negocio(rutaNegocio, { permitirRaiz: true })) {
       logger.error(
         'OFFLINE_SYNC',
         'Intento de inicializar ventas con rutaNegocio inválido o legacy',
         new Error(rutaNegocio)
       );
       return;
     }
     ...
   ```
2. En `src/sistema/servicios/SincronizacionInventarioOffline.ts` (línea 15):
   ```typescript
   initialize(db: Database, rutaNegocio: string): void {
     if (!validar_ruta_negocio(rutaNegocio, { permitirRaiz: true })) {
       logger.error(
         'OFFLINE_SYNC',
         'Intento de inicializar inventario con rutaNegocio inválido',
         new Error(rutaNegocio)
       );
       return;
     }
     ...
   ```

### Paso 2: Desbloquear Carga de Mesas en `gestionarMesas.ts`
En `src/roles/logica/mesero/gestionarMesas.ts`:
1. Conectar con el indicador de inicialización o timestamp del store de operación (`ultimaActualizacion`):
   ```typescript
   const ultimaActualizacion = useStore((s) => s.ultimaActualizacion);
   ```
2. Actualizar el `useEffect` de carga:
   ```typescript
   useEffect(() => {
     tablesRef.current = tables;
     // Si hay mesas O si el store ya completó al menos una lectura/actualización de RTDB
     if (tables.length > 0 || Object.keys(mesasDelStore).length > 0 || ultimaActualizacion > 0) {
       setTimeout(() => {
         setLoading(false);
       }, 0);
     }
   }, [tables, mesasDelStore, ultimaActualizacion]);
   ```
3. Agregar un temporizador de seguridad (fallback) de 2.5 segundos que fuerce `setLoading(false)` en caso de bases de datos completamente vacías o latencia en el primer snapshot, asegurando que la interfaz jamás quede atrapada.

---

## 6. Criterios de Verificación y Pruebas
1. **Prueba de Inicialización en Raíz Dedicada**:
   - Iniciar sesión con un negocio que use RTDB dedicada (`rutaNegocio = ''`).
   - Comprobar que en la consola y en pantalla **NO** aparece el error `[ERROR] [OFFLINE_SYNC...]`.
2. **Prueba de Carga con 0 Mesas**:
   - Abrir el rol de mesero en un negocio recién creado sin mesas configuradas.
   - El spinner "Cargando mesas…" debe desaparecer tras el primer snapshot (< 500 ms).
   - Debe renderizarse la cuadrícula mostrando el acceso a "Para Llevar" (`takeaway`) y la indicación amigable de "No hay mesas registradas".
3. **Prueba con Mesas Activas**:
   - Crear o asignar 2 mesas en la base de datos.
   - Confirmar que se rendericen normalmente con sus estados (libre, ocupada, por cobrar).
