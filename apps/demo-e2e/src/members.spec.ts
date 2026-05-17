import { test, expect } from '@playwright/test';

import {
  GLOBEX_WORKSPACE,
  resetMockDemoState,
  switchWorkspace,
  waitForMembersBillingLoaded,
} from './workspace.helpers';

test.describe.configure({ mode: 'serial' });

test.describe('members', () => {
  test('invites a member and shows success toast', async ({ page }) => {
    await resetMockDemoState(page);
    await page.goto('/workspace/settings/members');
    await switchWorkspace(page, GLOBEX_WORKSPACE);
    await waitForMembersBillingLoaded(page);
    await expect(page.getByText('2 / 10 used')).toBeVisible();

    await page.getByRole('button', { name: 'Invite member' }).click();
    await page.getByLabel('Email address').fill('new.teammate@example.com');
    await page.getByRole('button', { name: 'Send invite' }).click();

    await expect(page.getByText('Invitation sent to new.teammate@example.com.')).toBeVisible();
    await expect(
      page.locator('tbody').getByText('new.teammate@example.com'),
    ).toBeVisible();
  });

  test('removes a non-owner member', async ({ page }) => {
    await resetMockDemoState(page);
    await page.goto('/workspace/settings/members');
    await waitForMembersBillingLoaded(page);

    await expect(page.getByText('Alex Rivera')).toBeVisible();

    await page
      .getByRole('button', { name: 'Actions for Alex Rivera' })
      .click();
    await page.getByRole('menuitem', { name: 'Remove' }).click();
    await page.getByRole('button', { name: 'Remove member' }).click();

    await expect(page.getByText('Alex Rivera was removed from the workspace.')).toBeVisible();
    await expect(page.getByText('Alex Rivera')).toHaveCount(0);
  });
});
