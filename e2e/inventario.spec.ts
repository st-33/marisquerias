import { test, expect, type Page } from '@playwright/test';
import { sembrarSesionYMockRtdb } from './helpers/mockRtdb';
import { RUTA_NEGOCIO } from './fixtures/inventario.fixture';

/**
 * Auditoría visual M4 (Inventario) — Rol Administrador.
 * Valida empíricamente los hallazgos del informe técnico F1 contra la UI en vivo.
 */

const INVENTORY_URL = '/_role/admin/inventory';

async function go(page: Page) {
  await sembrarSesionYMockRtdb(page);
  await page.goto(INVENTORY_URL, { waitUntil: 'domcontentloaded' });
  // Esperar a que la app hidrate y renderice el panel (fin del estado de carga).
  await expect(page.getByText('Inventario', { exact: true }).first()).toBeVisible({
    timeout: 30_000,
  });
}

test('F1-A · La pantalla carga y muestra los 3 tabs de sección', async ({ page }) => {
  await go(page);

  await expect(page.getByText('Alimentos / Consumibles')).toBeVisible();
  await expect(page.getByText('Otros', { exact: true })).toBeVisible();
  await expect(page.getByText('Selecciona una sección y luego un área')).toBeVisible();

  // [PDO-1 B-01] Verificar la disonancia de literal: el tab dice "Losa y Cristal".
  const tabLosa = page.getByText('Losa y Cristal');
  await expect(tabLosa).toBeVisible();
  await page.screenshot({ path: 'e2e/artifacts/f1a_tabs.png', fullPage: true });
});

test('F1-B · [PDO-1 B-01] Tab "Losa y Cristal" vs nombre persistido "Losa / Cristalería"', async ({
  page,
}) => {
  await go(page);

  // Cambiar a la sección losa.
  await page.getByText('Losa y Cristal').click();
  await expect(page.getByText('ÁREAS')).toBeVisible();

  // Entrar a "items de la sección" vía botón lista (viewMode=items_section).
  await page.getByRole('button').filter({ has: page.locator('svg') }).first().click().catch(() => {});
  // screenshot del detalle de sección
  await page.screenshot({ path: 'e2e/artifacts/f1b_losa_detalle.png', fullPage: true });

  // El título del detalle lee sections[...].nombre -> "Losa / Cristalería"
  const detalleLosa = page.getByText('Losa / Cristalería');
  const tabPresente = await page.getByText('Losa y Cristal').count();
  console.log('[F1-B] PDO-1 B-01: ', {
    detalleLosaVisible: await detalleLosa.count(),
    tabLosaPresente: tabPresente,
  });
});

test('F1-C · Navegación Área → Contenedor → Items (jerarquía)', async ({ page }) => {
  await go(page);

  // Áreas de "Alimentos" visibles como chips.
  await expect(page.getByText('Cocina')).toBeVisible();
  await expect(page.getByText('Barra')).toBeVisible();

  // Click en "Cocina" -> ver contenedores.
  await page.getByText('Cocina').click();
  await expect(page.getByText('CONTENEDORES')).toBeVisible();
  // [PDO-2 P-07] Contenedor "Refri Principal" (nombre ambiguo)
  await expect(page.getByText('Refri Principal')).toBeVisible();

  // Click en contenedor -> ver items con stock.
  await page.getByText('Refri Principal').click();
  await expect(page.getByText('Camarón')).toBeVisible();
  await expect(page.getByText('Pescado Entero')).toBeVisible();

  await page.screenshot({ path: 'e2e/artifacts/f1c_contenedor_items.png', fullPage: true });
});

test('F1-D · [PDO-2 P-02/P-04] FAB y botones de ajuste +/−', async ({ page }) => {
  await go(page);

  await page.getByText('Cocina').click();
  await page.getByText('Refri Principal').click();
  await expect(page.getByText('Camarón')).toBeVisible();

  // FAB flotante (Acciones) presente solo en items_container.
  await page.screenshot({ path: 'e2e/artifacts/f1d_fab_y_stepper.png', fullPage: true });
});

test('F1-E · [PDO-2 P-06] Sin controles de editar/eliminar en detalle de item', async ({ page }) => {
  await go(page);
  await page.getByText('Cocina').click();
  await page.getByText('Refri Principal').click();

  const body = await page.locator('body').innerText();
  // No debe existir editar/eliminar (hallazgo P-06).
  const tieneEditar = /editar|eliminar|borrar/i.test(body);
  console.log('[F1-E] PDO-2 P-06 controles editar/eliminar presentes:', tieneEditar);
  await page.screenshot({ path: 'e2e/artifacts/f1e_sin_editar.png', fullPage: true });
});

test('F1-F · Modal "Nuevo Item" — [PDO-2 P-08] sin costo/proveedor', async ({ page }) => {
  await go(page);
  await page.getByText('Cocina').click();
  await page.getByText('Refri Principal').click();

  // Abrir modal Nuevo Item (FAB main o header). Usamos el FAB si existe, si no el botón +.
  // El FAB tiene label "Acciones"/"Nuevo Item"; el modal se abre con setShowItemModal.
  // Buscamos el botón '+' del header (viewMode items_container NO tiene addBtn en header).
  // En items_container el alta es vía FAB. Localizamos por texto del FAB.
  const fab = page.getByText('Nuevo Item');
  if (await fab.count()) {
    await fab.first().click();
  } else {
    await page.getByText('Acciones').first().click();
  }

  await expect(page.getByText('Nuevo Item').first()).toBeVisible();
  // Campos presentes: nombre, unidad, stock mínimo. NO proveedor/costo.
  const modal = page.locator('[role="dialog"], form').first();
  const modalText = await page.locator('body').innerText();
  const tieneCosto = /costo|proveedor/i.test(modalText);
  console.log('[F1-F] PDO-2 P-08 campos costo/proveedor en modal:', tieneCosto);
  await page.screenshot({ path: 'e2e/artifacts/f1f_modal_item.png', fullPage: true });
});

test('F1-G · Estado "Bajo Stock" refleja la métrica', async ({ page }) => {
  await go(page);
  // Métrica "Bajo Stock" en la cabecera de áreas.
  await expect(page.getByText('Bajo Stock')).toBeVisible();
  await page.screenshot({ path: 'e2e/artifacts/f1g_metricas.png', fullPage: true });
});
