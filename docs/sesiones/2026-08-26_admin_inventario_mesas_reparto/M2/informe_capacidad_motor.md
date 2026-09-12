# Informe M2 — Capacidad logística alineada al motor

**Agente:** M2  
**Fecha/hora de cierre:** 2026-08-27  
**Repositorio:** `st-33/marisquerias`  
**Rama:** `rama-2`  
**Zona trabajada:** `src/capacidades/logistica/` y su frontera de dominio  
**Objetivo:** Convertir la integración del pedido con logística en una capacidad consumidora de `SenalEntrada`, sin duplicar el pedido ni invadir la implementación de producción de los puertos del motor.

## Estado de coordinación revisado

La rama estaba limpia y sincronizada antes de reanudar el trabajo local. El último commit de M1 (`d013aad`) construyó el núcleo contractual en `src/motor/`, con `SenalEntrada`, `MotorLogistico.procesar`, `PuertoContextoOperativo`, `PuertoPersistenciaMotor` y `PuertoSalidasMotor`. M1 dejó explícitamente como dependencia de M2 el mapeo del `Pedido` real hacia `pedido.requiere_entrega`.

El estado central conserva las tareas históricas de la sesión y reserva la integración fina transversal al ORQUESTADOR. Por esa razón, el cambio se limitó a la capacidad de Marisquerías y no modificó `src/motor/`, `CENTRAL/`, `EVENTOS.json`, ni las superficies asignadas a M3–M5.

## Auditoría y decisión técnica

El adaptador existente todavía estaba modelado alrededor de `RepartoRepository.crearMisionDelivery`, un contrato legacy que no implementa la máquina de estados, la deduplicación ni el sobre de señales de M1. La decisión fue añadir un segundo puerto de entrada opcional, `PuertoEntradaLogistica`, con la forma exacta `procesar(senal: SenalEntrada)`, conservando el fallback legacy mientras el ORQUESTADOR/M4 resuelve los puertos productivos.

Esta separación evita dos errores: copiar el pedido completo dentro del motor y fabricar una implementación de producción de `PuertoContextoOperativo` o `PuertoPersistenciaMotor` que pertenece a otra frontera de coordinación. La capacidad conoce el contrato de entrada; no conoce Firebase, la persistencia del motor ni el transporte de salidas.

## Cambios ejecutados

| Archivo                                                                  | Cambio realizado                                                                                                                                                                                                                                                         |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/capacidades/logistica/IntegracionLogisticaPedido.ts`                | Añadido `PuertoEntradaLogistica`; creación de `SenalRequiereEntrega` con versión, operación, tenant, actor, canal, idempotencia, referencia al pedido y payload mínimo; proyección de `MisionLogistica` a `pedido.logistica`; fallback legacy conservado explícitamente. |
| `src/capacidades/logistica/useSincronizarPedidosLogistica.ts`            | Añadido `entradaMotor?: PuertoEntradaLogistica`; el sincronizador puede operar con el motor nuevo aun sin `repartoUrl`; se evita mezclar el listener RTDB legacy cuando el puerto nuevo está inyectado.                                                                  |
| `src/capacidades/logistica/index.ts`                                     | Exportado `PuertoEntradaLogistica` para inyección desde una composición externa.                                                                                                                                                                                         |
| `src/capacidades/logistica/__tests__/IntegracionLogisticaPedido.test.ts` | Añadida prueba vertical de señal nueva, identidad tenant canónica, actor, referencia, payload y proyección de misión. La suite focal queda en 6 pruebas.                                                                                                                 |
| `docs/.../M2/informe_capacidad_motor.md`                                 | Este registro técnico para coordinación.                                                                                                                                                                                                                                 |

## Mapeo de la señal

La capacidad emite `tipo: 'pedido.requiere_entrega'`, `schemaVersion: 1`, `destino: 'motor_logistico'`, `origen: 'negocio'` y actor `{ tipo: 'negocio', id: tenantId }`. La `idempotencyKey` es estable por `tenantPath + pedidoId`, y la referencia obliga a que el pedido señalado sea el mismo pedido de origen.

El payload contiene únicamente `pedidoId`, `estadoPedido`, `modalidad`, `puntoRecoleccion`, `puntoEntrega` y prioridad. La modalidad se normaliza a `domicilio`, `recoleccion` o `entrega`; los orígenes de Marisquerías se mapean a los canales cerrados del motor (`llamada`, `whatsapp`, `red_social`, `sistema` o `negocio`). La ubicación conserva dirección, referencia y coordenadas sin copiar cliente, inventario, recetas, venta ni historial al motor.

La identidad del tenant se deriva mediante `identidadTenantDesdePath`, por lo que la señal queda alineada con el parser canónico del motor. Esto significa que `tenantId` y `categoriaId` no se inventan desde el nombre visual del negocio.

## Integración con la capacidad existente

El flujo automático de `useSincronizarPedidosLogistica` sigue leyendo pedidos desde el store central y se mantiene como una capacidad opcional. Si se inyecta `entradaMotor`, `IntegracionLogisticaPedido` usa el motor nuevo; si no se inyecta, el comportamiento legacy permanece disponible para no romper el entorno actual mientras se implementan los puertos productivos.

La capacidad no crea una pantalla nueva, no crea una ruta nueva y no agrega otro dueño del pedido. La única escritura de vuelta es la proyección mínima `pedido.logistica`, con referencia, estado, fecha y error. La suscripción legacy queda deshabilitada cuando se usa el motor nuevo porque M1 expone procesamiento de señales, no un listener RTDB de misiones.

## Dependencias y límites

La capacidad ya consume el contrato de entrada de M1, pero todavía requiere una composición externa que construya `MotorLogistico` con `PuertoContextoOperativo`, `PuertoPersistenciaMotor` y, opcionalmente, `PuertoSalidasMotor`. Esa composición no se implementó aquí porque el propio informe de M1 la deja abierta y el estado central reserva la integración transversal.

El motor actual exige capacidades `motorLogistico`, `solicitudesLogisticas` y `delivery` en `ContextoOperativo`. Marisquerías no resuelve esas capacidades dentro del adaptador; las recibe indirectamente del motor, que debe consultar una fuente autoritativa. La capacidad tampoco convierte direcciones sin coordenadas: no emite una señal inválida ni fabrica geolocalización.

El fallback `RepartoRepository` queda como compatibilidad transitoria. No debe considerarse el contrato definitivo de producción, porque carece de la semántica formal del motor nuevo. La sustitución final puede hacerse inyectando un `PuertoEntradaLogistica` sin modificar Mesero, Cocina ni el modelo de pedido.

## Evidencia de validación

| Validación                                                                                    | Resultado                         |
| --------------------------------------------------------------------------------------------- | --------------------------------- |
| `npx prettier --write` sobre adaptador, sincronizador y prueba                                | Correcto.                         |
| `npm run check-types`                                                                         | Correcto (`tsc --noEmit`).        |
| `npx jest src/capacidades/logistica/__tests__/IntegracionLogisticaPedido.test.ts --runInBand` | Correcto: 6 pruebas.              |
| Regresión completa de esta unidad                                                             | Correcto: 21 suites, 119 pruebas. |

## Estado final para coordinación

**Comprobado:** el pedido real puede transformarse en una `SenalRequiereEntrega` válida, estable e idempotente; la identidad tenant coincide con el contrato del motor; la misión resultante puede proyectarse de vuelta al pedido; el flujo legacy no se mezcla cuando se inyecta el puerto nuevo.

**Decidido:** la capacidad queda como consumidor del puerto de entrada, mientras M4/ORQUESTADOR define la composición productiva de contexto, persistencia y salidas. El pedido, inventario, ventas e historial siguen bajo autoridad de Marisquerías.

**Pendiente:** construir el adaptador productivo de los puertos del motor, conectar ese adaptador en la composición raíz y acordar el transporte de eventos/salidas con Central y Repartidor.

**Impacto para otros modelos:** M1 ya tiene una frontera concreta para recibir señales desde Marisquerías; M3 puede consumir `EventoDominio`/`SenalSalida` sin depender de la UI; M4 debe resolver los puertos productivos sin modificar este adaptador; M5 puede usar la prueba vertical como evidencia de compatibilidad.

**Autor:** Manus AI
