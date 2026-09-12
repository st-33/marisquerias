# Informe técnico — Núcleo del motor logístico distribuido

**Agente:** M1 · **Repositorio:** `st-33/marisquerias` · **Rama:** `rama-2`
**Sesión operativa encontrada:** `2026-08-26_admin_inventario_mesas_reparto`
**Objeto de este informe:** ejecución de la instrucción específica entregada en los archivos de contexto del usuario.

## 1. Alcance y contradicción operativa detectada

La instrucción específica recibida solicita construir el núcleo contractual y operativo del motor distribuido de Servicio a Domicilio. El repositorio, sin embargo, contiene en su libro de eventos una tarea M1 distinta (`T-M1-01`) dedicada al mapeo y consolidación del módulo Inventario. Esa tarea ya estaba marcada como `REPORTADA → DISPONIBLE`, con su sello registrado en `M1/procesado.json`, y no fue modificada ni reabierta.

Se siguió la instrucción específica del usuario para esta ejecución. La tarea de Inventario permanece intacta: no se modificaron `CENTRAL/`, `EVENTOS.json`, `AGENTS.md`, `MANIFIESTO.md`, otras carpetas M\* ni la infraestructura compartida de persistencia. El nuevo informe se dejó como `M1/informe_motor.md` para no sobreescribir el informe previo de Inventario.

## 2. Inspección realizada

Se inspeccionaron las reglas de trabajo de `AGENTS.md`, el manifiesto, el libro de eventos, la instrucción y el estado de M1, además de la arquitectura real del repositorio. La aplicación es Expo/React Native con TypeScript, Firebase RTDB, Zustand y Jest/ts-jest.

| Área inspeccionada        | Evidencia                                                                                                | Hallazgo operativo                                                                                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identidad multi-tenant    | `src/sistema/rtdb/rutas/RutaTenant.ts`, `src/sistema/rtdb/guards.ts`                                     | Existe una validación canónica de `tenantPath` con al menos dos segmentos y derivación de `tenantId`/`categoriaId`.                                           |
| Pedido del negocio        | `src/sistema/persistencia/pedidos.repo.ts`, `src/sistema/store/slices/operacion.ts`                      | `Pedido` ya vive en el tenant, contempla `tipo: 'delivery'` y conserva la operación del negocio.                                                              |
| Misión existente          | `src/sistema/persistencia/reparto.repo.ts`                                                               | Hay CRUD de misiones en una RTDB de reparto separada, pero sin máquina de estados formal, autorización, deduplicación ni sobre de eventos del nuevo contrato. |
| Activación de capacidades | `src/sistema/ciclo_de_vida/ensureTenant.ts`, `src/sistema/persistencia/tenant.repo.ts`                   | Las flags de delivery/reparto existen y varían por tenant; no había una política pura que las validara antes de procesar una señal.                           |
| Superficie administrativa | `src/capacidades/reparto/useGestionReparto.ts`, `src/ui/roles/administrador/reparto/PantallaReparto.tsx` | La UI existente administra ajustes; no es el núcleo de procesamiento logístico.                                                                               |

## 3. Arquitectura construida

Se creó una frontera nueva y pura en `src/motor/`. El núcleo no importa React ni Firebase. Sus dependencias externas entran mediante puertos, y el adaptador en memoria se usa únicamente para pruebas y ejemplos.

```text
src/motor/
├── README.md
├── index.ts
├── motor-logistico.ts
├── puertos.ts
├── adaptadores/memoria.ts
├── nucleo/contratos.ts
├── nucleo/errores.ts
├── nucleo/transiciones.ts
├── nucleo/utilidades.ts
├── nucleo/validaciones.ts
└── pruebas/motor-logistico.test.ts
```

El flujo ejecutado es:

```text
SenalEntrada
  → normalización
  → resolución de ContextoOperativo
  → validación de tenant, capacidad y actor
  → deduplicación por tenant + eventId/idempotencyKey
  → comprobación de pedido sin solicitud previa
  → SolicitudLogistica
  → MisionLogistica en estado propuesta
  → persistencia del resultado
  → EventoDominio y SenalSalida
```

## 4. Conceptos definitivos

El **Pedido** no fue duplicado ni convertido en `PedidoDelivery`. El motor recibe una referencia mínima al pedido del tenant (`pedidoId`, `tenantPath` y referencias), pero no asume propiedad sobre sus ventas, inventario, clientes o historial.

La **SolicitudLogistica** quedó como objeto propio. Representa la decisión formal de que un pedido necesita una capacidad de entrega o recolección y conserva su vínculo con el Pedido. Esta decisión se tomó porque la solicitud es el punto de coordinación entre un pedido de negocio y una unidad de trabajo logístico; no es solo una etiqueta de estado del pedido ni una misión ya asignada.

La **MisionLogistica** quedó como unidad de trabajo independiente. Se crea desde la solicitud y comienza en `propuesta`. Pedido y Misión no comparten máquina de estados.

El **EventoDominio** representa un hecho relevante que puede ser persistido o auditado. La **SenalSalida** es información dirigida a un consumidor y no se convierte automáticamente en historial global. La entrada al motor se modela como **SenalEntrada**, con origen y canal independientes de cualquier pantalla.

## 5. Estados y reglas

La máquina de Pedido implementada en `src/motor/nucleo/transiciones.ts` utiliza los estados `provisional`, `corroboracion`, `confirmado`, `en_proceso` y `cancelado`. La señal `pedido.requiere_entrega` lleva un pedido `confirmado` a `en_proceso`; la cancelación puede llevar cualquier estado no terminal a `cancelado`, sujeto a actor autorizado.

La máquina de Misión utiliza `solicitada`, `propuesta`, `asignada`, `aceptada`, `recoleccion`, `en_camino`, `entregada`, `incidencia` y `cancelada`. El flujo inicial ejecutado es `solicitada → propuesta`. Las misiones `entregada` y `cancelada` son terminales. La cancelación de una misión terminal es rechazada.

Cada regla define estado anterior, acción, actores autorizados y estado resultante. Una acción inexistente o un actor no permitido produce `ErrorMotor` con código estable.

## 6. Contratos disponibles

| Contrato                  | Ubicación                       | Responsabilidad                                                                                                               |
| ------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `SenalEntrada`            | `src/motor/nucleo/contratos.ts` | Sobre versionado con identidad, operación, tenant, origen, canal, actor, momento, idempotencia, referencias y payload mínimo. |
| `ContextoOperativo`       | `src/motor/nucleo/contratos.ts` | Tenant identificado, existencia, habilitación, capacidades y autorización de actores.                                         |
| `SolicitudLogistica`      | `src/motor/nucleo/contratos.ts` | Coordinación logística entre Pedido y Misión.                                                                                 |
| `MisionLogistica`         | `src/motor/nucleo/contratos.ts` | Unidad de trabajo logístico y su estado independiente.                                                                        |
| `EventoDominio`           | `src/motor/nucleo/contratos.ts` | Hecho producido por el motor para negocio, Central, repartidor u otro motor.                                                  |
| `SenalSalida`             | `src/motor/nucleo/contratos.ts` | Comunicación dirigida sin implicar historial central.                                                                         |
| `PuertoContextoOperativo` | `src/motor/puertos.ts`          | Resolver el contexto autoritativo por `tenantPath`.                                                                           |
| `PuertoPersistenciaMotor` | `src/motor/puertos.ts`          | Deduplicar y persistir procesamiento, solicitudes y misiones.                                                                 |
| `PuertoSalidasMotor`      | `src/motor/puertos.ts`          | Publicar eventos y enviar señales después de persistir.                                                                       |
| `MotorLogistico`          | `src/motor/motor-logistico.ts`  | Orquestar el flujo completo sin conocer infraestructura externa.                                                              |

## 7. Tenant, activación y aislamiento

La señal se normaliza contra la utilidad canónica existente `src/sistema/rtdb/rutas/RutaTenant.ts`. Se rechaza un `tenantPath` inválido, una identidad cuyos componentes no coinciden con la ruta, un contexto inexistente, un tenant deshabilitado, una capacidad logística apagada o un actor no autorizado.

El contexto exige `motorLogistico` y `solicitudesLogisticas`. Para `pedido.requiere_entrega` exige además `delivery`. La autorización mínima se expresa por tipo de actor y puede restringirse por `actorIdsAutorizados`.

Todas las búsquedas de deduplicación y de solicitudes/misiones reciben `tenantPath`. Por diseño, un pedido idéntico en dos tenants produce operaciones independientes; una referencia de pedido con tenant diferente a la señal se rechaza.

## 8. Idempotencia y duplicación

La identidad del evento es `tenantPath + eventId`; la clave de idempotencia se consulta dentro del tenant. Un reenvío del mismo evento devuelve el resultado previamente guardado con código `EVENTO_REPETIDO`. La misma `idempotencyKey` con otro evento se rechaza como `IDEMPOTENCIA_CONFLICTIVA`. Un evento nuevo que intenta crear logística para un pedido que ya tiene una solicitud devuelve `PEDIDO_REPETIDO` y no crea otra misión.

Los IDs de solicitud y misión son deterministas por `tenantPath + pedidoId`, lo que facilita convergencia entre reintentos. La memoria de pruebas no implementa concurrencia transaccional; un adaptador de producción debe imponer unicidad atómica sobre las claves anteriores, idealmente junto con un outbox para persistencia y publicación.

## 9. Prueba vertical ejecutada

La prueba `src/motor/pruebas/motor-logistico.test.ts` simula un negocio que emite `pedido.requiere_entrega`. El motor resuelve el tenant, valida delivery y autorización, crea una solicitud logística, crea una misión propuesta, persiste el resultado y entrega tres eventos (`pedido.en_proceso`, `solicitud_logistica.creada`, `mision.propuesta`) junto con una señal `mision.propuesta` para Central.

También se verificaron transición inválida de Pedido, transición inválida de Misión terminal, tenant incorrecto, capacidad desactivada, actor no autorizado, evento duplicado, `idempotencyKey` conflictiva, pedido repetido, cancelación y referencias inconsistentes.

## 10. Validaciones ejecutadas

| Comando                                                             | Resultado                                                                                                        |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `npx eslint src/motor`                                              | Correcto.                                                                                                        |
| `npx tsc --noEmit`                                                  | Correcto.                                                                                                        |
| `npm test -- --runInBand src/motor/pruebas/motor-logistico.test.ts` | 11 pruebas correctas.                                                                                            |
| `npm test -- --runInBand`                                           | 20 suites y 112 pruebas correctas en la ejecución completa.                                                      |
| `git diff --check`                                                  | Correcto en la validación anterior al último ajuste de prueba; debe repetirse antes de publicar el commit final. |

## 11. Qué no se implementó deliberadamente

No se construyeron Central, la aplicación del Repartidor, GPS, mapas, WhatsApp, automatización telefónica, proveedores externos ni pantallas nuevas. Tampoco se modificaron `RepartoRepository`, `PedidosRepository`, Zustand, RTDB, reglas Firebase o el módulo Inventario. No se trasladó la lógica de Marisquerías al motor y no se copiaron pedidos completos, ventas o inventarios.

La integración de producción con la RTDB existente queda fuera de esta unidad porque requiere decidir si el contrato persistente de reparto actual se adapta, se versiona o se reemplaza. El núcleo ya ofrece el puerto para cualquiera de esas opciones sin acoplarse a una de ellas.

## 12. Supuestos abiertos y riesgos de integración

| Punto abierto                                     | Implicación                                                                                                 | Responsable sugerido |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | -------------------- |
| Fuente autoritativa de `ContextoOperativo`        | Debe mapear las flags reales de `ensureTenant.ts` y validar existencia/habilitación.                        | M4 / Orquestador     |
| Persistencia de solicitud, misión y deduplicación | Hay que escoger namespace, transacciones y estrategia outbox en RTDB.                                       | M4                   |
| Mapeo del Pedido real a `SenalEntrada`            | `Pedido` actual tiene estados y datos propios del negocio; no se debe acoplar el motor al payload completo. | M2                   |
| Consumidores de `EventoDominio` y `SenalSalida`   | Central, negocio y Repartidor necesitan proyecciones mínimas, no el agregado completo.                      | M3                   |
| Normalización de llamada, mensajería y redes      | Cada canal debe producir la misma señal versionada sin invadir el núcleo.                                   | M5                   |
| Semántica de `incidencia`                         | Se dejó como estado de misión, pero falta contrato de resolución y reanudación.                             | Orquestador / M3     |
| Seguridad de publicación                          | El adaptador de salidas debe autenticar destino y evitar publicar cross-tenant.                             | M4                   |

## 13. Necesidades para M2–M5

**M2** necesita consumir el contrato `SenalEntrada` desde el módulo del negocio. Debe mapear el pedido existente a `pedido.requiere_entrega` sin enviar inventario, historial ni ventas completas, y debe conservar `pedidoId`, `tenantPath`, referencias y `idempotencyKey` estable.

**M3** necesita definir las proyecciones de `MisionLogistica`, `EventoDominio` y `SenalSalida` para las superficies de Central y Repartidor. No debe recrear la máquina de estados en UI; las acciones deben regresar al puerto de entrada o a un contrato de transición del motor.

**M4** necesita implementar `PuertoContextoOperativo` y `PuertoPersistenciaMotor` contra la infraestructura elegida. Debe garantizar aislamiento por tenant, unicidad transaccional de evento/idempotencia/pedido y una estrategia de publicación durable; el adaptador en memoria no debe promoverse a producción.

**M5** necesita normalizar llamadas, WhatsApp/mensajería, redes y automatizaciones hacia la misma señal versionada. El núcleo acepta esas entradas por `origen` y `canal`, pero no procesa audio, conversaciones ni credenciales externas.

## 14. Cambios potenciales en otros repositorios

No se modificó ningún repositorio externo. Como contrato futuro, el negocio que produzca pedidos deberá emitir una señal con la forma de `SenalEntrada`, y los consumidores de Central/Repartidor deberán aceptar `EventoDominio`/`SenalSalida` con `schemaVersion: 1`. Cualquier cambio fuera de este repositorio requiere una instrucción explícita y una tabla de compatibilidad.

## 15. Conclusión

Quedó construido un núcleo real, tipado, testeable y desacoplado de infraestructura para el flujo mínimo negocio → motor → solicitud logística → misión propuesta → salida. La frontera respeta la autonomía del tenant y separa Pedido de Misión. Las limitaciones restantes son de integración persistente, publicación y consumidores; no se rellenaron con una arquitectura convencional ni se incorporaron deliberadamente a este núcleo.
