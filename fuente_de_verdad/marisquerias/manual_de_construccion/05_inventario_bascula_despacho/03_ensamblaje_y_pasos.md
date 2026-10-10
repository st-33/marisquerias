# ENSAMBLAJE Y PASOS: INVENTARIO, BASCULA Y DESPACHO POR PESO
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

## PASO 01: Persistencia del inventario
### ESPECIFICACION
- Se ensambla `useInventario({ db, rutaNegocio })` con `Existencia { insumoId, cantidad, unidad, minimo? }` (ver §2 de `02_contratos_y_tipos.md`).
- Toda cantidad se registra con unidad canonica `coerceUnidad` (`kg | g | l | ml | pza | caja`).
- El minimo opcional habilita alertas de reabastecimiento sin bloquear la operacion.

## PASO 02: Ajuste y merma
### ESPECIFICACION
- Se ensambla el ajuste por merma como `existencia - merma = existencia_ajustada`, con motivo obligatorio.
- No se registra merma sin motivo; el delta se persiste en `inventory_queue` como `pending` cuando no hay red (subsistema 10).
- `allowNegative` se respeta: existencia negativa solo si el contenedor lo permite explicitamente.

## PASO 03: Lectura de bascula
### ESPECIFICACION
- Se ensambla `setScale`/`leerPeso`/`tararBascula`/`hasScale` siguiendo `bascula/02_protocolo_serial.md`.
- El comando de lectura es `W\r`; la respuesta esperada es la trama ASCII `ST,GS,+  1.234kg`, decodificada con la regex `[-+]?\d*\.?\d+`.
- Lectura sin bascula conectada nunca lanza excepcion: retorna `{ success:false, ... }` con mensaje (`Bascula no conectada` / `Formato de peso invalido`).

## PASO 04: Despacho por peso
### ESPECIFICACION
- Se ensambla el despacho de precio = `peso * precioPorUnidad`, mostrando peso, unidad, estabilidad y error.
- `esperarEstabilidad` exige lectura repetida hasta confirmacion antes de retornar peso; `aplicarTara` descuenta la tara antes del registro final.
- Sin bascula se usa entrada manual o cancelacion explicita; nunca una lectura simulada.

## PASO 05: Descuento atomico de inventario
### ESPECIFICACION
- El despacho descuenta existencia en la misma operacion de venta (atomico), sin paso intermedio.
- El flujo `bascula -> usoMostradorPro(carrito) -> precio por unidad -> descuento inventario -> venta_offline/RTDB` se respeta.
- Un fallo en el descuento invalida la venta: no se emite venta sin descuento consistente (o su cola pendiente).
