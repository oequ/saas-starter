import { test, expect } from '@playwright/test';

import { resetMockDemoState } from './workspace.helpers';

test('redirects to workspace overview', async ({ page }) => {
  await resetMockDemoState(page);
  await page.goto('/');
  await expect(page).toHaveURL(/\/workspace$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
