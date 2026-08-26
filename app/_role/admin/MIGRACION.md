# Migración — UI de Reparto

**Fecha:** 2026-08-26 UTC
**Tarea:** `T-M3-01` — sesión `2026-08-26_admin_inventario_mesas_reparto`

La pantalla inline de Reparto se reunió en la caja propia del módulo, conservando la ruta Expo Router como adaptador fino.

| Origen | Transformación | Destino | Motivo |
|---|---|---|---|
| `app/_role/admin/repart.tsx` | Movido sin renombrar símbolos; se dejó un adaptador de ruta mínimo | `src/ui/roles/administrador/reparto/repart.tsx` | La UI es exclusiva de Reparto y debía salir de `app/` para alinearse con la separación ruta → pantalla usada por los demás módulos admin. |

La ruta pública `/_role/admin/repart` se conserva en `app/_role/admin/repart.tsx` y delega al componente reunido. No se movieron la capacidad `src/capacidades/reparto/`, la infraestructura RTDB ni los consumidores compartidos de navegación y feature flags.

**Validación prevista:** `npx tsc --noEmit` antes del commit, conforme a la instrucción de M3.
