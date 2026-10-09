# REGLAS DE DISENO

- Alcance: Ecosistema
- Fecha: 2026-10-08

## SEPARACION DE CAPAS

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Obligatorio: La logica visual no define el comportamiento funcional del sistema.
- Obligatorio: La logica del sistema no define la apariencia visual.
- Prohibido: Mezclar en una misma especificacion reglas de sistema y reglas visuales.

## CONSISTENCIA VISUAL

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Obligatorio: Toda pantalla respeta la paleta definida.
- Obligatorio: Todo boton usa los mismos estados visuales declarados.
- Obligatorio: Todo mensaje visual usa la misma jerarquia de estilos.
- Prohibido: Introducir estilos fuera de la paleta oficial.

## INTERACCION

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Obligatorio: Todo boton declara su disparo correspondiente.
- Obligatorio: Todo formulario declara su validacion visual.
- Obligatorio: Todo mensaje visual declara su duracion visual y su cierre visual.
- Prohibido: Botones sin accion declarada.

## NOMENCLATURA DE DISENO

- Alcance: Ecosistema
- Fecha: 2026-10-08
- Obligatorio: Los nombres de terminos de diseno residen exclusivamente en terminos_diseno.md.
- Obligatorio: Los nombres de archivos de diseno se escriben en minusculas con guion bajo.
- Prohibido: Usar terminos de diseno como si fueran terminos de sistema o viceversa.
