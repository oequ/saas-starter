import { test, expect } from '@playwright/test';

import { resetMockDemoState } from './workspace.helpers';

test.describe('metrics', () => {
  test('loads workspace metrics dashboard', async ({ page }) => {
    await resetMockDemoState(page);
    await page.goto('/workspace/metrics');

    await expect(page.getByRole('heading', { name: 'Metrics' })).toBeVisible();
    await expect(page.getByText('All domains')).toBeVisible();
    await expect(page.getByText('Last 15 days')).toBeVisible();

    await expect(page.getByText('Emails', { exact: true })).toBeVisible();
    await expect(page.getByText('Deliverability rate', { exact: true })).toBeVisible();
    await expect(page.getByText('Bounce rate', { exact: true })).toBeVisible();
    await expect(page.getByText('Complain rate', { exact: true })).toBeVisible();

    await expect(page.locator('canvas').first()).toBeVisible();
    await expect(page.getByText('100%')).toBeVisible();
    await expect(
      page.getByText('Data is updated every 15 minutes'),
    ).toBeVisible();
  });
});
