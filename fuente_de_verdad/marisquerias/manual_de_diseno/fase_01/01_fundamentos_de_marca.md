# INSTRUCCION: FUNDAMENTOS DE MARCA

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 01

## ORIGEN

- Terminos: PALETA, TIPOGRAFIA, ESPACIADO, JERARQUIA VISUAL, TOKEN DE DISENO, KPI.
- Formulas: bloque + espaciado = jerarquia_visual; componente + paleta + tipografia = componente_consistente.
- Reglas: CONSISTENCIA VISUAL y SEPARACION DE CAPAS.
- Fuente real: `DESIGN.md` y `src/compartido/constantes/theme.ts`.

## CONTRATO DE TOKENS (VALORES EXACTOS)

```typescript
// Tokens semánticos de paleta (valores canónicos)
const paleta = {
  fondo:  { canvas: '#07131A', surface: '#0E2028', elevated: '#15313B' },
  texto:  { primary: '#F4F7F6', secondary: '#A9BEC2' },
  marca:  { coral: '#F26B5E', dorado: '#C5A059' },
  estado: { info: '#34C5D5', success: '#55C58A', warning: '#F2B85B', danger: '#E96A68' },
  borde:  { subtle: '#24434D' },
  overlay:{ scrim: 'rgba(0, 0, 0, .62)' },
};
```

## PASO 01: ORIGEN UNICO DE VERDAD

### ESPECIFICACION

- Paleta, tipografia y espaciado se consolidan en un unico origen de tokens de diseno.
- Prohibido colores aislados dentro de pantallas; los colores se usan por significado.

## PASO 02: PALETA SEMANTICA

### ESPECIFICACION

- Fondo: canvas #07131A, surface #0E2028, elevated #15313B.
- Texto: primary #F4F7F6, secondary #A9BEC2.
- Marca: coral #F26B5E (CTA principal), dorado #C5A059 (sello y rol administrador).
- Estado: info #34C5D5 (conectividad/bascula), success #55C58A, warning #F2B85B, danger #E96A68.
- Borde subtle #24434D; overlay scrim rgba(0,0,0,.62).

## PASO 03: REGLA DE CONTRASTE

### ESPECIFICACION

- Todo texto esencial conserva contraste suficiente contra su superficie.
- El significado no depende solo del color: cada badge incorpora texto, icono o ambos.
- Coral/dorado se reservan para elementos grandes o de enfasis; nunca sustituyen una etiqueta textual de estado.

## PASO 04: TIPOGRAFIA

### ESPECIFICACION

- Sans serif, abierta y robusta; jerarquia por peso y tamano, sin mayusculas constantes.
- Escala exacta: Display 32-40/700, Titulo pantalla 24-28/700, Titulo seccion 18-20/700, Cuerpo 16/400-500, Etiqueta 12-14/600, Auxiliar >=12/400, Dato numerico 24-32/700.
- Precios, pesos, cantidades y totales usan cifras tabulares.

## PASO 05: ESPACIADO Y FORMA

### ESPECIFICACION

- Escala de ocho puntos: 4, 8, 12, 16, 24, 32, 40 px.
- Tarjeta operativa: padding 16 px; modulo principal: 24 px; grupos de controles: separacion minima 12 px.
- Radio: campo/boton 10-12, tarjeta 16, modal 20-24, orb/sello 50%, chip/badge 999.
- Profundidad: campo sin sombra; tarjeta elevacion baja + borde sutil; modal scrim + elevacion media; orb brillo controlado; badge sin sombra.

## CONTRATO DE SALIDA

- Ningun estilo fuera de la paleta; toda pantalla hereda los tokens; los KPI (precio, peso, cantidad, total) tienen contraste y espacio propios.
