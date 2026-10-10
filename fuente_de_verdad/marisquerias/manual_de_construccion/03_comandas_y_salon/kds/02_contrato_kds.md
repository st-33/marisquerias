# CONTRATO KDS — KITCHEN QUEUE ENGINE

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 03_comandas_y_salon/kds

## 1. CONTRATO DE TIPOS (FIRMAS REALES)

```typescript
type ItemCocina = {
  id: string;
  nombre: string;
  productoId?: string;
  cantidad: number;
  precio: number;
  estado: 'nuevo' | 'en_cocina' | 'en_preparacion' | 'listo' | 'entregado';
  variantes?: Record<string, string | string[]>;
  variantLabels?: string[];
  notas?: string;
  prepMin?: number;
  startedAt?: number;
  draftId?: string;
  inventoryDeducted?: boolean;
  idsAgrupados?: string[];
};

type OrdenCocina = {
  id: string;
  tipo: 'mesa' | 'para_llevar' | 'delivery';
  mesaId?: string;
  estatus: string;
  items: ItemCocina[];
  itemsTotal: number;
  itemsPendientes: number;
  itemsListos: number;
  tiempoTranscurrido: number;
  esUrgente: boolean;
  createdAt: number;
  sentToKitchenAt?: number;
  logistica?: Partial<LogisticaPedido> | null;
};

type EstadisticasCocina = {
  total: number;
  urgentes: number;
  itemsPendientes: number;
  itemsListos: number;
};
```

## 2. MOTOR

```typescript
class KitchenQueueEngine {
  private ordenes: Map<string, OrdenCocina>;
  private subscribers: Set<(ordenes: OrdenCocina[]) => void>;
  private urgentThresholdMs: number;

  constructor(urgentThresholdMinutes: number = 15); // umbral de urgencia 15 min
  subscribe(callback: (ordenes: OrdenCocina[]) => void): () => void;
  getOrdenesOrdenadas(): OrdenCocina[];
}
```

## 3. INVARIANTES

- Los estados de `ItemCocina` avanzan: `nuevo -> en_cocina -> en_preparacion -> listo -> entregado`.
- Una orden es `esUrgente` cuando `tiempoTranscurrido > urgentThresholdMs`.
- El motor NO se conecta a Firebase directamente: recibe ordenes por socket LAN o DB local.
- `subscribe` notifica con la cola ordenada a todo suscriptor; la UI reacciona sin acoplamiento.

## 4. REGLAS DE PRIORIDAD FIFO

- La cola se ordena por `createdAt` ascendente (FIFO) salvo urgencia manifiesta.
- Las ordenes urgentes se elevan en la presentacion sin romper el orden de entrada.
- Un pedido duplicado o perdida de red produce senal de reconciliacion, nunca una segunda tarjeta indistinguible.
