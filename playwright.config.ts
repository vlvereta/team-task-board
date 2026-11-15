import { defineConfig, devices } from '@playwright/test';

// E2E runs against the production preview build. The mock API latency is
// lowered at build time (VITE_MOCK_LATENCY) so the suite stays fast.
const PORT = 4173;
const BASE = `http://localhost:${PORT}/team-task-board/`;

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/live-smoke.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: ['**/mobile.spec.ts', '**/live-smoke.spec.ts'],
    },
    { name: 'mobile', use: { ...devices['Pixel 7'] }, testMatch: ['**/mobile.spec.ts'] },
  ],
  webServer: {
    command: `npm run build -- --mode e2e && npx vite preview --port ${PORT} --strictPort`,
    url: BASE,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
