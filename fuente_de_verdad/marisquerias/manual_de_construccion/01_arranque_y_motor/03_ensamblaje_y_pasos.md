# ENSAMBLAJE Y PASOS: ARRANQUE Y MOTOR
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

## PASO 01: Punto de entrada de la aplicacion
### ESPECIFICACION
- Se ensambla `app/index.tsx` como unica raiz de render: carga la ruta inicial `/access` y delega el resto del arbol al layout raiz.
- `PUBLIC_ROUTES = ['/']` es el unico destino publico; toda demas ruta exige sesion via `useAuthGuard` (segun `02_contratos_y_tipos.md` §3).
- El VERSION_ESQUEMA_MOTOR = 1 se mantiene como constante y no se altera sin migracion documentada.

## PASO 02: Bootstrapper y bandera de preparacion
### ESPECIFICACION
- Se ensambla `useBootstrapper()` para que exponga `isReady: boolean`; mientras sea `false`, ninguna ruta protegida se renderiza.
- La señal de arranque fluye `app/index.tsx -> /access -> useBootstrapper`; no se renderiza UI operativa antes de `isReady === true`.
- El bootstrapper no conoce Firebase ni React: consume unicamente contratos puros del motor.

## PASO 03: Guarda de autenticacion
### ESPECIFICACION
- Se ensambla `useAuthGuard` para decidir entre la ruta publica y el layout protegido.
- Cualquier ruta fuera de `PUBLIC_ROUTES` sin sesion valida se redirige y no monta pantallas de negocio.
- La guarda es anterior a la composicion de proveedores: ninguna pantalla recibe contexto sin sesion.

## PASO 04: Composición de proveedores (RootLayout)
### ESPECIFICACION
- Se ensambla `RootLayout` envolviendo unicamente a los proveedores declarados, sin logica de negocio dentro.
- El orden `useBootstrapper -> useAuthGuard -> RootLayout (proveedores)` se respeta; no se salta ningun eslabon.
- Ningun proveedor depende de Firebase/React en el nucleo del motor.

## PASO 05: Registro de pantallas
### ESPECIFICACION
- Se ensambla `REGISTRO_PANTALLAS` con entradas tipadas `ScreenRegistroEntrada` (`Screen`, `useLogic?`, `staticProps?`).
- Cada registro resuelve a un `ScreenResuelto` con `Screen`, `props`, `loading`, `error`, `niche`, `category` (ver §2 de los contratos).
- El registro no renderiza por si mismo: devuelve la composicion que el motor monta tras la guarda.

## PASO 06: Resolucion de rol hacia pantalla inicial
### ESPECIFICACION
- Se ensambla la resolucion final `REGISTRO_PANTALLAS -> rol`, que produce exactamente una pantalla inicial por rol.
- `loading` y `error` se propagan desde `ScreenResuelto`; una resolucion fallida no bloquea el arranque global (`isReady` ya consolidado).
- El motor puro queda aislado de Firebase y React: toda dependencia externa entra por los contratos, no por la composicion.
