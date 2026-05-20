import { test, expect } from '@playwright/test';

import {
  createWorkspaceViaOnboarding,
  resetMockDemoState,
  setZeroOrganizations,
} from './workspace.helpers';

test.describe.configure({ mode: 'serial' });

test.describe('api keys', () => {
  test('shows empty state for Parcel and creates a new key', async ({ page }) => {
    await resetMockDemoState(page);
    await page.goto('/workspace/api-keys');

    await expect(page.getByRole('heading', { name: 'API keys' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'No API keys yet' })).toBeVisible();

    await page.getByRole('button', { name: '+ Create API key' }).click();
    await expect(page.getByRole('heading', { name: 'Add API Key' })).toBeVisible();

    await page.getByLabel('Name').fill('E2E Test Key');
    await page.getByRole('button', { name: 'Add', exact: true }).click();

    await expect(
      page.getByRole('heading', { name: 'API key created' }),
    ).toBeVisible();
    await expect(page.getByText(/^oeq_/)).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();

    await expect(page.getByText('E2E Test Key')).toBeVisible();
  });

  test('opens create dialog from api keys page', async ({ page }) => {
    await setZeroOrganizations(page);
    await page.goto('/onboarding');
    await createWorkspaceViaOnboarding(page, 'API Key Flow Co');
    await page.goto('/workspace/api-keys');
    await page.getByRole('button', { name: '+ Create API key' }).click();

    await expect(page).toHaveURL(/\/workspace\/api-keys/);
    await expect(page.getByRole('heading', { name: 'Add API Key' })).toBeVisible();
  });
});
