# CONTRATOS Y TIPOS: FUNDAMENTOS DE MARCA

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 01_fundamentos_de_marca

## 1. TOKENS DE PALETA (VALORES EXACTOS)

```typescript
const paleta = {
  fondo:  { canvas: '#07131A', surface: '#0E2028', elevated: '#15313B' },
  texto:  { primary: '#F4F7F6', secondary: '#A9BEC2' },
  marca:  { coral: '#F26B5E', dorado: '#C5A059' },
  estado: { info: '#34C5D5', success: '#55C58A', warning: '#F2B85B', danger: '#E96A68' },
  borde:  { subtle: '#24434D' },
  overlay:{ scrim: 'rgba(0, 0, 0, .62)' },
};
```

## 2. ESCALA TIPOGRAFICA

| Nivel | Tamano | Peso |
| --- | --- | --- |
| Display | 32-40 px | 700 |
| Titulo pantalla | 24-28 px | 700 |
| Titulo seccion | 18-20 px | 700 |
| Cuerpo | 16 px | 400-500 |
| Etiqueta | 12-14 px | 600 |
| Auxiliar | >=12 px | 400 |
| Dato numerico (KPI) | 24-32 px | 700 |

## 3. ESPACIADO Y FORMA

- Escala 8 puntos: 4, 8, 12, 16, 24, 32, 40 px.
- Radio: campo/boton 10-12, tarjeta 16, modal 20-24, orb/sello 50%, chip/badge 999.
- Elevacion: campo sin sombra; tarjeta baja + borde sutil; modal scrim + media; orb brillo controlado; badge sin sombra.

## 4. INVARIANTES

- Ningun estilo fuera de la paleta; colores por significado, no decoracion.
- Significado nunca depende solo del color: badge con texto + icono.
- KPI (precio, peso, cantidad, total) con contraste y espacio propios.
