import { expect, type Page } from '@playwright/test';

export const WEB_ACTIVATION_HEADING = 'Welcome to your demo workspace';

/** Dismiss cookie banner when present (blocks clicks on onboarding). */
export async function dismissCookieConsentIfVisible(page: Page): Promise<void> {
  const accept = page.getByRole('button', { name: 'Accept all' });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`;
}

export async function registerUser(
  page: Page,
  email: string,
  password = 'password123',
): Promise<void> {
  await page.goto('/auth/register');
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.locator('#register-accept-terms').click();
  await page.locator('#register-accept-privacy').click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/onboarding$/);
}

export async function signInUser(
  page: Page,
  email: string,
  password = 'password123',
): Promise<void> {
  await page.goto('/auth/login');
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
}

export async function signOutViaMenu(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'User menu' }).click();
  await page.getByRole('menuitem', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/auth\/login$/);
}

export async function createWorkspaceViaOnboarding(
  page: Page,
  workspaceName: string,
): Promise<string> {
  await dismissCookieConsentIfVisible(page);
  await expect(
    page.getByRole('heading', { name: 'Create your workspace' }),
  ).toBeVisible();
  await page.getByLabel('Workspace name').fill(workspaceName);
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toContainText(
    workspaceName,
    { timeout: 30_000 },
  );
  await expect(
    page.getByRole('heading', { name: WEB_ACTIVATION_HEADING }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole('button', { name: 'Simulate sends' })).toBeVisible();
  return workspaceName;
}

/** Mock activation: simulate sends, land on Metrics. */
export async function completeActivationViaOnboarding(page: Page): Promise<void> {
  await dismissCookieConsentIfVisible(page);
  await page.getByRole('button', { name: 'Simulate sends' }).click();
  await expect(
    page.getByRole('heading', { name: 'Simulate send history' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Run simulation' }).click();
  await expect(page).toHaveURL(/\/workspace\/metrics$/);
}

export async function openWorkspaceSwitcher(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Switch workspace' }).click();
}

export async function waitForMembersPageLoaded(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
}

/** Register, create workspace, complete mock activation (owner ready for Members). */
export async function bootstrapOwnerWithActiveWorkspace(
  page: Page,
  workspaceName: string,
  email = uniqueEmail('owner'),
  password = 'password123',
): Promise<void> {
  await registerUser(page, email, password);
  await createWorkspaceViaOnboarding(page, workspaceName);
  await completeActivationViaOnboarding(page);
  await expect(page).toHaveURL(/\/workspace\/metrics$/);
}

export async function goToMembersPage(page: Page): Promise<void> {
  if (page.url().includes('/workspace/settings/members')) {
    await waitForMembersPageLoaded(page);
    return;
  }
  await page.locator('a[href="/workspace/settings/members"]').click();
  await expect(page).toHaveURL(/\/workspace\/settings\/members$/);
  await waitForMembersPageLoaded(page);
}

export async function goToApiKeysPage(page: Page): Promise<void> {
  if (page.url().includes('/workspace/api-keys')) {
    await expect(
      page.getByRole('heading', { name: 'API keys', level: 1 }),
    ).toBeVisible();
    return;
  }
  await page.getByRole('link', { name: 'API keys' }).click();
  await expect(page).toHaveURL(/\/workspace\/api-keys$/);
  await expect(
    page.getByRole('heading', { name: 'API keys', level: 1 }),
  ).toBeVisible();
}

export async function goToEmailsPage(page: Page): Promise<void> {
  if (page.url().includes('/workspace/emails')) {
    await expect(
      page.getByRole('heading', { name: 'Emails', level: 1 }),
    ).toBeVisible();
    return;
  }
  await page.getByRole('link', { name: 'Emails' }).click();
  await expect(page).toHaveURL(/\/workspace\/emails$/);
  await expect(
    page.getByRole('heading', { name: 'Emails', level: 1 }),
  ).toBeVisible();
}

export async function inviteMemberByEmail(page: Page, email: string): Promise<void> {
  await page.getByRole('button', { name: '+ Invite member' }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Send invite' }).click();
  await expect(
    page.getByText(`Invitation sent to ${email}.`),
  ).toBeVisible();
}

/** Team at seat cap: mock bumps seats_limit in Postgres, then invites. */
export async function inviteMemberByEmailExpectingSeatSync(
  page: Page,
  email: string,
): Promise<void> {
  await page.getByRole('button', { name: '+ Invite member' }).click();
  await page.getByLabel('Email address').fill(email);
  await page.getByRole('button', { name: 'Send invite' }).click();
  await expect(
    page.getByText(`Invitation sent to ${email}.`),
  ).toBeVisible({ timeout: 15_000 });
}

/** Opens invite dialog when seat cap is reached (UI gate before RPC). */
export async function expectInviteDialogSeatsExhausted(
  page: Page,
  email?: string,
): Promise<void> {
  await page.getByRole('button', { name: '+ Invite member' }).click();
  if (email) {
    await page.getByLabel('Email address').fill(email);
  }
  await expect(
    page
      .getByRole('alert')
      .filter({ hasText: /All seats (are in use|on your plan are in use)/ }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Send invite' })).toBeDisabled();
  await page.getByRole('button', { name: 'Cancel' }).click();
}

export async function goToBillingPage(page: Page): Promise<void> {
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toBeVisible({
    timeout: 30_000,
  });
  await page.getByRole('link', { name: 'Billing' }).click();
  await expect(page).toHaveURL(/\/workspace\/settings\/billing$/, { timeout: 30_000 });
  await expect(page.getByRole('heading', { name: 'Billing', level: 1 })).toBeVisible();
}

/** Opens paywall from the invite dialog “Upgrade your plan” action. */
export async function upgradeViaPaywallFromInviteDialog(
  page: Page,
  planName: 'Pro' | 'Team',
): Promise<void> {
  await page.getByRole('button', { name: '+ Invite member' }).click();
  await page.getByRole('button', { name: 'Upgrade your plan' }).click();
  await expect(
    page.getByRole('heading', { name: 'Change subscription plan' }),
  ).toBeVisible();
  await page.getByRole('button', { name: `Upgrade to ${planName}` }).click();
  await page.getByRole('button', { name: 'Simulate payment success' }).click();
  await expect(
    page.getByRole('heading', { name: 'Change subscription plan' }),
  ).toHaveCount(0, { timeout: 15_000 });
}

export async function expectWorkspaceInSwitcher(
  page: Page,
  workspaceName: string,
): Promise<void> {
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toContainText(
    workspaceName,
    { timeout: 30_000 },
  );
}

export async function upgradeWorkspaceToPlan(
  page: Page,
  planName: 'Pro' | 'Team',
): Promise<void> {
  if (!page.url().includes('/workspace/settings/billing')) {
    await goToBillingPage(page);
  }
  await page.getByRole('button', { name: 'Change subscription plan' }).click();
  await page.getByRole('button', { name: `Upgrade to ${planName}` }).click();
  await page.getByRole('button', { name: 'Simulate payment success' }).click();
  await expect(page.getByText('Plan updated successfully.')).toBeVisible({
    timeout: 15_000,
  });
}

export async function downgradeWorkspaceToPlan(
  page: Page,
  planName: 'Free' | 'Pro',
): Promise<void> {
  await goToBillingPage(page);
  await page.getByRole('button', { name: 'Change subscription plan' }).click();
  await page.getByRole('button', { name: `Downgrade to ${planName}` }).click();
  await page.getByRole('button', { name: 'Confirm downgrade' }).click();
  await expect(page.getByText('Plan updated successfully.')).toBeVisible({
    timeout: 15_000,
  });
}
