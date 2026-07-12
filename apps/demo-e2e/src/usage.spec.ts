import { test, expect } from '@playwright/test';
import {
  LUMEN_WORKSPACE,
  NOVA_WORKSPACE,
  PARCEL_WORKSPACE,
  resetMockDemoState,
  switchWorkspace,
  waitForUsageLoaded,
} from './workspace.helpers';

test.describe('Usage (mock demo)', () => {
  test.beforeEach(async ({ page }) => {
    await resetMockDemoState(page);
  });

  test('Parcel: usage page shows summary, seats, and meters', async ({
    page,
  }) => {
    await page.goto('/workspace/settings/usage');
    await switchWorkspace(page, PARCEL_WORKSPACE);
    await waitForUsageLoaded(page);

    await expect(page.getByRole('heading', { name: 'Usage Summary' })).toBeVisible();
    const seatsRow = page
      .locator('div.flex.items-start')
      .filter({ has: page.getByText('Seats', { exact: true }) });
    await expect(seatsRow.locator('p.font-semibold')).toHaveText(/4 \/ 50/);
    await expect(page.getByText(/8 \/ 100,?000 emails/)).toBeVisible();
    await expect(page.getByText('Monthly Active SSO Users')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Upgrade' })).toHaveCount(0);
  });

  test('Nova: locked premium features show unavailable state and Upgrade', async ({
    page,
  }) => {
    await page.goto('/workspace/settings/usage');
    await switchWorkspace(page, NOVA_WORKSPACE);
    await waitForUsageLoaded(page);

    await expect(page.getByText('Monthly Active SSO Users')).toBeVisible();
    await expect(page.getByText('Storage Image Transformations')).toBeVisible();
    await expect(page.getByText('Unavailable in plan')).toHaveCount(2);
    await expect(page.getByRole('button', { name: 'Upgrade' })).toHaveCount(2);
    const seatsRow = page
      .locator('div.flex.items-start')
      .filter({ has: page.getByText('Seats', { exact: true }) });
    await expect(seatsRow.locator('p.font-semibold')).toHaveText(/4 \/ 10/);
  });

  test('Lumen (Free): Upgrade opens paywall for locked features', async ({
    page,
  }) => {
    await page.goto('/workspace/settings/usage');
    await switchWorkspace(page, LUMEN_WORKSPACE);
    await waitForUsageLoaded(page);

    await expect(page.getByText('Organization is on the Free Plan')).toBeVisible();
    await expect(page.getByText('Unavailable in plan')).toHaveCount(2);

    await page.getByRole('button', { name: 'Upgrade' }).first().click();
    await expect(
      page.getByRole('heading', { name: 'Change subscription plan' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 4, name: 'Team' })).toBeVisible();
  });

  test('sidebar Usage link navigates to usage page', async ({ page }) => {
    await page.goto('/workspace/settings/general');

    await page.getByRole('link', { name: 'Usage' }).click();
    await expect(page).toHaveURL(/\/workspace\/settings\/usage$/);
    await waitForUsageLoaded(page);
    await expect(page.getByRole('heading', { name: 'Usage', level: 1 })).toBeVisible();
  });
});
