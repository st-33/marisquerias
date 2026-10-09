# INSTRUCCION: ROLES OPERATIVOS Y CONTROL DE ACCESO

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 02

## ORIGEN

- Terminos: ROL OPERATIVO, ACCESO, HABILITACION, CAPACIDAD HABILITADA, CATEGORIA DE MENU.
- Formulas: rol_operativo + pantalla = capacidad_habilitada.
- Plantillas: PLANTILLA DE INSTRUCCION EN MANUAL DE CONSTRUCCION.
- Codigo real inspeccionado: `src/negocio/roles/*`, `src/sistema/seguridad/*`, `src/composicion/registroPantallas.ts`.

## PASO 01: DECLARACION DE ROLES

### ESPECIFICACION

- Los roles operativos del giro son: mesero, cocina, mostrador, administrador y repartidor.
- Cada rol se declara en minusculas y corresponde a una carpeta de pantalla en `app/_role/`.

## PASO 02: EMPAQUETADO DE ROLES

### ESPECIFICACION

- `src/negocio/roles/empaquetadorRoles.ts` resuelve el conjunto de capacidades habilitadas por rol a partir de la configuracion del negocio en RTDB (`{rutaNegocio}/caracteristicas` y `{rutaNegocio}/features`).
- `src/negocio/roles/GestorCaracteristicas.ts` expone `estaCaracteristicaHabilitada` para consultar la habilitacion de una feature generica.

## PASO 03: CAPACIDADES HABILITADAS POR GOBIERNO

### ESPECIFICACION

- `estaCapacidadHabilitadaPorCentral` (en `src/sistema/central/useCentralConfig.ts`) consulta la configuracion remota del negocio para habilitar o bloquear capacidades como mostrador y reparto.
- Regla de oro: la consulta de capacidades remota no bloquea la operacion local de forma sincrona; si no responde, la operacion local continua.

## PASO 04: GUARDAS DE ACCESO

### ESPECIFICACION

- `src/sistema/seguridad/useAuth.ts` y `useAuthGuard` controlan la sesion activa y la identidad del negocio.
- `src/sistema/seguridad/deviceBinding.ts` vincula la identidad del dispositivo a la sesion del negocio mediante `resolverDeviceIdADI`.

## PASO 05: RUTEO POR ROL

### ESPECIFICACION

- El registro global `REGISTRO_PANTALLAS` mapea cada clave de rol a su vista presentacional (mesero -> MeseroScreen, cocina -> CocinaScreen, mostrador -> MostradorPro, etc.).
- La ruta `/_role/roles` presenta el selector de rol del negocio, que dirige al usuario a su pantalla segun el rol activo.
