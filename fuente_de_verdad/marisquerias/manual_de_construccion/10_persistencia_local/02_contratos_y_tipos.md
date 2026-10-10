# CONTRATOS Y TIPOS: PERSISTENCIA LOCAL

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 10_persistencia_local

## 1. ADAPTADOR SQLITE

```typescript
// index.native.ts — expo-sqlite (adi_pos_offline.db)
class SQLiteStorageAdapterClass {
  private db; private isInitialized;
  // init crea 9 tablas + 5 indices (ver sqlite/02_esquema_y_colas.md)
}

// index.web.ts — fallback vacio (expo-sqlite no disponible en web)
class SQLiteStorageAdapterWebClass {}

export const SQLiteStorageAdapter = /* clase segun plataforma */;
```

## 2. REPOSITORIOS DE BORRADOR

- `drafts.repo.ts` — borradores de comanda del mesero (persistidos antes de enviar a cocina).
- `SimpleSalesRepo.ts` — ventas simples registradas localmente para sincronizacion.

## 3. COLA DE SINCRONIZACION

- `ventas_offline` → `syncStatus: 'pending'` hasta `syncedAt` confirmado.
- `print_queue` / `inventory_queue` → `status: 'pending'` + `attempts` en reintento.

## 4. INVARIANTES

- El salon no se detiene sin red: todo cambio queda en cola pendiente.
- Nada se pierde: los registros pendientes se drenan en orden al reconectar.
- `sincronizado`/`syncedAt` solo tras confirmacion integra del remoto.

## 5. FLUJO

operacion -> SQLite (cola pending) -> reconexion -> drenar (inventory_queue, ventas_offline, historial_ventas, print_queue) -> marcar sincronizado
