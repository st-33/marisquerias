# Tarea T-M4-01 — Detección de huérfanos y candidatos a eliminación

| Campo | Valor |
|---|---|
| ID | `T-M4-01` |
| VERSION | `1` |
| Sesión | `2026-08-25_admin_menu` |
| Agente | M4 |
| Publicada | `2026-08-26 05:00 UTC` |
| ESTADO | NUEVA |
| SELLO | |

## 1. Objetivo
Confirmar, para un conjunto de piezas sospechosas de no tener uso, si realmente están
huérfanas y producir la lista de candidatos a eliminación con evidencia.

## 2. Contexto mínimo
Antes de eliminar cualquier pieza se exige evidencia de ausencia de consumo. Una pieza
puede estar viva por import estático, import dinámico, referencia en registro de pantallas,
o export de barril consumido a su vez.

## 3. Ruta inicial
`src/ui/bloques/menu/MenuLayout.tsx`

## 4. Alcance (sospechosas)
- `src/ui/bloques/menu/MenuLayout.tsx`
- `src/ui/bloques/productos/MallaProductos.tsx` (+ su test)
- `src/ui/primitivos/productos/ControlCantidad.tsx`, `EtiquetaPrecio.tsx`,
  `InsigniaEstado.tsx`, `TarjetaBase.tsx` (+ su test)
- `src/capacidades/admin/useAdminTools.ts`
- Cualquier otra pieza del territorio que detectes sin consumidores.

## 5. Límites
Solo lectura. **No elimines nada.** Solo produces la lista de candidatos.

## 6. Qué verificar
Para cada pieza: `grep -rn` de su nombre y de su ruta en `src` y `app`; export de barril
(`ui/index.ts`, `capacidades/index.ts`) y si ese barril es consumido; imports dinámicos
(`require`, `import(`) ; referencias en `composicion/registroPantallas.ts` y en tests.

## 7. Evidencia que debe producir
Tabla: `| pieza | ¿exportada en barril? | ¿consumidor estático? | ¿dinámico? | veredicto |`.
Veredicto ∈ {HUERFANA_CONFIRMADA, VIVA_POR, INDETERMINADA}. Para HUERFANA, la evidencia
de búsqueda (comandos usados).

## 8. Puede modificar
Ninguno. Solo tu carpeta `M4/`.

## 9. No puede modificar
Código, `CENTRAL/`, otras carpetas M*, `EVENTOS.json`, `ACTIVACIONES.json`, `MANIFIESTO.md`.

## 10. Qué debe documentar
El informe con la tabla y la lista de candidatos confirmados.

## 11. Cuándo hacer commit
Un commit al entregar: `docs(multimodelo/M4): detección de huérfanos menú`.

## 12. Qué debe reportar
La tabla y el veredicto por pieza.

## 13. Condición de terminado
Cada pieza del alcance tiene veredicto con evidencia.

## 14. Si encuentra una contradicción
Reportarla; no asumas.

## 15. Si la pieza ya fue movida
Rastro → destino → continúa.

## 16. Si necesita salir del límite
Detente y repórtalo.
