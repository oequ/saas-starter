import { test, expect } from '@playwright/test';

import { resetMockDemoState, setZeroOrganizations } from './workspace.helpers';

test.describe.configure({ mode: 'serial' });

test.describe('onboarding', () => {
  test('redirects to onboarding when user has no workspaces', async ({ page }) => {
    await setZeroOrganizations(page);
    await page.goto('/workspace');
    await expect(page).toHaveURL(/\/onboarding$/);
    await expect(
      page.getByRole('heading', { name: 'Set up your workspace' }),
    ).toBeVisible();
  });

  test('completes onboarding and lands on workspace overview', async ({ page }) => {
    await setZeroOrganizations(page);
    await page.goto('/onboarding');
    await expect(
      page.getByRole('heading', { name: 'Set up your workspace' }),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Skip' }).click();
    await page.getByLabel('Workspace name').fill('Starter Co');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();

    await expect(page).toHaveURL(/\/workspace$/);
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Starter Co',
    );
    await expect(
      page.getByRole('heading', { name: "We think you're gonna like it here." }),
    ).toBeVisible();
  });

  test('blocks onboarding when workspaces already exist', async ({ page }) => {
    await resetMockDemoState(page);
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/workspace$/);
  });
});
