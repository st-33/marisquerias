# MANUAL DE CONSTRUCCION · MARISQUERIAS

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Categoria padre: Marisquerias
- Proposito: Declarar el objetivo de materializacion del sistema de punto de venta y toma de comandas para el giro de marisqueria, documentando la arquitectura real del aplicable y las fases de su construccion fisica y digital.
- Autoridad de redaccion: Mariscal del Proyecto
- Regla de gobierno: Se rige por las leyes, terminos y formulas de la Fuente de Verdad principal sin contradecirlas.

## INDICE DE FASES

1. **FASE 01 — ARRANQUE Y ARQUITECTURA BASE**: motor de arranque, composicion de pantallas, resolucion de rutas y configuracion de Expo/React Native.
2. **FASE 02 — ROLES OPERATIVOS Y CONTROL DE ACCESO**: roles operativos (mesero, cocina, mostrador, administrador, repartidor), acceso y guardas de sesion.
3. **FASE 03 — COMANDAS Y ELABORACION**: comanda, partida, mesa, envio a cocina y cadena de estados de preparacion.
4. **FASE 04 — MENU Y PRODUCTOS**: producto, variante, receta, categoria de menu y su gestion administrativa.
5. **FASE 05 — INVENTARIO Y DESPACHO POR PESO**: inventario, existencia, merma, bascula y despacho por peso.
6. **FASE 06 — IMPRESION Y TICKETS**: impresora termica, ticket de cocina y de venta, cola de impresion.
7. **FASE 07 — REPARTO Y LOGISTICA**: reparto a domicilio, despacho y sincronizacion logisticamente aislada.
8. **FASE 08 — METRICAS Y CIERRE DE JORNADA**: registro de ventas del dia, metricas y cierre de jornada operativa.

## REGLA DE SANEAMIENTO

Toda instruccion de este manual se redacta por ingenieria inversa del codigo real (`src/`, `app/`). Toda pieza que pertenezca a Unidad Central o al Ecosistema ADI APP y carezca de respaldo en la Categoria Marisquerias queda fuera de este manual y se purga del codigo fuente.
