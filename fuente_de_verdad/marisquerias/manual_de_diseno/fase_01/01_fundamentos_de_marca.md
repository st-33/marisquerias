# INSTRUCCION: FUNDAMENTOS DE MARCA

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 01

## ORIGEN

- Terminos: PALETA, TIPOGRAFIA, ESPACIADO, JERARQUIA VISUAL, TOKEN DE DISENO, KPI.
- Formulas: bloque + espaciado = jerarquia_visual; componente + paleta + tipografia = componente_consistente.
- Reglas: CONSISTENCIA VISUAL y SEPARACION DE CAPAS (rubros en reglas_diseno.md).
- Fuente real: `DESIGN.md` (raiz del proyecto) y `src/compartido/constantes/theme.ts`.

## PASO 01: ORIGEN UNICO DE VERDAD

### ESPECIFICACION

- La paleta semantica, la tipografia y el espaciado se consolidan en un unico origen de verdad de tokens de diseno.
- No se introducen colores aislados dentro de las pantallas; los colores se usan por significado.

## PASO 02: PALETA SEMANTICA

### ESPECIFICACION

- Fondo: `fondo.canvas` #07131A, `fondo.surface` #0E2028, `fondo.elevated` #15313B.
- Texto: `texto.primary` #F4F7F6, `texto.secondary` #A9BEC2.
- Marca: `marca.coral` #F26B5E (CTA principal), `marca.dorado` #C5A059 (sello y rol administrador).
- Estado: `estado.info` #34C5D5 (conectividad y bascula), `estado.success` #55C58A, `estado.warning` #F2B85B, `estado.danger` #E96A68.
- Borde: `borde.subtle` #24434D; overlay: `overlay.scrim` rgba(0,0,0,.62).

## PASO 03: REGLA DE CONTRASTE

### ESPECIFICACION

- Todo texto esencial conserva contraste suficiente contra su superficie.
- El significado no depende unicamente del color: cada badge incorpora texto, icono o ambos.

## PASO 04: TIPOGRAFIA

### ESPECIFICACION

- La tipografia es sans serif, abierta y robusta en pantallas pequenas; la jerarquia usa peso y tamano, no mayusculas constantes.
- Niveles: Display 32-40px/700, Titulo de pantalla 24-28px/700, Titulo de seccion 18-20px/700, Cuerpo 16px/400-500, Etiqueta 12-14px/600, Auxiliar 12px/400, Dato numerico 24-32px/700.
- Los precios, pesos, cantidades y totales usan cifras tabulares.

## PASO 05: ESPACIADO Y FORMA

### ESPECIFICACION

- El sistema usa escala de ocho puntos: 4, 8, 12, 16, 24, 32, 40 px.
- Tarjetas operativas: padding 16 px; modulos principales: 24 px; controles: separacion minima 12 px.
- Radio: campo/boton 10-12 px, tarjeta 16 px, modal 20-24 px, orb/sello 50%, chip/badge 999 px.
