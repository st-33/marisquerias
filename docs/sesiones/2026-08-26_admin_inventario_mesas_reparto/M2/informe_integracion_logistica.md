# Informe de integración logística en Marisquerías

**Agente:** M2  
**Fecha:** 2026-08-27  
**Repositorio:** `st-33/marisquerias`  
**Rama:** `rama-2`  
**Propósito:** Integrar la capacidad logística como una capacidad opcional de un pedido existente, sin convertir Marisquerías en una aplicación de delivery independiente.

## 1. Resultado ejecutivo

La integración quedó implementada dentro del flujo operativo existente. Marisquerías continúa siendo la fuente de verdad de productos, pedidos, venta, inventario, clientes e historial. La logística se representa como una proyección opcional dentro del pedido mediante `pedido.logistica`, con estado y referencia de misión, mientras que el motor recibe únicamente la información mínima necesaria para crear una misión de entrega.

No se añadió una ruta de delivery, no se creó un panel paralelo y no se agregaron listeners duplicados para pedidos. El sincronizador se monta en el ciclo de vida existente, consume `usePedidos()` del store central y se activa únicamente cuando la feature logística está habilitada y existe `repartoUrl`.

> **Conclusión:** Marisquerías puede conservar su identidad operativa y utilizar una operación logística asociada. La integración funcional está lista contra el contrato `MisionDelivery` que ya existe en Marisquerías; el contrato del repositorio actual de Servicio a Domicilio todavía no expone esa operación y requiere alineación posterior.

## 2. Arquitectura real encontrada antes del cambio

| Área                     | Evidencia encontrada                                                                                                                                                                       | Consecuencia para la integración                                                                                                |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| Nacimiento del pedido    | `src/roles/logica/mesero/procesarPedido.ts:81-179` toma drafts, bloquea la mesa, crea mediante `PedidosRepository.crear`, asigna `pedidoActivoId`, envía a Cocina y marca la mesa ocupada. | El pedido ya existe antes de cualquier etapa logística; el adaptador debe colgarse del pedido, no reemplazar su creación.       |
| Representación           | `src/sistema/persistencia/pedidos.repo.ts:45-81` define `Pedido`; `src/sistema/store/slices/operacion.ts:70-88` define `PedidoBase`. Ambos aceptan/extienden atributos operativos.         | Se añadió `modalidad`, `origen`, `cliente`, `destino` y `logistica` opcionales, preservando compatibilidad con pedidos de mesa. |
| Sincronización operativa | `src/sistema/store/slices/operacion.ts:220-329` instala cinco listeners centralizados: mesas, pedidos, categorías, productos y ventas.                                                     | No se creó un listener adicional para pedidos. El nuevo hook lee la proyección ya cargada en el store.                          |
| Mesero                   | `src/ui/pantallas/MeseroScreen.tsx` monta `useMeseroLogic`; `useMeseroLogic` mantiene drafts, pedido activo, envío a Cocina, entrega de ítems, inventario y cierre.                        | Se agregó una acción opcional `solicitarEntrega` y una indicación contextual en `PuestoMando`, sin cambiar el flujo normal.     |
| Cocina                   | `src/ui/pantallas/CocinaScreen.tsx` consume `useCocinaLogic`; este transforma pedidos del store y conserva la clasificación de ítems a Cocina o directos.                                  | Se propagó el bloque logístico a la orden de Cocina para mostrar estado y referencia, sin cambiar preparación ni inventario.    |
| Bebidas/directos         | `PedidosRepository.enviarACocina` clasifica por producto/categoría (`:398-428`), envía a Cocina los preparados y marca como `listo` los directos (`:476-515`).                             | La logística no asume que todos los ítems pasan por Cocina; la clasificación existente permanece intacta.                       |
| Inventario               | El descuento se ejecuta en Mesero/Cocina mediante `InventoryV2Repository` y `SincronizadorCocina`; el pedido solo guarda marcas de descuento por ítem.                                     | El adaptador no envía inventario ni recetas al motor.                                                                           |
| Rutas                    | `app/_layout.tsx:35-48` ya protege Mesero, Cocina y `admin/repart`; no existe una ruta operativa de delivery.                                                                              | Se conservaron las rutas actuales; la capacidad vive detrás de la pantalla del negocio.                                         |
| Reparto previo           | `src/sistema/persistencia/reparto.repo.ts:97-142` ya define `MisionDelivery` y `:253-271` crea misiones en la RTDB de reparto.                                                             | Este contrato existente se usa como frontera/adaptador, no se duplica el motor.                                                 |

## 3. Punto exacto de integración

El punto de integración está compuesto por tres capas relacionadas:

1. `src/capacidades/logistica/IntegracionLogisticaPedido.ts` funciona como adaptador. Recibe un `Pedido` existente, verifica que requiere logística, valida cliente/destino, proyecta los datos mínimos al contrato `MisionDelivery` y escribe de vuelta únicamente `pedido.logistica`.

2. `src/capacidades/logistica/useSincronizarPedidosLogistica.ts` se monta desde `app/_layout.tsx` en el ciclo de vida común. Lee los pedidos que ya sincronizó el store, espera a que estén operativos, evita reenvíos concurrentes y, si el tenant tiene la capacidad activa, crea la misión una sola vez. También suscribe las misiones del tenant para proyectar estados posteriores al pedido original.

3. `src/ui/bloques/PuestoMando.tsx` y `src/ui/bloques/TarjetaComanda.tsx` muestran una variante mínima y contextual. No existe un panel de delivery separado.

El contrato de dominio nuevo está en `src/logica/dominio/logistica.ts`. Define `ModalidadPedido`, `OrigenPedido`, `EstadoLogistico`, `UbicacionPedido`, `ClientePedido` y `LogisticaPedido`, además de las funciones `pedidoRequiereLogistica`, `pedidoConfirmadoParaLogistica` y `etiquetaEstadoLogistico`.

## 4. Flujo antes y después

| Etapa         | Antes                                                                                   | Después                                                                                                                                                                          |
| ------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Creación      | Mesero crea un pedido desde drafts y lo asocia a una mesa.                              | El mismo flujo continúa sin cambios. Los pedidos que entren por otros puertos pueden incluir `tipo: 'delivery'`, `modalidad`, `cliente` y `destino`.                             |
| Preparación   | `enviarACocina` clasifica ítems preparados/directos y actualiza los estados existentes. | La clasificación se conserva. La logística no altera `estatus`, estados de ítems ni descuento de inventario.                                                                     |
| Detección     | No había una frontera operativa para pedir reparto desde el pedido.                     | El sincronizador detecta un pedido confirmado que requiere logística. La activación depende de `delivery` o `delivery_interno_adi_repart` y de `repartoUrl`.                     |
| Solicitud     | No existía una solicitud automática conectada al pedido.                                | El adaptador genera una misión `MisionDelivery.v1` con `pedidoId`, tenant, cliente, ubicación, items mínimos, totales y prioridad.                                               |
| Consecuencia  | El pedido no tenía estado logístico propio.                                             | Se guarda solamente `pedido.logistica = { requiereEntrega, modalidad, origen, estado, referenciaMision, actualizadoEn, error }`.                                                 |
| Seguimiento   | No había proyección de misión al pedido.                                                | El adaptador puede consumir misiones por tenant, filtrar por `pedidoId` y proyectar `pendiente`, `asignada`, `en_camino`, `en_ubicacion`, `completada`, `cancelada` o `fallida`. |
| Visualización | Cocina ya diferenciaba `delivery` por icono/etiqueta, pero sin referencia de misión.    | Mesero muestra una fila compacta `A DOMICILIO`; Cocina muestra estado y referencia en la tarjeta existente.                                                                      |

El sincronizador no procesa drafts ni pedidos cerrados. Considera confirmados los pedidos cuyo `estatus` no sea `activo`, `creado`, `nuevo` o `borrador`. Esta protección evita crear una misión mientras el pedido todavía está siendo armado.

## 5. Datos que cruzan la frontera

| Se envía al motor                                            | Se queda en Marisquerías                                              |
| ------------------------------------------------------------ | --------------------------------------------------------------------- |
| `pedidoId` como referencia al pedido original.               | Historial completo del pedido.                                        |
| `tenantId` y `tenantPath`.                                   | Productos y catálogo completo.                                        |
| Cliente: nombre y teléfono opcional.                         | Inventario, recetas y movimientos.                                    |
| Destino: dirección, referencia y coordenadas.                | Venta, cobro y registro de ventas.                                    |
| Ítems mínimos: id, nombre, cantidad, unidad, precio y notas. | Estados de Cocina y operación interna, salvo la proyección logística. |
| Totales subtotal/total.                                      | Datos no necesarios para reparto.                                     |
| Prioridad y metadata de contrato/origen.                     | La fuente de verdad del pedido.                                       |

No se envía `productId`, receta ni inventario. Los ítems de misión se construyen mediante `toItemMision`, y la misión conserva `pedidoId` como referencia externa al origen.

## 6. Roles y pantallas afectadas

**Mesero.** Sigue utilizando `useMeseroLogic`, `PuestoMando`, drafts por mesa, envío a Cocina y cierre. Cuando el pedido tiene modalidad logística, la misma superficie muestra una fila compacta con modalidad, estado y referencia. La acción `SOLICITAR` solo aparece cuando la capacidad está activa y todavía no existe referencia de misión.

**Cocina.** Sigue utilizando `useCocinaLogic` y el mismo tablero de comandas. `TarjetaComanda` conserva iconos y etiquetas existentes para `delivery`, y ahora puede mostrar `A DOMICILIO · estado` y la referencia de misión. No se cambió el ordenamiento, temporizador, clasificación de productos ni descuento de inventario.

**Administrador.** No se creó ni modificó un panel operativo de delivery. La pantalla existente `admin/repart` continúa siendo de configuración de umbrales, horarios y costos. La operación logística del pedido permanece en la pantalla natural del negocio.

## 7. Feature flags y apagado seguro

La capacidad se considera habilitada cuando el store del negocio expone `delivery.enabled === true` o `delivery_interno_adi_repart.enabled === true`, y además existe una `repartoUrl` configurada. También se amplió `src/sistema/utilidades/caracteristicas.ts` para conservar las flags `delivery_interno_adi_repart`, `delivery_externo`, `tracking_repartidor` y `solicitudes_logisticas` durante la normalización.

Cuando la capacidad está apagada, el pedido continúa por el flujo normal. No se crea misión, no se suscribe la RTDB de reparto y no se modifica el pedido por efectos del sincronizador. El bootstrap existente mantiene `delivery: false` para alimentos preparados por defecto; la activación debe ser explícita por tenant.

## 8. Contrato utilizado e incompatibilidades

La implementación utiliza el contrato existente en `Marisquerías/src/sistema/persistencia/reparto.repo.ts`, específicamente `MisionDelivery` y `RepartoRepository.crearMisionDelivery`. Este contrato persiste misiones en `reparto/misiones` dentro de una RTDB separada y permite consultar misiones por tenant.

La inspección de `st-33/servicio-a-domicilio` encontró una incompatibilidad importante. Su esquema actual solo tiene usuarios, tenants, membresías, ajustes y `tenant_feature_flags`; `server/routers.ts` expone únicamente contexto de tenant y plataforma. No hay tablas, endpoints ni contratos operativos para pedidos, misiones, asignaciones, repartidores o tracking. Por ello, el adaptador funciona contra el contrato legado/disponible de Marisquerías, pero no puede afirmar integración completa con el backend actual de Servicio a Domicilio.

También se detectó que `MisionDelivery` exige `cliente.ubicacion.lat` y `lng`. La dirección textual por sí sola no basta. El adaptador no fabrica coordenadas: marca el bloque logístico como `fallida` y deja el error explícito `El contrato MisionDelivery.v1 exige coordenadas lat/lng; el pedido solo tiene una dirección.`

## 9. Archivos modificados

| Archivo                                                                  | Cambio                                                                                                    |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `src/logica/dominio/logistica.ts`                                        | Contrato mínimo, detección de necesidad logística, guard de confirmación y etiquetas.                     |
| `src/capacidades/logistica/IntegracionLogisticaPedido.ts`                | Adaptador pedido → misión y proyección misión → pedido.                                                   |
| `src/capacidades/logistica/useSincronizarPedidosLogistica.ts`            | Sincronizador raíz sobre el store central, con feature flag, idempotencia local y suscripción por tenant. |
| `src/capacidades/logistica/index.ts`                                     | Barrel de la capacidad.                                                                                   |
| `src/capacidades/index.ts`                                               | Exportación canónica de logística.                                                                        |
| `src/capacidades/logistica/__tests__/IntegracionLogisticaPedido.test.ts` | Cinco pruebas del flujo de solicitud, validación, idempotencia y actualización.                           |
| `src/sistema/persistencia/pedidos.repo.ts`                               | Campos logísticos opcionales en `Pedido`.                                                                 |
| `src/sistema/store/slices/operacion.ts`                                  | Campos logísticos explícitos en `PedidoBase`.                                                             |
| `src/sistema/utilidades/caracteristicas.ts`                              | Conservación de flags logísticas durante normalización.                                                   |
| `src/roles/logica/mesero/useMeseroLogic.ts`                              | Acción `solicitarEntrega`, gate de feature y estado de solicitud.                                         |
| `src/ui/pantallas/MeseroScreen.tsx`                                      | Wiring de pedido activo y acción contextual.                                                              |
| `src/ui/bloques/PuestoMando.tsx`                                         | Indicador mínimo de modalidad/estado/referencia.                                                          |
| `src/roles/logica/cocina/useCocinaLogic.ts`                              | Propagación de `logistica` en la orden de Cocina.                                                         |
| `src/sistema/motores/KitchenQueueEngine.ts`                              | Compatibilidad del tipo compartido de orden.                                                              |
| `src/ui/bloques/TarjetaComanda.tsx`                                      | Estado y referencia logística compactos en la tarjeta existente.                                          |
| `app/_layout.tsx`                                                        | Montaje del sincronizador en el ciclo de vida raíz.                                                       |

## 10. Pruebas ejecutadas

| Validación                | Resultado                                                                                                   |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `npm run check-types`     | **Correcto** (`tsc --noEmit`).                                                                              |
| `npm test -- --runInBand` | **Correcto:** 21 suites, 118 pruebas en el commit publicado, incluyendo la regresión concurrente de rama-2. |

| Pruebas de logística | **Correcto:** 5 pruebas. |
| ESLint focal sobre archivos modificados | **Correcto:** 0 errores; permanecen 2 warnings preexistentes/no bloqueantes en `ComandoPOS` y `isPrinting`. |
| |
| `git diff --check` | **Correcto**, sin errores de whitespace. |

La prueba principal representa este flujo: pedido `delivery` existente con cliente, dirección y coordenadas → creación de una misión mínima → respuesta `MIS-20260827-001` → actualización del pedido con `logistica.estado = 'solicitada'` y `referenciaMision`, sin propiedad `inventario` en el payload.

## 11. Recomendaciones para M1

M1 debe publicar un contrato operativo estable que reemplace la dependencia del repositorio legado. Como mínimo debe definir una operación equivalente a `crearMisionDelivery`, un identificador idempotente por `tenantId + pedidoId`, una suscripción o callback de estados y un esquema claro para ubicación incompleta.

También debe decidir si el contrato canónico conservará `tenantPath` completo, o si Central resolverá esa pertenencia a partir de `tenantId`. Marisquerías necesita únicamente el identificador de misión, el estado logístico y, opcionalmente, un error de coordinación; no debería conocer la arquitectura interna de Central ni Repartidor.

El contrato actual obliga a incluir coordenadas y unidades de ítems. Si esa obligación es correcta, M1 debe formalizar la geocodificación antes de permitir solicitudes solo con dirección. Si no lo es, debe aceptar una ubicación pendiente sin forzar a Marisquerías a inventar datos.

## 12. Posibles efectos en Central y Repartidor

Central deberá consumir eventos o misiones sin absorber el pedido completo. Puede observar `tenantId`, `pedidoId`, origen, destino mínimo, estado y referencia, pero el pedido, inventario, venta e historial deben permanecer en Marisquerías.

Repartidor necesitará leer una misión `delivery` con estados compatibles con `EstadoMision`, pero cualquier asignación, tracking o comunicación deberá operar dentro del dominio logístico y devolver únicamente consecuencias mínimas. Marisquerías ya está preparada para proyectar estados, pero no debe convertirse en dueña de asignación, rutas o ubicación del repartidor.

## 13. Funcionando y pendiente

**Funcionando:** frontera/adaptador tipado; feature flag apagable; detección automática desde el store; creación de misión contra `RepartoRepository`; idempotencia cuando existe `referenciaMision`; proyección de estados por tenant; indicación contextual en Mesero y Cocina; aislamiento de inventario; pruebas unitarias y regresión completa en verde.

**Pendiente:** contrato operativo definitivo del repositorio `servicio-a-domicilio`; endpoint o transporte compatible con `MisionDelivery`; idempotencia garantizada por el motor remoto; geocodificación de direcciones sin coordenadas; autenticación/autorización entre tenant y motor; flujo real de asignación, tracking y repartidor; y prueba end-to-end contra un entorno de reparto real.

## 14. Huella técnica

Los cambios de código quedaron en la rama autorizada `rama-2`. Este informe se entrega separado del informe histórico de Mesas para no sobrescribir el resultado de la tarea anterior de M2.

**Autor:** Manus AI
