# Informe — M4 / Tarea T-M4-01

| Campo | Valor |
|---|---|
| Agente | M4 |
| Tarea | T-M4-01 |
| Sesión | `2026-08-26_admin_inventario_mesas_reparto` |
| Fecha/hora UTC | `2026-08-26 06:49` |
| Estado | REPORTADA |
| Commits | Pendiente de asignar en el commit de entrega |
| Archivos creados/modificados | `M4/informe.md`, `M4/estado.md`, `M4/procesado.json` |

## 1. Resumen ejecutivo

Se auditó el territorio autorizado de **Inventario, Mesas y Reparto** del rol Administrador. Se inventariaron los nueve archivos principales de los cinco directorios objetivo y las piezas relacionadas detectadas en UI/capacidades. Todas las piezas del territorio tienen consumidor real, ya sea por ruta de pantalla, composición, capacidad, barril consumido o bloque compartido.

No se confirmó ningún candidato a eliminación dentro del alcance de M4. `TablesGrid`, que inicialmente podía parecer exclusivo de Mesas, está vivo en el flujo Mesero mediante `PuestoMando`. La UI de Reparto no está bajo `src/ui/roles/administrador/reparto/`: vive inline en `app/_role/admin/repart.tsx` y consume directamente `useAdminRepart`. M4 no eliminó, movió ni editó código.

## 2. Hechos confirmados

| # | Hecho | Evidencia (ruta:línea o commit) |
|---|---|---|
| 1 | La sesión activa es `2026-08-26_admin_inventario_mesas_reparto`, con fases 1–3 delegadas y fase 4 reservada al orquestador. | `MANIFIESTO.md:20-28`; `CENTRAL/estado.md:5-17` |
| 2 | El evento `ev-0004` es `INSTRUCCION_NUEVA`, está dirigido a M4, corresponde a T-M4-01 y su sello no estaba procesado al arrancar. | `EVENTOS.json:34-40`; `M4/procesado.json:2-3` |
| 3 | El sello de la instrucción coincide: SHA-256 `348c768224c9c8198f2d35f98d63db777854a97773afdcbe44e0b926fe622022`. | `M4/instruccion.md:5-11`; `sha256sum` ejecutado antes de iniciar |
| 4 | Inventario está conectado: `admin_inventory` resuelve a `AdminInventoryScreen`; esta pantalla renderiza `PanelInventario`, y el panel consume `useInventarioAvanzado`. | `src/composicion/registroPantallas.ts:7,37-38`; `src/ui/roles/administrador/inventario/AdminInventoryScreen.tsx:6-18`; `PanelInventario/index.tsx:18,34,51` |
| 5 | Mesas está conectado: `admin_tables` resuelve a `AdminTablesScreen`, que consume `useMesasManagement` y `usePuenteAccionesFlotantes`. | `src/composicion/registroPantallas.ts:6,34-35`; `src/ui/roles/administrador/mesas/AdminTablesScreen.tsx:22,51,59` |
| 6 | Reparto tiene UI real en la ruta Expo, aunque no exista una carpeta `src/ui/roles/administrador/reparto/`; la ruta consume `useAdminRepart` y muestra las acciones de ajustes. | `app/_role/admin/repart.tsx:3,33-87`; `src/capacidades/reparto/useAdminRepart.ts:19,60-79` |
| 7 | La resolución de pantallas para Inventario y Mesas es estática por registro; el resolvedor no carga componentes por `require` ni `import()`. | `app/_role/admin/inventory.tsx:7-17`; `app/_role/admin/tables.tsx:7-17`; `src/composicion/resolvedorPantalla.tsx:24-49` |
| 8 | `TablesGrid` no es huérfana de Mesas: `PuestoMando` la importa y la renderiza; `PuestoMando` se consume desde `MeseroScreen`. | `src/ui/bloques/PuestoMando.tsx:5-7,187-200`; `src/ui/pantallas/MeseroScreen.tsx:17,229`; `src/ui/index.ts:14,24-25` |
| 9 | `TableBadge` es una dependencia viva de `TablesGrid`, aunque está fuera de `ui/bloques` y se importa desde `compartido`. | `src/ui/bloques/TablesGrid.tsx:4,167`; `src/compartido/componentes/ui/TableBadge.tsx:27-33` |
| 10 | La capacidad compartida `usePuenteAccionesFlotantes` tiene consumidores en Inventario, Mesas y Métricas; no es candidata. | `src/capacidades/admin/operacion/usePuenteAccionesFlotantes.ts:24`; `PanelInventario/index.tsx:19,215`; `AdminTablesScreen.tsx:22,182`; `PantallaMetricasDatos.tsx:28,171` |
| 11 | Los barriles raíz exponen capacidades y piezas UI, pero la exposición no se confundió con consumo: cada fila se verificó contra su consumidor concreto. | `src/capacidades/index.ts:8-11`; `src/ui/index.ts:12,14,24-25`; barriles locales `capacidades/{inventario,mesas,reparto}/index.ts:1` |
| 12 | No existen tests con referencias nominales a las piezas principales del territorio; la suite existente cubre otras áreas. | Búsqueda independiente sobre `find src app -type f \( -iname '*test*' -o -iname '*spec*' \)` sin resultados para los símbolos objetivo |
| 13 | El historial confirma que las rutas actuales son destinos de movimientos previos, no duplicados accidentales: Inventario/Mesas se reubicaron en `71d6a21`, Reparto en `0aae582` y `TablesGrid` en `bb17ca9`. | `git log --follow --find-renames --name-status` sobre cada pieza objetivo |

### Tabla de veredictos

> `consumidor estático` identifica uso funcional en `src` o `app`; la definición propia no cuenta. Un export de barril solo cuenta como exposición, no como consumidor. No se detectaron cargas dinámicas dirigidas a estas piezas.

| pieza | ¿en barril? | ¿consumidor estático? | ¿dinámico? | veredicto |
|---|---|---|---|---|
| `src/ui/roles/administrador/inventario/AdminInventoryScreen.tsx` | No en `ui/index.ts` | Sí: `registroPantallas.ts:7,37-38` | No | **VIVA_POR** — ruta `admin_inventory` |
| `src/ui/roles/administrador/inventario/PanelInventario/index.tsx` | Sí: `src/ui/index.ts:12` | Sí: `AdminInventoryScreen.tsx:6,18` | No | **VIVA_POR** — pantalla de Inventario |
| `src/capacidades/inventario/useInventarioAvanzado.ts` | Sí: índice local `:1` y raíz `capacidades/index.ts:9` | Sí: `PanelInventario/index.tsx:18,51` | No | **VIVA_POR** — capacidad activa |
| `src/capacidades/inventario/index.ts` | Sí, es el barril local | Sí indirecto por `PanelInventario` | No | **VIVA_POR** — entrada de la capacidad |
| `src/ui/roles/administrador/mesas/AdminTablesScreen.tsx` | No en `ui/index.ts` | Sí: `registroPantallas.ts:6,34-35` | No | **VIVA_POR** — ruta `admin_tables` |
| `src/capacidades/mesas/useMesasManagement.ts` | Sí: índice local `:1` y raíz `capacidades/index.ts:8` | Sí: `AdminTablesScreen.tsx:22,59` | No | **VIVA_POR** — capacidad activa |
| `src/capacidades/mesas/index.ts` | Sí, es el barril local | Sí indirecto por `AdminTablesScreen` vía raíz | No | **VIVA_POR** — entrada de la capacidad |
| `src/capacidades/reparto/useAdminRepart.ts` | Sí: índice local `:1` y raíz `capacidades/index.ts:11` | Sí: `app/_role/admin/repart.tsx:3,34` | No | **VIVA_POR** — UI inline de Reparto |
| `src/capacidades/reparto/index.ts` | Sí, es el barril local | Sí: ruta de Reparto `:3` | No | **VIVA_POR** — entrada de la capacidad |
| `src/ui/bloques/TablesGrid.tsx` | Sí: `src/ui/index.ts:24-25` | Sí: `PuestoMando.tsx:7,187-200` | No | **VIVA_POR** — compartida con Mesero |
| `src/ui/bloques/PuestoMando.tsx` | Sí: `src/ui/index.ts:14,21` | Sí: `MeseroScreen.tsx:17,229` | No | **VIVA_POR** — puesto de operación Mesero |
| `src/compartido/componentes/ui/TableBadge.tsx` *(dependencia relacionada)* | No en barril UI; import directo | Sí: `TablesGrid.tsx:4,167` | No | **VIVA_POR** — dependencia de bloque vivo |
| `src/capacidades/admin/operacion/usePuenteAccionesFlotantes.ts` *(compartida)* | Sí: `admin/index.ts:3`, raíz transitiva | Sí: Inventario, Mesas y Métricas | No | **VIVA_POR** — capacidad transversal |
| `app/_role/admin/repart.tsx` *(UI inline relacionada)* | No aplica | Sí: ruta Expo existente | No | **VIVA_POR** — pantalla de Reparto |

### Candidatos confirmados

**Ninguno dentro del alcance autorizado.** Cada pieza recibió veredicto `VIVA_POR`. En particular, `TablesGrid` no debe eliminarse ni absorberse como exclusivo de Mesas sin preservar el flujo Mesero → `PuestoMando` → `TablesGrid`.

## 3. Hipótesis y límites de certeza

La evidencia cubre el árbol versionado `src` y `app`, búsquedas de símbolos y rutas, barriles solicitados, imports dinámicos, imports de espacio de nombres, registro de pantallas, rutas Expo y tests. No se detectó ningún consumidor dinámico oculto.

Hay una observación fuera del alcance principal: `src/sistema/persistencia/reparto.repo.ts` exporta `RepartoRepository` desde `src/sistema/persistencia/index.ts:44-55`, pero no apareció un consumidor nominal dentro de `src`/`app` aparte de su propia declaración. Se deja como **INDETERMINADA fuera de alcance**, porque la instrucción de M4 limita las piezas relacionadas a UI/capacidades y una exportación pública no permite descartar consumidores externos. No se recomienda eliminarla con esta evidencia aislada.

Existe una aparente discrepancia con el plan central, que preguntaba si Reparto tenía registro `admin_repart`. La evidencia actual la resuelve: no hay esa clave en `registroPantallas.ts`, pero la ruta `app/_role/admin/repart.tsx` es una pantalla inline y consume directamente la capacidad. La ausencia de registro no implica orfandad.

## 4. Movimientos realizados

| Pieza | Origen | Transformación | Destino | Por qué | Hora UTC |
|---|---|---|---|---|---|
| Todas las piezas auditadas | Rutas actuales versionadas | Ningún movimiento de M4; solo lectura y rastreo histórico | Sin cambio | La sesión reserva la fase de armado para el orquestador | 2026-08-26 06:40–06:49 |

Trazabilidad consultada:

- `AdminInventoryScreen.tsx`: `R071` desde `src/ui/pantallas/AdminInventoryScreen.tsx` a `src/ui/roles/administrador/inventario/AdminInventoryScreen.tsx` en `71d6a21`.
- `PanelInventario/index.tsx`: `R099` desde `src/ui/bloques/pantallas/PanelInventario/index.tsx` a la ubicación actual en `71d6a21`.
- `AdminTablesScreen.tsx`: `R098` desde `src/ui/pantallas/AdminTablesScreen.tsx` a la ubicación actual en `71d6a21`.
- `useInventarioAvanzado.ts`: `R097` desde `src/capacidades/admin/operacion/` a `src/capacidades/inventario/` en `71d6a21`.
- `useMesasManagement.ts`: `R100` desde `src/capacidades/admin/` a `src/capacidades/mesas/` en `71d6a21`.
- `useAdminRepart.ts`: `R100` desde `src/capacidades/admin/` a `src/capacidades/reparto/` en `0aae582`.
- `TablesGrid.tsx`: `C095` desde `src/catalogo/_compartido/bloques/TablesGrid.tsx` a `src/ui/bloques/TablesGrid.tsx` en `bb17ca9`.

No se repitieron movimientos ya realizados y no se modificó código, `CENTRAL/`, `EVENTOS.json`, `ACTIVACIONES.json` ni carpetas de otros agentes.

## 5. Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| Verificación de sello de instrucción | PASS: `348c768224c9c8198f2d35f98d63db777854a97773afdcbe44e0b926fe622022`, igual a `ev-0004` |
| Inventario de archivos en los cinco directorios objetivo | PASS: 9 archivos principales, sin directorio UI propio de Reparto |
| Búsquedas de símbolos y rutas en `src` y `app` | PASS: todos los objetivos tienen consumidor o son barriles con consumidor transitivo |
| Revisión de barriles `ui/index.ts` y `capacidades/index.ts` | PASS: exposiciones verificadas contra consumidores concretos |
| Búsqueda de `require`/`import()` dirigida | PASS: sin cargas dinámicas de piezas objetivo ni barriles relacionados |
| Búsqueda de imports de espacio de nombres | PASS: sin namespace imports sobre UI/capacidades objetivo |
| Registro y resolvedor de pantallas | PASS: Inventario/Mesas por registro estático; Reparto por ruta inline directa |
| Tests relacionados | Sin tests nominales de estas piezas; no se eliminó ni modificó ninguno |
| `./node_modules/.bin/tsc --noEmit` | PASS, salida 0 |
| `./node_modules/.bin/jest --runInBand` | PASS: 19 suites, 102 tests |
| Lint focal | PASS, salida 0; 2 warnings no bloqueantes: `PuestoMando.tsx:104` (`isPrinting` sin uso) y `AdminTablesScreen.tsx:180` (dependencia innecesaria `mesas` en `useMemo`) |
| `git diff --check` | PASS |
| Alcance de cambios M4 | PASS: solo `M4/informe.md`, `M4/estado.md` y `M4/procesado.json` |

## 6. Bloqueos y necesidades fuera de alcance

No hay bloqueo para la detección. M4 no puede mover, eliminar, corregir warnings ni reorganizar la arquitectura en esta sesión. La fase 4 está reservada al orquestador.

La observación de `RepartoRepository` requiere decisión o una instrucción explícita sobre infraestructura persistente; por ahora queda fuera de la lista de candidatos confirmados.

## 7. Pendientes para otros procesos

El orquestador debe conservar las cadenas vivas identificadas al armar la siguiente jerarquía. Debe tratar `TablesGrid` como pieza compartida con Mesero y considerar la UI inline de Reparto al definir la estructura final. También puede decidir si crea un registro `admin_repart` en una fase arquitectónica posterior, pero eso no forma parte de la detección de M4.

Los dos warnings de lint pueden ser atendidos por el proceso de calidad o por el orquestador, sin mezclar esa corrección con esta entrega documental.

## 8. Propuestas

No propongo eliminaciones. Para la fase de armado, conservar las capacidades vivas y evaluar cualquier movimiento mediante la misma matriz de consumidores; antes de tocar `RepartoRepository`, buscar contratos externos y referencias de infraestructura fuera del árbol `src`/`app`.
