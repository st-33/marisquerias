# REPORTE DE PURGA Y SANEAMIENTO CONSOLIDADO

- Fecha: 2026-10-10
- Autoridad: Comando Central Operativo / Mariscal Ejecutor
- Estado: Lotes 1 al 6 ejecutados y validados (90/90 archivos procesados)

---

## LOTE 1 (Archivos 1 - 15)

### Archivos purgados / eliminados por duplicidad y basura documental:
1. `src/compartido/utils/logger.ts` -> **ELIMINADO**. Redundante con núcleo `src/sistema/monitoreo/logger.ts`.
2. `src/sistema/utilidades/logger.ts` -> **ELIMINADO**. Redundante con núcleo `src/sistema/monitoreo/logger.ts`.
3. `app/_role/admin/MIGRACION.md` -> **ELIMINADO**. Huella histórica local consolidada aquí.
4. `src/capacidades/admin/MIGRACION.md` -> **ELIMINADO**. Huella histórica local consolidada aquí.
5. `src/compartido/MIGRACION.md` -> **ELIMINADO**. Huella histórica local consolidada aquí.
6. `src/compartido/componentes/MIGRACION.md` -> **ELIMINADO**. Huella histórica local consolidada aquí.
7. `src/ui/bloques/MIGRACION.md` -> **ELIMINADO**. Huella histórica local consolidada aquí.

### Archivos renombrados / purgados de Spanglish (Bloques Visuales):
8. `src/ui/bloques/LiquidBackground.tsx` ➔ `src/ui/bloques/FondoLiquido.tsx`
9. `src/ui/bloques/BrandSeal.tsx` ➔ `src/ui/bloques/SelloMarca.tsx`
10. `src/ui/bloques/OrbButton.tsx` ➔ `src/ui/bloques/BotonOrbe.tsx`
11. `src/ui/bloques/StickerLayer.tsx` ➔ `src/ui/bloques/CapaEstampa.tsx`
12. `src/ui/bloques/ProductPickerOverlay.tsx` ➔ `src/ui/bloques/SelectorProductoSuperpuesto.tsx`
13. `src/ui/bloques/ActionArea.tsx` ➔ `src/ui/bloques/AreaAccion.tsx`
14. `src/ui/bloques/AnimatedPressable.tsx` ➔ `src/ui/bloques/PresionableAnimado.tsx`
15. `src/ui/bloques/BluetoothPrinterModal.tsx` ➔ `src/ui/bloques/ModalImpresoraBluetooth.tsx`

---

## LOTE 2 Y 3 (Archivos 16 - 45: Capacidades, Componentes Compartidos y Sistema)

### Archivos purgados / eliminados:
16. `src/capacidades/pos/usePOS.ts` -> **ELIMINADO**. Redundante y obsoleto frente a `useMostradorPro`.

### Capacidades (`src/capacidades/**`):
17. `src/capacidades/ui/useActionAreaCollapse.ts` ➔ `src/capacidades/ui/useColapsoAreaAccion.ts` (alias: `useActionAreaCollapse`).
18. `src/capacidades/ui/useAlternatingSounds.ts` ➔ `src/capacidades/ui/useSonidosAlternados.ts` (alias: `useAlternatingSounds`).
19. `src/capacidades/ui/useFabRadial.ts` ➔ `src/capacidades/ui/useAccionRadialFlotante.ts` (alias: `useFabRadial`).
20. `src/capacidades/admin/useAdminFeatures.ts` ➔ `src/capacidades/admin/useFuncionalidadesAdmin.ts` (alias: `useAdminFeatures`).
21. `src/capacidades/admin/menuSafety.ts` ➔ `src/capacidades/admin/seguridadMenu.ts`.
22. `src/capacidades/admin/menuSafety.test.ts` ➔ `src/capacidades/admin/seguridadMenu.test.ts`.
23. `src/capacidades/admin/useFeatureFlag.test.ts` ➔ `src/capacidades/admin/useFuncionalidadesAdmin.test.ts`.
24. `src/capacidades/mostrador/usePosConfig.ts` ➔ `src/capacidades/mostrador/useConfiguracionCaja.ts` (alias: `usePosConfig`).

### Componentes Compartidos (`src/compartido/componentes/**` y temas):
25. `src/compartido/componentes/NotificationToast.tsx` ➔ `src/compartido/componentes/NotificacionToast.tsx` (alias: `NotificationToast`).
26. `src/compartido/componentes/SyncStatusPanel.tsx` ➔ `src/compartido/componentes/PanelEstadoSincronizacion.tsx` (alias: `SyncStatusPanel`).
27. `src/compartido/componentes/devices/TicketActionsConfigurator.tsx` ➔ `src/compartido/componentes/devices/ConfiguradorAccionesTicket.tsx` (alias: `TicketActionsConfigurator`).
28. `src/compartido/componentes/devices/TicketFieldEditor.tsx` ➔ `src/compartido/componentes/devices/EditorCamposTicket.tsx` (alias: `TicketFieldEditor`).
29. `src/compartido/componentes/devices/TicketRoleSelector.tsx` ➔ `src/compartido/componentes/devices/SelectorRolTicket.tsx` (alias: `TicketRoleSelector`).
30. `src/compartido/componentes/devices/TicketPreview.tsx` ➔ `src/compartido/componentes/devices/VistaPreviaTicket.tsx` (alias: `TicketPreview`).
31. `src/compartido/componentes/layouts/AdminLayout.tsx` ➔ `src/compartido/componentes/layouts/DisenoAdministrador.tsx` (alias: `AdminLayout`).
32. `src/compartido/componentes/ui/AnimatedButton.tsx` ➔ `src/compartido/componentes/ui/BotonAnimado.tsx` (alias: `AnimatedButton`).
33. `src/compartido/componentes/ui/Card.tsx` ➔ `src/compartido/componentes/ui/TarjetaContenedora.tsx` (alias: `Card`).
34. `src/compartido/componentes/ui/PulsingCard.tsx` ➔ `src/compartido/componentes/ui/TarjetaPulsante.tsx` (alias: `PulsingCard`).
35. `src/compartido/componentes/ui/TableBadge.tsx` ➔ `src/compartido/componentes/ui/InsigniaMesa.tsx` (alias: `TableBadge`).
36. `src/compartido/componentes/ui/VariantDisplay.tsx` ➔ `src/compartido/componentes/ui/VisorVariantes.tsx` (alias: `VariantDisplay`).
37. `src/compartido/componentes/ui/ModernAlert.tsx` ➔ `src/compartido/componentes/ui/AlertaModerna.tsx` (alias: `ModernAlert`).
38. `src/compartido/componentes/ui/ModernAlert/ModernAlertView.tsx` ➔ `src/compartido/componentes/ui/ModernAlert/VistaAlertaModerna.tsx` (alias: `ModernAlertView`).
39. `src/compartido/componentes/ui/ModernAlert/useModernAlert.ts` ➔ `src/compartido/componentes/ui/ModernAlert/useAlertaModerna.ts` (alias: `useModernAlert`).
40. `src/compartido/temas/components/ThemeToggle.tsx` ➔ `src/compartido/temas/components/ConmutadorTema.tsx` (alias: `ThemeToggle`).

### Sistema y Sincronización (`src/sistema/**`):
41. `src/sistema/sincronizacion/SyncMetrics.ts` ➔ `src/sistema/sincronizacion/MetricasSincronizacion.ts` (alias: `syncMetrics`).
42. `src/sistema/sincronizacion/SynchronizationService.ts` ➔ `src/sistema/sincronizacion/ServicioSincronizacion.ts` (alias: `SynchronizationService`).
43. `src/sistema/sincronizacion/useSynchronizedArray.ts` ➔ `src/sistema/sincronizacion/useArregloSincronizado.ts` (alias: `useSynchronizedArray`).
44. `src/sistema/utilidades/logCleaner.ts` ➔ `src/sistema/utilidades/depuradorRegistros.ts`.
45. `src/sistema/utilidades/syncDebugger.ts` ➔ `src/sistema/utilidades/depuradorSincronizacion.ts` (alias: `SyncDebugger`).

---

## LOTES 4, 5 Y 6 (Archivos 46 - 90: Hooks, Dominio, Primitivos, Roles, Audio, Ciclo de Vida y Servicios)

### Ganchos Compartidos y Utilidades (`src/compartido/**`):
46. `src/compartido/hooks/useItemStatusListener.ts` ➔ `src/compartido/hooks/useEscuchaEstadoPartida.ts` (alias: `useItemStatusListener`).
47. `src/compartido/hooks/useNotifications.ts` ➔ `src/compartido/hooks/useNotificaciones.ts` (alias: `useNotifications`).
48. `src/compartido/hooks/useStoreNotifications.ts` ➔ `src/compartido/hooks/useNotificacionesAlmacen.ts` (alias: `useStoreNotifications`).
49. `src/compartido/hooks/useThemedColors.ts` ➔ `src/compartido/hooks/useColoresTema.ts` (alias: `useThemedColors`).
50. `src/compartido/utils/formatters.ts` ➔ `src/compartido/utils/formateadores.ts` (alias: `formatters`).
51. `src/compartido/constantes/theme.ts` ➔ `src/compartido/constantes/tema.ts`.
52. `src/compartido/sounds.ts` ➔ `src/compartido/sonidos.ts`.
53. `src/compartido/theme.ts` ➔ `src/compartido/tema.ts`.
54. `src/compartido/componentes/ui/Toast.tsx` ➔ `src/compartido/componentes/ui/AvisoEmergente.tsx` (alias: `Toast`).

### Lógica de Dominio (`src/logica/dominio/**`):
55. `src/logica/dominio/itemCanonical.ts` ➔ `src/logica/dominio/partidaCanonica.ts`.
56. `src/logica/dominio/normalizers.ts` ➔ `src/logica/dominio/normalizadores.ts`.
57. `src/logica/dominio/status.ts` ➔ `src/logica/dominio/estados.ts`.
58. `src/logica/dominio/__tests__/status.test.ts` ➔ `src/logica/dominio/__tests__/estados.test.ts`.

### Primitivos y Bloques Visuales (`src/ui/**`):
59. `src/ui/primitivos/AtmosphereLayer.tsx` ➔ `src/ui/primitivos/CapaAtmosfera.tsx` (alias: `AtmosphereLayer`).
60. `src/ui/bloques/Badge.tsx` ➔ `src/ui/bloques/Insignia.tsx` (alias: `Badge`).
61. `src/ui/bloques/fabAction.ts` ➔ `src/ui/bloques/accionFlotante.ts`.
62. `src/ui/bloques/FabRadial.tsx` ➔ `src/ui/bloques/AccionRadialFlotante.tsx` (alias: `FabRadial`).
63. `src/ui/bloques/__tests__/FabRadial.test.ts` ➔ `src/ui/bloques/__tests__/AccionRadialFlotante.test.ts`.
64. `src/ui/bloques/RoleSelectorElite.tsx` ➔ `src/ui/bloques/SelectorRolElite.tsx` (alias: `RoleSelectorElite`).
65. `src/ui/pantallas/RolesScreen.tsx` ➔ `src/ui/pantallas/PantallaRoles.tsx` (alias: `RolesScreen`).
66. `src/ui/pantallas/MeseroScreen.tsx` ➔ `src/ui/pantallas/PantallaMesero.tsx` (alias: `MeseroScreen`).
67. `src/ui/pantallas/CocinaScreen.tsx` ➔ `src/ui/pantallas/PantallaCocina.tsx` (alias: `CocinaScreen`).

### Lógica de Roles (`src/roles/logica/**`):
68. `src/roles/logica/mesero/rules.ts` ➔ `src/roles/logica/mesero/reglas.ts`.
69. `src/roles/logica/mesero/inventoryErrors.ts` ➔ `src/roles/logica/mesero/erroresInventario.ts`.
70. `src/roles/logica/mesero/usePrintPolicies.ts` ➔ `src/roles/logica/mesero/usePoliticasImpresion.ts` (alias: `usePrintPolicies`).
71. `src/roles/logica/mesero/useProductSelector.ts` ➔ `src/roles/logica/mesero/useSelectorProductos.ts` (alias: `useProductSelector`).
72. `src/roles/logica/mesero/useVariantSelector.ts` ➔ `src/roles/logica/mesero/useSelectorVariantes.ts` (alias: `useVariantSelector`).
73. `src/roles/logica/cocina/useCocinaAudio.ts` ➔ `src/roles/logica/cocina/useAudioCocina.ts` (alias: `useCocinaAudio`).
74. `src/roles/logica/cocina/useCocinaLogic.ts` ➔ `src/roles/logica/cocina/useLogicaCocina.ts` (alias: `useCocinaLogic`).
75. `src/roles/logica/selector/useRoleSelectorLogic.ts` ➔ `src/roles/logica/selector/useLogicaSelectorRoles.ts` (alias: `useRoleSelectorLogic`).

### Audio y Monitoreo (`src/sistema/audio/**`, `src/sistema/monitoreo/**`):
76. `src/sistema/audio/soundBank.ts` ➔ `src/sistema/audio/bancoSonidos.ts` (alias: `SoundBank`).
77. `src/sistema/audio/soundNotifications.ts` ➔ `src/sistema/audio/notificacionesSonoras.ts` (alias: `playSoundEvent`, etc.).
78. `src/sistema/monitoreo/observabilidad/audit.ts` ➔ `src/sistema/monitoreo/observabilidad/auditoria.ts`.
79. `src/sistema/monitoreo/__mocks__/sentry.mock.ts` ➔ `src/sistema/monitoreo/__mocks__/simuladorSentry.ts`.

### Navegación y Ciclo de Vida (`src/sistema/navegacion/**`, `src/sistema/ciclo_de_vida/**`):
80. `src/sistema/navegacion/GestureHandler.ts` ➔ `src/sistema/navegacion/ManejadorGestos.ts`.
81. `src/sistema/navegacion/ImmersiveMode.ts` ➔ `src/sistema/navegacion/ModoInmersivo.ts` (alias: `useImmersiveMode`).
82. `src/sistema/ciclo_de_vida/ensureNegocio.ts` ➔ `src/sistema/ciclo_de_vida/asegurarNegocio.ts`.
83. `src/sistema/ciclo_de_vida/NegocioLifecycleController.ts` ➔ `src/sistema/ciclo_de_vida/ControladorCicloVidaNegocio.ts`.
84. `src/sistema/ciclo_de_vida/useAppStateSync.ts` ➔ `src/sistema/ciclo_de_vida/useSincronizacionEstadoApp.ts` (alias: `useAppStateSync`).

### Servicios, Motores y Seguridad (`src/sistema/servicios/**`, `src/sistema/motores/**`, `src/sistema/seguridad/**`):
85. `src/sistema/servicios/OfflineInventorySync.ts` ➔ `src/sistema/servicios/SincronizacionInventarioOffline.ts`.
86. `src/sistema/servicios/OfflinePrintFallback.ts` ➔ `src/sistema/servicios/RespaldoImpresionOffline.ts`.
87. `src/sistema/servicios/OfflineSalesSync.ts` ➔ `src/sistema/servicios/SincronizacionVentasOffline.ts`.
88. `src/sistema/servicios/TicketFormatter.ts` ➔ `src/sistema/servicios/FormateadorTicket.ts`.
89. `src/sistema/motores/KitchenQueueEngine.ts` ➔ `src/sistema/motores/MotorColaCocina.ts`.
90. `src/sistema/seguridad/deviceBinding.ts` ➔ `src/sistema/seguridad/vinculacionDispositivo.ts` (alias: `deviceBinding`).

---

## ALIMENTACIÓN A LA FUENTE DE VERDAD

### En `fuente_de_verdad/terminos.md`:
- `156.- REGISTRO DE OBSERVABILIDAD` (Lote 1)
- `157.- METRICAS DE SINCRONIZACION` (Lotes 2 y 3)
- `158.- SERVICIO DE SINCRONIZACION` (Lotes 2 y 3)
- `159.- SISTEMA DE NOTIFICACIONES` (Lotes 4, 5 y 6)
- `160.- NORMALIZADOR DE COMANDA` (Lotes 4, 5 y 6)
- `161.- CONTROLADOR DE CICLO DE VIDA DE NEGOCIO` (Lotes 4, 5 y 6)
- `162.- MOTOR DE COLA DE COCINA` (Lotes 4, 5 y 6)
- `163.- VINCULACION DE DISPOSITIVO` (Lotes 4, 5 y 6)
- `164.- RESPALDO DE IMPRESION OFFLINE` (Lotes 4, 5 y 6)

### En `fuente_de_verdad/terminos_diseno.md`:
- `42.- FONDO LIQUIDO` (Lote 1)
- `43.- SELLO DE MARCA` (Lote 1)
- `44.- CONMUTADOR DE TEMA` (Lotes 2 y 3)
- `45.- INSIGNIA DE MESA` (Lotes 2 y 3)
- `46.- PANEL DE ESTADO DE SINCRONIZACION` (Lotes 2 y 3)
- `47.- CAPA DE ATMOSFERA` (Lotes 4, 5 y 6)
- `48.- ACCION RADIAL FLOTANTE` (Lotes 4, 5 y 6)
- `49.- SELECTOR DE ROL ELITE` (Lotes 4, 5 y 6)

---

## LOTE 7 — PRELUDIO (Consolidación de línea base verde)

Antes de arrancar el Lote 7 (archivos 91 al 135), se detectó que la línea base
del árbol de trabajo estaba **en rojo** (25 errores de TypeScript heredados de los
renombrados en vuelo de los Lotes 4–6). Se restauró la barrera binaria a VERDE:

- **Puentes faltantes creados** (retrocompatibilidad total):
  - `src/sistema/impresion/legacy/policies.ts` → reexporta `politicasImpresion`.
  - `src/sistema/impresion/fierros/estado/EstadoHub.ts` → reexporta `EstadoConcentrador`.
  - `src/sistema/impresion/fierros/hub/GestorHub.tsx` → reexporta `GestorConcentrador`.
- **Consumer migrado** a métodos canónicos de `RepositorioDispositivos`:
  - `useGestionDispositivos.ts` y `GestorConcentrador.tsx` (`suscribirHubConfig` → `suscribirConfiguracionHub`, etc.).
- **Barril alineado**: `src/sistema/sin_conexion/index.ts` ahora traduce las
  exportaciones reales del adaptador SQLite a nombres canónicos en español
  (`AdaptadorAlmacenamientoSQLite`, `*SinConexion`) preservando alias ingleses.
- **Tipo corregido**: `OrderDraft` → `BorradorComanda` en `borradores.repo.ts`.

**Barrera binaria**: `npx tsc --noEmit` (0 errores) y `npm test` (23/23 suites, 147 tests).
Commit de sellado: `81bfc85 refactor(sistema): sellar linea base verde del Lote 7`.

---

## LOTE 7 — AVANCE DE RENOMBRADOS (Archivos 91–135)

### Rebautizados con `git mv` + puente (0 roturas):
1. `src/compartido/temas/ThemeContext.tsx` ➔ `ContextoTema.tsx` (puente: `ThemeContext.tsx`).
2. `src/sistema/central/CentralListener.ts` ➔ `OyenteCentral.ts` (puente: `CentralListener.ts`).
3. **Sufijo de persistencia** `.repo` ➔ `.repositorio` en 12 repositorios canónicos:
   - `borradores.repo.ts`, `dispositivos.repo.ts`, `inventario.repo.ts`, `menu.repo.ts`,
     `mesas.repo.ts`, `negocio.repo.ts`, `pedidos.repo.ts`, `registroVentas.repo.ts`,
     `reparto-ajustes.repo.ts`, `reparto.repo.ts`, `tickets.repo.ts`, `ventasSimples.repo.ts`.
   - Puentes legacy (`devices.repo.ts`, `drafts.repo.ts`, `SimpleSalesRepo.ts`) reencauzados
     al nuevo sufijo.
   - Barril `persistencia/index.ts` y ~30 consumidores migrados.

**Barrera binaria**: `npx tsc --noEmit` = 0 errores · `npm test` = 23/23 (147 tests).
Commits: `becf430` (ThemeContext/CentralListener), `bf20c27` (`.repo` ➔ `.repositorio`).

### Mutación profunda de identificadores (clases y tipos del dominio de persistencia):
- **9 clases `*Repository`** rebautizadas a `*Repositorio` con alias inglés conservado:
  - `MenuRepository`→`RepositorioMenu`, `MesasRepository`→`RepositorioMesas`,
    `NegocioRepository`→`RepositorioNegocio`, `PedidosRepository`→`RepositorioPedidos`,
    `RegistroVentasRepository`→`RepositorioRegistroVentas`,
    `RepartoAjustesRepository`→`RepositorioAjustesReparto`, `RepartoRepository`→`RepositorioReparto`,
    `TicketTemplatesRepository`→`RepositorioPlantillasTicket`, `InventoryV2Repository`→`RepositorioInventario`.
- **Tipos SQLite `Offline*`** rebautizados a `*SinConexion` en el adaptador
  (`VentaSinConexion`, `TrabajoImpresionSinConexion`, `MovimientoInventarioSinConexion`,
  `ProductoSinConexion`, `CategoriaSinConexion`, `MesaSinConexion`, `PedidoSinConexion`),
  con alias inglés `Offline*` preservados en el barril `sin_conexion`.

**Alimentación a la Fuente de Verdad**:
- `165.- ADAPTADOR DE ALMACENAMIENTO SQLITE`.
- `166.- REPOSITORIO DE CAPA DE PERSISTENCIA`.

**Barrera binaria**: `npx tsc --noEmit` = 0 errores · `npm test` = 23/23 (147 tests).
Commits: `716f5b7` (clases Repositorio), `3495876` (tipos SinConexion), `a437c06` (Fuente).

### Hispianización de motores, sincronización, audio y servicios offline:
- `CentralListener` → `OyenteCentral` (interfases `OyenteCentralCallbacks`, `OpcionesOyenteCentral`).
- `KitchenQueueEngine` → `MotorColaCocina`; singleton `motorColaCocina`.
- `SynchronizationService` → `ServicioSincronizacion`; singleton `servicioSincronizacion`.
- `SyncDebugger` → `DepuradorSincronizacion`; `SyncMetricsCollector` → `MetricasSincronizacion`.
- `SoundBankClass` → `BancoSonidos`; singleton `bancoSonidos`.
- `OfflineInventorySyncClass` → `SincronizacionInventarioOffline`;
  `OfflinePrintFallbackClass` → `RespaldoImpresionOffline`;
  `OfflineSalesSyncClass` → `SincronizacionVentasOffline`.
- Todos conservan alias inglés (`export { X as Y }`) para retrocompatibilidad total.

**Barrera binaria**: `npx tsc --noEmit` = 0 errores · `npm test` = 23/23 (147 tests).
Commits: `a3c9c1a` (OyenteCentral), `a29606e` (MotorColaCocina), `a2390ed` (ServicioSincronizacion),
`0d58e97` (SyncDebugger/SyncMetrics), `e894e33` (SoundBank/Offline*).

