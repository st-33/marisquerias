# ENSAMBLAJE Y PASOS: PANTALLAS POR ROL
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

Pasos normativos de construcción visual del subsistema `03_pantallas_por_rol`.
Cada paso hace referencia a los contratos definidos en `02_contratos_y_tipos.md`
(secciones indicadas entre paréntesis). Cada rol ve su mundo: la pantalla se
adapta a sus tareas sin información ni acciones que no le correspondan.

## PASO 01: Montar el shell compartido con cabecera

### ESPECIFICACION
- Se construye primero el shell común que envuelve todas las pantallas, con la
  cabecera que muestra: nombre de pantalla, contexto actual y estado de
  conectividad (invariante 3).
- El shell hereda los tokens de fundamentos (fondo profundo, tipografía, radio)
  y los componentes compartidos ya aprobados en el subsistema de primitivos.
- Condición de terminado: todos los roles comparten exactamente el mismo shell;
  solo cambia el contenido interior por rol.

## PASO 02: Resolver cada rol a su pantalla inicial

### ESPECIFICACION
- Se registra en `REGISTRO_PANTALLAS` (sección 2) cada clave con su `Screen`:
  `selector_roles`, `cocina`, `mesero`, `mostrador`, `admin_dashboard`,
  `admin_menu`, `admin_tables`, `admin_inventory`, `admin_repart`,
  `admin_mostrador`.
- Cada rol resuelve **exactamente una** pantalla inicial según la tabla de
  experiencia (sección 1): administrador → Resumen de operación, mostrador →
  Venta de mostrador, mesero → Mapa/lista de mesas, cocina → Cola de cocina,
  reparto → Pedidos de reparto.
- Condición de terminado: al iniciar sesión, cada rol cae directo en su pantalla
  inicial sin pasos intermedios ni ambigüedad.

## PASO 03: Construir la pantalla del administrador

### ESPECIFICACION
- Se ensambla el Resumen de operación con los datos siempre visibles del
  contrato (sección 1): negocio activo, ventas, alertas, permisos.
- La acción dominante "Abrir módulo / revisar alerta" usa el acento dorado
  (administración) según la paleta semántica de fundamentos.
- Condición de terminado: el administrador accede a catálogo, caja, reportes,
  usuarios y configuración sin ver las tareas operativas de otros roles.

## PASO 04: Construir mostrador, mesero y cocina

### ESPECIFICACION
- Mostrador: Venta de mostrador con carrito, total, método de pago y pendientes
  siempre visibles; acción dominante "Agregar producto / cobrar" en coral
  (acción principal).
- Mesero: Mapa/lista de mesas con mesa, productos, notas y estado siempre
  visibles; acción dominante "Abrir mesa / enviar comanda".
- Cocina: Cola de cocina con número, tiempo, prioridad y líneas siempre
  visibles; acción dominante "Marcar estado de preparación".
- Condición de terminado: cada rol ve únicamente sus datos (el cocinero no ve
  el total a cobrar; el mesero no ve la configuración del negocio).

## PASO 05: Construir la pantalla del reparto

### ESPECIFICACION
- Reparto: Pedidos de reparto con dirección, estado y responsable siempre
  visibles; acción dominante "Asignar / actualizar entrega".
- Se usa la semántica de conectividad (`info`) para el estado de entrega y el
  dato de destino se destaca con espacio y contraste propios (invariante 3).
- Condición de terminado: el repartidor ve el destino de entrega que otros
  roles no necesitan ver, sin ruido de configuración ni de cocina.

## PASO 06: Verificar el invariante de pantallas

### ESPECIFICACION
- Se recorren las invariantes (sección 3): exactamente una pantalla inicial por
  rol; shell con cabecera en todas; la navegación no oculta una venta/comanda en
  curso sin advertencia; el dato crítico (totales, estados, peso, stock) tiene
  espacio y contraste propios.
- Se comprueba que ninguna pantalla muestra información o acciones fuera de su
  rol, y que el dato crítico respira según fundamentos.
- Condición de terminado: los cinco roles quedan cubiertos, resolubles por
  `REGISTRO_PANTALLAS` y consistentes con el shell y los tokens.
