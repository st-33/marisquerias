# Tarea T-M3-01 — Fases 1–3 del módulo Reparto (Administrador)

| Campo | Valor |
|---|---|
| ID | `T-M3-01` |
| VERSION | `1` |
| Sesión | `2026-08-26_admin_inventario_mesas_reparto` |
| Agente | M3 |
| Publicada | `2026-08-26 06:00 UTC` |
| ESTADO | NUEVA |
| SELLO | |

## 1. Objetivo
Ejecutar las fases 1–3 del módulo **Reparto** (servicio a domicilio y reabasto) del rol
Administrador: (1) localizar TODA la pieza del módulo (incluida su UI, que está por
encontrar), (2) documentar con evidencia y huella, (3) reunir en la caja las piezas
exclusivas dispersas.

## 2. Contexto mínimo
La lógica conocida está en `src/capacidades/reparto/useAdminRepart.ts` (80 líneas) y la
ruta `app/_role/admin/repart.tsx` existe. **La pantalla/UI de reparto NO está localizada
todavía**: es tu hallazgo principal determinar dónde se renderiza y a través de qué
clave de registro (`admin_repart` u otra). Rama `rama-2`.

## 3. Ruta inicial
`src/capacidades/reparto/useAdminRepart.ts`, `app/_role/admin/repart.tsx`,
`src/composicion/registroPantallas.ts`

## 4. Alcance (fase 1 — mapeo)
- `capacidades/reparto/*` y todos los consumidores de `useAdminRepart`.
- La ruta Expo `app/_role/admin/repart.tsx`: qué pantalla resuelve y desde dónde.
- El registro `src/composicion/registroPantallas.ts`: qué clave usa el reparto.
- Cualquier pieza visual de reparto (busca por repart, domicilio, delivery, reabasto,
  costos, horarios, umbrales).
- RTDB: nodos `ajustes/reparto` (costos, horarios, umbrales) — solo lectura.

## 5. Límites (fases 1–2)
- Módulo Dispositivos y otros roles: **fuera de alcance**.
- Infraestructura y RTDB: solo lectura, documentar.

## 6. Qué verificar (fase 1)
La cadena completa: ruta Expo → registro → pantalla → capacidad → RTDB. Para cada
pieza: consumidores y clasificación (EXCLUSIVA_REPARTO, COMPARTIDA, HUERFANA_CANDIDATA).

## 7. Evidencia que debe producir (fase 2)
Informe con: (a) la cadena de renderizado completa del módulo Reparto; (b) tabla
pieza→consumidores→clasificación; (c) piezas exclusivas dispersas candidatas a la caja;
(d) pendientes (por ejemplo, si la UI de reparto no existe todavía o vive fuera del rol).

## 8. Puede modificar (fase 3 — reunión en la caja)
SOLO piezas EXCLUSIVA_REPARTO, con las reglas:
- `git mv` hacia `src/ui/roles/administrador/reparto/` (visual; crea la carpeta si la
  pieza existe) o `src/capacidades/reparto/` (lógica).
- Actualizar imports de los consumidores del módulo.
- **No** renombrar símbolos ni crear subjerarquías (fase 4 del orquestador).
- `MIGRACION.md` en el origen.
- `npx tsc --noEmit` antes del commit.
- Si la pieza visual NO existe, decláralo: la fase 3 de reparto puede quedar solo
  documental.

## 9. No puede modificar
Compartidas, infraestructura, `CENTRAL/`, otras carpetas M*, `EVENTOS.json`,
`ACTIVACIONES.json`, `MANIFIESTO.md`, `AGENTS.md`, protocolos y plantillas.

## 10. Qué debe documentar
Informe oficial + huella de movimientos.

## 11. Cuándo hacer commit
Fase 2: `docs(multimodelo/M3): mapeo reparto`. Fase 3: `refactor(admin): reunir piezas de reparto` (solo si hay movimientos).

## 12. Qué debe reportar
Cadena de renderizado, clasificación, piezas movidas o la declaración de inexistencia
con evidencia.

## 13. Condición de terminado
La cadena Reparto está mapeada con evidencia (ruta → registro → pantalla → capacidad),
el informe entregado y, si existían piezas exclusivas dispersas, movidas con tsc verde.

## 14. Si encuentra una contradicción
Reportarla con evidencia.

## 15. Si la pieza ya fue movida
Rastro → destino → solo lo pendiente.

## 16. Si necesita salir del límite
Detente y repórtalo.
