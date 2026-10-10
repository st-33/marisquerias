# CONTRATOS Y TIPOS: ROLES Y PERMISOS

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 02_roles_y_permisos

## 1. CONTRATO DE DISPOSITIVO

```typescript
type DispositivoVinculado = {
  deviceIdADI: string;
  rutaNegocio: string;
  negocioId: string;
  negocio_id?: string;
  ruta_negocio?: string;
  categoria_id?: string;
  niche: string;
  category?: string;
  aliasDispositivo?: string;
  rolActivo: string | null;
  rolesPermitidos: string[];
  modulosPermitidos: Record<string, boolean>;
  estado: 'activo' | 'bloqueado' | 'mantenimiento' | 'reemplazado';
  nivelOperativo?: 'admin' | 'segundo_al_mando' | 'operador' | 'consulta';
  puedeCambiarRol: boolean;
  ultimoHeartbeat?: number;
  vinculadoEn: number;
  actualizadoEn: number;
  reemplazaADeviceId?: string;
  reemplazadoPorDeviceId?: string;
};
```

## 2. CONTRATO DE INSTALACION

```typescript
type ContratoInstalacion = { accessCode: string; aliasDispositivo?: string };

type ResultadoInstalacion =
  | { ok: true; dispositivo: DispositivoVinculado; features: Record<string, Feature> }
  | { ok: false; error: string };
```

## 3. CAPACIDADES GOBERNADAS

- `estaCapacidadHabilitadaPorCentral(config, capacidad): boolean` — configuracion `null` = permitido (cero bloqueos).
- Capacidades: `mostrador`, `reparto`, y anidadas bajo `config.capacidades`.
- Bloqueo total si Central reporta negocio bloqueado o inactivo.

## 4. INVARIANTES

- Un rol resuelve exactamente una pantalla inicial.
- Dispositivo `estado: 'bloqueado'` no arranca la aplicacion.
- Capacidad no habilitada queda oculta.

## 5. FLUJO

ContratoInstalacion -> EnsambladorInstalacion -> DispositivoVinculado -> empaquetadorRoles({rutaNegocio}/caracteristicas + /features) -> rol -> REGISTRO_PANTALLAS
