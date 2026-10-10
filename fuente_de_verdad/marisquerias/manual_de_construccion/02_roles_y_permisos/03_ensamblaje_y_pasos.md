# ENSAMBLAJE Y PASOS: ROLES Y PERMISOS
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

## PASO 01: Instalacion y vinculacion de dispositivo
### ESPECIFICACION
- Se ensambla `EnsambladorInstalacion` que consume `ContratoInstalacion { accessCode, aliasDispositivo? }` (ver §2 de `02_contratos_y_tipos.md`).
- El resultado es una union `ResultadoInstalacion`: `ok:true` con `DispositivoVinculado + features`, o `ok:false` con `error` accionable.
- No se vincula ninguna identidad sin `accessCode` valido; el error se comunica en texto claro.

## PASO 02: Construccion del DispositivoVinculado
### ESPECIFICACION
- Se ensambla `DispositivoVinculado` con todos sus campos obligatorios (`deviceIdADI`, `rutaNegocio`, `negocioId`, `niche`, `rolActivo`, `rolesPermitidos`, `modulosPermitidos`, `estado`, `vinculadoEn`, `actualizadoEn`).
- `estado` solo admite `activo | bloqueado | mantenimiento | reemplazado`; un dispositivo `bloqueado` no arranca la aplicacion.
- Los campos de reemplazo (`reemplazaADeviceId` / `reemplazadoPorDeviceId`) se rellenan solo en flujo de sustitucion documentado.

## PASO 03: Empaquetado de roles
### ESPECIFICACION
- Se ensambla `empaquetadorRoles` sobre `{rutaNegocio}/caracteristicas + /features`, produciendo `rolesPermitidos` y `modulosPermitidos`.
- Un rol resuelve exactamente una pantalla inicial; la lista de roles permitidos nunca queda vacia.
- El empaquetado es lectura pura: no muta el dispositivo ni los permisos de Central.

## PASO 04: Capacidades gobernadas por Central
### ESPECIFICACION
- Se ensambla `estaCapacidadHabilitadaPorCentral(config, capacidad)` con la regla `config === null` implica permitido (cero bloqueos).
- Se gobiernan `mostrador`, `reparto` y las capacidades anidadas bajo `config.capacidades`.
- Un negocio reportado bloqueado o inactivo por Central implica bloqueo total de toda capacidad.

## PASO 05: Guardas de acceso por rol
### ESPECIFICACION
- Se ensamblan guardas que ocultan toda capacidad no habilitada; una capacidad deshabilitada no renderiza su modulo ni su ruta.
- Un dispositivo en estado distinto de `activo` (salvo `mantenimiento` autorizado) no accede a flujos operativos.
- `nivelOperativo` (`admin | segundo_al_mando | operador | consulta`) acota el alcance de escritura segun lo declarado.

## PASO 06: Ruteo por rol resuelto
### ESPECIFICACION
- Se ensambla el ruteo final `rol -> REGISTRO_PANTALLAS` del subsistema 01, entregando una unica pantalla inicial por rol.
- `puedeCambiarRol: false` fija el `rolActivo`; el cambio de rol solo se habilita cuando el dispositivo lo permite.
- El `ultimoHeartbeat` se actualiza sin bloquear el arranque y no invalida la sesion activa por si solo.
