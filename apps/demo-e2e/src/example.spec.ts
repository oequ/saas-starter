import { test, expect } from '@playwright/test';

import { resetMockDemoState } from './workspace.helpers';

test('redirects to workspace general settings', async ({ page }) => {
  await resetMockDemoState(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/workspace\/settings\/general$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Workspace settings',
  );
});
