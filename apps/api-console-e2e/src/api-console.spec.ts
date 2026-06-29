import { test, expect } from '@playwright/test';

import {
  createApiKeyViaUi,
  playgroundGetAccount,
  playgroundPostDemoRuns,
  registerApiConsoleUser,
  revokeApiKeyViaUi,
  uniqueEmail,
} from './api-console.helpers';

test.describe('API Developer Console @api-console', () => {
  test.describe.configure({ mode: 'serial' });

  test('register lands on overview with project id and usage units', async ({
    page,
  }) => {
    const email = uniqueEmail('ac-reg');
    await registerApiConsoleUser(page, email);

    await expect(page.getByText(/proj_/)).toBeVisible();
    await expect(page.getByText('usage units remaining')).toBeVisible();
  });

  test('can open API keys and create a key', async ({ page }) => {
    const email = uniqueEmail('ac-keys');
    await registerApiConsoleUser(page, email);

    await page.goto('/keys');
    await expect(
      page.getByRole('heading', { name: 'API keys', exact: true }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: '+ Create API key', exact: true })
      .first()
      .click();
    await page.getByLabel('Name').fill('E2E key');
    await page.getByRole('button', { name: 'Add', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'API key created' })).toBeVisible();
    await page.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByText('E2E key')).toBeVisible();
  });

  test('playground page loads with connection form', async ({ page }) => {
    const email = uniqueEmail('ac-pg');
    await registerApiConsoleUser(page, email);

    await page.goto('/playground');
    await expect(page.getByRole('heading', { name: 'Playground' })).toBeVisible();
    await expect(page.getByLabel('Base URL')).toBeVisible();
    await expect(page.getByLabel('API key')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send request' })).toBeVisible();
  });

  test('create key and GET /account returns 200 in playground', async ({
    page,
  }) => {
    const email = uniqueEmail('ac-e2');
    await registerApiConsoleUser(page, email);
    const secret = await createApiKeyViaUi(page, 'E2E account key');
    await playgroundGetAccount(page, secret, 200);
    await expect(page.locator('pre')).toContainText('usage_units');
  });

  test('revoked key returns 401 in playground', async ({ page }) => {
    const email = uniqueEmail('ac-e3');
    await registerApiConsoleUser(page, email);
    const keyName = 'E2E revoke key';
    const secret = await createApiKeyViaUi(page, keyName);
    await playgroundGetAccount(page, secret, 200);
    await revokeApiKeyViaUi(page, keyName);
    await playgroundGetAccount(page, secret, 401);
  });

  test('POST /demo-runs appears in metered usage', async ({ page }) => {
    const email = uniqueEmail('ac-oss-meter');
    await registerApiConsoleUser(page, email);
    const secret = await createApiKeyViaUi(page, 'E2E demo key');
    await playgroundPostDemoRuns(page, secret);

    await page.goto('/metered-usage');
    await expect(
      page.getByRole('heading', { name: 'Metered usage', exact: true }),
    ).toBeVisible();

    const usageTable = page.locator('table tbody');
    await expect
      .poll(async () => usageTable.locator('tr').count(), {
        timeout: 30_000,
      })
      .toBeGreaterThan(0);
    await expect(usageTable).toContainText(/demo-runs/i);
  });
});
