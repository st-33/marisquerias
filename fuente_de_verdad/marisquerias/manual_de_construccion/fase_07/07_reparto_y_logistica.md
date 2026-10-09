# INSTRUCCION: REPARTO Y LOGISTICA

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 07

## ORIGEN

- Terminos: REPARTO, REPARTIDOR, VENTA POR ORDEN, DESTINO.
- Formulas: venta_por_orden + destino_externo = reparto.
- Reglas: REPARTO A DOMICILIO.
- Codigo real: `src/capacidades/reparto/*`, `src/capacidades/logistica/*`, `src/motor/motor-logistico.ts`, `src/motor/nucleo/contratos.ts`.

## CONTRATO DE TIPOS (FIRMAS REALES)

```typescript
type OrigenSenal = 'negocio' | 'publico' | 'llamada' | 'mensajeria' | 'redes' | 'sistema' | 'automatizacion' | 'servicio_domicilio';

type CanalEntrada = 'negocio' | 'publico' | 'llamada' | 'whatsapp' | 'mensajeria' | 'red_social' | 'sistema' | 'automatizacion';

type TipoActor = 'negocio' | 'publico' | 'central' | 'repartidor' | 'sistema' | 'automatizacion';

type CapacidadesLogisticas = { motorLogistico: boolean; delivery: boolean; solicitudesLogisticas: boolean };

type ContextoOperativo = IdentidadNegocio & { negocioExiste: boolean; habilitado: boolean; capacidades: CapacidadesLogisticas; actoresAutorizados: readonly TipoActor[]; actorIdsAutorizados?: readonly string[] };

type EstadoPedido = 'provisional' | 'corroboracion' | 'confirmado' | 'en_proceso' | 'cancelado';
```

## PASO 01: PERSISTENCIA DE REPARTO

### ESPECIFICACION

- `reparto.repo.ts` y `reparto-ajustes.repo.ts` declaran el contrato de pedidos y ajustes bajo `{rutaNegocio}/reparto`.
- `useGestionReparto(props?)` es el cerebro de gestion.

## PASO 02: VALIDACION DE AJUSTES

### ESPECIFICACION

- `validarAjustes.ts` valida los ajustes antes de aplicarlos.
- Todo reparto registra un destino externo antes del despacho.

## PASO 03: MOTOR LOGISTICO

### ESPECIFICACION

- `motor-logistico.ts` implementa el motor de transiciones; `transiciones.ts` declara los actores autorizados por transicion.
- El motor no conoce Firebase ni React: opera con `Pedido` como referencia del negocio y `SolicitudLogistica`/`MisionLogistica` propias.

## PASO 04: INTEGRACION CON PEDIDOS

### ESPECIFICACION

- `IntegracionLogisticaPedido.ts` vincula el pedido con el evento logistico.
- `useSincronizarPedidosLogistica.ts` sincroniza pedidos hacia el flujo logistico.

## PASO 05: AISLAMIENTO DE REPARTO

### ESPECIFICACION

- El reparto no se mezcla con mostrador o mesa; cada venta queda diferenciada por modalidad.
- Destino de senal de salida: `'negocio' | 'central' | 'repartidor'`.

## CONTRATO DE SALIDA

- Todo pedido logistico transita estados `provisional -> corroboracion -> confirmado -> en_proceso` o `cancelado`; los actores autorizados estan explicitos por transicion; el reparto queda aislado de la operacion de salon.
