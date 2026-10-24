# Incidentes de prueba en dispositivo

Fecha: 2026-10-22  
Dispositivo: BL52Pro, instalación Android nativa

## INC-001 — Revalidación de acceso al regresar a la aplicación

- **Estado:** registrado, pendiente de diagnóstico aislado.
- **Síntoma:** después de validar el código y llegar a la selección de roles, cambiar de aplicación y regresar vuelve a solicitar el código. En un intento, la pantalla de acceso reapareció tras acertarlo.
- **Impacto:** bloqueo intermitente del ingreso.
- **Alcance actual:** no corregido para evitar mezclar autenticación con el ajuste solicitado del menú.

## INC-002 — Monitoreo sin dispositivos conectados

- **Estado:** registrado, pendiente de diagnóstico aislado.
- **Síntoma:** la consola informa registro operativo y conexión reciente, pero no lista dispositivos conectados ni responde el monitoreo.
- **Impacto:** estado operativo inconsistente o incompleto.
- **Alcance actual:** no corregido; requiere verificar presencia, suscripciones y fuente de tiempo en una tarea separada.

## INC-003 — Catálogo vacío sin acciones de creación

- **Estado:** reproducido y corregido en código.
- **Causa observada:** el estado vacío solo mostraba una instrucción; la creación dependía del botón flotante global y no ofrecía una salida visible dentro del catálogo.
- **Corrección:** se conectaron botones visibles para crear categoría al modal y a la lógica de validación ya existentes. No se modificó persistencia ni lógica de negocio.
- **Cobertura:** la barra permite crear categorías en todo momento; el estado vacío muestra una llamada a la acción; al existir una categoría se conserva la acción de agregar productos y el editor existente de variantes.

## INC-004 — Firebase rechaza productos con variantes opcionales

- **Estado:** reproducido y corregido en código.
- **Síntoma:** al guardar un producto, Firebase lanza `validateFirebaseData` desde `crearProducto`.
- **Causa:** el repositorio saneaba categorías, pero enviaba productos sin aplicar el saneador recursivo existente. Los campos opcionales `undefined` dentro de variantes invalidaban todo el payload.
- **Corrección:** creación y edición de productos eliminan valores `undefined` en el límite de persistencia, antes de escribir las copias plana y canónica.
