import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 30_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:5000',
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'api',
      testMatch: /(auth|users|treasury)\.spec\.ts/,
    },
    {
      name: 'browser',
      testMatch: /swagger\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
