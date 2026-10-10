# CONTRATOS Y TIPOS: SUPERPOSICIONES Y NAVEGACION

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 05_superposiciones_y_navegacion

## 1. DURACIONES CANONICAS

```typescript
const duraciones = {
  press_release:  '100-200 ms',
  cambio_estado:  '180-280 ms',
  entrada_modal:  '220-320 ms',
  exito:          '<= 500 ms',
  error:          'sin rebote agresivo',
};
```

## 2. SUPERPOSICIONES

- Cierre con gesto o boton visible; foco contenido en el dialogo.
- Coordinacion explicita y testeable; no depende de zIndex fijo.
- `superposicion + cierre_visual = flujo_temporal_visual`.

## 3. NAVEGACION Y RESPONSIVE

- `pantalla + transicion_visual = navegacion_visual`.
- Telefono vertical: una columna, CTA accesible, resumen anclado.
- Tablet: panel de trabajo + detalle; Web: navegacion lateral + tablas.
- Offline: lectura y captura local con cola pendiente visible.

## 4. ACCESIBILIDAD

- Objetivos tactiles >= 44x44 px; foco visible en web y teclado.
- Dato importante con texto + posicion + forma, ademas de color.
- Icono sin etiqueta accesible queda fuera de definicion de terminado.
- Respetar movimiento reducido; la animacion nunca bloquea una accion critica.
