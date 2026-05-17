import { expect, type Page } from '@playwright/test';

/** Default mock workspace (Acme Corp, 5/5 seats). */
export const ACME_WORKSPACE = 'Acme Corp';

/** Trialing workspace for upgrade funnel and trial banner. */
export const GLOBEX_WORKSPACE = 'Globex';

const WORKSPACE_SLUG_BY_NAME: Record<string, string> = {
  [ACME_WORKSPACE]: 'acme',
  [GLOBEX_WORKSPACE]: 'globex',
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

export async function waitForMembersBillingLoaded(page: Page): Promise<void> {
  await page.getByText('Loading seat usage…').waitFor({ state: 'hidden' });
}
