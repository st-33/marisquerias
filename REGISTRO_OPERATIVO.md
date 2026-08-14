# Registro operativo — Marisquerías

## Estado de trabajo

- **Rama:** `manus/reconstruccion-operativa-inicial`.
- **Flujo actual:** acceso → selección de rol → mesa → pedido → cocina → entrega → pago.
- **Plataforma de validación:** web mediante Expo Router.

## Evidencia inicial

| Punto | Hecho observable | Evidencia |
|---|---|---|
| Inicio | La ruta `/` redirige a `/access`. | `app/index.tsx` devuelve `Redirect` a `/access`. |
| Acceso | La pantalla muestra un código, el texto “Mi Negocio a un Click” y el botón “Entrar al Panel”. | Validación web realizada el 2026-08-14; ruta visible `/access`. |
| Negocio | El código se valida contra Firebase RTDB y resuelve `tenantPath`, `tenantId`, nicho y categoría. | `useAuth.ts` y `EnsambladorInstalacion.ts`. |
| Dispositivo y rol inicial | La instalación registra/vincula un dispositivo y obtiene `rolActivo`, roles permitidos y módulos permitidos. | `EnsambladorInstalacion.ts`. |
| Selector de roles | Tras acceso correcto, la app envía a `/_role/roles`; los roles se cargan desde `{tenantPath}/caracteristicas` con alternativa `{tenantPath}/features`. | `app/(auth)/access.tsx`, `useRoleSelectorLogic.ts`, `useRolePacker.ts`. |
| Mesero | La vista conecta mesa, borrador de productos, pedido, envío a cocina, cuenta, entrega y pago. | `MeseroScreen.tsx`, `useMeseroLogic.ts`, `procesarPedido.ts`. |
| Persistencia del envío | El envío crea o amplía un pedido, lo asigna a la mesa, lo envía a cocina y marca la mesa ocupada. | `procesarPedido.ts`. |

## Cambios aplicados

| Cambio | Motivo | Estado |
|---|---|---|
| Sincronización de `package-lock.json` | `npm ci` no podía instalar porque el bloqueo estaba desalineado con `package.json` en dependencias `@emnapi`. | Aplicado en la rama de trabajo; pendiente de validación completa. |

## Verificación web

La aplicación compiló con Expo y respondió por HTTP. Visualmente carga la pantalla de acceso sin error visible. Se observó una advertencia de estilos `shadow*` deprecados en web, que no bloqueó el arranque.

## Pendientes inmediatos

1. Verificar el flujo estático y web desde Mesero hacia Cocina, sin usar códigos de acceso reales ni alterar datos remotos.
2. Ejecutar comprobaciones de tipos y pruebas para determinar si el cambio de bloqueo y la base actual están sanos.
3. Determinar si existe una ruta de datos de prueba segura para validar roles y pedidos de extremo a extremo.

## Riesgos conocidos

- El flujo autenticado depende de un código de acceso válido y de RTDB; no se debe usar ni inventar uno.
- La prueba completa de rol y pedido requiere datos de tenant autorizados o un entorno de prueba seguro.
- La normalización de `package-lock.json` es reversible, pero debe pasar verificaciones antes de incluirla en un commit.

## Decisiones

- No se eliminaron ni renombraron módulos históricos.
- No se alteró Firebase ni información persistente.
- Se eligió Mesero → Cocina → entrega → pago como primer flujo de negocio porque está conectado de forma explícita desde la interfaz hasta la persistencia.


## Resultado de la primera intervención

| Hallazgo | Evidencia | Acción aplicada | Verificación |
|---|---|---|---|
| El bloqueo de dependencias no era instalable de forma limpia. | `npm ci` fallaba porque el archivo de bloqueo no incluía `@emnapi/core` y `@emnapi/runtime` 1.11.3, y retenía `@emnapi/wasi-threads` 1.2.2 incompatible. | Se normalizó `package-lock.json` con las dependencias declaradas, sin modificar `package.json`. | `npm ci` finalizó correctamente y la aplicación web compiló. |
| Una prueba de roles bloqueaba `tsc` por mocks sin tipos compatibles. | `npm run check-types` reportó cuatro errores en `useRolePacker.test.ts`. | Se tipó el estado simulado y se aisló el mock genérico de `useState`; no se cambió la lógica de roles. | `npm run check-types` finalizó correctamente. |
| Una prueba de seguridad buscaba una ruta histórica inexistente. | La suite completa falló por `ENOENT` hacia `catalogo/nichos/2 alimentos_y_bebidas/.../AdminMenuScreen.tsx`. | Se reconectó la prueba a `catalogo/_compartido/pantallas/AdminMenuScreen.tsx`, que es la pantalla usada actualmente. | La suite completa finalizó con 16 suites y 104 pruebas aprobadas. |

### Validaciones realizadas

| Comprobación | Resultado |
|---|---|
| Instalación reproducible (`npm ci`) | Correcta después de sincronizar el bloqueo. |
| Tipos (`npm run check-types`) | Correcta. |
| Pruebas de roles | 2 de 2 aprobadas. |
| Suite completa (`npm test -- --runInBand`) | 16 de 16 suites; 104 de 104 pruebas aprobadas. |
| Estilo de las pruebas tocadas | Correcto con ESLint sobre ambos archivos. |
| Web | La aplicación volvió a cargar la pantalla de acceso en `/access` después de las correcciones. |

### Límites de esta validación

La prueba web confirmó el arranque y la redirección a acceso. No se introdujo un código de acceso real: usar uno ejecuta vinculación de dispositivo, registra cambios en RTDB y podría afectar un tenant. Por eso el recorrido autenticado de Mesero, Cocina y Administración quedó validado por código, pruebas y rutas, pero no se accionó contra datos reales.

### Calidad pendiente fuera de esta intervención

El análisis global de estilo sigue fallando con **72 errores y 50 advertencias** preexistentes, repartidos en módulos no tocados. No se aplicó corrección masiva porque no existe todavía evidencia de que esos cambios respeten los flujos operativos; esta limpieza queda como rama separada.

### Próximo paso seguro

Para recorrer de forma real el flujo Mesero → Cocina → entrega → pago hace falta un **tenant de pruebas** y un código de acceso autorizado, con datos de mesas, menú y roles. Con ese entorno se puede validar el circuito sin escribir sobre un negocio productivo.


## Tramo Mesero → Mesa → Pedido

- **Movido:** el circuito exclusivo de Mesero desde `plataforma/dominios/alimentos_y_bebidas` a `plataforma/dominios/marisqueria/mesero`.
- **Piezas:** orquestación de Mesero, mesas, borradores, productos, variantes, pedido, impresión e inventario de Mesero.
- **Responsabilidad:** la pantalla selecciona mesa y productos; el orquestador mantiene borrador y pedido; `procesarPedido` crea o amplía pedido, lo asocia a la mesa, lo envía a Cocina y deja la mesa ocupada.
- **Reconexión:** se actualizaron la pantalla de Mesero, lista de pedido, cuadrícula de mesas, modal de variantes y el barril histórico para mantener consumidores vigentes.
- **No movido:** `SincronizadorCocina` continúa en la ruta histórica porque lo consumen Cocina y el repositorio persistente de pedidos; moverlo ampliaría este tramo.
- **Validación:** tipos correctos; 16 suites y 104 pruebas correctas; web carga `/access` sin código de tenant. El primer servidor web agotó memoria con el límite por defecto y se reinició correctamente con un límite de 8 GB.


## Tramo Pedido → Cocina

La lógica y el audio de Cocina se movieron a `plataforma/dominios/marisqueria/cocina`. `CocinaScreen` recibe el pedido desde el store, muestra comandas mediante `TarjetaComanda` y llama a `startItem`, `finishItem` o `finishOrder`; esas acciones actualizan los items y el estatus persistido del pedido. Las utilidades y pruebas que usan sus tipos se reconectaron. El `SincronizadorCocina` no se movió: lo consumen Cocina, Mesero y el repositorio de pedidos, por lo que no es exclusivo de este tramo.

Tipos, estilo local y las 16 suites con 104 pruebas pasaron. La validación web nueva quedó bloqueada por un agotamiento de memoria de Metro: la primera ejecución agotó el límite por defecto y el único reintento con 8 GB también agotó su heap. No se reintentará automáticamente; los cambios quedan validados estáticamente y con pruebas.


## Tramo Entrega → Pago

La entrega nace en `OrderList` y llega a `markAsDelivered` del orquestador de Mesero; esa acción marca el item como `entregado` mediante `PedidosRepository.actualizarEstadoItem` y puede lanzar el descuento de inventario configurado. La cuenta se solicita desde `gestionarImpresion`, que deja la mesa en `solicitar_cuenta`. El pago exige cuenta impresa e ítems entregados; `markAsPaid` cierra el pedido con `PedidosRepository.cerrar`, guarda el pago y elimina su índice por mesa, después libera la mesa con `MesasRepository.liberar`.

No se movieron `PedidosRepository` ni `MesasRepository`: son infraestructura compartida y alteran contratos persistentes de pedidos, mesas e índices. Tampoco se recorrió el flujo contra RTDB, porque requiere un tenant autorizado; el circuito quedó demostrado por llamadas, tipos y pruebas existentes.

