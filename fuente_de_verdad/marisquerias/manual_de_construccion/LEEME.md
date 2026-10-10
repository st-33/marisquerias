# MANUAL DE CONSTRUCCION · MARISQUERIAS

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Categoria padre: Marisquerias
- Proposito: Declarar el objetivo de materializacion del sistema de punto de venta y toma de comandas para el giro de marisqueria. El manual esta desplegado en estructura fractal: cada subsistema se fragmenta en lenguaje comun, contratos tecnicos y ensamblaje.
- Autoridad de redaccion: Mariscal del Proyecto
- Regla de gobierno: Se rige por las leyes, terminos y formulas de la Fuente de Verdad principal sin contradecirlas.

## ESTRUCTURA FRACTAL (SUBSISTEMAS)

Cada subsistema aloja tres niveles: `01_conceptos_y_reglas.md`, `02_contratos_y_tipos.md` y `03_ensamblaje_y_pasos.md`. Los subsistemas con hardware o persistencia agregan subcarpetas con protocolos (bascula, esc_pos, sqlite, kds).

## INDICE DE SUBSISTEMAS

1. **01_arranque_y_motor** — motor de arranque, composicion de pantallas y nucleo de transiciones.
2. **02_roles_y_permisos** — roles operativos, vinculacion de dispositivo y capacidades gobernadas.
3. **03_comandas_y_salon** — comanda, partida, mesa y cadena de preparacion. Incluye `kds/`.
4. **04_menu_y_variantes** — producto, variante, receta y categoria de menu.
5. **05_inventario_bascula_despacho** — inventario, merma, bascula y despacho por peso. Incluye `bascula/`.
6. **06_impresion_escpos** — impresora termica, spool y tickets. Incluye `esc_pos/`.
7. **07_mostrador_venta_crudo** — mostrador pro y venta de marisco en crudo por peso.
8. **08_reparto_y_logistica** — reparto a domicilio y motor logistico.
9. **09_metricas_y_cierres** — ventas del dia, metricas y cierre de jornada.
10. **10_persistencia_local** — SQLite offline y colas de sincronizacion. Incluye `sqlite/`.

## REGLA DE SANEAMIENTO

Toda instruccion de este manual se redacta por ingenieria inversa del codigo real (`src/`, `app/`). Toda pieza que pertenezca a Unidad Central o al Ecosistema ADI APP y carezca de respaldo en la Categoria Marisquerias queda fuera de este manual y se purga del codigo fuente.
