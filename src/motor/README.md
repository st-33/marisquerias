# Motor logístico distribuido

Este módulo contiene el núcleo contractual y operativo para coordinar necesidades logísticas de tenants autónomos. No es una aplicación de delivery completa, no contiene pantallas, no es Central y no sustituye los pedidos o el inventario del negocio.

## Frontera de dominio

El **Pedido** continúa perteneciendo al negocio y se transporta como referencia (`pedidoId` + `tenantPath`). La **SolicitudLogistica** es un objeto propio porque representa la decisión formal de que un pedido requiere una capacidad logística. La **MisionLogistica** es una unidad de trabajo posterior y tiene una máquina de estados diferente. Esta separación evita convertir Pedido y Misión en un mismo agregado.

El módulo distingue dos salidas. Un **EventoDominio** registra un hecho relevante que puede formar parte del historial o de una auditoría. Una **SenalSalida** es una notificación dirigida a un consumidor y no implica que el motor deba mantener un historial global de esa comunicación.

## Flujo

```text
SenalEntrada
  -> normalizarSenalEntrada
  -> resolver ContextoOperativo
  -> validar tenant, capacidad y actor
  -> deduplicar por tenant + eventId + idempotencyKey
  -> comprobar pedido sin solicitud previa
  -> crear SolicitudLogistica
  -> crear MisionLogistica en estado propuesta
  -> persistir y publicar EventoDominio/SenalSalida
```

El caso de cancelación busca la solicitud por `tenantPath + pedidoId`, marca la solicitud como cancelada y, si existe una misión no terminal, la lleva a `cancelada` usando la misma máquina de estados de misión.

## API de integración

La integración debe proporcionar `PuertoContextoOperativo` y `PuertoPersistenciaMotor`. El primero resuelve el contexto autoritativo del tenant; el segundo persiste deduplicación, solicitudes y misiones. `PuertoSalidasMotor` es opcional: cuando se entrega, el motor publica cada evento y señal después de persistir el resultado. El adaptador `adaptadores/memoria.ts` sirve para pruebas y ejemplos, no es una persistencia de producción.

El sobre de entrada exige `id`, `schemaVersion`, `operationId`, identidad de tenant, origen, canal, actor, momento, `idempotencyKey`, referencias y payload mínimo. La referencia al pedido debe coincidir con `payload.pedidoId`; una referencia con otro tenant se rechaza.

## Activación y aislamiento

El motor no consulta directamente la configuración del tenant. El adaptador debe resolver `ContextoOperativo` a partir de la fuente autoritativa del repositorio. El contexto exige `tenantExiste`, `habilitado`, `motorLogistico`, `solicitudesLogisticas` y, para entregas, `delivery`. También puede limitar IDs concretos de actores mediante `actorIdsAutorizados`.

Las rutas se validan con la utilidad canónica existente en `src/sistema/rtdb/rutas/RutaTenant.ts`. No se copian ventas, inventarios ni pedidos completos al motor.

## Estados

`transicionarPedido` separa el flujo del negocio (`provisional`, `corroboracion`, `confirmado`, `en_proceso`, `cancelado`) del flujo logístico. `transicionarMision` cubre `solicitada`, `propuesta`, `asignada`, `aceptada`, `recoleccion`, `en_camino`, `entregada`, `incidencia` y `cancelada`; las misiones entregadas o canceladas son terminales.

## Pendientes de integración

El repositorio existente aún tiene `src/sistema/persistencia/reparto.repo.ts`, que ofrece CRUD de misiones en una RTDB separada pero no implementa estas transiciones, autorización ni deduplicación. La conexión de ese repositorio con estos puertos requiere una decisión posterior sobre persistencia y contrato compartido; deliberadamente no se modificó infraestructura existente en esta unidad.
