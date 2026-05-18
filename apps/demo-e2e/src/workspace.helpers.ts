import { expect, type Page } from '@playwright/test';

/** Default mock workspace (Parcel, 5/5 seats). */
export const PARCEL_WORKSPACE = 'Parcel';

/** Trialing workspace for upgrade funnel and trial banner. */
export const NOVA_WORKSPACE = 'Nova';

const WORKSPACE_SLUG_BY_NAME: Record<string, string> = {
  [PARCEL_WORKSPACE]: 'parcel',
  [NOVA_WORKSPACE]: 'nova',
};

export async function resetMockDemoState(page: Page): Promise<void> {
  await page.goto('/workspace/settings/general');
  await page.evaluate(() => window.__oequResetMock?.());
}

export async function setZeroOrganizations(page: Page): Promise<void> {
  await page.goto('/account/profile');
  await page.evaluate(() => {
    sessionStorage.setItem('oequ-demo-zero-orgs', '1');
    window.__oequSetZeroOrgs?.();
  });
  await page.reload();
  await page.waitForFunction(() => window.__oequOrganizationCount?.() === 0);
}

export async function switchWorkspace(
  page: Page,
  workspaceName: string,
): Promise<void> {
  const slug = WORKSPACE_SLUG_BY_NAME[workspaceName] ?? workspaceName;
  await page.evaluate(async (workspaceSlug) => {
    await window.__oequSelectWorkspace?.(workspaceSlug);
  }, slug);
  await expect(page.getByRole('button', { name: 'Switch workspace' })).toContainText(
    workspaceName,
  );
}

export async function waitForBillingLoaded(page: Page): Promise<void> {
  await page.getByText('Loading billing…').waitFor({ state: 'hidden' });
}

export async function waitForMembersPageLoaded(page: Page): Promise<void> {
  await expect(page.getByRole('heading', { name: 'Members' })).toBeVisible();
  await expect(page.getByRole('table')).toBeVisible();
}

/** Creates a workspace from the zero-org onboarding form and waits for activation UI. */
export async function createWorkspaceViaOnboarding(
  page: Page,
  workspaceName: string,
): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'Create your workspace' }),
  ).toBeVisible();
  await page.getByLabel('Workspace name').fill(workspaceName);
  await page.getByRole('button', { name: 'Create workspace' }).click();
  await expect(
    page.getByRole('heading', { name: 'Send your first email' }),
  ).toBeVisible();
}

/** Mock activation: add API key, send email, land on general settings. */
export async function completeActivationViaOnboarding(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Add API Key' }).click();
  await page.getByRole('button', { name: 'Send email' }).click();
  await expect(page).toHaveURL(/\/workspace\/settings\/general$/);
}
