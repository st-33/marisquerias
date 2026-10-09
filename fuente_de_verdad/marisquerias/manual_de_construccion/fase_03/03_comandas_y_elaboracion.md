# INSTRUCCION: COMANDAS Y ELABORACION

- Alcance: Aplicable: marisquerias
- Fecha: 2026-10-09
- Fase: 03

## ORIGEN

- Terminos: COMANDA, PARTIDA, MESA, COCINA, TICKET, VENTA POR ORDEN.
- Formulas: (producto + variante + cantidad = partida); (partida + partida = comanda).
- Reglas: COMANDAS Y ELABORACION.
- Codigo real: `src/logica/dominio/status.ts`, `src/sistema/tipos/pos.ts`, `src/roles/logica/mesero/*`, `src/roles/logica/cocina/*`.

## CONTRATO DE TIPOS (FIRMAS REALES)

```typescript
type OrderStatus =
  | 'creado' | 'enviado_cocina' | 'en_preparacion'
  | 'listo_para_entregar' | 'entregado' | 'cerrado';

type ItemStatus = 'nuevo' | 'en_preparacion' | 'listo' | 'entregado';

type TableState = 'libre' | 'ocupada' | 'cuenta';

type ItemPendiente = {
  itemId: string; draftId: string; productoId: string;
  nombre: string; precio: number; cantidad: number;
  tamano?: Record<string, string>; preparacion?: Record<string, string>;
  precioBase?: number; deltaPrecio?: number; prepMinutos?: number;
};

type ItemPedido = {
  id: string; nombre: string; precio: number; cantidad: number;
  estado: 'nuevo' | 'preparando' | 'listo' | 'entregado';
  variantes?: Record<string, string | string[]>;
  variantLabels?: string[];
};
```

## PASO 01: CICLO DE VIDA DE LA COMANDA

### ESPECIFICACION

- `toOrderCanonical(s: any): OrderStatus` normaliza desde estados legacy: `abierto`/`enviada_cocina` -> `enviado_cocina`; `preparando` -> `en_preparacion`; `lista`/`listo_para_entrega` -> `listo_para_entregar`. Default `creado`.
- `isOrderActive(status): boolean` retorna `true` para `enviado_cocina`, `en_preparacion`, `listo_para_entregar`.

## PASO 02: CICLO DE VIDA DE LA PARTIDA

### ESPECIFICACION

- `toItemCanonical(s: any): ItemStatus` normaliza: `en_cocina`/`preparando` -> `en_preparacion`; `lista` -> `listo`. Default `nuevo`.
- `isItemBillable(status): boolean` retorna `true` para `en_preparacion`, `listo`, `entregado`.

## PASO 03: MESA Y SUS ESTADOS

### ESPECIFICACION

- `TableState` = `'libre' | 'ocupada' | 'cuenta'`; transicion secuencial.
- `MesaConLayout = Mesa & { posX: number; posY: number; shape: 'square' | 'round' }` normaliza coordenadas al rango `[0,1]`.

## PASO 04: BORRADOR DEL MESERO

### ESPECIFICACION

- Fuente de verdad del borrador: SQLite local (`order_draft_items_v1`). `ItemPendiente` es el item no enviado a cocina.
- `ItemPedido` es solo lectura en la capa visual; su estado (nuevo -> preparando -> listo -> entregado) lo actualiza el nucleo.

## PASO 05: PROCESADO Y ENVIO A COCINA

### ESPECIFICACION

- `procesarPedido.ts` procesa la comanda del mesero y dispara el envio a cocina.
- `SincronizadorCocina.ts` sincroniza partidas hacia el KDS de cocina.

## PASO 06: MODERACION Y DESCUENTO

### ESPECIFICACION

- `ModeradorComandas.ts` arbitra transiciones validas de comanda y partida.
- `descontarInventario.ts` descuenta insumos por receta al elaborar cada partida.

## CONTRATO DE SALIDA

- Toda partida transita por la cadena declarada sin saltos; el inventario se descuenta exactamente por receta; una mesa no salta de `libre` a `cuenta` sin pasar por `ocupada`.
