import { expect, test } from '@playwright/test';

test('home heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1').first()).toContainText(/Oequ Starter/i);
});
