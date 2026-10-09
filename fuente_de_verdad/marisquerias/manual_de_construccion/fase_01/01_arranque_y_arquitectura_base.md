# INSTRUCCION: ARRANQUE Y ARQUITECTURA BASE

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 01

## ORIGEN

- Terminos: FASE, INSTRUCCION, PASO, ESPECIFICACION, APLICABLE, CATEGORIA, ROL OPERATIVO, COMANDAL.
- Formulas: categoria + plantilla_estructural_de_categoria + capacidad = aplicable.
- Plantillas: PLANTILLA DE INSTRUCCION EN MANUAL DE CONSTRUCCION.
- Codigo real inspeccionado: `app/_layout.tsx`, `app/index.tsx`, `src/composicion/*`, `src/sistema/estado/useBootstrapper.ts`, `src/sistema/store/*`.

## PASO 01: ENTRADA DE LA APLICACION

### ESPECIFICACION

- El punto de entrada de expo-router resuelve en `app/index.tsx`, que redirige al acceso (`/access`).
- La ruta raiz `/` es una ruta publica declarada en `PUBLIC_ROUTES` dentro de `app/_layout.tsx`.

## PASO 02: BOOTSTRAP DEL ESTADO

### ESPECIFICACION

- `useBootstrapper()` (en `src/sistema/estado/useBootstrapper.ts`) hidrata el estado global del store antes de renderizar cualquier pantalla protegida.
- Ninguna pantalla bajo `/_role` se renderea antes de que `isReady` sea verdadero.

## PASO 03: GUARDAS DE SESION Y NAVEGACION

### ESPECIFICACION

- `useAuthGuard` protege las rutas no publicas redirigiendo a `/access` si no hay sesion.
- `useGobernanzaRealtime` (en `src/sistema/seguridad/useGobernanzaRealtime.ts`) escucha la configuracion remota del negocio en tiempo real.
- El guardia de navegacion de fabrica valida `ROUTE_FEATURES` (mapa ruta -> feature) y redirige a `/_role/roles` cuando la feature esta deshabilitada.

## PASO 04: PROVEEDORES DE SERVICIO

### ESPECIFICACION

- El arbol de proveedores en `app/_layout.tsx` sigue el orden: `ThemeProvider` -> `ProveedorFierros` -> `ProveedorConfiguracionNegocio` -> `GestureHandlerRootView` -> `ProveedorAudioNotificaciones`.
- `useInicializacionServiciosNegocio` orquesta la inicializacion de servicios por negocio sin logica de negocio en el layout.

## PASO 05: REGISTRO DE PANTALLAS

### ESPECIFICACION

- `src/composicion/registroPantallas.ts` define el registro global `REGISTRO_PANTALLAS` que mapea cada rol operativo a su vista: selector_roles, cocina, mesero, mostrador, admin_dashboard, admin_menu, admin_tables, admin_inventory, admin_repart, admin_mostrador.
- `src/composicion/resolvedorPantalla.tsx` resuelve la vista a partir del registro y del rol activo.

## PASO 06: MOTOR DE ARRANQUE

### ESPECIFICACION

- El `src/motor/` declara los contratos, errores, transiciones y validaciones del nucleo del sistema (motor logistico).
- El contrato de actores del motor incluye: negocio, sistema, automatizacion, central y repartidor, cada uno con autoridad declarada sobre sus transiciones.
