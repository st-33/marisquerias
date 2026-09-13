import { defineConfig, devices } from '@playwright/test';

/**
 * Config de Playwright para auditoría visual del módulo M4 (Inventario).
 * Sirve el build estático de Expo (dist/) a través de un servidor HTTP local.
 * La app web se monta en cualquier ruta (SPA); usamos la pantalla real de inventario.
 */

const PORT = 4173;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e-report' }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    },
  ],
  webServer: {
    command: `node e2e/server.mjs ${PORT}`,
    url: `http://127.0.0.1:${PORT}/_role/admin/inventory`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
