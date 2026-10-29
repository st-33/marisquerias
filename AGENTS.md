# AGENTS.md — Reglas para agentes externos (M1–M5)

**Repositorio:** `st-33/marisquerias` — ecosistema modular de negocio local (Expo/React Native + Firebase RTDB).
**Rama de trabajo:** `rama-2` únicamente. `main` es un espejo: **nunca** trabajes en `main`.

## Arranque (obligatorio, en este orden)

```bash
git fetch && git checkout rama-2 && git pull
```

1. Leer este archivo.
2. Leer `docs/comunicacion_multimodelo/MANIFIESTO.md` — fuente operativa única
   (rama, sesión activa, mecánica de detección, estados).
3. Leer `docs/comunicacion_multimodelo/sesiones/<sesion_activa>/EVENTOS.json`
   (el libro de eventos).
4. Leer `docs/comunicacion_multimodelo/sesiones/<sesion_activa>/CENTRAL/estado.md`.
5. Leer tu carpeta `M<n>/` (`instruccion.md`, `estado.md`, `procesado.json`).
6. Aplicar `docs/comunicacion_multimodelo/protocolos/02_subagente.md`.

> La documentación de sesiones históricas puede contener ramas y rutas antiguas:
> **no es fuente operativa** (carpetas marcadas con `HISTORICO.md`).

## Detección de trabajo (nunca por historial de git)

Un commit **no** es una instrucción. Solo un evento `INSTRUCCION_NUEVA` en
`EVENTOS.json` dirigido a tu `agente` y con `sello` no presente en tu
`procesado.json` significa trabajo nuevo. Sin evento pendiente → escribe
`DISPONIBLE` en tu `estado.md` y termina.

## Reglas de escritura

- Escribe **solo** en tu carpeta `M<n>/` de la sesión activa y en los archivos de código
  explícitamente autorizados en tu `instruccion.md`.
- `CENTRAL/`, otras carpetas `M*`, `protocolos/`, `plantillas/`, `MANIFIESTO.md`,
  `LEEME.md`, `EVENTOS.json`, `ACTIVACIONES.json` y este archivo son de solo lectura.
- `ACTIVACIONES.json` registra activaciones enviadas por el workflow; no sustituye
  `M<n>/procesado.json`, que cada agente actualiza al terminar su propia tarea.
- Si la sesión no está ACTIVA: no ejecutar trabajo; registrar `DISPONIBLE`.

## Commits

- Un commit por unidad terminada; mensaje `docs(multimodelo/M<n>): resumen` (documentos)
  o `feat|fix|refactor(<area>): resumen` (código autorizado).
- `git pull --rebase` antes de publicar. Conflicto sobre archivos de otros → no
  resolver por tu cuenta: `BLOQUEADA` en `estado.md` y reportar.

## Estándares del proyecto

- Nomenclatura propia en español; conservar en inglés solo APIs, librerías, protocolos
  y convenciones técnicas obligatorias.
- Todo movimiento funcional deja huella (`MIGRACION.md` local o registro en
  `docs/desfragmentaciones/`).
- Verificación mínima antes de reportar: `npx tsc --noEmit`, `npm test` y lint focal
  cuando la tarea toque código.

## Protocolo de Arquitectura y Operación en Producción

### 15. Aislamiento Multi-Inquilino en Web
- En compilaciones Web (`Platform.OS === 'web'`), el almacenamiento local debe aislarse estrictamente por pestaña/ventana utilizando `sessionStorage`.
- `metro.config.js` debe resolver `@react-native-async-storage/async-storage` hacia `src/sistema/almacenamiento/asyncStorageWeb.ts` cuando `platform === 'web'`.
- `obtenerDeviceIdResiliente()` debe priorizar `sessionStorage` para evitar colisiones de presencia y sobreescritura de sesiones entre pestañas de `localhost:8081`.

### 16. Raíz Operativa Dedicada
- En negocios con RTDB propia exclusiva, `rutaNegocio` es legítimamente `''` o `'/'`.
- Todo servicio, repositorio o sincronizador debe invocar `validar_ruta_negocio(rutaNegocio, { permitirRaiz: true })`.
- Nunca evaluar la validez de `rutaNegocio` con truthiness booleana (`!rutaNegocio`); verificar siempre `rutaNegocio === null || rutaNegocio === undefined`.

### 17. Desacoplamiento de Paneles de Control
- El acceso al dashboard administrativo (`admin_dashboard`) es gobernado exclusivamente por el rol de Administrador (`adminRoleEnabled`).
- Jamás bloquear el ingreso al panel administrativo por la ausencia de capacidades secundarias (ej. `metricas_y_cierres`). Dichas capacidades deben mostrar tarjetas informativas o estados desactivados dentro del dashboard sin rebotar al usuario.

### 18. Tolerancia a Estado Cero (Zero-Record Resilience)
- Toda interfaz o hook de datos operativos (mesas, comandas, productos) debe admitir bases de datos recién creadas (0 registros) sin quedar atrapada en spinners perpetuos.
- Desconectar `loading` ante la confirmación del primer snapshot de RTDB y añadir fallback timer para habilitar pedidos para llevar (*takeaway*).

### 19. Evaluación Exacta de Rutas Públicas en Guardias de Navegación
- En layouts de Expo Router (`app/_layout.tsx`), queda prohibido evaluar rutas públicas con `PUBLIC_ROUTES.some(r => pathname.includes(r))` cuando `'/'` está en el arreglo. Debe utilizarse siempre coincidencia exacta o prefijo de ruta (`pathname === '/' || PUBLIC_ROUTES.some(r => pathname.startsWith(r))`).

### 20. Aislamiento Estricto del FAB y Conmutación Dinámica
- El botón radial flotante (FAB) pertenece exclusivamente al rol Administrador (`/_role/admin/*`).
- Queda terminantemente prohibido renderizarlo o retener su estado en el selector de roles (`/_role/roles`) o perfiles operativos de piso.
- En Administrador, el módulo activo debe situarse en la burbuja principal con su icono canónico y permutar con el abanico radial.

### 21. Unicidad de Acciones en Estados Vacíos
- En pantallas de gestión y catálogo (ej. menú de administración), si una colección se encuentra vacía, la acción de creación debe centralizarse en la tarjeta hero explicativa.
- Queda prohibido duplicar botones de alta en barras de encabezado secundarias mientras no existan elementos en la colección.

### 22. Gobierno de Cupo de Terminales en Central
- El límite de terminales autorizadas simultáneas (`limite_dispositivos`) reside soberanamente en la Unidad Central bajo `/negocio/{id}/limite_dispositivos`. Toda terminal física o web debe validar este cupo antes de operar en piso.


