import { test, expect } from '@playwright/test';

import { resetMockDemoState } from './workspace.helpers';

test.describe.configure({ mode: 'serial' });

test.describe('help panel', () => {
  test.beforeEach(async ({ page }) => {
    await resetMockDemoState(page);
  });

  test('shows contextual topics on metrics and opens an article', async ({
    page,
  }) => {
    await page.goto('/workspace/metrics');
    await page.getByRole('button', { name: 'Need help?' }).click();

    await expect(page.getByText('For this page')).toBeVisible();
    await expect(
      page.getByRole('button', { name: /Understanding deliverability rate/i }),
    ).toBeVisible();

    await page
      .getByRole('button', { name: /Understanding deliverability rate/i })
      .click();
    await expect(
      page.getByRole('heading', { name: 'Understanding deliverability rate' }),
    ).toBeVisible();
    await expect(
      page.getByText('Deliverability rate shows the share of sent emails'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Back' }).click();
    await expect(page.getByText('Browse topics')).toBeVisible();
  });

  test('submits contact support form', async ({ page }) => {
    await page.goto('/workspace/settings/general');
    await page.getByRole('button', { name: 'Need help?' }).click();
    await page.getByRole('button', { name: 'Contact support', exact: true }).click();

    await expect(
      page.getByRole('heading', { name: 'Contact support' }),
    ).toBeVisible();

    await page.getByLabel('Subject').fill('Billing question');
    await page
      .getByLabel('Message')
      .fill(
        'I need help understanding how seat limits work on our current plan.',
      );
    await page.getByRole('button', { name: 'Send' }).click();

    await expect(page.getByText(/Ticket #OEQU-/)).toBeVisible();
  });

  test('opens with keyboard shortcut', async ({ page }) => {
    await page.goto('/workspace/metrics');
    await page.locator('body').click({ position: { x: 8, y: 8 } });
    await page.keyboard.press('Shift+/');

    await expect(page.getByText('Help center')).toBeVisible();
    await expect(page.getByText('For this page')).toBeVisible();
  });
});
