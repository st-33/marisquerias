# CONTRATOS Y TIPOS: INVENTARIO, BASCULA Y DESPACHO POR PESO

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 05_inventario_bascula_despacho

## 1. UNIDADES CANONICAS

```typescript
coerceUnidad(input: any): 'kg' | 'g' | 'l' | 'ml' | 'pza' | 'caja';
// mapa: pz/pieza/piezas -> pza; kgs/kilo/kilos -> kg; gr/gramo/gramos -> g; lt/litro/litros -> l; mililitro -> ml; cajas -> caja
```

## 2. PERSISTENCIA

```typescript
useInventario({ db: Database; rutaNegocio: string }): Inventario;
// Existencia: { insumoId, cantidad, unidad, minimo? }
// Ajuste por merma: existencia - merma = existencia_ajustada (con motivo obligatorio)
```

## 3. CONTRATO HARDWARE DE BASCULA

```typescript
setScale({ address, name, unidadPorDefecto, precision, tara?, timeout? }): void;
leerPeso({ aplicarTara?, esperarEstabilidad?, timeout? }):
  Promise<{ success, peso?, unidad?, message?, estable? }>;
tararBascula(): Promise<{ success, peso?, unidad?, message? }>;
hasScale(): boolean;
```

## 4. INVARIANTES DE DESPACHO

- Precio = `peso * precioPorUnidad`; la lectura muestra peso, unidad, estabilidad y error.
- Sin bascula: entrada manual o cancelacion explicita; nunca una lectura simulada.
- El despacho descuenta existencia en la misma operacion de venta (atomico).

## 5. FLUJO DE DATOS

bascula(leerPeso W\r -> ST,GS,+) -> usoMostradorPro(carrito) -> precio por unidad -> descuento inventario -> venta_offline/RTDB
