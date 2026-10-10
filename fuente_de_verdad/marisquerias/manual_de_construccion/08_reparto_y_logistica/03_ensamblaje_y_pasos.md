# ENSAMBLAJE Y PASOS: REPARTO Y LOGISTICA
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

## PASO 01: Persistencia del reparto
### ESPECIFICACION
- Se ensambla la persistencia de pedidos logisticos con `PedidoLogisticoEvent { evento_id, negocio_id, pedido_id, canal_origen, tipo_operacion, timestamp, idempotencia_key }` (ver §2 de `02_contratos_y_tipos.md`).
- `timestamp` es ISO-8601; `idempotencia_key` evita duplicados ante reintentos.
- Todo reparto registra destino externo antes del despacho, sin mezclarse con operacion de salon.

## PASO 02: Validacion de ajustes del contexto
### ESPECIFICACION
- Se ensambla `ContextoOperativo` (extiende `IdentidadNegocio`) con `negocioExiste`, `habilitado`, `capacidades`, `actoresAutorizados`, `actorIdsAutorizados`.
- `CapacidadesLogisticas { motorLogistico, delivery, solicitudesLogisticas }` gobierna que modulo se habilita.
- Un negocio inexistente o deshabilitado no despliega el motor logistico.

## PASO 03: Motor logístico y transiciones
### ESPECIFICACION
- Se ensambla el motor con `EstadoPedido` transitando `provisional -> corroboracion -> confirmado -> en_proceso` o `cancelado`.
- Cada transicion exige el actor autorizado correspondiente (`TipoActor`); un actor no autorizado no mueve el pedido.
- `EstadoSolicitudLogistica` solo `solicitada | cancelada`; `DestinoSenalSalida` solo `negocio | central | repartidor`.

## PASO 04: Integracion con pedidos
### ESPECIFICACION
- Se ensambla `IntegracionLogisticaPedido -> SolicitudLogistica` que convierte una `venta_por_orden` en solicitud logistica.
- `canal_origen` usa los valores declarados (`web | whatsapp | llamada | red_social | restaurante | mesera`) y `tipo_operacion` (`entrega_domicilio | apoyo_logistico`).
- El evento se emite con `idempotencia_key` generada de forma estable para el mismo pedido.

## PASO 05: Aislamiento de la mision logistica
### ESPECIFICACION
- Se ensambla `MisionLogistica` que asigna `reparto(destino)` al pedido confirmado en `en_proceso`.
- El flujo `venta_por_orden -> IntegracionLogisticaPedido -> SolicitudLogistica -> motor -> MisionLogistica -> reparto(destino)` se respeta.
- La operacion de reparto nunca comparte estado con el salon: aislamiento total de ciclos e inventarios.
