# INSTRUCCION: PRIMITIVOS Y BLOQUES

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 02

## ORIGEN

- Terminos: PRIMITIVO, BLOQUE, COMPONENTE, TARJETA, BADGE, BOTON, CAMPO DE ENTRADA VISUAL, ICONO, MODAL.
- Formulas: componente + paleta + tipografia = componente_consistente.
- Reglas: CONSISTENCIA VISUAL.
- Codigo real: `src/ui/primitivos/*`, `src/ui/bloques/*`, `src/compartido/componentes/ui/*`.

## CONTRATO DE ESTADOS DE COMPONENTES (FIRMAS REALES)

```typescript
// Estados de componentes visuales (mínimos)
type EstadosBotonPrimario   = 'normal' | 'pressed' | 'loading' | 'disabled' | 'success' | 'error';
type EstadosBotonSecundario = 'normal' | 'pressed' | 'disabled';
type EstadosCampo           = 'empty' | 'focused' | 'filled' | 'invalid' | 'disabled';
type EstadosBadge           = 'info' | 'success' | 'warning' | 'danger' | 'neutral';
type EstadosModal           = 'abierto' | 'cargando' | 'error' | 'cerrado';
type EstadosEmptyState      = 'sin_datos' | 'sin_conexion' | 'filtro_sin_coincidencias';
type EstadosBannerConexion  = 'conectado' | 'reconectando' | 'offline' | 'pendiente';
```

## PASO 01: PRIMITIVOS

### ESPECIFICACION

- Primitivos viven en `src/ui/primitivos/` (ej. AtmosphereLayer).
- Un primitivo no se subdivide sin perder significado.

## PASO 02: BLOQUES REUTILIZABLES

### ESPECIFICACION

- Bloques en `src/ui/bloques/`: ActionArea, Badge, FabRadial, OrderItemCard, TarjetaComanda, MostradorPro, VariantsModal.
- Un bloque agrupa elementos relacionados por proposito.

## PASO 03: COMPONENTES COMPARTIDOS

### ESPECIFICACION

- Componentes en `src/compartido/componentes/ui/`: AnimatedButton, Card, ModernAlert, PulsingCard, TableBadge, Toast.
- Todo componente conserva identidad funcional en cualquier pantalla y respeta paleta, tipografia y espaciado.

## PASO 04: BOTONES Y CAMPOS

### ESPECIFICACION

- Boton primario cubre los 6 estados; secundario los 3; todo boton declara su disparo.
- Quedan prohibidos onPress vacios o controles sin consecuencia comunicada.

## PASO 05: TARJETAS Y BADGES

### ESPECIFICACION

- Tarjeta de producto cubre: disponible, agotado, seleccionado, error.
- Tarjeta de comanda cubre: recibida, preparacion, lista, entregada, pendiente.
- Badge comunica estado con texto + icono; sin depender solo del color.

## CONTRATO DE SALIDA

- Ningun componente sin estados declarados; toda interaccion produce una consecuencia visible o un motivo de indisponibilidad.
