# Informe — M2 / Tarea T-M2-01

| Campo | Valor |
|---|---|
| Agente | M2 |
| Tarea | T-M2-01 |
| Sesión | `2026-08-25_admin_menu` |
| Fecha/hora UTC | `2026-08-26 05:28` |
| Estado | REPORTADA |
| Commits | `HEAD` al cierre (mensaje: `docs(multimodelo/M2): comparación histórica y esquema RTDB menú`) |
| Archivos creados/modificados | `M2/informe.md`, `M2/estado.md`, `M2/procesado.json` |

## 1. Resumen ejecutivo

Se comparó el territorio Menú solicitado entre `rama-2` y `origin/manus/administracion-menu`, sin modificar código ni hacer checkout destructivo. La comparación acotada produjo **22 archivos creados en la ruta actual y 6.273 líneas añadidas**, porque la rama histórica usa rutas anteriores; no se observó una eliminación funcional directa dentro del alcance, sino un refactor con renombres, reubicaciones y piezas nuevas.

También se inspeccionó `rtdb_actualizada.json`. El nodo real no tiene una única forma por comercio: `__plantilla_base` conserva `categorias_menu`, `el-arrecife` usa categorías anidadas más `productos` planos e índice, `marisqueria-la-perla-del-pueblo` solo muestra categorías, y `marisqueria-puerto-libres` usa categorías anidadas más productos planos e índice. Se documentan abajo los campos observados y ejemplos reales.

## 2. Hechos confirmados

### 2.1 Comparación histórica del territorio Menú

La referencia histórica existe como `origin/manus/administracion-menu` y la rama operativa quedó en `rama-2`, conforme a `AGENTS.md` y al manifiesto de la sesión. La comparación se ejecutó con `git diff --stat origin/manus/administracion-menu..rama-2 -- <rutas del alcance>` y `git diff --name-status` sobre las rutas de la instrucción.

| Archivo o territorio | Estado en `rama-2` | Estado en `origin/manus/administracion-menu` | Notas de la discrepancia |
|---|---|---|---|
| `src/ui/roles/administrador/menu/PantallaMenuAdmin.tsx` | **A**, 1.063 líneas | Equivalente histórico en `src/plataforma/dominios/marisqueria/administracion/menu/AdminMenuScreen.tsx`, 1.032 líneas | Renombre de pantalla y reubicación. La versión actual agrega adaptación de formulario, defaults de `activo`/`visible.ventaCrudo`, pestañas de variantes/receta y nuevas rutas de importación. |
| `src/ui/roles/administrador/menu/bloques/BarraCategorias.tsx` | **A**, 333 líneas | Equivalente en `.../menu/CategorySidebar.tsx`, 333 líneas | Traslado y renombrado al español; cambia el texto de canal «Venta y Crudo» a «Mostrador». |
| `src/ui/roles/administrador/menu/bloques/TarjetaProducto.tsx` | **A**, 277 líneas | Equivalente en `.../menu/ProductCard.tsx`, 277 líneas | Traslado, renombrado y actualización de tipos/rutas. |
| `src/ui/roles/administrador/menu/editores/EditorReceta.tsx` | **A**, 426 líneas | Equivalente en `src/catalogo/_compartido/bloques/RecipeEditor.tsx`, 426 líneas | El path solicitado `src/ui/bloques/RecipeEditor.tsx` no existe actualmente; la pieza está bajo `roles/administrador/menu/editores`. El contenido pareado solo cambia imports y nombres públicos. |
| `src/ui/roles/administrador/menu/editores/EditorVariantes.tsx` | **A**, 841 líneas | Equivalente en `src/catalogo/_compartido/bloques/VariantEditor.tsx`, 826 líneas | El path solicitado `src/ui/bloques/VariantEditor.tsx` no existe actualmente. Se añaden normalización de visibilidad, memoización de grupos, primer grupo expandido y componentes renombrados. |
| `src/ui/bloques/VariantsModal.tsx` | **A**, 840 líneas | `src/catalogo/_compartido/bloques/VariantsModal.tsx`, 734 líneas | Traslado de catálogo a UI compartida; se añaden tema, safe area, accesibilidad, haptics y ajustes de navegación/animación. |
| `src/ui/bloques/ProductPickerOverlay.tsx` | **A**, 410 líneas | `src/catalogo/_compartido/bloques/ProductPickerOverlay.tsx` | Traslado con rediseño responsivo, tema, safe area, accesibilidad y feedback háptico. |
| `src/ui/bloques/menu/MenuLayout.tsx` | **A**, 95 líneas | `src/catalogo/_compartido/bloques/menu/MenuLayout.tsx`, 95 líneas | Contenido pareado sin diferencias relevantes; cambia la ubicación de la pieza. |
| `src/ui/bloques/productos/` | **A**: `MallaProductos.tsx` y prueba | No se encontró equivalente con esos nombres | Piezas nuevas de composición/listado y cobertura de prueba dentro del territorio actual. |
| `src/ui/primitivos/productos/` | **A**: `ControlCantidad`, `EtiquetaPrecio`, `InsigniaEstado`, `TarjetaBase` y prueba | No se encontró equivalente con esos nombres | Nueva capa de primitivos de producto y pruebas asociadas. |
| `src/capacidades/menu/` | **A**: `index.ts` y `useGestionMenu.ts`, 423 líneas | Equivalente funcional en `src/plataforma/dominios/alimentos_y_bebidas/useMenuManagement.ts`, 423 líneas | Refactor de dominio a capacidades. Mantiene CRUD y self-healing, cambia imports/nombres y queda integrado con `src/sistema`. |
| `src/capacidades/admin/menuSafety.ts` | **A**, 21 líneas | `src/plataforma/dominios/alimentos_y_bebidas/menuSafety.ts`, 21 líneas | Contenido pareado sin diferencias relevantes; traslado de dominio a capacidades administrativas. |
| `src/capacidades/admin/useAdminTools.ts` | **A**, 77 líneas | `src/plataforma/dominios/alimentos_y_bebidas/useAdminTools.ts`, 77 líneas | El diff pareado solo muestra el cambio de import de `MenuRepository`; conserva la herramienta de reparación de recetas. |
| `src/sistema/persistencia/menu.repo.ts` | **A**, 616 líneas | `src/plataforma/base/_persistencia/menu.repo.ts`, 594 líneas | Traslado al sistema de persistencia y ampliación del contrato: guards de tenant/payload, alias de etiquetas de variante, sanitización en escrituras y tipos operativos. |

En conjunto, el diff acotado reportó únicamente estados `A` porque las rutas actuales y las históricas no comparten el mismo path. Esto **no demuestra que las piezas históricas hayan desaparecido funcionalmente**: los pares indicados muestran equivalentes trasladados. Las piezas sin equivalente identificado son las nuevas capas de productos/primativos y `ProductPickerOverlay` no tiene un equivalente en la misma ruta, aunque sí existe una pieza histórica con el mismo nombre bajo catálogo.

Los conceptos funcionales que aparecen o quedan reforzados en `rama-2` son la separación de la pantalla administrativa en bloques y editores, la nomenclatura en español, el canal `ventaCrudo` dentro de visibilidad, la configuración de cocina por categoría/producto, la validación de recetas contra inventario, la compatibilidad de datos anidados y planos y la reparación de integridad entre ambas representaciones. En `useGestionMenu.ts:130-206` se calcula validez, errores, advertencias, capacidad e ingrediente limitante de una receta; en `useGestionMenu.ts:256-356` esa validación participa en creación y actualización de productos. En `menu.repo.ts:149-202` se documenta la lectura dual y los paths de `categorias`, `productos` y `productos_index`; en `menu.repo.ts:427-445` se escriben las tres representaciones; y en `menu.repo.ts:535-615` se reconcilian discrepancias entre flat y nested.

### 2.2 Esquema real observado en RTDB

El inventario se obtuvo del nodo `marisquerias/*/menu/` de `rtdb_actualizada.json`. Se observaron cinco registros de categoría, 23 registros de producto en los nodos planos y 11 registros en `productos_index`, agregando los comercios que contienen esas secciones. Las cifras cuentan registros de los nodos planos y no suman de nuevo los productos anidados como entidades distintas.

| Comercio | Forma observada de `menu` | Evidencia |
|---|---|---|
| `__plantilla_base` | `categorias_menu: {}` y `productos: {}`; no presenta `categorias` ni `productos_index` en el bloque observado | `rtdb_actualizada.json:16` |
| `el-arrecife` | `categorias`, `productos` y `productos_index`; cada categoría contiene además `productos` anidados | `rtdb_actualizada.json:425-526` |
| `marisqueria-la-perla-del-pueblo` | Solo `categorias`, con una categoría sin productos en el bloque observado | `rtdb_actualizada.json:1303-1313` |
| `marisqueria-puerto-libres` | `categorias`, productos anidados por categoría, `productos` planos y `productos_index` | `rtdb_actualizada.json:1799-1851`, `rtdb_actualizada.json:3714-3767` |

#### Campos de categoría

| Campo observado | Ejemplo real | Interpretación limitada a la evidencia |
|---|---|---|
| Clave de categoría | `-OhSV8b8Yg59A8coTbiO` | Identificador RTDB de categoría; `catBebidas` y `catPlatillos` son otros ejemplos. |
| `activa` | `true` | Estado activo de la categoría; `el-arrecife` lo muestra en `rtdb_actualizada.json:428`. |
| `enviarACocina` | `false` en `Crudo`; `true` en `Platillos` | Política de envío a cocina a nivel categoría, observada en `rtdb_actualizada.json:429` y `:460`. |
| `herencia.digital` | `false` | Herencia de visibilidad para nuevos productos; `rtdb_actualizada.json:430-434`. |
| `herencia.mesero` | `false` | Segundo canal de herencia; `rtdb_actualizada.json:430-434`. |
| `herencia.ventaCrudo` | `true` | Canal adicional de herencia observado en `Crudo`; `rtdb_actualizada.json:430-434`. No aparece en todas las categorías. |
| `nombre` | `Crudo` | Nombre legible; también `Bebidas y Postres` en `rtdb_actualizada.json:1801-1804`. |
| `productos` | `{ "-OhSVDTmsQaQSh1DKq-M": { ... } }` | Mapa nested de productos por categoría; aparece en `rtdb_actualizada.json:436-453` y `:1805-1851`. |
| `saltarPreparando` | `false` | Política de flujo de cocina de la categoría; `rtdb_actualizada.json:455`. |
| `slug` | `crudo` | Identificador legible/normalizado; `rtdb_actualizada.json:456`. |

No se observó `orden` en los registros de categoría inspeccionados, aunque el tipo de TypeScript lo permite. La ausencia en este snapshot no prueba que el campo no exista en otras cargas.

#### Campos de producto

Los siguientes campos aparecen en productos anidados y/o planos. La clave del registro funciona como `id`; por ejemplo, `boing-1753220050777` y `coctel-1`.

| Campo observado | Ejemplo real | Evidencia y nota |
|---|---|---|
| `activo` | `true` | Producto `BOING`, `rtdb_actualizada.json:1806-1810`. |
| `categoriaId` | `catBebidas` | Relación producto-categoría, `rtdb_actualizada.json:1807-1808`. |
| `enviarACocina` | `true` en `BOING` | Override de cocina a nivel producto, `rtdb_actualizada.json:1809`. No es universal. |
| `nombre` | `BOING` | Nombre legible, `rtdb_actualizada.json:1810`. |
| `precio` | `25` | Precio numérico, `rtdb_actualizada.json:1811`. |
| `prepMin` | `0` | Minutos de preparación, `rtdb_actualizada.json:1812`. |
| `receta.ingredientes` | `{ "crema-13": 0.08, "durazno-15": 0.15 }` | Receta de `Duraznos con Crema`, `rtdb_actualizada.json:1929-1943`; las claves apuntan a insumos y los valores son cantidades. |
| `saltarPreparando` | `false` | Ejemplo en `BOING`, `rtdb_actualizada.json:1813`. |
| `slug` | `boing` | Slug del producto, `rtdb_actualizada.json:1814`. |
| `unidad` | `pza` | Unidad de `Botella de Agua`, `rtdb_actualizada.json:1853-1863`; también se observa `kg` en `Camaron`. |
| `usarConfigPersonalizada` | `false` | Indica configuración de cocina propia frente a herencia; `rtdb_actualizada.json:1815`. `Caldo de 🐓` muestra `true` en `:477`. |
| `variantes.grupos` | `gSab` con `obligatorio: true`, `rol: "Sabor"`, `tipo: "single"`, `titulo: "Sabor"` | Producto `BOING`, `rtdb_actualizada.json:1816-1846`. |
| `variantes.grupos.*.opciones` | `oDur: { "delta": 0, "titulo": "Durazno" }` | Opciones de la variante, `rtdb_actualizada.json:1820-1824`. |
| `variantes.grupos.*.obligatorio` | `true` | Obligación del grupo `gSab`, `rtdb_actualizada.json:1818-1819`; también existen grupos `false`. |
| `variantes.grupos.*.rol` | `Sabor` | Rol legible del grupo, `rtdb_actualizada.json:1842`. |
| `variantes.grupos.*.tipo` | `single` y `multi` | `single` en `gSab`, `rtdb_actualizada.json:1843`; `multi` en `gSN` de `Coctel`, `rtdb_actualizada.json:2345-2347`. |
| `variantes.grupos.*.titulo` | `Sabor` | Título del grupo, `rtdb_actualizada.json:1844`. |
| `variantes.reglas.visible` | `r1.showGroups.gSN: true`, condicionado por `whenGroup: "gTip"`, `whenOpt: "oCam"` | Regla de visibilidad de `Coctel`, `rtdb_actualizada.json:2406-2416`. |
| `visible.digital` | `false` en `BOING`; `true` en `Coctel` | Canal digital; `rtdb_actualizada.json:1848-1851` y `:2418-2421`. |
| `visible.mesero` | `true` | Canal mesero en `BOING`, `rtdb_actualizada.json:1848-1851`. |
| `visible.ventaCrudo` | `true` en `Camaron` de `el-arrecife` | Canal adicional que no está presente en todos los productos; `rtdb_actualizada.json:448-452`. |

También se observaron extensiones de grupo `nextGroupId` y `excludeFromSibling` en productos concretos y opciones sin `delta` explícito. El tipo actual de persistencia tolera además `label`, `nombre` y `titulo` para etiquetas de opciones (`src/sistema/persistencia/menu.repo.ts:88-109`), pero en los ejemplos RTDB revisados la forma efectiva usa principalmente `titulo`.

#### Campos de `productos_index`

`productos_index` es un mapa separado y más pequeño que el producto completo. Su forma observada es la siguiente.

| Campo | Ejemplo real | Evidencia |
|---|---|---|
| Clave de producto | `boing-1753220050777` | `rtdb_actualizada.json:3715`. |
| `catId` | `catBebidas` | `rtdb_actualizada.json:3716`. |
| `nombre` | `BOING` | `rtdb_actualizada.json:3717`. |
| `precio` | `25` | `rtdb_actualizada.json:3718`. |
| `slug` | `boing` | `rtdb_actualizada.json:3719`. |
| `hasReceta` | `true` en los índices de `el-arrecife` | `rtdb_actualizada.json:523-536`; no aparece en las entradas de `marisqueria-puerto-libres` visibles en `:3714-3767`. |

La diferencia de `hasReceta` entre índices es una **inconsistencia observada del snapshot**, no una conclusión de que el índice esté roto: debe confirmarse contra reglas, escrituras y datos de producción antes de corregirla.

## 3. Hipótesis y límites de certeza

La lectura conjunta de rutas y contenido hace plausible que `rama-2` sea una reestructuración del módulo histórico, no una implementación completamente independiente: varios pares conservan el mismo número de líneas o cambios concentrados en imports y nombres. Esto es una inferencia de comparación estática; no se verificó la historia de migración funcional ni el comportamiento en ejecución.

`menu.repo.ts` denomina la representación anidada como «canonical» y la plana como «compat», pero la RTDB contiene ambas en algunos comercios. El informe puede afirmar que el código implementa lectura/escritura dual y reparación, pero no puede afirmar qué representación prevalece en todos los entornos desplegados. Del mismo modo, que `marisqueria-la-perla-del-pueblo` tenga solo categorías puede ser un comercio realmente vacío o un snapshot parcial; no se asume que falten productos por error.

La comparación fue de lectura contra referencias Git y un archivo JSON local. No se consultó Firebase en vivo ni se realizaron escrituras, por lo que no se validó la sincronización efectiva entre nodos ni la ejecución de los hooks en dispositivo.

## 4. Movimientos realizados

| Pieza | Origen | Transformación | Destino | Por qué | Hora UTC |
|---|---|---|---|---|---|
| Código y datos de la aplicación | No aplica | Ninguna; solo lectura | No aplica | La instrucción autorizó únicamente observación | 2026-08-26 05:23–05:28 |
| Informe y trazabilidad de M2 | Estado e informe previos de M2 | Registro de recepción, hallazgos y sello procesado | `docs/comunicacion_multimodelo/sesiones/2026-08-25_admin_menu/M2/` | Entrega exigida por el protocolo 02 | 2026-08-26 05:28 |

No hubo movimiento funcional, migración ni modificación de código; por tanto, no se requiere `MIGRACION.md` para esta tarea.

## 5. Validaciones ejecutadas

| Validación | Resultado |
|---|---|
| `git fetch origin` | Correcto. |
| `git checkout rama-2` y `git pull --rebase` | Correcto; rama alineada con `origin/rama-2` al iniciar el análisis. |
| Existencia de `origin/manus/administracion-menu` | Confirmada. |
| `git diff --stat` y `git diff --name-status` sobre el alcance | 22 rutas con estado `A`, 6.273 líneas añadidas; se verificaron equivalentes históricos por nombre y contenido. |
| Parseo estructural de `rtdb_actualizada.json` | Correcto; se agregaron categorías, productos planos e índices por comercio. |
| Restricción de escritura | Cumplida: no se modificó código, `CENTRAL/`, `EVENTOS.json`, `MANIFIESTO.md` ni carpetas de otros agentes. |
| `git status --short --branch` antes de la entrega | Solo cambios dentro de `M2/`; sin cambios de otros agentes. |

No se ejecutaron `npx tsc --noEmit`, `npm test` ni lint focal porque la tarea fue exclusivamente de lectura y documentación y no modificó código funcional.

## 6. Bloqueos y necesidades fuera de alcance

No hay bloqueo para la entrega. Queda fuera de alcance confirmar el estado de Firebase en vivo, decidir la fuente canónica definitiva del menú, corregir la variabilidad de `productos_index.hasReceta` o modificar los adaptadores de persistencia.

## 7. Pendientes para otros procesos

El orquestador debe decidir si la reubicación de las piezas históricas se considera ya absorbida por la arquitectura de `rama-2` y si los paths indicados en la instrucción (`src/ui/bloques/RecipeEditor.tsx` y `VariantEditor.tsx`) deben actualizarse en la documentación operativa. También conviene revisar explícitamente la coexistencia flat/nested y la ausencia de `hasReceta` en los índices de `marisqueria-puerto-libres` antes de cualquier migración.

## 8. Propuestas

Como propuesta no ejecutada, mantener una matriz de compatibilidad que distinga campos observados, campos opcionales tolerados por TypeScript y campos derivados del índice. Antes de una limpieza de datos, convendría comparar esa matriz con reglas RTDB y una exportación reciente de cada tenant, especialmente para `visible.ventaCrudo`, `herencia`, `variantes` y `hasReceta`.
