import { test, expect } from '@playwright/test';
import {
  LUMEN_WORKSPACE,
  PARCEL_WORKSPACE,
  NOVA_WORKSPACE,
  resetMockDemoState,
  switchWorkspace,
  waitForBillingLoaded,
  waitForMembersPageLoaded,
} from './workspace.helpers';

test.describe('Billing v0.3 (mock demo)', () => {
  test.beforeEach(async ({ page }) => {
    await resetMockDemoState(page);
  });
  test('upgrade funnel: trialing workspace в†’ mock checkout в†’ active plan', async ({
    page,
  }) => {
    await page.goto('/workspace/settings/billing');
    await switchWorkspace(page, NOVA_WORKSPACE);

    await expect(page.getByText('You are on a trial.')).toBeVisible();
    await waitForBillingLoaded(page);

    await expect(
      page.getByRole('heading', { name: 'Subscription Plan' }).locator('..').getByText('Pro Plan'),
    ).toBeVisible();
    await expect(page.getByText('Status:').locator('..')).toContainText('Trial');

    await page.getByRole('button', { name: 'Change subscription plan' }).click();
    await expect(
      page.getByRole('heading', { name: 'Change subscription plan' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 4, name: 'Free' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 4, name: 'Pro' })).toBeVisible();
    await expect(page.getByRole('heading', { level: 4, name: 'Team' })).toBeVisible();

    await page.getByRole('button', { name: 'Upgrade to Team' }).click();
    await expect(page.getByRole('heading', { name: 'Upgrade to Team' })).toBeVisible();
    await page
      .getByRole('button', { name: 'Simulate payment success' })
      .waitFor({ state: 'visible' });
    await page.getByRole('button', { name: 'Simulate payment success' }).click();

    await expect(
      page.getByRole('heading', { name: 'Subscription Plan' }).locator('..').getByText('Team Plan'),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Status:').locator('..')).toContainText('Active');
    await expect(page.getByText('Plan updated successfully.')).toBeVisible();

    await page.reload();
    await waitForBillingLoaded(page);
    await expect(page.getByText('You are on a trial.')).toHaveCount(0);
  });

  test('seats: Lumen at limit shows error only when inviting', async ({
    page,
  }) => {
    await page.goto('/workspace/settings/members');
    await switchWorkspace(page, LUMEN_WORKSPACE);
    await waitForMembersPageLoaded(page);
    await expect(page.getByText(/Seat limit reached/)).toHaveCount(0);
    await expect(page.getByText(/\d+ \/ \d+ used/)).toHaveCount(0);

    await page.getByRole('button', { name: '+ Invite member' }).click();
    await expect(
      page.getByRole('alert').getByText(/All seats are in use \(4 \/ 3\)/),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Upgrade your plan' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Send invite' })).toBeDisabled();

    await page.getByLabel('Email address').fill('over.limit@oequ.io');
    await page.getByRole('button', { name: 'Send invite' }).click();
    await expect(page.getByRole('button', { name: 'Send invite' })).toBeDisabled();
  });

  test('downgrade: Parcel Team to Pro updates seat limit', async ({ page }) => {
    await page.goto('/workspace/settings/billing');
    await switchWorkspace(page, PARCEL_WORKSPACE);
    await waitForBillingLoaded(page);

    await expect(
      page.getByRole('heading', { name: 'Subscription Plan' }).locator('..').getByText('Team Plan'),
    ).toBeVisible();

    await page.getByRole('button', { name: 'Change subscription plan' }).click();
    await page.getByRole('button', { name: 'Downgrade to Pro' }).click();
    await expect(page.getByRole('heading', { name: 'Downgrade to Pro' })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm downgrade' }).click();

    await expect(page.getByText('Plan updated successfully.')).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole('heading', { name: 'Subscription Plan' }).locator('..').getByText('Pro Plan'),
    ).toBeVisible();

    await page.goto('/workspace/settings/usage');
    await expect(page.getByRole('heading', { name: 'Usage', level: 1 })).toBeVisible();
    const seatsRow = page
      .locator('div.flex.items-start')
      .filter({ has: page.getByText('Seats', { exact: true }) });
    await expect(seatsRow.locator('p.font-semibold')).toHaveText(/4 \/ 10/);
  });

  test('billing page shows subscription and invoices sections', async ({
    page,
  }) => {
    await page.goto('/workspace/settings/billing');
    await switchWorkspace(page, PARCEL_WORKSPACE);
    await waitForBillingLoaded(page);

    await expect(page.getByRole('heading', { name: 'Subscription Plan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Past Invoices' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Invoice number' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Change subscription plan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Payment Methods' })).toHaveCount(0);
  });

  test('legacy billing sub-routes redirect to unified billing page', async ({
    page,
  }) => {
    await page.goto('/workspace/settings/billing/invoices');
    await expect(page).toHaveURL(/\/workspace\/settings\/billing$/);
    await waitForBillingLoaded(page);
    await expect(page.getByRole('heading', { name: 'Past Invoices' })).toBeVisible();
  });
});
