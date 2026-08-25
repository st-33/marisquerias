# Desfragmentación: módulo Métricas y Datos (rol Administrador)

**Fecha y hora:** 2026-08-25 05:27 CST (documentación del resultado; los movimientos
se ejecutaron en la misma sesión de trabajo, commit sin publicar al cierre del registro).

**Ámbito:** arquitectura Roles → Administrador → Métricas y Datos.
**Territorio intervenido:** solo el módulo Métricas y Datos del rol Administrador.
**Contexto:** ecosistema modular de negocio local (Marisquerías), configuración por tenant
y capacidades activables vía RTDB.

---

## 1. Qué era realmente el bloque (mapa inicial por capas)

### 1.1. Capa visual

- `src/ui/roles/administrador/metricas/AdminDashboardScreen.tsx` (963 líneas):
  pantalla del panel con subcomponente interno `MetricCard`, filtros de período duplicados
  (variante móvil/escritorio), secciones de alertas, predicciones y 3 gráficas.
- `src/ui/roles/administrador/metricas/RegistroVentasDia.tsx`: componente del registro
  de ventas del día.
- Registro de pantalla: `src/composicion/registroPantallas.ts` (clave `admin_dashboard`),
  ruta Expo Router `app/_role/admin/dashboard.tsx` → resolvedor de pantallas.

### 1.2. Capa de código y lógica

Fragmentada en dos capacidades:

- `src/capacidades/metricas/`: `useAdminLogic.ts`, `useAdminMetrics.ts`,
  `useRegistroVentasDelDia.ts`, `metricasVendedores.ts`, `index.ts`,
  `__tests__/useAdminMetrics.test.ts` (que en realidad probaba `metricasVendedores`).
- `src/capacidades/admin/`: `analitica/usePrediccionStock.ts` y
  `useAlertasInteligentes.ts`, consumidas **exclusivamente** por la pantalla del módulo.
- Ciclo de tipos entre ambas: `useAdminLogic` (metricas) definía `TenantFeatures`,
  que importaba `useAdminFeatures` (admin); y `useAdminFeatures` importaba ese tipo
  desde metricas.
- Gráficas en `src/compartido/componentes/charts/` (5 archivos) cuyo único consumidor
  era la pantalla del módulo; `ChartCard.tsx` y `chartTheme.ts` sin ningún consumidor
  (huérfanas).

### 1.3. Capa RTDB (mecanismo de activación)

- Autoridad de flags: `marisquerias/<tenant>/caracteristicas/roles/admin`
  (bool o objeto con `dashboard`, `menu`, `inventario`, `mesas`, `dispositivos`,
  `repart`, `mostrador`, `menu_add_category`) más flags planos
  `module_venta_crudo`, `fastbutton_venta_crudo`, `menu_editor_venta_crudo`.
- Verificado en `rtdb_actualizada.json` (tenant `el-arrecife`, `marisqueria-puerto-libres`…).
- `admin_dashboard` es el gate del módulo completo. La interpretación vive en
  `normalizarFeaturesAdmin` (capacidad admin compartida) — no se duplicó lógica de
  activación dentro del módulo.

### 1.4. Flujo de usuario

`app/_role/admin/index.tsx` (usa `useAdminFeatures`) → redirige a
`/_role/admin/dashboard` → `app/_role/admin/dashboard.tsx` → resolvedor
(`registroPantallas`, clave `admin_dashboard`) → pantalla del módulo.

**Observación pendiente (no intervenida):** las entradas de navegación admin están
definidas dos veces: en `app/_role/admin/index.tsx` y en el FAB de la pantalla del
módulo. Su unificación pertenece al proceso del rol Administrador completo, no a este módulo.

---

## 2. Registro de transformaciones

Plantilla por pieza: origen → estado anterior → transformación → destino → relaciones
afectadas → dependencias pendientes.

### 2.1. Lógica del módulo (reunión y renombrado)

| # | Origen | Transformación | Destino |
|---|---|---|---|
| 1 | `src/capacidades/admin/analitica/usePrediccionStock.ts` | Movido (solo lo consumía este módulo). Se reajustó el import del store | `src/capacidades/metricas/analitica/usePrediccionStock.ts` |
| 2 | `src/capacidades/admin/useAlertasInteligentes.ts` | Movido (solo lo consumía este módulo). Import de `usePrediccionStock` ahora relativo al mismo directorio | `src/capacidades/metricas/analitica/useAlertasInteligentes.ts` |
| 3 | `src/capacidades/metricas/useAdminLogic.ts` | Renombrado a `useLogicaMetricas`; eliminado el tipo `TenantFeatures` (trasladado a `useAdminFeatures.ts`) para romper el ciclo de tipos | `src/capacidades/metricas/useLogicaMetricas.ts` |
| 4 | `src/capacidades/metricas/useAdminMetrics.ts` | Renombrado a `useMetricasVentas` | `src/capacidades/metricas/useMetricasVentas.ts` |
| 5 | `src/capacidades/metricas/__tests__/useAdminMetrics.test.ts` | Renombrado; el nombre ahora refleja su sujeto real (`acumularVendedorSeguro`) | `src/capacidades/metricas/__tests__/metricasVendedores.test.ts` |
| 6 | `src/capacidades/admin/useAdminFeatures.ts` | Hogar del tipo `TenantFeatures`; se eliminó su import desde metricas (ciclo roto). Sin cambios de comportamiento | Sin cambio de ruta |
| 7 | `src/capacidades/admin/index.ts` | Barril reducido: ya no reexporta analitica ni alertas; conserva piezas compartidas del rol admin | Sin cambio de ruta |
| 8 | `src/capacidades/metricas/index.ts` | Barril del módulo: exporta lógica + analitica | Sin cambio de ruta |

### 2.2. Capa visual (reunión, extracción y renombrado)

| # | Origen | Transformación | Destino |
|---|---|---|---|
| 9 | `src/compartido/componentes/charts/SalesLineChart.tsx` | Movido y renombrado a `GraficaVentasTiempo`; import del tema reajustado | `src/ui/roles/administrador/metricas/graficas/GraficaVentasTiempo.tsx` |
| 10 | `src/compartido/componentes/charts/SalesDistributionPieChart.tsx` | Movido y renombrado a `GraficaDistribucionVentas` | `src/ui/roles/administrador/metricas/graficas/GraficaDistribucionVentas.tsx` |
| 11 | `src/compartido/componentes/charts/TopProductsBarChart.tsx` | Movido y renombrado a `GraficaTopProductos`; import del tema reajustado | `src/ui/roles/administrador/metricas/graficas/GraficaTopProductos.tsx` |
| 12 | `src/compartido/componentes/charts/ChartCard.tsx` | **Eliminado** (sin ningún consumidor en el proyecto; la pantalla usa su propio contenedor) | — |
| 13 | `src/compartido/componentes/charts/chartTheme.ts` | **Eliminado** (sin ningún consumidor en el proyecto) | — |
| 14 | `src/ui/roles/administrador/metricas/AdminDashboardScreen.tsx` | Renombrada a `PantallaMetricasDatos`; extraídos sus subcomponentes internos (963 → ~490 líneas); eliminados estilos muertos (`salesKpi*`) y los fallbacks defensivos de predicción que ya no existen en el contrato `PrediccionPlatillo` (`estadoStock`, `platilloId`, `nombrePlatillo`, `promedioDiario`, `diasRestantes`, `fechaRecompraSugerida`) | `src/ui/roles/administrador/metricas/PantallaMetricasDatos.tsx` |
| 15 | `MetricCard` (interno de la pantalla) | Extraído y renombrado a `TarjetaMetrica` | `src/ui/roles/administrador/metricas/componentes/TarjetaMetrica.tsx` |
| 16 | Filtros de período duplicados (móvil/escritorio) | Extraídos y unificados en `FiltroPeriodo` (una sola definición, variante interna móvil) | `src/ui/roles/administrador/metricas/componentes/FiltroPeriodo.tsx` |
| 17 | Sección de alertas (JSX interno) | Extraída a `SeccionAlertas` | `src/ui/roles/administrador/metricas/componentes/SeccionAlertas.tsx` |
| 18 | Sección de predicciones (JSX interno + mapeos de estado) | Extraída a `SeccionPredicciones` + `TarjetaPrediccion` (tipada contra `PrediccionPlatillo`) | `src/ui/roles/administrador/metricas/componentes/SeccionPredicciones.tsx` y `TarjetaPrediccion.tsx` |
| 19 | Bloque de gráfica duplicado 3 veces (tarjeta + encabezado) | Extraído a `SeccionGrafica` | `src/ui/roles/administrador/metricas/componentes/SeccionGrafica.tsx` |
| 20 | Encabezados de sección y estados vacíos | Extraídos a `EncabezadoSeccion` y `VistaSinDatos` | `src/ui/roles/administrador/metricas/componentes/` |
| 21 | `src/composicion/registroPantallas.ts` | Actualizado el import de la pantalla (`PantallaMetricasDatos`); la clave `admin_dashboard` y la ruta no cambian | Sin cambio de ruta |

### 2.3. Piezas compartidas observadas (no reorganizadas)

| Pieza | Consumidores reales | Decisión |
|---|---|---|
| `capacidades/admin/useAdminFeatures` | índice admin, módulo Métricas y Datos, Mostrador admin | Compartida por el rol Admin; permanece. Ahora es hogar de `TenantFeatures` |
| `capacidades/admin/operacion/usePuenteAccionesFlotantes` | Métricas, PanelInventario, pantalla Mesas | Compartida; permanece |
| `capacidades/admin/menuSafety` | `useAdminFeatures` y `capacidades/menu` | Compartida; permanece |
| `capacidades/admin/useAdminTools` | sin consumidores (herramienta de reparación de menú) | Fuera del territorio de este módulo; queda para el proceso de la capacidad admin |
| `sistema/persistencia/registroVentas.repo.ts` | módulo (lectura del día), mostrador, pedidos | Infraestructura de persistencia compartida; permanece |
| `sistema/store` y `slices/inventoryV2` (`PrediccionPlatillo`) | módulo + resto del sistema | Infraestructura; permanece |
| `logica/dominio/normalizers`, `AdminLayout`, `AtmosphereLayer`, hooks de notificación, `logger` | varios | Infraestructura/compartido; permanece |

---

## 3. Estructura resultante

```
src/capacidades/metricas/                  ← lógica del módulo (reunida)
    index.ts
    useLogicaMetricas.ts                   ← composición: features + métricas + período
    useMetricasVentas.ts                   ← cálculo de métricas de ventas desde el store
    useRegistroVentasDelDia.ts             ← registro de ventas del día (persistencia)
    metricasVendedores.ts                  ← resúmenes por vendedor (acumulación segura)
    analitica/
        usePrediccionStock.ts              ← predicción de reabastecimiento
        useAlertasInteligentes.ts          ← alertas derivadas de predicciones
    __tests__/
        metricasVendedores.test.ts

src/ui/roles/administrador/metricas/       ← capa visual del módulo
    PantallaMetricasDatos.tsx              ← composición del panel
    RegistroVentasDia.tsx                  ← registro de ventas del día
    componentes/
        EncabezadoSeccion.tsx
        FiltroPeriodo.tsx
        SeccionAlertas.tsx
        SeccionGrafica.tsx
        SeccionPredicciones.tsx
        TarjetaMetrica.tsx
        TarjetaPrediccion.tsx
        VistaSinDatos.tsx
    graficas/
        GraficaDistribucionVentas.tsx
        GraficaTopProductos.tsx
        GraficaVentasTiempo.tsx

src/capacidades/admin/                    ← capacidad admin compartida (solo restos relevantes)
    index.ts                               ← ya sin exports del módulo Métricas y Datos
    useAdminFeatures.ts                    ← hogar de TenantFeatures
    operacion/usePuenteAccionesFlotantes.ts
    menuSafety.ts · useAdminTools.ts
```

## 4. Relaciones reconstruidas

- La pantalla importa toda la lógica desde `capacidades/metricas` y solo las piezas
  compartidas (`usePuenteAccionesFlotantes`) desde `capacidades/admin`.
- `useLogicaMetricas` → `useAdminFeatures` (tipo + hook) sin ciclo.
- `useAlertasInteligentes` → `usePrediccionStock` (mismo directorio `analitica/`).
- `TarjetaPrediccion` tipada contra `PrediccionPlatillo` (store `inventoryV2`);
  se eliminaron los campos defensivos inexistentes en el contrato.
- Los componentes internos se tipan contra los contratos del módulo
  (`DateFilter`, `AlertaInteligente`, `PrediccionPlatillo`) vía `capacidades/metricas`.

## 5. Conexiones pendientes de otros procesos

- Unificar la navegación admin duplicada (`app/_role/admin/index.tsx` vs FAB del módulo).
- Decidir el destino de `capacidades/admin/useAdminTools` (sin consumidores).
- Los tests raíz de `capacidades/admin` (`menuSafety.test.ts`, `useFeatureFlag.test.ts`)
  están fuera del patrón de jest (`__tests__`/`pruebas`), condición preexistente.
- La auditoría visual (docs/auditorias) marcaba la pantalla como P2 extensa; esta
  desfragmentación la redujo de 963 a ~490 líneas.

## 6. Evidencia de verificación

- `npx tsc --noEmit` → 0 errores.
- `npm test` → 21 suites, 114 pruebas, todas en verde
  (incluye `metricasVendedores.test.ts` y `useAdminFeatures.test.ts`).
- `eslint` sobre los archivos del territorio → limpio tras `--fix` (formato).

## 7. Huellas locales de trazabilidad

- `src/capacidades/admin/MIGRACION.md` — salida de analitica/alertas y nuevo hogar de `TenantFeatures`.
- `src/compartido/componentes/MIGRACION.md` — salida de `charts/` y eliminación de huérfanas.
