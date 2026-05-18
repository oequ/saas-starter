import { test, expect } from '@playwright/test';
import {
  ACME_WORKSPACE,
  GLOBEX_WORKSPACE,
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
    await page.goto('/workspace/settings/billing/overview');
    await switchWorkspace(page, GLOBEX_WORKSPACE);

    await expect(page.getByText('You are on a trial.')).toBeVisible();
    await waitForBillingLoaded(page);

    await expect(page.getByRole('heading', { level: 3, name: 'Starter' })).toBeVisible();
    await expect(page.getByText('Status:').locator('..')).toContainText('Trial');

    await page.getByRole('button', { name: 'Upgrade plan' }).click();
    await expect(page.getByRole('heading', { name: 'Upgrade plan' })).toBeVisible();
    await page
      .getByText('Initializing secure checkout…')
      .waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Simulate payment success' }).click();

    await expect(
      page.getByRole('heading', { level: 3, name: 'Professional' }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText('Status:')).toContainText('Active');
    await expect(page.getByText('Plan upgraded successfully.')).toBeVisible();

    await page.reload();
    await waitForBillingLoaded(page);
    await expect(page.getByText('You are on a trial.')).toHaveCount(0);
  });

  test('seats: Acme at limit blocks invite and links to billing', async ({
    page,
  }) => {
    await page.goto('/workspace/settings/members');
    await switchWorkspace(page, ACME_WORKSPACE);
    await waitForMembersPageLoaded(page);
    await expect(page.getByText(/Seat limit reached/)).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'upgrade your plan' }),
    ).toHaveAttribute('href', /\/workspace\/settings\/billing\/overview/);

    const inviteButton = page.getByRole('button', { name: 'Invite member' });
    await expect(inviteButton).toBeDisabled();
  });

  test('billing sidebar navigates overview, invoices, and payment', async ({
    page,
  }) => {
    await page.goto('/workspace/settings/general');
    await switchWorkspace(page, ACME_WORKSPACE);

    await page.getByRole('button', { name: 'Billing' }).click();
    await page.getByRole('link', { name: 'Overview' }).click();
    await expect(page).toHaveURL(/\/workspace\/settings\/billing\/overview/);
    await waitForBillingLoaded(page);
    await expect(page.getByRole('button', { name: 'Upgrade plan' })).toBeVisible();

    await page.getByRole('link', { name: 'Invoices' }).click();
    await expect(page).toHaveURL(/\/workspace\/settings\/billing\/invoices/);
    await expect(page.getByRole('columnheader', { name: 'Date' })).toBeVisible();

    await page.getByRole('link', { name: 'Payment method' }).click();
    await expect(page).toHaveURL(/\/workspace\/settings\/billing\/payment/);
    await expect(
      page.getByRole('button', { name: 'Manage in portal' }),
    ).toBeVisible();
  });
});
