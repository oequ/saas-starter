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

    await page.goto('/workspace/settings/billing');
    await waitForBillingLoaded(page);
    await page.screenshot({
      path: path.join(assetsDir, 'demo-billing.png'),
      fullPage: true,
    });

    await switchWorkspace(page, NOVA_WORKSPACE);
    await page.goto('/workspace/settings/billing');
    await waitForBillingLoaded(page);
    await page.getByText(/You are on a trial/).waitFor({ timeout: 15_000 });
    await page
      .getByRole('heading', { name: 'Subscription Plan' })
      .locator('..')
      .getByText('Pro Plan')
      .waitFor();
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

    await page.goto('/workspace/metrics');
    await expect(page.getByRole('heading', { name: 'Metrics' })).toBeVisible();
    await page.getByRole('button', { name: 'Need help?' }).click();
    await expect(page.getByText('For this page')).toBeVisible();
    await expect(page.getByText('Browse topics')).toBeVisible();
    await page.screenshot({
      path: path.join(assetsDir, 'demo-help-panel.png'),
      fullPage: false,
    });
    await page.keyboard.press('Escape');

    await switchWorkspace(page, NOVA_WORKSPACE);
    await page.goto('/workspace/settings/billing');
    await waitForBillingLoaded(page);
    await page.getByRole('button', { name: 'Change subscription plan' }).click();
    await expect(
      page.getByRole('heading', { name: 'Change subscription plan' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { level: 4, name: 'Team' })).toBeVisible();
    await page.screenshot({
      path: path.join(assetsDir, 'demo-paywall.png'),
      fullPage: false,
    });
  });
});
