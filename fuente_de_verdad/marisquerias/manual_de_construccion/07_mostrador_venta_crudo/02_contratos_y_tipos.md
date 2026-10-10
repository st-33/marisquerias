# CONTRATOS Y TIPOS: MOSTRADOR Y VENTA EN CRUDO

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 07_mostrador_venta_crudo

## 1. FIRMAS DEL POS/MOSTRADOR

```typescript
type UseMostradorProProps = { /* config del mostrador */ };
useMostradorPro(props?: UseMostradorProProps): MostradorPro;

// Carrito: acumula ItemPendiente con precio por unidad o por peso
// Cobro: total anclado = suma de partidas; por peso usa peso * precioPorUnidad
```

## 2. VENTA EN CRUDO (MARISCO POR PESO)

- Pantalla especializada que lee la bascula y liquida sin pasar por comanda de salon.
- `useVentaCrudoAdmin` gobierna el flujo de venta por peso desde administracion.
- `resolverDeviceIdADI` vincula la identidad del dispositivo al mostrador.

## 3. INVARIANTES

- El carrito permanece visible mientras se agregan productos; el total anclado en zona de alcance.
- Por peso: la lectura muestra peso, unidad, estabilidad y error.
- Sin bascula: entrada manual o cancelacion explicita; nunca lectura simulada.
- El despacho descuenta inventario en la misma operacion.

## 4. FLUJO

bascula(leerPeso) -> useMostradorPro(carrito) -> cobro(por peso o por orden) -> SimpleSalesRepo/RTDB ventas -> ticket
