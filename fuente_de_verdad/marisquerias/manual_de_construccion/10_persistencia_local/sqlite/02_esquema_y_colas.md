# ESQUEMA SQLITE OFFLINE — TABLAS Y COLA PENDIENTE

- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09
- Subsistema: 10_persistencia_local/sqlite

## 1. CONTRATO DE ADAPTADOR

- Base de datos: `expo-sqlite`, archivo `adi_pos_offline.db` (nativo).
- En web `expo-sqlite` no esta disponible: `SQLiteStorageAdapterWebClass` usa fallback vacio.

## 2. ESQUEMA (FIRMAS REALES)

```sql
CREATE TABLE IF NOT EXISTS config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_productos (
  id TEXT PRIMARY KEY, data TEXT NOT NULL, updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS menu_categorias (
  id TEXT PRIMARY KEY, data TEXT NOT NULL, updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mesas (
  id TEXT PRIMARY KEY, data TEXT NOT NULL, updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS pedidos (
  id TEXT PRIMARY KEY, data TEXT NOT NULL, updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS ventas_offline (
  id TEXT PRIMARY KEY,
  canal TEXT NOT NULL,
  data TEXT NOT NULL,
  syncStatus TEXT NOT NULL DEFAULT 'pending',
  createdAt INTEGER NOT NULL,
  syncedAt INTEGER
);

CREATE TABLE IF NOT EXISTS print_queue (
  id TEXT PRIMARY KEY,
  ticketData TEXT NOT NULL,
  target TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  createdAt INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS inventory_queue (
  id TEXT PRIMARY KEY,
  rutaNegocio TEXT NOT NULL,
  containerId TEXT NOT NULL,
  itemId TEXT NOT NULL,
  delta REAL NOT NULL,
  usuario TEXT,
  razon TEXT,
  allowNegative INTEGER NOT NULL DEFAULT 0,
  createdAt INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS historial_ventas (
  id TEXT PRIMARY KEY,
  negocio_id TEXT NOT NULL,
  tipo TEXT NOT NULL,
  fecha TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  total REAL NOT NULL,
  metodo_pago TEXT,
  datos_json TEXT NOT NULL,
  sincronizado INTEGER DEFAULT 1
);
```

## 3. INDICES DE SINCRONIZACION

```sql
CREATE INDEX IF NOT EXISTS idx_ventas_sync      ON ventas_offline(syncStatus);
CREATE INDEX IF NOT EXISTS idx_print_status     ON print_queue(status);
CREATE INDEX IF NOT EXISTS idx_inv_queue_status ON inventory_queue(status);
CREATE INDEX IF NOT EXISTS idx_historial_negocio_fecha ON historial_ventas(negocio_id, fecha);
CREATE INDEX IF NOT EXISTS idx_historial_tipo   ON historial_ventas(tipo);
```

## 4. INVARIANTES DEL MODO OFFLINE

- `ventas_offline` y las colas (`print_queue`, `inventory_queue`) usan `syncStatus`/`status` `= 'pending'` hasta su sincronizacion exitosa.
- `attempts` incrementa en cada reintento fallido; nunca se descarta un registro pendiente sin confirmacion.
- El borrador de comanda (mesero) persiste en `pedidos` local antes de enviarse a cocina.

## 5. FLUJO DE RECONEXION

1. Al recuperar red, se drenan en orden: `inventory_queue`, `ventas_offline`, `historial_ventas`, `print_queue`.
2. `syncedAt`/`sincronizado` se marcan solo tras confirmacion integra del remoto.
