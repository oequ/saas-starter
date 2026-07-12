import { defineConfig, devices } from '@playwright/test';
import { nxE2EPreset } from '@nx/playwright/preset';
import { workspaceRoot } from '@nx/devkit';

const baseURL = process.env['BASE_URL'] || 'http://localhost:4201';

export default defineConfig({
  ...nxE2EPreset(__filename, { testDir: './src' }),
  globalSetup: require.resolve('./src/global-setup.ts'),
  timeout: 90_000,
  expect: { timeout: 30_000 },
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npx nx run web:serve',
    url: 'http://localhost:4201',
    reuseExistingServer: !process.env['CI'],
    cwd: workspaceRoot,
    timeout: 300_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
