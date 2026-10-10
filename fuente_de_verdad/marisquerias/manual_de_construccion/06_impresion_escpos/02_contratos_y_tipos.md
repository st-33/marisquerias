# CONTRATOS Y TIPOS: IMPRESION TERMICA ESC/POS

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 06_impresion_escpos

## 1. CONTRATO HARDWARE DE IMPRESION

```typescript
PrintResult = { success: boolean; message: string; jobId?: string };

setPrinter(address: string, name: string): Promise<void> | void;
loadPersistedConfig(): Promise<void>;
getPrinter(): { address: string | null; name: string | null };
hasPrinter(): boolean;
imprimirComanda(pedido, opciones?): Promise<PrintResult>;
imprimirCuenta(pedido, opciones?): Promise<PrintResult>;
imprimirTicketVenta(venta): Promise<PrintResult>;
imprimirPrueba(mensaje?): Promise<PrintResult>;
```

## 2. ESTADOS DE SPOOL

```typescript
type SpoolStatus =
  | 'pendiente_aprobacion' | 'pendiente_impresion'
  | 'impresion_enviada' | 'exito' | 'fallo';
```

## 3. COLA Y DESPACHO

- `DespachadorCola`: TTL 48 horas; arranque no bloqueante; claim por instancia (`_lockedBy`, `_lockedBy === idInstancia`).
- `onChildAdded` escucha nuevos trabajos; garbage collector elimina expirados sin tocar recientes.

## 4. INVARIANTES

- Toda partida de cocina puede derivar ticket con destinatario de area.
- Toda venta cobrada porta ticket si hay impresora disponible.
- `success: false` implica `message` accionable (reintento desde cola).
- Reintentos con incremento de `attempts`; nunca lanzar a la capa de negocio.

## 5. FLUJO DE DATOS

partida -> TicketFormatter -> cola print_queue -> ConstructorEscPos(bytes) -> AdaptadorBluetooth -> corta (GS V 0) -> estado exito/fallo -> tickets.repo
