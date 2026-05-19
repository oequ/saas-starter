import { test, expect } from '@playwright/test';
import {
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
  test('upgrade funnel: trialing workspace → mock checkout → active plan', async ({
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
    await expect(page.getByText('Plan upgraded successfully.')).toBeVisible();

    await page.reload();
    await waitForBillingLoaded(page);
    await expect(page.getByText('You are on a trial.')).toHaveCount(0);
  });

  test('seats: Parcel at limit shows error only when inviting', async ({
    page,
  }) => {
    await page.goto('/workspace/settings/members');
    await switchWorkspace(page, PARCEL_WORKSPACE);
    await waitForMembersPageLoaded(page);
    await expect(page.getByText(/Seat limit reached/)).toHaveCount(0);
    await expect(page.getByText(/\d+ \/ \d+ used/)).toHaveCount(0);

    await page.getByRole('button', { name: '+ Invite member' }).click();
    await page.getByLabel('Email address').fill('over.limit@example.com');
    await page.getByRole('button', { name: 'Send invite' }).click();

    await expect(
      page.getByText('No seats available. Upgrade your plan.'),
    ).toBeVisible();
  });

  test('billing page shows subscription, invoices, and payment sections', async ({
    page,
  }) => {
    await page.goto('/workspace/settings/billing');
    await switchWorkspace(page, PARCEL_WORKSPACE);
    await waitForBillingLoaded(page);

    await expect(page.getByRole('heading', { name: 'Subscription Plan' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Past Invoices' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Payment Methods' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Invoice number' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Change subscription plan' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Add new card' })).toBeVisible();
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
