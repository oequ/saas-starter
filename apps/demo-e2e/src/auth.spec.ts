import { test, expect } from '@playwright/test';

import { resetMockDemoState } from './workspace.helpers';

test.describe.configure({ mode: 'serial' });

test.describe('auth', () => {
  test('signs out and signs back in with demo credentials', async ({ page }) => {
    await resetMockDemoState(page);
    await page.goto('/workspace');
    await expect(page).toHaveURL(/\/workspace\/settings\/general$/);

    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(
      page.getByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible();

    await page.getByLabel('Password').fill('demo');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/workspace\/settings\/general$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Workspace settings',
    );
  });

  test('rejects invalid password', async ({ page }) => {
    await resetMockDemoState(page);
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/auth\/login$/);

    await page.getByLabel('Password').fill('wrong');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/auth\/login$/);
    await expect(page.getByText('Invalid email or password.')).toBeVisible();
  });

  test('redirects unauthenticated users from workspace to login', async ({
    page,
  }) => {
    await resetMockDemoState(page);
    await page.getByRole('button', { name: 'User menu' }).click();
    await page.getByRole('menuitem', { name: 'Sign out' }).click();
    await expect(page).toHaveURL(/\/auth\/login$/);

    await page.goto('/workspace');
    await expect(page).toHaveURL(/\/auth\/login/);
  });
});
