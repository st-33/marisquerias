# INSTRUCCION: PANTALLAS POR ROL

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 03

## ORIGEN

- Terminos: PANTALLA, ROL OPERATIVO, CARRITO, KPI, MESA, PARTIDA, MOSTRADOR, COCINA, REPARTO, SHELL.
- Formulas: pantalla + ruta = unidad_navegable; rol_operativo + pantalla = capacidad_habilitada.
- Fuente real: `DESIGN.md` seccion 7, `src/ui/pantallas/*`, `src/ui/roles/*`.

## CONTRATO DE EXPERIENCIA POR ROL (TABLA CANONICA)

| Rol | Pantalla inicial | Accion dominante | Datos siempre visibles |
| --- | --- | --- | --- |
| administrador | Resumen de operacion | Abrir modulo / revisar alerta | Negocio activo, ventas, alertas, permisos |
| mostrador | Venta de mostrador | Agregar producto / cobrar | Carrito, total, metodo de pago, pendientes |
| mesero | Mapa/lista de mesas | Abrir mesa / enviar comanda | Mesa, productos, notas, estado del pedido |
| cocina | Cola de cocina | Marcar estado de preparacion | Numero, tiempo, prioridad, lineas del pedido |
| reparto | Pedidos de reparto | Asignar / actualizar entrega | Direccion, estado, responsable |

## PASO 01: SHELL COMPARTIDO

### ESPECIFICACION

- Shell incluye cabecera breve: nombre de pantalla, contexto operativo y senal de conectividad.
- La navegacion no oculta una venta o comanda en curso sin advertencia.

## PASO 02: ADMINISTRADOR

### ESPECIFICACION

- Inicia con resumen de ventas y alertas que conduzcan a una accion.
- Modulos Menu, Inventario, Mesas, Dispositivos y Reparto como entradas claras con estado breve.

## PASO 03: MOSTRADOR

### ESPECIFICACION

- Divicion: seleccion, detalle de venta, cierre; carrito visible y total anclado.
- Por peso: peso, unidad, estabilidad y error visibles; sin bascula, entrada manual o cancelacion explicita.

## PASO 04: MESERO

### ESPECIFICACION

- De la mesa a comanda enviada o cuenta solicitada.
- Estados de mesa: libre, ocupada, pendiente, cuenta solicitada, bloqueada (texto + senal visual).

## PASO 05: COCINA (KDS)

### ESPECIFICACION

- Numero, mesa/canal, tiempo transcurrido y lineas agrupadas.
- Estados: recibida -> en preparacion -> lista -> entregada.
- Pedido duplicado o perdida de red muestra senal de reconciliacion, no una segunda tarjeta.

## PASO 06: REPARTO

### ESPECIFICACION

- Secuencia: pendiente, asignado, en camino, entregado, incidencia.
- Acciones destructivas solicitan confirmacion y explican el efecto.

## CONTRATO DE SALIDA

- Cada rol ve solo sus tareas y permisos; los datos de riesgo (totales, estados, peso, stock) tienen espacio y contraste propios; la accion principal es visible sin explorar menus secundarios.
