import fs from 'node:fs';
import path from 'node:path';
import { workspaceRoot } from '@nx/devkit';
import { test } from '@playwright/test';
import {
  ACME_WORKSPACE,
  GLOBEX_WORKSPACE,
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

  test('capture billing and members previews', async ({ page }) => {
    test.setTimeout(120_000);

    await page.setViewportSize({ width: 1280, height: 800 });
    fs.mkdirSync(assetsDir, { recursive: true });
    await resetMockDemoState(page);
    await switchWorkspace(page, ACME_WORKSPACE);
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

    await switchWorkspace(page, GLOBEX_WORKSPACE);
    await page.goto('/workspace/settings/billing/overview');
    await waitForBillingLoaded(page);
    await page.getByText(/You are on a trial/).waitFor({ timeout: 15_000 });
    await page.getByRole('heading', { level: 3, name: 'Starter' }).waitFor();
    await page.screenshot({
      path: path.join(assetsDir, 'demo-billing-trial.png'),
      fullPage: false,
    });

    await page.goto('/workspace/settings/members');
    await switchWorkspace(page, ACME_WORKSPACE);
    await waitForMembersPageLoaded(page);
    await page.getByText(/Seat limit reached/).waitFor();
    await page.screenshot({
      path: path.join(assetsDir, 'demo-members-seats.png'),
      fullPage: false,
    });
  });
});
