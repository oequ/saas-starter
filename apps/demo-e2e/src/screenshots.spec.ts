import fs from 'node:fs';
import path from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import { expect, test } from '@playwright/test';
import {
  NOVA_WORKSPACE,
  PARCEL_WORKSPACE,
  resetMockDemoState,
  switchWorkspace,
  waitForBillingLoaded,
  waitForMembersPageLoaded,
} from './workspace.helpers';

const assetsDir = path.join(workspaceRoot, 'docs', 'assets');

test.describe('README screenshots', () => {
  test.skip(
    !process.env['UPDATE_SCREENSHOTS'],
    'Set UPDATE_SCREENSHOTS=1 to regenerate docs/assets/*.png',
  );

  test('capture workspace previews', async ({ page }) => {
    test.setTimeout(180_000);

    await page.setViewportSize({ width: 1280, height: 800 });
    fs.mkdirSync(assetsDir, { recursive: true });
    await resetMockDemoState(page);
    await switchWorkspace(page, PARCEL_WORKSPACE);

    await page.goto('/onboarding');
    await expect(
      page.getByRole('heading', { name: 'Send your first email' }),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(assetsDir, 'demo-onboarding.png'),
      fullPage: false,
    });

    await page.goto('/workspace/metrics');
    await expect(page.getByRole('heading', { name: 'Metrics' })).toBeVisible();
    await expect(page.getByText('Emails sent', { exact: true })).toBeVisible();
    await page.locator('canvas').first().waitFor();
    await page.screenshot({
      path: path.join(assetsDir, 'demo-metrics.png'),
      fullPage: false,
    });

    await page.goto('/workspace/api-keys');
    await expect(page.getByRole('heading', { name: 'API keys' })).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'No API keys yet' }),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(assetsDir, 'demo-api-keys.png'),
      fullPage: false,
    });

    await page.goto('/workspace/settings/general');
    await expect(
      page.getByRole('heading', { name: 'Workspace name' }),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(assetsDir, 'demo-settings.png'),
      fullPage: false,
    });

    await page.goto('/workspace/settings/billing/overview');
    await waitForBillingLoaded(page);
    await page.screenshot({
      path: path.join(assetsDir, 'demo-billing-overview.png'),
      fullPage: false,
    });

    await page.goto('/workspace/settings/billing/invoices');
    await page.getByRole('columnheader', { name: 'Date' }).waitFor();
    await page.screenshot({
      path: path.join(assetsDir, 'demo-billing-invoices.png'),
      fullPage: false,
    });

    await page.goto('/workspace/settings/billing/payment');
    await expect(
      page.getByRole('heading', { name: 'Payment method' }),
    ).toBeVisible();
    await page.screenshot({
      path: path.join(assetsDir, 'demo-billing-payment.png'),
      fullPage: false,
    });

    await switchWorkspace(page, NOVA_WORKSPACE);
    await page.goto('/workspace/settings/billing/overview');
    await waitForBillingLoaded(page);
    await page.getByText(/You are on a trial/).waitFor({ timeout: 15_000 });
    await page.getByRole('heading', { level: 3, name: 'Starter' }).waitFor();
    await page.screenshot({
      path: path.join(assetsDir, 'demo-billing-trial.png'),
      fullPage: false,
    });

    await page.goto('/workspace/settings/members');
    await waitForMembersPageLoaded(page);
    await expect(page.getByText('2 / 10 used')).toBeVisible();
    await page.screenshot({
      path: path.join(assetsDir, 'demo-members.png'),
      fullPage: false,
    });

    await switchWorkspace(page, PARCEL_WORKSPACE);
    await page.goto('/workspace/settings/members');
    await waitForMembersPageLoaded(page);
    await page.getByText(/Seat limit reached/).waitFor();
    await page.screenshot({
      path: path.join(assetsDir, 'demo-members-seats.png'),
      fullPage: false,
    });
  });
});
