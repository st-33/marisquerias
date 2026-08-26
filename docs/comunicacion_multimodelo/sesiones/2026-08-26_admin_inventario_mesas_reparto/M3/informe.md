# Informe — M3 / Tarea T-M3-01

| Campo | Valor |
|---|---|
| Agente | M3 |
| Tarea | `T-M3-01` |
| Sesión | `2026-08-26_admin_inventario_mesas_reparto` |
| Fecha/hora UTC | `2026-08-26 06:51` |
| Estado | REPORTADA |
| Commits | `d303374` (`refactor(admin): reunir piezas de reparto`) + commit documental de este informe |
| Archivos creados/modificados | `app/_role/admin/repart.tsx`, `app/_role/admin/MIGRACION.md`, `src/ui/roles/administrador/reparto/repart.tsx`, `M3/informe.md`, `M3/estado.md`, `M3/procesado.json` |

## 1. Resumen ejecutivo

La UI de Reparto sí existe y estaba localizada en `app/_role/admin/repart.tsx`, no en `src/ui/roles/administrador/` ni en `src/composicion/registroPantallas.ts`. La cadena efectiva es: feature flag `admin_repart` → entrada de navegación admin y guardia de ruta → `/_role/admin/repart` → pantalla `AdminRepart` → `useAdminRepart` → `RepartoAjustesRepository` → nodos `${tenantPath}/ajustes/reparto/{umbrales,horarios,costos}`.

Se inventariaron las piezas visuales, de capacidad, persistencia, inicialización RTDB, navegación y compatibilidad. La UI inline era exclusiva de Reparto y se reunió en `src/ui/roles/administrador/reparto/repart.tsx`; la ruta pública se conservó como adaptador fino en `app/_role/admin/repart.tsx`. La infraestructura RTDB y los consumidores compartidos no se movieron.

La evidencia también revela dos decisiones pendientes para la fase 4 del orquestador: Reparto todavía no está registrado en `REGISTRO_PANTALLAS`, por lo que el route adapter evita la fábrica de pantallas; y existen dos superficies de persistencia con bases distintas: ajustes administrativos en la RTDB operativa y misiones en la RTDB alias `reparto`.

## 2. Hechos confirmados

### 2.1. Cadena completa de renderizado y datos

| Paso | Hecho confirmado | Evidencia |
|---|---|---|
| Feature flag | `TenantFeatures` declara `admin_repart`; se normaliza como `adminRoleEnabled && adminConfig?.repart !== false`. | `src/capacidades/admin/useAdminFeatures.ts:15-30`, `:41-59` |
| Compatibilidad de configuración | El normalizador legado acepta tanto `roles.admin.repart` como `roles.admin.reparto` y produce la clave plana `admin_repart`. | `src/sistema/utilidades/caracteristicas.ts:23-45`, especialmente `:27-35` |
| Entrada de navegación | El índice del rol Admin agrega `ADI Repart` y la ruta `/_role/admin/repart` cuando `features.admin_repart === true`. | `app/_role/admin/index.tsx:7-64`, especialmente `:54-60` |
| Guardia de ruta | El layout global exige `admin_repart` para `/_role/admin/repart`; si no está habilitado, redirige al selector de roles. | `app/_layout.tsx:25-38`, `:55-78`, especialmente `:35` y `:64-75` |
| Acceso contextual | La pantalla de Métricas y Datos ofrece un acceso secundario a `ADI Repart` y navega a la misma ruta si `features.admin_repart !== false`. | `src/ui/roles/administrador/metricas/PantallaMetricasDatos.tsx:150-156` |
| Ruta real | La ruta pública se conservó en `app/_role/admin/repart.tsx` como adaptador, delegando al componente reunido en `src/ui/roles/administrador/reparto/repart.tsx`. | `app/_role/admin/repart.tsx:1-7`; movimiento de entrega |
| Pantalla | La pantalla `AdminRepart` contiene tres tarjetas inline: Reabastecimiento, Horarios y ventanas, y Costos y reglas. | `src/ui/roles/administrador/reparto/repart.tsx:5-30`, `:33-86` |
| Capacidad | `AdminRepart` consume exclusivamente `useAdminRepart()` y recibe `loading`, `umbrales`, `horarios`, `costos` y `actions`. | `src/ui/roles/administrador/reparto/repart.tsx:33-34` |
| Estado inicial | La capacidad mantiene defaults locales: stock bajo 5, máximo 10 pedidos activos, SLA 45 min; horario 09:00–18:00 deshabilitado; costos base 20, por km 5, mínimo 20. | `src/capacidades/reparto/useAdminRepart.ts:29-43` |
| Suscripciones | La capacidad suscribe por separado `umbrales`, `horarios` y `costos`, y libera los tres listeners al desmontar. | `src/capacidades/reparto/useAdminRepart.ts:45-58` |
| Acciones | La pantalla puede actualizar `stockBajo`, alternar `horarios.habilitado` y actualizar `costos.base`; la capacidad también expone guardado parcial de horarios y costos. | UI: `src/ui/roles/administrador/reparto/repart.tsx:59-80`; capacidad: `src/capacidades/reparto/useAdminRepart.ts:60-71` |
| Repositorio | La capacidad instancia `RepartoAjustesRepository` y no llama Firebase directamente desde la UI. | `src/capacidades/reparto/useAdminRepart.ts:9-27`; comentario de infraestructura en `src/sistema/persistencia/reparto-ajustes.repo.ts:2-5` |
| RTDB | La base de ajustes es `${tenantPath}/ajustes/reparto`; contiene las subramas `umbrales`, `horarios` y `costos`. | `src/sistema/persistencia/reparto-ajustes.repo.ts:11-26`, `:36-38` |
| Inicialización | `ensureTenant` crea esos tres nodos con los mismos defaults si no existen. | `src/sistema/ciclo_de_vida/ensureTenant.ts:76-99` |

La cadena efectiva puede resumirse así:

```text
caracteristicas/roles/admin/repart
        ↓ normalización
features.admin_repart
        ↓ navegación + guardia
app/_role/admin/repart.tsx
        ↓ adaptador fino
src/ui/roles/administrador/reparto/repart.tsx
        ↓ hook de capacidad
src/capacidades/reparto/useAdminRepart.ts
        ↓ repositorio de ajustes
src/sistema/persistencia/reparto-ajustes.repo.ts
        ↓ RTDB operativa
<tenantPath>/ajustes/reparto/{umbrales,horarios,costos}
```

### 2.2. Inventario de piezas y clasificación

La clasificación distingue piezas exclusivas de Reparto, piezas compartidas de navegación/infraestructura y una pieza de misiones que queda como candidata huérfana para el frente de M4. La clasificación no autoriza eliminar ni modificar piezas fuera de los límites de T-M3-01.

| Pieza | Consumidores / relación | Clasificación | Decisión en fases 1–3 |
|---|---|---|---|
| `app/_role/admin/repart.tsx` | Ruta pública Expo Router; era pantalla inline y consumía `useAdminRepart`. | `EXCLUSIVA_REPARTO` como UI/ruta de entrada | Movida la UI a la caja; se dejó adaptador mínimo en `app/`. |
| `src/ui/roles/administrador/reparto/repart.tsx` | Pantalla reunida; consume `useAdminRepart`. | `EXCLUSIVA_REPARTO` | Nueva ubicación de la pieza visual, sin renombrar símbolos ni crear subjerarquías internas. |
| `src/capacidades/reparto/useAdminRepart.ts` | Consumido por la pantalla de Reparto; reexportado por `src/capacidades/reparto/index.ts` y `src/capacidades/index.ts`. | `EXCLUSIVA_REPARTO` / capacidad | Permanece en su ubicación correcta; no requiere movimiento. |
| `src/capacidades/reparto/index.ts` | Barril que reexporta `useAdminRepart`; usado por el import de la pantalla. | `EXCLUSIVA_REPARTO` / barril | Permanece; el movimiento de la UI actualiza su import relativo. |
| `src/sistema/persistencia/reparto-ajustes.repo.ts` | Consumido por `useAdminRepart`; reexportado por `src/sistema/persistencia/index.ts`. | `COMPARTIDA` / infraestructura RTDB | Solo lectura; no se mueve por el límite de infraestructura. |
| `src/sistema/ciclo_de_vida/ensureTenant.ts` | Inicializa los tres nodos RTDB de ajustes durante el ciclo de vida del tenant. | `COMPARTIDA` / inicialización | Solo lectura; no se mueve. |
| `src/capacidades/admin/useAdminFeatures.ts` | Produce `admin_repart` junto con todos los flags administrativos. | `COMPARTIDA` | No se mueve; gobierna otros módulos admin. |
| `app/_role/admin/index.tsx` | Construye navegación de todos los módulos administrativos. | `COMPARTIDA` | No se mueve; solo se documenta el acceso a Reparto. |
| `app/_layout.tsx` | Guardia global de rutas y proveedores de toda la aplicación. | `COMPARTIDA` | No se mueve. |
| `src/ui/roles/administrador/metricas/PantallaMetricasDatos.tsx` | Acceso contextual a Reparto desde Métricas y Datos. | `COMPARTIDA` | No se mueve. |
| `src/composicion/registroPantallas.ts` | Registro global de `admin_dashboard`, `admin_menu`, `admin_tables`, `admin_inventory` y `admin_mostrador`; no contiene `admin_repart`. | `COMPARTIDA` / punto de integración pendiente | No se modifica en fase 3; queda pendiente para el orquestador. |
| `src/composicion/resolvedorPantalla.tsx` | Resuelve únicamente claves presentes en `REGISTRO_PANTALLAS`; Reparto no entra por esta vía. | `COMPARTIDA` | No se mueve. |
| `src/sistema/utilidades/caracteristicas.ts` | Normalizador de compatibilidad que acepta `repart` y `reparto`. | `COMPARTIDA` / compatibilidad | No se mueve. |
| `src/sistema/persistencia/reparto.repo.ts` | Define misiones `delivery` y `reabastecimiento`, pero no tiene consumidores de clase en `app` o `src`; solo se reexporta desde el barril de persistencia. | `HUERFANA_CANDIDATA` / infraestructura | No se modifica: su verificación o eventual eliminación corresponde a M4/orquestador. |

### 2.3. Contrato RTDB y frontera de bases

| Área | Contrato observado | Evidencia | Riesgo o pendiente |
|---|---|---|---|
| Ajustes de umbral | `stockBajo`, `maxPedidosActivos`, `tiempoMaxEntregaMin`; lecturas normalizan a número y escrituras usan `update`. | `reparto-ajustes.repo.ts:11-16`, `:41-62` | No hay validación de rangos en la capacidad o repositorio; la UI incrementa `stockBajo` sin límites visibles. |
| Horarios | `habilitado` y `ventanas[]`; lectura aplica ventana default; guardar ventanas completas usa `set`, parches simples `update`. | `reparto-ajustes.repo.ts:17-20`, `:65-99` | Una escritura completa de ventanas reemplaza la subrama; la UI localizada no edita ventanas todavía, solo alterna habilitación. |
| Costos | `base`, `porKm`, `minimo`; lectura normaliza a número y escritura usa `update`. | `reparto-ajustes.repo.ts:21-25`, `:101-123` | La UI solo incrementa `base`; `porKm` y `minimo` quedan sin edición visual en esta pantalla. |
| Inicialización | `ensureTenant` escribe defaults directamente en los mismos nodos antes de que la capacidad se suscriba. | `ensureTenant.ts:76-99` | Hay dos escritores del mismo contrato: inicializador y repositorio. Es esperado para bootstrap, pero debe conservarse la misma forma. |
| Fuente de datos de ajustes | `useAdminRepart` obtiene la base usando `getRtdb(ds?.operacionUrl || undefined)`, es decir, la RTDB operativa por URL. | `useAdminRepart.ts:20-26` | El nombre ADI-Repart puede sugerir una base separada, pero los ajustes admin no usan el alias dedicado `reparto`. |
| Fuente de datos de misiones | `RepartoRepository` usa `getRtdb('reparto')`, que resuelve `dataSources.repartoUrl` y maneja misiones bajo `reparto/misiones`. | `reparto.repo.ts:200-214`; `src/sistema/firebase/firebase.ts:68-80` | Existen dos superficies de Reparto con bases distintas: ajustes admin en operación y misiones en RTDB dedicada. La relación entre ambas no está implementada en los consumidores actuales. |
| Misiones | El repositorio operativo define tipos y CRUD para delivery y reabastecimiento, pero el escaneo no encontró consumidores de `RepartoRepository`. | Definición: `reparto.repo.ts:39-194`, `:200-325`; referencias en árbol `app/src`: solo export de `src/sistema/persistencia/index.ts:44-55` | Candidato huérfano para M4; no asumir que está muerto en producción solo por ausencia de consumidores estáticos. |

### 2.4. Contraste con el patrón de módulos admin

Los adaptadores de Dashboard, Menú, Mesas e Inventario son contenedores finos que llaman `useResolvedorPantalla` y obtienen la pantalla desde `REGISTRO_PANTALLAS`; por ejemplo, `app/_role/admin/menu.tsx:1-19` y `app/_role/admin/inventory.tsx:1-19`. Reparto, en cambio, renderizaba la UI completa dentro de la ruta. Además, `REGISTRO_PANTALLAS` no incluye `admin_repart` (`src/composicion/registroPantallas.ts:15-43`) y `useResolvedorPantalla` devuelve una alternativa si la clave no está registrada (`src/composicion/resolvedorPantalla.tsx:24-35`).

Por eso la fase 3 solo reunió la pantalla visual en la carpeta propia y conservó la ruta como adaptador directo. No se agregó `admin_repart` al registro global, porque esa integración cruza la fase 4 reservada al orquestador y afectaría la arquitectura de composición compartida.

## 3. Hipótesis y límites de certeza

La ausencia de referencias a `RepartoRepository` en `app` y `src` permite clasificarlo como `HUERFANA_CANDIDATA`, no afirmar que sea definitivamente eliminable. Puede existir consumo dinámico, externo o planificado que el escaneo estático no detecte. M4/orquestador debe decidir después de verificar historial, documentación y configuración desplegada.

La pantalla de Reparto parece ser un prototipo operativo: las tres tarjetas ejecutan mutaciones directas al presionarse, y no exponen formularios completos para todos los campos del contrato. Esto es un hecho observable en `repart/repart.tsx:59-80`; no se concluye aquí si esa UX es intencional o provisional.

El uso de `getRtdb(ds?.operacionUrl || undefined)` en `useAdminRepart` frente a `getRtdb('reparto')` en `RepartoRepository` demuestra dos fuentes de datos distintas en el código. No se verificó el contenido de `dataSources` en un tenant real ni las reglas Firebase, por lo que no se afirma que exista un fallo de producción.

No se modificó `REGISTRO_PANTALLAS`, la capacidad, el repositorio RTDB, el inicializador, los feature flags ni los consumidores compartidos. Esas piezas quedan inventariadas para la decisión arquitectónica posterior.

## 4. Movimientos realizados

| Pieza | Origen | Transformación | Destino | Por qué | Hora UTC |
|---|---|---|---|---|---|
| UI completa `AdminRepart` | `app/_role/admin/repart.tsx` | `git mv` sin renombrar símbolos; se corrigió únicamente el import relativo de la capacidad después del movimiento | `src/ui/roles/administrador/reparto/repart.tsx` | Pieza visual exclusiva de Reparto; se reúne en la caja prescrita y se alinea con la separación ruta → pantalla de los demás módulos admin | `2026-08-26 06:45–06:47` |
| Adaptador de ruta | `app/_role/admin/repart.tsx` | Se creó un contenedor mínimo que importa y exporta la pantalla reunida | `app/_role/admin/repart.tsx` | Conserva la ruta pública `/_role/admin/repart` sin incorporar todavía Reparto a la fábrica global | `2026-08-26 06:47` |
| Huella de origen | No existía | Se creó registro local de migración | `app/_role/admin/MIGRACION.md` | Dejar rastro del movimiento, destino, motivo y piezas deliberadamente no movidas | `2026-08-26 06:47` |

La capacidad y la infraestructura no se movieron: ya estaban en `src/capacidades/reparto/` y `src/sistema/persistencia/`, respectivamente. No se modificaron piezas compartidas ni archivos de otros agentes.

## 5. Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| Detección de evento | Confirmado `ev-0003`, tipo `INSTRUCCION_NUEVA`, agente `M3`, tarea `T-M3-01`, sello `43d7c3471afb75afce82c48e324f66201ccbee3b94928c35fa6b9638e63e739e`; el sello no estaba en `M3/procesado.json`. |
| Rama | `rama-2` sincronizada con `origin/rama-2` antes de iniciar. |
| Inventario estático | Localizados ruta, UI, capacidad, barriles, repositorio de ajustes, bootstrap RTDB, feature flags, navegación, guardia, registro de pantallas y repositorio operativo de misiones. |
| Referencias | No quedaron referencias a la ruta antigua como implementación de UI; la ruta pública solo importa `src/ui/roles/administrador/reparto/repart`. `useAdminRepart` solo es consumido por la pantalla reunida, además de sus barriles. |
| `npx tsc --noEmit` | Verde después de corregir el import relativo producido por el movimiento. |
| Lint focal | Verde: `npx eslint app/_role/admin/repart.tsx src/ui/roles/administrador/reparto/repart.tsx`. |
| Suite de pruebas | Verde: `19` suites, `102` tests. Comando: `npm test -- --runInBand`. |
| Integridad del diff | `git diff --check` verde. Antes de publicar se verificará que el commit contenga solo la zona propia M3 y los archivos funcionales autorizados. |

## 6. Bloqueos y necesidades fuera de alcance

No hubo bloqueo para localizar la UI ni para reunir la pieza exclusiva. La integración de Reparto en `src/composicion/registroPantallas.ts` queda fuera de esta fase: requiere decisión del orquestador porque cambiaría la cadena de resolución compartida y debería acompañarse de pruebas de navegación.

La inspección y eventual limpieza de `src/sistema/persistencia/reparto.repo.ts` queda fuera de M3: se clasifica como candidata huérfana y corresponde al frente de M4/orquestador. La revisión de reglas RTDB, datos de producción, consumidores dinámicos y la relación entre ajustes y misiones también queda fuera del alcance autorizado.

## 7. Pendientes para otros procesos

| Prioridad | Pendiente | Responsable sugerido |
|---|---|---|
| P1 | Decidir si `admin_repart` debe entrar en `REGISTRO_PANTALLAS` y convertir la ruta en un contenedor `useResolvedorPantalla`, como los demás módulos admin. | Orquestador, fase 4 |
| P1 | Confirmar y documentar la autoridad de datos: ajustes en RTDB operativa (`<tenantPath>/ajustes/reparto`) frente a misiones en RTDB alias `reparto`. | Orquestador + agente de infraestructura |
| P1 | Verificar si `RepartoRepository` es realmente huérfano mediante historial, documentación y configuración antes de eliminarlo. | M4/orquestador |
| P2 | Diseñar controles de edición completos para ventanas, `porKm` y `minimo`; la UI actual solo muestra ventanas y modifica algunos valores mediante taps. | Orquestador + agente de UI |
| P2 | Definir validaciones de rango para umbrales, tiempos y costos antes de permitir edición administrativa abierta. | Orquestador + agente de dominio |
| P2 | Añadir pruebas específicas de la pantalla/capacidad de Reparto y del gate `admin_repart`; la suite general verde no prueba todavía la ruta reunida de forma directa. | M5/orquestador |

## 8. Propuestas opcionales

La propuesta de menor riesgo para la fase 4 es mantener el movimiento realizado y convertir `app/_role/admin/repart.tsx` en un contenedor de `useResolvedorPantalla('admin_repart')` solo después de registrar una pantalla `AdminRepart` en `REGISTRO_PANTALLAS` y añadir pruebas de resolución. Así se evita que la fase 3 mezcle inventario con una modificación de la fábrica global.

Antes de ampliar la UI, conviene separar explícitamente dos subdominios: **ajustes administrativos** bajo el tenant operativo y **misiones de delivery/reabastecimiento** bajo la RTDB dedicada. El nombre Reparto es común, pero los repositorios y bases no son actualmente una misma cadena de ejecución.

## 9. Fuentes internas de evidencia

Las afirmaciones del informe se basan exclusivamente en la rama `rama-2` sincronizada en la fecha indicada y en estas rutas del repositorio: `app/_role/admin/repart.tsx`, `app/_role/admin/index.tsx`, `app/_layout.tsx`, `src/ui/roles/administrador/metricas/PantallaMetricasDatos.tsx`, `src/capacidades/admin/useAdminFeatures.ts`, `src/capacidades/reparto/useAdminRepart.ts`, `src/sistema/persistencia/reparto-ajustes.repo.ts`, `src/sistema/persistencia/reparto.repo.ts`, `src/sistema/ciclo_de_vida/ensureTenant.ts`, `src/sistema/firebase/firebase.ts`, `src/composicion/registroPantallas.ts`, `src/composicion/resolvedorPantalla.tsx` y `src/sistema/utilidades/caracteristicas.ts`.
