# ENSAMBLAJE Y PASOS: PERSISTENCIA LOCAL
- Alcance: Categoria: Marisquerias
- Fecha: 2026-10-09

## PASO 01: Inicializacion de SQLite
### ESPECIFICACION
- Se ensambla `SQLiteStorageAdapter` (expo-sqlite, `adi_pos_offline.db`) cuyo `init` crea 9 tablas + 5 indices (ver `sqlite/02_esquema_y_colas.md`).
- En web se usa `SQLiteStorageAdapterWebClass` (fallback vacio), exportando la clase correcta segun plataforma (index.native / index.web).
- La inicializacion es idempotente (`CREATE TABLE IF NOT EXISTS`) y no bloquea el arranque.

## PASO 02: Espejo offline de datos de negocio
### ESPECIFICACION
- Se ensamblan las tablas espejo `menu_productos`, `menu_categorias`, `mesas`, `pedidos`, `config` para operar sin red.
- Todo cambio de negocio queda disponible localmente; el salon no se detiene sin red.
- El espejo no introduce logica de negocio: solo persiste y replica estado.

## PASO 03: Cola de sincronizacion
### ESPECIFICACION
- Se ensamblan `ventas_offline` (`syncStatus: 'pending'` hasta `syncedAt` confirmado) y `print_queue`/`inventory_queue` (`status: 'pending'` + `attempts`).
- `attempts` incrementa en cada reintento fallido; nunca se descarta un registro pendiente sin confirmacion integra.
- Los indices `idx_ventas_sync`, `idx_print_status`, `idx_inv_queue_status` soportan el filtrado de pendientes.

## PASO 04: Borrador de comanda
### ESPECIFICACION
- Se ensambla `drafts.repo.ts` para borradores de comanda del mesero, persistidos en `pedidos` local antes de enviarse a cocina.
- `SimpleSalesRepo.ts` registra ventas simples localmente para sincronizacion posterior.
- Un borrador persistido no se pierde ni se duplica ante caida de red o reintento.

## PASO 05: Drenado en reconexion
### ESPECIFICACION
- Se ensambla el drenado ordenado al recuperar red: `inventory_queue -> ventas_offline -> historial_ventas -> print_queue`.
- `syncedAt`/`sincronizado` se marcan solo tras confirmacion integra del remoto (ver `02_contratos_y_tipos.md` §4).
- La operacion `operacion -> SQLite (cola pending) -> reconexion -> drenar -> marcar sincronizado` se respeta sin reorden.
