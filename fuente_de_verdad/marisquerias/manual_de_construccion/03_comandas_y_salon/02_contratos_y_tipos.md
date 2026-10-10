# CONTRATOS Y TIPOS: COMANDAS Y SALON

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 03_comandas_y_salon

## 1. FIRMAS CANONICAS

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

type MesaConLayout = Mesa & { posX: number; posY: number; shape: 'square' | 'round' };
```

## 2. NORMALIZACION CANONICA

```typescript
toOrderCanonical(s: any): OrderStatus;   // abierto/enviada_cocina -> enviado_cocina; preparando -> en_preparacion; lista -> listo_para_entregar
toItemCanonical(s: any): ItemStatus;     // en_cocina/preparando -> en_preparacion; lista -> listo
isItemBillable(status): boolean;         // en_preparacion | listo | entregado
isOrderActive(status): boolean;          // enviado_cocina | en_preparacion | listo_para_entregar
```

## 3. INVARIANTES DE TRANSICION

- Comanda no salta estados; mesa no salta de libre a cuenta sin ocupada.
- `ItemPendiente` es el borrador; `ItemPedido` es solo lectura en UI (estado lo mueve el nucleo).
- El descuento de inventario ocurre por receta al elaborar cada partida.

## 4. FLUJO DE DATOS

mesero(draft SQLite) -> procesarPedido -> enviado_cocina -> SincronizadorCocina(KDS) -> ModeradorComandas -> entregado -> cuenta/cerrado
