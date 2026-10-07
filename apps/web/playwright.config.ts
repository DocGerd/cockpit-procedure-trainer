import { defineConfig, devices } from '@playwright/test';

const base = process.env.BASE_PATH ?? '/';
const port = Number(process.env.E2E_PORT ?? 4399);
const offlineSpec = /offline\.spec\.ts$/;
const perfSpec = 'e2e/perf/**/*.spec.ts';
// The perf budget runs only through `pnpm test:perf`: it throttles the CPU, so the default run skips it.
const perf = process.env.E2E_PERF === '1';
const origin = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: 'e2e',
  outputDir: 'node_modules/e2e/results',
  workers: 1,
  retries: 0,
  forbidOnly: Boolean(process.env.CI),
  reporter: process.env.CI
    ? [['list'], ['html', { open: 'never', outputFolder: 'node_modules/e2e/report' }]]
    : 'list',
  expect: { timeout: 10_000 },
  use: {
    ...devices['Desktop Chrome'],
    baseURL: `${origin}${base}`,
    viewport: { width: 1280, height: 800 },
    locale: 'en-US',
    colorScheme: 'light',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', testIgnore: [offlineSpec, perfSpec] },
    { name: 'offline', testMatch: offlineSpec, use: { serviceWorkers: 'allow' } },
    ...(perf
      ? [
          {
            name: 'perf',
            testMatch: perfSpec,
            timeout: 30 * 60_000,
            use: { viewport: { width: 1024, height: 768 }, colorScheme: 'dark' as const },
          },
        ]
      : []),
  ],
  webServer: {
    command: `pnpm run build && pnpm exec vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `${origin}${base}`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
