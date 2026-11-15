import { defineConfig, devices } from '@playwright/test';

// Smoke test against the deployed site: `npx playwright test -c playwright.live.config.ts`.
export default defineConfig({
  testDir: './e2e',
  testMatch: ['**/live-smoke.spec.ts'],
  retries: 1,
  reporter: 'list',
  use: {
    baseURL: process.env.LIVE_URL ?? 'https://vlvereta.github.io/team-task-board/',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'live', use: { ...devices['Desktop Chrome'] } }],
});
