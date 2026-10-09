# INSTRUCCION: ROLES OPERATIVOS Y CONTROL DE ACCESO

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 02

## ORIGEN

- Terminos: ROL OPERATIVO, CAPACIDAD HABILITADA, ACCESO, HABILITACION.
- Formulas: rol_operativo + pantalla = capacidad_habilitada.
- Plantillas: PLANTILLA DE INSTRUCCION EN MANUAL DE CONSTRUCCION.
- Codigo real: `src/negocio/roles/*`, `src/sistema/seguridad/*`, `src/composicion/registroPantallas.ts`, `src/sistema/instalacion/contratos/*`.

## CONTRATO DE ENTRADA

- Roles operativos declarados: `mesero`, `cocina`, `mostrador`, `administrador`, `repartidor`.
- Identidad del negocio: `IdentidadNegocio { rutaNegocio: string; negocioId: string; categoriaId: string }`.

## PASO 01: EMPAQUETADO DE ROLES

### ESPECIFICACION

- `useEmpaquetadorRoles({ db, rutaNegocio })` lee `{rutaNegocio}/caracteristicas` y `{rutaNegocio}/features` de la RTDB.
- Rolas resultantes: `admin`, `mesero`, `cocina`, `mostrador`, `reparto`, `repartidor` segun la carga de roles.
- `estaCaracteristicaHabilitada(feature: string, defecto: boolean): boolean` consulta la habilitacion generica.

## PASO 02: CAPACIDADES HABILITADAS POR GOBIERNO

### ESPECIFICACION

- `estaCapacidadHabilitadaPorCentral(config, capacidad)` consulta la configuracion remota (`central/negocios/{id}/configuracion`).
- Contrato de no-bloqueo: configuracion `null` = operacion local permitida (cero bloqueos sincronos).
- Capacidades gobernadas: `mostrador`, `reparto` y anidadas bajo `config.capacidades`.

## PASO 03: VINCULACION DE DISPOSITIVO

### ESPECIFICACION

- `DispositivoVinculado` declara: `deviceIdADI`, `rutaNegocio`, `negocioId`, `rolActivo: string | null`, `rolesPermitidos: string[]`, `modulosPermitidos: Record<string, boolean>`, `estado: 'activo' | 'bloqueado' | 'mantenimiento' | 'reemplazado'`, `puedeCambiarRol: boolean`, `vinculadoEn: number`, `actualizadoEn: number`.
- `nivelOperativo?: 'admin' | 'segundo_al_mando' | 'operador' | 'consulta'`.

## PASO 04: CONTRATO DE INSTALACION

### ESPECIFICACION

- `ContratoInstalacion { accessCode: string; aliasDispositivo?: string }`.
- `ResultadoInstalacion` (union discriminada): `{ ok: true; dispositivo: DispositivoVinculado; features: Record<string, Feature> } | { ok: false; error: string }`.

## PASO 05: GUARDAS DE ACCESO

### ESPECIFICACION

- `useAuth` y `useAuthGuard` controlan sesion e identidad del negocio.
- `deviceBinding.ts` vincula `resolverDeviceIdADI` a la sesion del negocio.

## PASO 06: RUTEO POR ROL

### ESPECIFICACION

- `REGISTRO_PANTALLAS` mapea cada clave de rol a su vista; `/_role/roles` es el selector.

## CONTRATO DE SALIDA

- Cada rol resuelve exactamente una pantalla inicial; las capacidades no habilitadas por gobierno quedan ocultas; un dispositivo bloqueado (`estado: 'bloqueado'`) no arranca la aplicacion.
