import { defineConfig } from '@playwright/test';

/**
 * Configuracion de Playwright.
 *
 * - Por defecto las pruebas corren contra la aplicacion compilada en local
 *   (Express sirviendo el frontend en http://localhost:3001).
 * - Si se define la variable URL_BASE se ejecutan contra esa direccion, que es
 *   lo que se usa para probar la aplicacion publicada en Render.
 */
const urlBase = process.env.URL_BASE ?? 'http://localhost:3001';
const usarServidorLocal = !process.env.URL_BASE;

export default defineConfig({
  testDir: './e2e/tests',
  timeout: 45_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: urlBase,
    channel: 'chrome',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure'
  },
  projects: [{ name: 'chrome' }],
  webServer: usarServidorLocal
    ? {
        command: 'npm run start',
        url: 'http://localhost:3001/api/salud',
        reuseExistingServer: !process.env.CI,
        timeout: 90_000
      }
    : undefined
});
