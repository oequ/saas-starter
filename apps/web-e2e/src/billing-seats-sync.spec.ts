import { test, expect } from '@playwright/test';

import {
  bootstrapOwnerWithActiveWorkspace,
  downgradeWorkspaceToPlan,
  expectInviteDialogSeatsExhausted,
  goToBillingPage,
  goToMembersPage,
  inviteMemberByEmail,
  inviteMemberByEmailExpectingSeatSync,
  uniqueEmail,
  upgradeViaPaywallFromInviteDialog,
  upgradeWorkspaceToPlan,
  waitForMembersPageLoaded,
} from './web.helpers';

test.describe('billing seats sync @web', () => {
  test('upgrade to Pro unlocks third invite on Free plan', async ({ page }) => {
    const workspaceName = `Billing Upgrade ${Date.now()}`;
    const emailA = uniqueEmail('bill-a');
    const emailB = uniqueEmail('bill-b');
    const emailC = uniqueEmail('bill-c');

    await bootstrapOwnerWithActiveWorkspace(page, workspaceName);
    await goToMembersPage(page);

    await inviteMemberByEmail(page, emailA);
    await inviteMemberByEmail(page, emailB);
    await expect(page.locator('tbody tr').filter({ hasText: emailB })).toBeVisible();
    await expectInviteDialogSeatsExhausted(page, emailC);

    await upgradeViaPaywallFromInviteDialog(page, 'Pro');
    await inviteMemberByEmail(page, emailC);
    await expect(page.locator('tbody tr').filter({ hasText: emailC })).toBeVisible();
  });

  test('Team at seat cap syncs subscription then invites second member', async ({
    page,
  }) => {
    const workspaceName = `Billing Team Bump ${Date.now()}`;
    const emailB = uniqueEmail('bill-team-b');

    await bootstrapOwnerWithActiveWorkspace(page, workspaceName);
    await goToBillingPage(page);
    await upgradeWorkspaceToPlan(page, 'Team');
    await goToMembersPage(page);
    await page.reload();
    await waitForMembersPageLoaded(page);

    await inviteMemberByEmailExpectingSeatSync(page, emailB);
    await expect(page.locator('tbody tr').filter({ hasText: emailB })).toBeVisible();

    await goToBillingPage(page);
    await expect(
      page.getByRole('heading', { name: 'Subscription Plan' }).locator('..').getByText('Team Plan'),
    ).toBeVisible();
  });

  test('downgrade to Free blocks invite when at seat cap', async ({ page }) => {
    const workspaceName = `Billing Downgrade ${Date.now()}`;
    const emailA = uniqueEmail('bill-dg-a');
    const emailB = uniqueEmail('bill-dg-b');
    const emailC = uniqueEmail('bill-dg-c');

    await bootstrapOwnerWithActiveWorkspace(page, workspaceName);
    await goToBillingPage(page);
    await upgradeWorkspaceToPlan(page, 'Pro');
    await goToMembersPage(page);

    await inviteMemberByEmail(page, emailA);
    await inviteMemberByEmail(page, emailB);

    await downgradeWorkspaceToPlan(page, 'Free');
    await goToMembersPage(page);
    await expectInviteDialogSeatsExhausted(page, emailC);
  });
});
