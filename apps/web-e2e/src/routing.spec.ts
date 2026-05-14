import { expect, test } from '@playwright/test';

test.describe('routing smoke', () => {
  test('landing shows hero heading', async ({ page }) => {
    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: /Oequ Starter/i })
    ).toBeVisible();
  });

  test('protected org route sends anonymous user to login', async ({ page }) => {
    await page.goto('/orgs/acme');
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });

  test('protected app route sends anonymous user to login', async ({ page }) => {
    await page.goto('/app');
    await expect(page).toHaveURL(/\/login(\?|$)/);
  });
});
