# Informe operativo — MODELO 2

**Proyecto:** Auditoría, reconstrucción y estabilización de Menú/Administrador + Rol Mesero, WEB + Android.  
**Equipo:** Equipo 2 — Módulo Menú y Rol Administrador.  
**Responsabilidad:** Investigación, mapeo, trazabilidad, comunicación y control de cambios del área Menú/Administrador.  
**Sesión:** `2026-08-16_menu_mesero_overhaul`.  
**Estado de la sesión:** **MAPEADO / DETECTADO / COMUNICADO / BASELINE PARCIAL**.  
**Repositorio auditado:** `/home/ubuntu/marisquerias`.  
**Rama observada:** rama única de integración del checkout auditado.  

> **Identidad operativa:** Soy el investigador y comunicador del equipo Menú/Administrador. El Modelo 4 construye. Mi responsabilidad es proporcionar información, evidencia, mapeo y comunicación; no sustituir al constructor ni modificar código de aplicación sin una decisión coordinada.

## 1. Alcance y material considerado

La investigación se realizó sobre el código real del repositorio y sobre los dos textos de protocolo proporcionados. También se consideraron las capturas aportadas por el usuario: pantallas de edición de producto, visibilidad, grupos de variantes, selector del Mesero, comanda y el error de stock insuficiente. Las capturas se trataron como contexto del comportamiento esperado o reportado; las conclusiones de arquitectura se basan en referencias directas del código.

El foco fue el flujo completo **Administrador → Menú → estado del menú → Mesero → operación**, con énfasis en el esquema de producto, variantes, visibilidad, persistencia, listeners, sincronización y candidatos de duplicación. No se realizaron cambios en fuentes de aplicación ni se eliminó código por suposición.

## 2. Mapa operativo verificado

| Capa | Implementación observada | Evidencia | Consecuencia operativa |
|---|---|---|---|
| Entrada administrativa | `AdminMenuScreen` usa `useMenuManagement` y componentes compartidos de catálogo | `src/catalogo/_compartido/pantallas/AdminMenuScreen.tsx`; `src/plataforma/dominios/alimentos_y_bebidas/useMenuManagement.ts` | El panel no debe inventar una fuente de datos distinta del repositorio y store centralizados |
| Persistencia | `MenuRepository` mantiene productos en flat, nested por categoría e índice | `src/plataforma/base/_persistencia/menu.repo.ts:181-188, 410-494` [1](../../../../src/plataforma/base/_persistencia/menu.repo.ts) | Hay compatibilidad dual y una deuda de consistencia que requiere migración o escrituras coordinadas |
| Estado compartido | Listeners centrales escuchan `menu/categorias` y `menu/productos` y alimentan el slice de operación | `src/plataforma/core/store/slices/operacion.ts:272-317` [2](../../../../src/plataforma/core/store/slices/operacion.ts) | Admin y Mesero deben conservar el payload que entra por el store; no se necesita un listener paralelo |
| Consumo Mesero | `useProductSelector` lee exclusivamente `useCategorias()` y `useProductos()` | `src/plataforma/dominios/marisqueria/mesero/useProductSelector.ts:22-28` [3](../../../../src/plataforma/dominios/marisqueria/mesero/useProductSelector.ts) | La visibilidad administrada llega al Mesero por el store central |
| Visibilidad de producto | Filtra `activo !== false` y `visible.mesero !== false` | `useProductSelector.ts:40-52` [3](../../../../src/plataforma/dominios/marisqueria/mesero/useProductSelector.ts) | La ausencia de `activo` o `visible.mesero` se interpreta como disponible/visible |
| Visibilidad de categoría | Filtra `activo !== false` y `herencia.mesero !== false` | `useProductSelector.ts:55-66` [3](../../../../src/plataforma/dominios/marisqueria/mesero/useProductSelector.ts) | La categoría tiene campos propios de disponibilidad que no deben confundirse con los del producto |
| Variantes | `VariantEditor` persiste grupos, opciones, obligatoriedad, modo, deltas, triggers y referencias de flujo | `src/catalogo/_compartido/bloques/VariantEditor.tsx`; `src/plataforma/base/_persistencia/menu.repo.ts:78-104` [1](../../../../src/plataforma/base/_persistencia/menu.repo.ts) | El contrato de variantes es compartido entre Administrador y Mesero |
| Reglas Mesero | `VariantsModal` usa `evaluateRules` y `getOrderedVisibleGroups` | `src/catalogo/_compartido/bloques/VariantsModal.tsx:116-183`; `src/plataforma/dominios/marisqueria/mesero/rules.ts:31-136` | Los cambios en reglas o tipos afectan directamente la operación del Mesero |

## 3. Hallazgos confirmados

### 3.1. La fuente activa del menú es el store centralizado

**Hecho.** El slice de operación establece que Firebase notifica, el listener actualiza el store y los componentes únicamente leen del store. Hay un listener para categorías y otro para productos bajo el tenant actual.

**Evidencia.** `operacion.ts:2-16, 272-317` [2](../../../../src/plataforma/core/store/slices/operacion.ts). El selector Mesero usa `useCategorias` y `useProductos` y no crea listeners propios [3](../../../../src/plataforma/dominios/marisqueria/mesero/useProductSelector.ts).

**Interpretación.** La abstracción `useSynchronizedArray` no es la ruta activa del catálogo. En la búsqueda realizada aparece asociada a borradores compartidos, no a `AdminMenuScreen`, `useMenuManagement`, `useProductSelector` ni `VariantsModal`.

**Decisión.** Modelo 4 no debe introducir una segunda sincronización para productos o categorías. Cualquier cambio de payload debe validarse primero contra el slice de operación y luego comunicarse al Modelo 1.

### 3.2. El contrato de disponibilidad tiene varias dimensiones

**Hecho.** El producto canónico incluye `activo`, `visible.digital`, `visible.mesero`, `visible.ventaCrudo`, preparación, receta, cocina y variantes [1]. El Mesero aplica `activo` y `visible.mesero`; la categoría aplica `activa` y `herencia.mesero` [3].

**Riesgo.** La pantalla administrativa puede mostrar controles correctos y aun así una modificación puede no producir el efecto esperado si se escribe el campo equivocado. `visible.digital` no controla el selector Mesero y `ventaCrudo` no forma parte del filtro observado.

**Acción comunicada.** El Modelo 1 debe conservar esta matriz de campos al validar su selector y sus pruebas. Modelo 4 debe evitar una unificación semántica que elimine la diferencia entre producto, categoría, Mesero, canal digital y venta de crudo.

### 3.3. La persistencia es dual y las mutaciones normales no son una sola operación

**Hecho.** `MenuRepository` lee y combina rutas flat y nested, mantiene `productos_index` y ejecuta auto-reparación al montar `useMenuManagement`. Crear, actualizar y eliminar realizan operaciones secuenciales en más de una ubicación; la auto-reparación sí acumula correcciones y las aplica mediante un `update` multiubicación [1].

**Riesgo.** Una falla entre dos operaciones secuenciales puede dejar flat, nested e índice en estados distintos. La lectura de `operacion.ts` escucha principalmente `menu/productos`, mientras `MenuRepository` conserva además la estructura nested. La auto-reparación reduce divergencias, pero su heurística puede priorizar nested cuando detecta variantes o diferencias de nombre.

**Decisión.** No se elimina ninguna ruta. El candidato de construcción es una estrategia explícita de migración o escritura coordinada, acompañada de pruebas de fallo parcial y de precedencia. Modelo 4 debe presentar su plan antes de modificar esta capa.

### 3.4. El editor guarda `nextGroupId`, pero el motor actual no lo usa para ordenar

**Hecho.** El editor permite persistir `nextGroupId` y el contrato lo declara. Sin embargo, `getOrderedVisibleGroups` devuelve las claves de `groups` en orden de inserción y solo filtra las ocultas; no recorre `nextGroupId` [1](../../../../src/plataforma/base/_persistencia/menu.repo.ts) [4](../../../../src/plataforma/dominios/marisqueria/mesero/rules.ts).

**Interpretación.** El panel puede aparentar que configuró un flujo de grupos, mientras Mesero presenta el orden de inserción. Este es un defecto de coherencia entre configuración administrativa y consumo operativo.

**Decisión.** El hallazgo se entrega a Modelo 4 como corrección de lógica, no como una decisión visual. Deben añadirse pruebas para orden explícito, fallback al orden de inserción, ciclos y referencias a grupos inexistentes. Modelo 1 debe ser notificado porque `rules.ts` y `VariantsModal.tsx` son piezas compartidas.

### 3.5. Los triggers de variantes sí tienen un motor de consumo, pero requieren pruebas de contrato

**Hecho.** `evaluateRules` aplica reglas explícitas de visibilidad y deshabilitado, triggers `showGroups`/`hideGroups` y exclusiones mutuas mediante `excludeFromSibling`. `VariantsModal` usa `disabledSet`, grupos visibles y obligatoriedad para controlar la interacción [4](../../../../src/plataforma/dominios/marisqueria/mesero/rules.ts) [5](../../../../src/catalogo/_compartido/bloques/VariantsModal.tsx).

**Riesgo.** El editor y el motor comparten nombres de propiedades, pero no existe en la línea base observada una prueba específica que cubra todos los casos combinados de whitelist, blacklist, `single`, `multi`, obligatoriedad y exclusión mutua.

**Acción siguiente.** Modelo 4 debe agregar pruebas unitarias del motor antes de simplificar el editor. No se debe convertir el payload a otra estructura hasta demostrar equivalencia.

### 3.6. El inventario de dependencias presenta drift, no evidencia suficiente para podar

**Hecho.** `src/dependency_inventory.json` lista rutas bajo `dominios/alimentos_y_bebidas` que no existen actualmente: `useProductSelector.ts`, `useVariantSelector.ts` y `mesero/procesarPedido.ts`. Las implementaciones actuales del selector están bajo `dominios/marisqueria/mesero`; `OrderList.tsx` importa desde la ruta actual.

**Interpretación.** Esto demuestra que el inventario está desactualizado. No demuestra que haya archivos muertos que puedan eliminarse.

**Decisión.** Modelo 4 debe actualizar el inventario y repetir la búsqueda de consumidores estáticos y dinámicos antes de cualquier poda. No se eliminó código.

## 4. Línea base de validación

| Validación | Resultado | Lectura correcta |
|---|---|---|
| Jest directo | **18 suites aprobadas; 113 pruebas aprobadas** | La línea base existente no reporta regresiones en las pruebas actuales |
| TypeScript directo | **Bloqueado por `TS6053`** | `tsconfig.json` incluye `expo-env.d.ts`, pero el archivo no existe en el checkout |
| Script `pnpm run check-types` | **No ejecutable en esta sesión** | El lifecycle de pnpm se detuvo por `ERR_PNPM_IGNORED_BUILDS`; no se usó como evidencia de errores de código |
| WEB | **Pendiente de prueba funcional** | El código compartido está presente, pero no se validó la interacción en navegador |
| Android | **Pendiente de prueba funcional** | El código compartido está presente, pero no se validó la interacción en dispositivo/emulador |
| Flujo Admin→Mesero | **Mapeado; no validado end-to-end** | Falta ejecutar modificación de disponibilidad, propagación y operación en ambas plataformas |

La ausencia de `expo-env.d.ts` debe resolverse de forma explícita por Modelo 4 o por la persona responsable del entorno. No se creó el archivo durante la auditoría para evitar convertir un bloqueo de checkout en una modificación no aprobada.

## 5. Comunicación formal al equipo Mesero / Modelo 1

El mensaje operativo es el siguiente:

> **Modelo 2 comunica al Modelo 1:** El selector real del Mesero consume el store centralizado. Los productos se filtran por `categoriaId`, `activo !== false` y `visible.mesero !== false`; las categorías se filtran por `activo !== false` y `herencia.mesero !== false`. El Administrador y Modelo 4 deben preservar estos campos y rutas. Las variantes se consumen desde `producto.variantes.grupos` y `producto.variantes.reglas`. El motor actual aplica triggers y exclusiones, pero el orden configurado por `nextGroupId` no se respeta todavía: `rules.ts` usa el orden de las claves. Cualquier cambio en `rules.ts`, `VariantsModal.tsx` o el payload de variantes requiere validación cruzada antes de aceptarse.

Este mensaje queda registrado en `modelo_2.md` y debe ser leído antes de validar cambios del selector, modal o sincronización del equipo Mesero.

## 6. Plan de trabajo entregado a Modelo 4

| Prioridad | Trabajo propuesto | Archivos de referencia | Criterio de aceptación |
|---|---|---|---|
| P0 | Presentar plan de refactor antes de tocar persistencia o tipos compartidos | `menu.repo.ts`, `operacion.ts`, `contratos.ts` | El plan identifica consumidores, rutas y compatibilidad WEB/Android |
| P0 | Corregir o formalizar el uso de `nextGroupId` | `rules.ts`, `VariantsModal.tsx`, `VariantEditor.tsx` | Pruebas de orden explícito, fallback, ciclo y grupo inexistente |
| P0 | Definir la fuente de verdad de flat/nested/index | `menu.repo.ts` | Pruebas de lectura, escritura, fallo parcial y reparación |
| P1 | Unificar/adaptar contratos sin perder campos operativos | `menu.repo.ts`, `operacion.ts`, `contratos.ts` | Adaptadores o tipos centrales cubren visibilidad, variantes, receta y cocina |
| P1 | Actualizar `dependency_inventory.json` | `src/dependency_inventory.json` | No quedan rutas inventariadas que no existan, o quedan justificadas |
| P1 | Agregar pruebas de contrato de variantes y visibilidad | `rules.ts`, selector Mesero y repositorio | La configuración del Admin produce el mismo comportamiento en Mesero |
| P2 | Resolver el bloqueo `expo-env.d.ts` | `tsconfig.json` y configuración Expo | `tsc --noEmit` reproducible desde un checkout limpio |
| P2 | Verificar WEB y Android de forma independiente | Rutas y pantallas compartidas | El flujo Admin→Mesero funciona sin desbordes ni regresiones táctiles |

## 7. Archivos creados y archivos no modificados

Se creó únicamente la comunicación aislada de esta sesión:

```text
comunicacion_multimodelo/
└── sesiones/
    └── 2026-08-16_menu_mesero_overhaul/
        ├── modelo_2.md
        └── reporte_modelo_2.md
```

No se modificaron archivos de aplicación, tipos, repositorios, listeners, rutas ni componentes. No se hizo commit porque en esta sesión solo se consolidó la investigación y no existe un cambio de producto listo para validar como commit funcional. La única modificación deliberada pendiente de revisión es la bitácora oficial y este reporte operativo.

## 8. Pendientes y criterio de cierre

La investigación de Modelo 2 queda lista para la fase de construcción condicionada a que Modelo 4 entregue un plan técnico que respete el contrato Admin→Mesero. Quedan pendientes la ejecución funcional WEB/Android, la validación end-to-end de disponibilidad, la resolución reproducible del `expo-env.d.ts`, la decisión sobre flat/nested/index y las pruebas de orden y triggers de variantes.

La sesión no debe marcarse como **RESUELTA** porque aún no se ha construido ni validado una corrección. El estado correcto es **MAPEADO / DETECTADO / COMUNICADO / ESPERANDO CONSTRUCCIÓN**.

## Referencias locales

[1]: ../../../../src/plataforma/base/_persistencia/menu.repo.ts "Repositorio y contratos canónicos del menú"
[2]: ../../../../src/plataforma/core/store/slices/operacion.ts "Slice de operación y listeners centralizados"
[3]: ../../../../src/plataforma/dominios/marisqueria/mesero/useProductSelector.ts "Selector real del menú en Mesero"
[4]: ../../../../src/plataforma/dominios/marisqueria/mesero/rules.ts "Motor de reglas y orden de grupos de variantes"
[5]: ../../../../src/catalogo/_compartido/bloques/VariantsModal.tsx "Modal compartido de selección de variantes"
