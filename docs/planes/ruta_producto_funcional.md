# Ruta de producto funcional

**Repositorio:** `st-33/marisquerias`

**Rama:** `rama-2`

**Checkpoint:** [`e6b6632`](https://github.com/st-33/marisquerias/commit/e6b6632)

## 1. Objetivo

Llevar el sistema desde una arquitectura reorganizada y compilable hasta una operación funcional verificable para una marisquería multi-tenant. El objetivo no es producir una demo ni un MVP de carpetas. El objetivo es que los flujos de negocio, sus errores y su recuperación estén definidos y comprobados.

## 2. Estado de partida

La arquitectura canónica `sistema`, `ui`, `capacidades`, `roles`, `negocio`, `composicion` y `logica` ya está visible. Los puentes generales de hardware retirados fueron `ProveedorHardware`, `useHardware` compartido y `useFierrosLegacy`. TypeScript, Jest, lint y exportación web pasan en el checkpoint actual.

Eso no demuestra todavía operación física ni extremo a extremo. El escáner de códigos sigue sin implementación real. `MostradorPro` conserva un consumo directo de `HardwareService` para la báscula. El sistema de impresión distribuida y offline sigue activo y debe validarse antes de consolidarse.

## 3. Orden de trabajo

### Fase 0. Contratos y aceptación

Antes de ampliar componentes visuales, se congelan contratos y criterios de salida para venta, pedido, impresión, báscula, sincronización, tenant, roles y errores. Cada flujo debe tener camino feliz, fallo esperado, reintento y condición de recuperación.

**Salida:** matriz de aceptación versionada y lista de invariantes.

### Fase 1. Núcleo de venta y dispositivos

Migrar `MostradorPro` de `HardwareService` a `useFierros` sin modificar JSX, estilos, textos ni navegación. Retirar `HardwareService` solo si no quedan consumidores. Conservar el nombre visual **Dispositivos** y reemplazar gradualmente `fierros` como identidad pública por una nomenclatura técnica más clara, sin hacer un renombrado masivo todavía.

La báscula debe devolver peso, unidad, estabilidad, error y cancelación. La impresión debe mantener comanda, cuenta, venta y etiqueta, con resultado explícito y sin duplicar trabajo. El escáner se debe mantener como no disponible hasta que exista hardware o simulador verificable.

**Salida:** núcleo de venta conectado al contrato canónico y sin consumidor legacy de hardware.

### Fase 2. Flujos operativos por rol

Validar Administrador, Mostrador, Mesero y Cocina como ciclos completos: acceso, resolución de tenant, selección de rol, carga de datos, acción principal, persistencia, notificación de estado y recuperación de error.

**Salida:** cada rol completa sus operaciones críticas con datos aislados y estados comprensibles.

### Fase 3. Datos, offline e idempotencia

Probar dos tenants, operaciones repetidas, reconexión, cola local, sincronización RTDB/SQLite, ventas pendientes, impresión pendiente y recuperación después de un fallo. Una operación repetida no debe duplicar venta, pedido ni impresión.

**Salida:** invariantes de tenant, idempotencia y recuperación comprobadas.

### Fase 4. UX robusta y tema único

Corregir primero el objeto estático `theme` que permanece fijado en `defaultColors`, el almacenamiento global `@adi_theme_preference`, el shell nulo durante la carga del tema, el contraste de AdminMenu y los no-op de acciones. Después se puede modernizar la base visual.

La estrategia recomendada es gradual: conservar la semántica POS y refactorizar primitives, estados, formularios, overlays y feedback. React Native Paper y `@gorhom/bottom-sheet` son candidatos a un prototipo aislado, no una decisión automática para reemplazar todo.

**Salida:** un solo origen de verdad visual, feedback para acciones no disponibles y componentes repetibles.

### Fase 5. Operación y observabilidad

Instrumentar bootstrap, autenticación, impresión, báscula, sincronización, offline, errores de permisos y acciones de rol. Cada fallo crítico debe indicar qué pasó, qué dato se perdió o quedó pendiente y cómo recuperar.

**Salida:** diagnóstico operativo sin revisar manualmente todo el código.

### Fase 6. Contratos reutilizables del ecosistema

Después de estabilizar la operación, extraer contratos públicos para servicio a domicilio, aplicaciones hermanas, históricos, predicciones y agentes autorizados. Los contratos no deben exponer directamente el store interno ni permitir bypass de permisos.

**Salida:** motores reutilizables y versionados sin acoplar otra aplicación al árbol visual.

## 4. Matriz de aceptación funcional

| Flujo | Camino feliz | Fallo que debe comprobarse | Recuperación |
|---|---|---|---|
| Acceso y tenant | Usuario entra al negocio correcto | Código inválido o tenant inexistente | Mensaje y retorno seguro |
| Mostrador | Producto, cantidad, peso, total y venta | Báscula ausente o lectura inválida | Teclado/manual o cancelación explícita |
| Impresión | Comanda/cuenta/venta impresa | Dispositivo desconectado | Cola o reintento sin duplicado |
| Mesero | Pedido enviado y cuenta solicitada | Sin mesa, sin productos o impresora ausente | Estado explicado y acción posible |
| Cocina | Comanda recibida y estados actualizados | Red perdida o pedido duplicado | Reconciliación idempotente |
| Inventario | Movimiento registrado | Conflicto de stock o tenant incorrecto | Rechazo explicable y sin escritura parcial |
| Offline | Operación queda pendiente | Aplicación se cierra sin red | Recuperación al volver la conectividad |
| Roles | Acciones permitidas por rol | Acceso a capacidad no autorizada | Bloqueo visible y auditable |

## 5. Reglas de continuidad

Cada frente debe terminar con un commit pequeño, validación estática y una nota de alcance. No se debe reemplazar lógica de negocio por una biblioteca UI. No se debe añadir una biblioteca visual a toda la aplicación sin probar antes una pantalla aislada. No se debe renombrar una API técnica mientras todavía tenga consumidores activos. No se debe declarar soporte de hardware sin hardware, simulador o pruebas contractuales que lo demuestren.

## 6. Próxima acción recomendada

La siguiente acción de código es **Fase 1, migración puntual de `MostradorPro`**. La siguiente acción documental es congelar la matriz de aceptación de Fase 0. Ambas pueden avanzar sin modificar el resto de las pantallas.

## Referencias

[1]: https://github.com/st-33/marisquerias/commit/e6b6632 "Checkpoint hardware actual"

[2]: https://github.com/st-33/marisquerias/blob/rama-2/src/ui/bloques/MostradorPro.tsx "Consumidor pendiente de HardwareService"

[3]: https://github.com/st-33/marisquerias/blob/rama-2/src/sistema/impresion/fierros/proveedor/ProveedorFierros.tsx "Contrato canónico de dispositivos e impresión"
