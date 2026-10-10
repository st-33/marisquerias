# CONTRATOS Y TIPOS: PRIMITIVOS Y BLOQUES

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 02_primitivos_y_bloques

## 1. ESTADOS DE COMPONENTES

```typescript
type EstadosBotonPrimario   = 'normal'|'pressed'|'loading'|'disabled'|'success'|'error';
type EstadosBotonSecundario = 'normal'|'pressed'|'disabled';
type EstadosCampo           = 'empty'|'focused'|'filled'|'invalid'|'disabled';
type EstadosBadge           = 'info'|'success'|'warning'|'danger'|'neutral';
type EstadosModal           = 'abierto'|'cargando'|'error'|'cerrado';
type EstadosEmptyState      = 'sin_datos'|'sin_conexion'|'filtro_sin_coincidencias';
type EstadosBannerConexion  = 'conectado'|'reconectando'|'offline'|'pendiente';
```

## 2. TARJETAS POR CONTEXTO

- Tarjeta de producto: disponible, agotado, seleccionado, error.
- Tarjeta de comanda: recibida, preparacion, lista, entregada, pendiente.

## 3. MAPA DE ARCHIVOS REALES

- Primitivos: `src/ui/primitivos/` (AtmosphereLayer).
- Bloques: `src/ui/bloques/` (ActionArea, Badge, FabRadial, OrderItemCard, TarjetaComanda, MostradorPro, VariantsModal).
- Componentes compartidos: `src/compartido/componentes/ui/` (AnimatedButton, Card, ModernAlert, PulsingCard, TableBadge, Toast).

## 4. INVARIANTES

- Todo boton declara su disparo; prohibido onPress vacio o control sin consecuencia.
- Todo componente conserva identidad funcional en cualquier pantalla.
