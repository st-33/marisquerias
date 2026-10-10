# CONTRATOS Y TIPOS: REPARTO Y LOGISTICA

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 08_reparto_y_logistica

## 1. FIRMAS DEL MOTOR LOGISTICO

```typescript
type OrigenSenal = 'negocio' | 'publico' | 'llamada' | 'mensajeria' | 'redes' | 'sistema' | 'automatizacion' | 'servicio_domicilio';
type CanalEntrada = 'negocio' | 'publico' | 'llamada' | 'whatsapp' | 'mensajeria' | 'red_social' | 'sistema' | 'automatizacion';

type CapacidadesLogisticas = { motorLogistico: boolean; delivery: boolean; solicitudesLogisticas: boolean };

type ContextoOperativo = IdentidadNegocio & {
  negocioExiste: boolean;
  habilitado: boolean;
  capacidades: CapacidadesLogisticas;
  actoresAutorizados: readonly TipoActor[];
  actorIdsAutorizados?: readonly string[];
};

type EstadoPedido = 'provisional' | 'corroboracion' | 'confirmado' | 'en_proceso' | 'cancelado';
type EstadoSolicitudLogistica = 'solicitada' | 'cancelada';
type DestinoSenalSalida = 'negocio' | 'central' | 'repartidor';
```

## 2. EVENTO LOGISTICO

```typescript
type PedidoLogisticoEvent = {
  evento_id: string;
  negocio_id: string;
  pedido_id: string;
  canal_origen: 'web' | 'whatsapp' | 'llamada' | 'red_social' | 'restaurante' | 'mesera';
  tipo_operacion: 'entrega_domicilio' | 'apoyo_logistico';
  timestamp: string;       // ISO-8601
  idempotencia_key: string;
};
```

## 3. INVARIANTES

- El pedido transita `provisional -> corroboracion -> confirmado -> en_proceso` o `cancelado` segun actores autorizados por transicion.
- `idempotencia_key` evita duplicados en reintentos.
- Todo reparto registra destino externo antes del despacho; nunca se mezcla con operacion de salon.

## 4. FLUJO

venta_por_orden -> IntegracionLogisticaPedido -> SolicitudLogistica -> motor-logistico(transiciones) -> MisionLogistica -> reparto(destino)
