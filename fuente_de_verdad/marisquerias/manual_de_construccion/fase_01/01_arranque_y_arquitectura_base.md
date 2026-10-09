# INSTRUCCION: ARRANQUE Y ARQUITECTURA BASE

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 01

## ORIGEN

- Terminos: FASE, INSTRUCCION, PASO, ESPECIFICACION, APLICABLE, CATEGORIA, ROL OPERATIVO.
- Formulas: categoria + plantilla_estructural_de_categoria + capacidad = aplicable.
- Plantillas: PLANTILLA DE INSTRUCCION EN MANUAL DE CONSTRUCCION.
- Codigo real: `app/_layout.tsx`, `app/index.tsx`, `src/composicion/*`, `src/sistema/estado/useBootstrapper.ts`, `src/sistema/store/*`.

## CONTRATO DE ENTRADA

- Punto de entrada: `app/index.tsx` redirige a `Redirect href="/access"`.
- Rutas publicas: `const PUBLIC_ROUTES = ['/']` en `app/_layout.tsx`.

## PASO 01: ENTRADA DE LA APLICACION

### ESPECIFICACION

- La raiz `/` resuelve en `app/index.tsx` y redirige a `/access` (flujo normal de autenticacion).
- Ninguna ruta bajo `/_role` se renderiza sin sesion resuelta por `useBootstrapper()`.

## PASO 02: BOOTSTRAP DEL ESTADO

### ESPECIFICACION

- `useBootstrapper()` (retorna `boolean isReady`) hidrata el estado global del store antes de renderizar rutas protegidas.
- Contrato: `isReady: true` es la precondicion de todo render bajo `RootLayoutContent`.

## PASO 03: GUARDAS DE SESION Y NAVEGACION

### ESPECIFICACION

- `useAuthGuard(activo: boolean)` protege rutas no publicas; redirige a `/access` sin sesion.
- `useGobernanzaRealtime(activo: boolean)` escucha configuracion remota en tiempo real.
- `ROUTE_FEATURES: Record<string, { generic?: string; admin?: string[] }>` mapea ruta -> feature. Ej: `'/_role/mesero': { generic: 'restaurante.mesas' }`, `'/_role/admin/menu': { admin: ['admin_menu'] }`.
- Guardia de fabrica: si la ruta matchea y la feature no esta habilitada, `router.replace('/_role/roles')`.

## PASO 04: ARBOL DE PROVEEDORES

### ESPECIFICACION

- Orden exacto en `RootLayout`: `ThemeProvider` -> `RootLayoutContent` -> `ProveedorFierros` -> `ProveedorConfiguracionNegocio` -> `GestorHubGlobal` -> `GestureHandlerRootView` -> `ProveedorAudioNotificaciones`.
- `useInicializacionServiciosNegocio({ estadoInstalacion, rutaNegocio })` orquesta servicios sin logica de negocio en layout.
- `operacionDb = getRtdb(dataSources.operacionUrl ?? undefined)` resuelve la RTDB operacional.

## PASO 05: REGISTRO DE PANTALLAS

### ESPECIFICACION

- `REGISTRO_PANTALLAS: Record<string, { Screen: React.ComponentType<any> }>` mapea clave de rol a vista.
- Claves: `selector_roles`, `cocina`, `mesero`, `mostrador`, `admin_dashboard`, `admin_menu`, `admin_tables`, `admin_inventory`, `admin_repart`, `admin_mostrador`.
- `resolvedorPantalla.tsx` produce `ScreenResuelto { Screen; props; loading; error; niche; category }`.

## PASO 06: MOTOR DE ARRANQUE

### ESPECIFICACION

- `src/motor/nucleo/contratos.ts` declara `TipoActor = 'negocio' | 'publico' | 'central' | 'repartidor' | 'sistema' | 'automatizacion'`.
- `Actor { tipo: TipoActor; id: string }` y `IdentidadNegocio { rutaNegocio; negocioId; categoriaId }` son los contratos base del nucleo.
- `VERSION_ESQUEMA_MOTOR = 1` fija la version del esquema del motor.

## CONTRATO DE SALIDA

- Al completar la fase, la aplicacion arranca con: sesion hidratada, guardas activas, arbol de proveedores montado y registro de pantallas resolviendo por rol.
