# INFORME DE AUDITORÍA: SEGURIDAD, ARQUITECTURA MULTI-INQUILINO Y DEUDA TÉCNICA (NPB / ESTADO / AISLAMIENTO)

**Módulo**: Aplicación de Categoría (Marisquerías)  
**Repositorio**: `/home/st/Escritorio/marisquerias`  
**Rama**: `rama-2`  
**Stack auditado**: React Native 0.86 / Expo Router v57 (React 19) + Firebase RTDB + expo-sqlite + Zustand  
**Autoridad**: Mariscal y Arquitecto Principal de Aplicación de Categoría  
**Fecha de Emisión**: 2026-10-28  

---

## 1. Resumen Ejecutivo y Dictamen de Aislamiento

Tras una inspección estricta y exhaustiva del código fuente del repositorio `marisquerias`, se emite un dictamen de **CRÍTICO: RIESGO DE FUGA INTER-INQUILINO Y VIOLACIÓN DE AISLAMIENTO MULTI-TENANT**.

Si bien el proyecto cuenta con directrices como el "Dogma V2: Un Solo Store", guards en rutas y el arranque O(1) con contratos congelados de NPB, se identificaron **12 brechas críticas de aislamiento multi-inquilino** y deuda técnica acumulada:
1. **Contaminación silenciosa de la Unidad Secundaria**: El resolvedor central de bases de datos (`firebase.ts`) cae en un fallback silente hacia `Unidad Secundaria` si la URL operativa del negocio no está resuelta. Operaciones de lectura y escritura transaccionales terminan grabándose en la base maestra del Ecosistema.
2. **Causa raíz descubierta del incidente INC-001**: La interacción desincronizada entre `cargarEstadoPersistido` (en `store/index.ts`) y `EnsambladorInstalacion` consulta la existencia del dispositivo contra `getRtdb()` antes de hidratar `operacionUrl`, lo que consulta a Unidad Secundaria, declara al dispositivo como desconocido/reemplazado, y borra la sesión local al regresar de background.
3. **Persistencia local SQLite (`adi_pos_offline.db`) agnóstica de inquilino**: Las tablas `menu_productos`, `menu_categorias`, `mesas`, `pedidos`, `ventas_offline` y `print_queue` no tienen columna de `negocio_id` ni de `ruta_negocio`. El catálogo, las mesas y las ventas fuera de línea de un negocio se mezclan y filtran al siguiente inquilino que use la misma terminal.
4. **Fuga en borradores de mesas (`order_drafts_v1`)**: Aunque la documentación estipula aislamiento por `negocioId`, la tabla en SQLite carece de dicha columna y las consultas filtran únicamente por `deviceId`.
5. **Oyentes huérfanos de impresión en segundo plano (`DespachadorCola`)**: Mantiene un registro estático de instancias con listeners (`onChildAdded`) sobre la cola de RTDB que **nunca se destruyen en `clearSession()` ni en `desvincularNegocioO1()`**, permitiendo que un dispositivo siga procesando tickets de un negocio tras desvincularlo.
6. **Bypass total de los guardias de seguridad en `app/_layout.tsx`**: La comprobación `PUBLIC_ROUTES = ['/']` combinada con `pathname.includes(route)` evalúa a `true` en el 100% de las rutas de la app, apagando permanentemente `useAuthGuard` y `useGobernanzaRealtime`.
7. **Colisión de claves en bases dedicadas (`rutaNegocio = '/'`)**: Para inquilinos con base de datos RTDB independiente, las claves generadas por `getNegocioStorageKey` colisionan en `@/:hardware:...` y `@theme_preference_/`.
8. **Acumulación de basura técnica y dependencias fantasma**: Paquetes como Vite, `@tailwindcss/vite`, TailwindCSS v4, Lucide React, BLE Plx y Playwright están instalados en `package.json` sin una sola línea de consumo.

---

## 2. Detección de Código Legacy y Basura Técnica de NPB

### 2.1. Dependencias Fantasma en `package.json`
El proyecto contiene dependencias pesadas e incompatibles que quedaron como residuo de refactorizaciones o pruebas:

| Dependencia | Tipo | Estado en Código | Riesgo / Impacto |
| :--- | :--- | :--- | :--- |
| `@tailwindcss/vite` (`^4.3.3`) | `dependencies` | **0 referencias** en `src/` y `app/` | Basura técnica. Vite no es el bundler de Expo (usa Metro). |
| `@vitejs/plugin-react` (`^6.1.1`) | `dependencies` | **0 referencias** | Basura técnica. Confusión de herramientas. |
| `vite` (`^8.3.0`) | `dependencies` | **0 referencias** | Basura técnica. Peso innecesario en `node_modules` y lockfile. |
| `tailwindcss` (`^4.3.3`) | `dependencies` | **0 referencias** | El proyecto usa React Native `StyleSheet` y un sistema de temas propio (`src/compartido/temas`). |
| `lucide-react` (`^1.44.0`) | `dependencies` | **0 referencias** | Se utiliza `@expo/vector-icons` y SVG nativo. `lucide-react` es para DOM/Web. |
| `react-native-ble-plx` (`^3.5.0`) | `dependencies` | **0 referencias** | El hardware Bluetooth se maneja exclusivamente con `react-native-bluetooth-classic`. |
| `playwright` / `@playwright/test` (`^1.56.1`) | `devDependencies` | **0 referencias** | No existen suites ni configs de Playwright; los tests son Jest/ts-jest. |
| `chromium-edge-launcher` (`^0.3.0`) | `devDependencies` | **0 referencias directas** | Residuo de scripts antiguos. |
| `@types/lodash` (`^4.17.21`) | `dependencies` | Ubicación errónea | Debe estar en `devDependencies`. |

### 2.2. Dualidad Arquitectónica: `EnsambladorInstalacion` vs `useArranqueSistema`
- **Ruta**: `src/sistema/instalacion/ensambladores/EnsambladorInstalacion.ts` y `src/sistema/instalacion/runtime/resolver-configuracion-inicial.ts`.
- Coexisten dos motores de vinculación: el motor canónico O(1) (`useArranqueSistema.ts` + `persistenciaSesionO1.ts` + `cargarNPB.ts` + `encenderCapacidades.ts`) y el ensamblador legacy (`EnsambladorInstalacion.ts`).
- `useAuth.ts` y `store/index.ts:cargarEstadoPersistido()` siguen importando y ejecutando `EnsambladorInstalacion`, generando fallos cruzados de sesión.

### 2.3. Código Hardcodeado de Pruebas y Detección Ingenua de Plantilla
- En `src/sistema/instalacion/vinculacion/resolver-access-code.ts` (L180): `cleanCode === 'NPB00-TEST'` está cableado directamente en el flujo de producción.
- En `src/ui/pantallas/PantallaVinculacion.tsx` (L41-43): `codigo.includes("00")` marca como plantilla de pruebas cualquier código real que contenga dos ceros (ej. `REST-001`).

### 2.4. Discrepancias en Rutas Candidatas de NPB
- `cargarNPB.ts` busca primero en la ruta canónica del Ecosistema: `negocio/${cleanSlug}-00`.
- Sin embargo, `monitorConexionO1.ts:revalidarVersionNPB()` **no incluye `negocio/${cleanSlug}-00`**, provocando que el monitor de reconexión jamás detecte actualizaciones remotas en plantillas selladas en la ruta canónica.

---

## 3. Fugas de Estado entre Inquilinos (Multi-Tenancy Leaks)

### 3.1. Fallback Silente a Unidad Secundaria en `firebase.ts` (Severidad: CRÍTICA)
- En `src/sistema/firebase/firebase.ts` (L115-124), si `urlDirecta` o `_leerUrlOperativaDelStore()` es nulo, `getOperacionRtdb()` retorna `getSecundariaRtdb()`.
- Cualquier escritura operativa sin sesión activa o en hidratación escribe silenciosamente en Unidad Secundaria, corrompiendo la base maestra.

### 3.2. Causa Raíz de INC-001: Desvinculación Involuntaria al Cambiar de App (Severidad: CRÍTICA)
- En `src/sistema/store/index.ts` (L203-220), `store.loadDataSources()` se ejecuta **después** de llamar a `getRtdb()`.
- Como `operacionUrl` aún no está cargada en memoria, `getRtdb()` retorna Unidad Secundaria.
- `EnsambladorInstalacion` consulta el dispositivo en Unidad Secundaria, no lo encuentra, asume que fue revocado y ejecuta `desvincularLocalmente()`.
- Al volver de background, la sesión del usuario ha sido purgada forzando reingreso de credenciales.

### 3.3. SQLite Storage (`adi_pos_offline.db`) Global y sin Namespace (Severidad: CRÍTICA)
- Las tablas locales en SQLite no tienen columna `negocio_id`.
- Catálogo, mesas y ventas fuera de línea de un negocio persisten y se leen por el siguiente negocio que opere la terminal.
- `SQLiteStorageAdapter.clearAll()` nunca es invocado en `clearSession()` ni en `desvincularNegocioO1()`.

### 3.4. Fuga de Borradores de Comanda en `borradores.repositorio.ts` (Severidad: ALTA)
- La tabla `order_drafts_v1` en SQLite filtra únicamente por `deviceId`.
- Dos negocios que operen en la misma terminal física comparten borradores de comanda abiertos por mesa.

### 3.5. Fuga de Listeners de Spool en `DespachadorCola` (Severidad: CRÍTICA)
- `DespachadorCola` guarda sus instancias en un `Map` estático.
- Ni `clearSession()` ni `desvincularNegocioO1()` destruyen las instancias.
- El dispositivo sigue escuchando tickets del negocio previo e imprimiéndolos físicamente tras desvincular.

### 3.6. Persistencia Incompleta y Reseteo Roto en Zustand (Severidad: CRÍTICA)
- La acción `clearSession()` solo limpia el slice de sesión. No invoca `resetNegocioScopedSlices()`.
- Slices de `operacion`, `mesas`, `pedidos` e `inventario` sobreviven en memoria tras el cierre de sesión.

### 3.7. Falla de Claves en AsyncStorage para Bases Dedicadas (`rutaNegocio = '/'`) (Severidad: ALTA)
- En negocios con RTDB propia (`rutaNegocio = '/'`), `getNegocioStorageKey` genera prefijos `@/:...`.
- Todos los negocios con base dedicada comparten las mismas entradas de hardware y configuración en almacenamiento local.

### 3.8. Bypass de AuthGuard y Gobernanza en `app/_layout.tsx` (Severidad: CRÍTICA)
- La comprobación `PUBLIC_ROUTES.some((route) => pathname.includes(route))` con `PUBLIC_ROUTES = ['/']` es siempre `true` porque toda ruta en Expo Router inicia con `/`.
- `useAuthGuard` y `useGobernanzaRealtime` permanecían permanentemente apagados.

---

## 4. Matriz de Hallazgos y Severidad

| ID | Hallazgo | Severidad | Ubicación | Impacto |
| :--- | :--- | :--- | :--- | :--- |
| **H-01** | Fallback silente a Unidad Secundaria en `getOperacionRtdb` | **CRÍTICA** | `src/sistema/firebase/firebase.ts:118` | Contamina base maestra con datos operativos. |
| **H-02** | Causa raíz INC-001: Desvinculación por carrera de arranque | **CRÍTICA** | `src/sistema/store/index.ts:203` | Cierre de sesión y bloqueo al alternar apps. |
| **H-03** | SQLite sin discriminación de inquilino (`adi_pos_offline.db`) | **CRÍTICA** | `src/sistema/sin_conexion/.../index.native.ts:114` | Menú, ventas y mesas cruzadas en offline. |
| **H-04** | Bypass permanente de AuthGuard y Gobernanza en layout | **CRÍTICA** | `app/_layout.tsx:56` | Desactiva toda la seguridad de rutas y suspensión cloud. |
| **H-05** | Listeners de spool de impresión huérfanos tras logout | **CRÍTICA** | `src/sistema/impresion/fierros/cola/DespachadorCola.ts:124` | Impresión de tickets de inquilinos anteriores tras desvincular. |
| **H-06** | `clearSession()` no resetea slices operativos ni inventario | **CRÍTICA** | `src/sistema/store/slices/sesion.ts:165` | Estado residual en memoria disponible para nuevo login. |
| **H-07** | Borradores de mesa (`order_drafts_v1`) sin columna de negocio | **ALTA** | `src/sistema/persistencia/borradores.repositorio.ts:68` | Comandas en borrador compartidas entre negocios. |
| **H-08** | Colisión de claves AsyncStorage en bases dedicadas (`rutaNegocio = '/'`) | **ALTA** | `src/sistema/store/slices/sesion.ts:48` | Sobreescritura cruzada de configs y hardware en bases dedicadas. |
| **H-09** | Fuga de eventos de delivery en `COLA_PENDIENTES` | **MEDIA-ALTA** | `src/capacidades/logistica/DespachadorEventosLogisticos.ts:170` | Reintento de misiones del negocio A en la sesión del negocio B. |
| **H-10** | Detección de plantilla NPB ingenua (`includes("00")`) | **MEDIA** | `src/ui/pantallas/PantallaVinculacion.tsx:42` | Confusión visual de operadores en negocios reales. |
| **H-11** | Discrepancia en rutas de plantilla NPB en reconexión | **MEDIA** | `src/sistema/instalacion/reconexion/monitorConexionO1.ts:35` | Imposibilidad de detectar actualizaciones de plantillas canónicas. |
| **H-12** | 9 dependencias fantasma en `package.json` | **MEDIA** | `package.json:39-102` | Inflado de bundle, lentitud de CI y confusión de stack. |

---

## 5. Plan de Acción Inmediato y Recomendaciones

1. **Reparar la condición de `PUBLIC_ROUTES` en `app/_layout.tsx`**:
   Sustituir `pathname.includes('/')` por verificación exacta de rutas públicas:
   `const isPublicRoute = pathname === '/' || pathname === '/index' || pathname.startsWith('/(auth)');`
2. **Eliminar el fallback silente a Unidad Secundaria en `getOperacionRtdb`**:
   Lanzar error si se intenta operar sin URL operativa vinculada.
3. **Reseteo completo de slices en `clearSession()`**:
   Invocar `resetNegocioScopedSlices()` y destruir listeners de `DespachadorCola`.
4. **Purga de dependencias fantasma**:
   Limpiar `package.json` de paquetes incompatibles con Expo/Metro.
5. **Migración de esquema SQLite a Multi-Tenant**:
   Agregar `negocio_id` en las tablas locales y purgar SQLite en desvinculación explícita.
