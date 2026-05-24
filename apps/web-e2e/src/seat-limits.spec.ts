import { test, expect } from '@playwright/test';

import {
  bootstrapOwnerWithActiveWorkspace,
  expectInviteDialogSeatsExhausted,
  goToMembersPage,
  inviteMemberByEmail,
  uniqueEmail,
} from './web.helpers';

test.describe('seat limits @web', () => {
  test('third invite fails when workspace has three seats (owner + two invited)', async ({
    page,
  }) => {
    const workspaceName = `Seats Co ${Date.now()}`;
    const emailA = uniqueEmail('seat-a');
    const emailB = uniqueEmail('seat-b');
    const emailC = uniqueEmail('seat-c');

    await bootstrapOwnerWithActiveWorkspace(page, workspaceName);
    await goToMembersPage(page);

    await inviteMemberByEmail(page, emailA);
    await inviteMemberByEmail(page, emailB);

    await expect(page.locator('tbody tr').filter({ hasText: emailA })).toBeVisible();
    await expect(page.locator('tbody tr').filter({ hasText: emailB })).toBeVisible();

    await expectInviteDialogSeatsExhausted(page, emailC);

    await expect(page.locator('tbody tr').filter({ hasText: emailC })).toHaveCount(0);
  });
});
