import { test, expect } from '@playwright/test';

import { resetMockDemoState } from './workspace.helpers';

test.describe('metrics', () => {
  test('loads workspace metrics dashboard', async ({ page }) => {
    await resetMockDemoState(page);
    await page.goto('/workspace/metrics');

    await expect(page.getByRole('heading', { name: 'Metrics' })).toBeVisible();
    await expect(page.getByText('All domains')).toBeVisible();
    await expect(page.getByRole('group', { name: 'Time period' })).toBeVisible();
    await expect(page.getByRole('button', { name: '15d', pressed: true })).toBeVisible();

    await expect(page.getByText('Emails sent', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Deliverability', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Bounce rate', { exact: true }).first()).toBeVisible();
    await expect(page.getByText('Complain rate', { exact: true }).first()).toBeVisible();

    await expect(page.locator('canvas').first()).toBeVisible();
    await expect(
      page.getByText('Data is updated every 15 minutes'),
    ).toBeVisible();
  });
});
