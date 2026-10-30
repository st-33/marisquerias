# Reporte de Estado Actual y Continuación — Proyecto Marisquerías

**Fecha de corte:** 29 de octubre de 2026  
**Repositorio:** `/home/st/Escritorio/marisquerias`  
**Rama / Commit actual:** `rama-2` (`85fe96c` — `fix(pos): ensure products without explicit ventaCrudo flag are visible in mostrador`)  
**Estado del árbol Git:** Limpio (`git status` sin cambios pendientes)

---

## 1. Lo más reciente que se estuvo haciendo (Prioridad Alta)

### 1.1 Cierre del Circuito Operativo de Ventas e Inventario en Tiempo Real (`85fe96c`, `a4602f0`)
1. **Visibilidad de Productos en Mostrador (`src/capacidades/pos/useMostradorPro.ts`):**
   - Anteriormente, `useMostradorPro` filtraba productos exigiendo `visible?.ventaCrudo === true`, lo que ocultaba productos recién creados desde el menú estándar si no tenían esa bandera explícita.
   - Se corrigió para que todo producto activo sea visible en Mostrador salvo que tenga explícitamente `visible?.ventaCrudo === false`.
2. **Escritura Real de Ventas y Descuento Automático de Stock (`useMostradorPro.ts`):**
   - Al ejecutar el cobro en Mostrador (`COBRAR E IMPRIMIR`), ahora se persiste la venta mediante `salesRepo.registrarVenta(payload)` en `/ventas/{ventaId}` de la Unidad Operativa del negocio (`unidad-01` o `unidad-02`).
   - Se implementó resolución automática del área de inventario (`area_mostrador` / `venta_crudo`) y auto-creación de área fallback si el negocio aún no tenía una inicializada.
   - Se verificó en `unidad-01` (`PUERTO-265316`) la venta real `venta_1761741422284_xcaae` por `$205` (`1x Ceviche Mixto` + `1x Cerveza Corona`) y el descuento inmediato de stock en `inventario/areas/area_mostrador/stock` de `100 -> 99`.
3. **Flujo de Mesero / Salón y Descuento por Receta:**
   - Se verificó en `unidad-01` la apertura de `Mesa 1`, envío de comanda a cocina (`pedido_1761741530872`) y descuento en `inventario/areas/area_cocina/stock`.

### 1.2 Módulo de Ajustes de Administrador, Dispositivos y Selector de Roles (`4033a55`, `6d5e56e`)
1. **Nuevo Módulo de Ajustes (`/_role/admin/ajustes`):**
   - Se creó `src/ui/roles/administrador/ajustes/PantallaAjustesAdmin.tsx` y se integró al FAB radial del Administrador con el ícono de engranaje (`settings-outline`).
   - Permite configurar **Identidad de Marca** (nombre comercial y URL de logotipo sin fondo en tiempo real hacia RTDB `configuracion/nombre` y `configuracion/logo_url`), **Estilo del Selector de Roles** (Tarjetas Clásicas vs Pastillas Compactas) y **Tema Visual**.
2. **Corrección del Rebote en Módulo de Dispositivos (`/_role/admin/dispositivos`):**
   - Se corrigió en `src/capacidades/admin/useFuncionalidadesAdmin.ts` el guardia que expulsaba al administrador de regreso a `/_role/roles` cuando visitaba `/_role/admin/dispositivos`. Ahora el rol administrador tiene garantizado el acceso a `admin_devices` y `admin_ajustes`.
3. **Aislamiento del FAB Radial y Conmutación Dinámica:**
   - El FAB radial (`AccionRadialFlotante.tsx`) solo se renderiza dentro de `/_role/admin/*` y jamás se queda pegado al regresar a `/_role/roles`.
4. **Restauración de `unidad-02` (Marisquería El Arrecife):**
   - Durante las pruebas de verdulerías se había usado temporalmente `unidad-02`; ya fue restaurada íntegramente con el catálogo y stock de `Marisquería El Arrecife` (`ARRECIFE-02`), mientras que `Verdulería La Huerta` fue migrada a su propia base `unidad-004`.

---

## 2. Problemas Actuales y Puntos Pendientes por Pulir

1. **Validación Estricta de Categoría en `useArranqueSistema.ts`:**
   - En `src/sistema/instalacion/useArranqueSistema.ts` (líneas 109-114), la validación acepta códigos con `catSlug === 'marisquerias'` o `catId === '01'`. Debe verificarse que si `catSlug` viene vacío en algún código mal formado, tampoco permita vincular negocios de otra categoría.
2. **Descuento de Inventario Basado en Recetas Compuestas vs Descuento Directo (1:1):**
   - En Mostrador (`useMostradorPro.ts`), el descuento actual deduce `1:1` sobre el `productoId` en `area_mostrador`.
   - En Cocina (`SincronizadorCocina.descontarPorReceta`), si un platillo tiene receta con múltiples insumos (`receta.ingredientes`), descuenta cada insumo; si el platillo no tiene receta definida en RTDB, el descuento por receta no deduce insumos individuales a menos que se configure la receta o el fallback directo.
3. **Subida de Archivo de Imagen Local para el Logo en Ajustes:**
   - Actualmente `PantallaAjustesAdmin.tsx` permite ingresar/pegar la URL del logotipo (`logo_url`) y previsualizarlo sin fondo en el selector de roles. Si se requiere selector de archivos local (`expo-image-picker`) con subida a Firebase Storage o Base64 en RTDB, falta conectar ese picker.
4. **Cierre de Cuenta de Mesa hacia Caja / Cobro Final:**
   - El envío de comanda en Mesero (`procesarPedido.ts`) crea el pedido y descuenta en cocina, pero conviene realizar una prueba E2E completa del cierre de mesa con pago en `PantallaCaja.tsx` y liberación de la mesa a estado `libre`.

---

## 3. Instrucciones Exactas para Continuar en Otra Sesión

### Paso 1: Verificar los 3 Negocios de Marisquerías en Navegador
Con el servidor en el puerto `8081` (`npx expo start --web --port 8081`):
1. **Pestaña 1 (`PUERTO-265316` -> `unidad-01`):** Verificar roles `Administrador`, `Mesero`, `Cocina`, `Mostrador`.
2. **Pestaña 2 (`ARRECIFE-02` -> `unidad-02`):** Verificar que solo aparezcan `Administrador` y `Mostrador` (sin `Mesero` ni `Cocina`).
3. **Pestaña 3 (`MAZATLAN-03` -> `unidad-03`):** Verificar operación de salón/mesas.

### Paso 2: Completar Prueba de Cierre de Mesa y Corte de Caja
- Revisar `src/ui/pantallas/PantallaCaja.tsx` y `src/roles/logica/caja/` para asegurar que el cobro de una comanda abierta en `unidad-01` o `unidad-03` registre la venta en `/ventas` y cambie `mesas/{mesaId}/estado` a `'libre'`.

### Paso 3: Ejecutar Validación de Tipos y Pruebas Unitarias
```bash
cd /home/st/Escritorio/marisquerias
npx tsc --noEmit
npm test
```
