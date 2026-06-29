import { expect, type Page } from '@playwright/test';

const MAILPIT_API = 'http://127.0.0.1:54324/api/v1';

export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@oequ.io`;
}

export async function dismissCookieConsentIfVisible(page: Page): Promise<void> {
  const accept = page.getByRole('button', { name: 'Accept all' });
  if (await accept.isVisible().catch(() => false)) {
    await accept.click();
  }
}

export async function fetchLatestSignupOtp(email: string): Promise<string> {
  for (let attempt = 0; attempt < 24; attempt++) {
    const listRes = await fetch(`${MAILPIT_API}/messages?limit=25`);
    if (listRes.ok) {
      const json = (await listRes.json()) as {
        messages?: {
          ID: string;
          To?: { Address?: string }[];
        }[];
      };
      for (const msg of json.messages ?? []) {
        const to = (msg.To ?? [])
          .map((t) => t.Address ?? '')
          .join(' ')
          .toLowerCase();
        if (!to.includes(email.toLowerCase())) {
          continue;
        }
        const detailRes = await fetch(`${MAILPIT_API}/message/${msg.ID}`);
        if (!detailRes.ok) {
          continue;
        }
        const detail = (await detailRes.json()) as {
          Text?: string;
          HTML?: string;
        };
        const text = detail.Text ?? detail.HTML ?? '';
        const match = text.match(/\b(\d{6})\b/);
        if (match?.[1]) {
          return match[1];
        }
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`No signup OTP in Mailpit for ${email}`);
}

/** API console: register → confirm email → overview (no B2B onboarding). */
export async function registerApiConsoleUser(
  page: Page,
  email: string,
  password = 'password123',
): Promise<void> {
  await page.goto('/auth/register');
  await dismissCookieConsentIfVisible(page);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password', { exact: true }).fill(password);
  await page.getByLabel('Confirm password').fill(password);
  await page.locator('#register-accept-terms').click();
  await page.locator('#register-accept-privacy').click();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/auth\/confirm-email/);

  const otp = await fetchLatestSignupOtp(email);
  await page.locator('#confirm-otp').fill(otp);
  await page.getByRole('button', { name: 'Confirm email' }).click();
  await expect(page).toHaveURL(/\/overview/);
  await expect(page.getByRole('heading', { name: 'Overview' })).toBeVisible();
}

/** Create a key on /keys and return the one-time secret from the dialog. */
export async function createApiKeyViaUi(
  page: Page,
  name: string,
): Promise<string> {
  await page.goto('/keys');
  await dismissCookieConsentIfVisible(page);
  await expect(
    page.getByRole('heading', { name: 'API keys', exact: true }),
  ).toBeVisible();
  await page
    .getByRole('button', { name: '+ Create API key', exact: true })
    .first()
    .click();
  await page.getByLabel('Name').fill(name);
  await page.getByRole('button', { name: 'Add', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'API key created', exact: true }),
  ).toBeVisible();

  const secretEl = page.locator('hlm-dialog-content .font-mono').last();
  await expect(secretEl).toBeVisible();
  const secret = (await secretEl.textContent())?.trim() ?? '';
  if (!/^oeq_[a-f0-9]+$/.test(secret)) {
    throw new Error('API key secret not shown in create dialog');
  }

  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'API key created', exact: true }),
  ).toBeHidden();
  return secret;
}

/** Playground preset POST /demo-runs — expects HTTP 200; returns run id. */
export async function playgroundPostDemoRuns(
  page: Page,
  apiSecret: string,
): Promise<string> {
  await page.goto('/playground');
  await dismissCookieConsentIfVisible(page);
  await expect(
    page.getByRole('heading', { name: 'Playground', exact: true }),
  ).toBeVisible();
  await page.locator('#pg-api-key').fill(apiSecret);
  await page.locator('hlm-select-trigger').click();
  await page.getByRole('option', { name: 'POST /demo-runs', exact: true }).click();
  await page.getByRole('button', { name: 'Send request', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: /Response \(200\)/ }),
  ).toBeVisible({ timeout: 45_000 });

  const body = await page.locator('pre').innerText();
  const match = body.match(/"id"\s*:\s*"([0-9a-f-]{36})"/i);
  if (!match?.[1]) {
    throw new Error(`No demo run id in playground response: ${body.slice(0, 400)}`);
  }
  return match[1];
}

/** Playground preset GET /account — expects HTTP 200 in the response panel. */
export async function playgroundGetAccount(
  page: Page,
  apiSecret: string,
  expectedStatus: 200 | 401,
): Promise<void> {
  await page.goto('/playground');
  await dismissCookieConsentIfVisible(page);
  await expect(
    page.getByRole('heading', { name: 'Playground', exact: true }),
  ).toBeVisible();
  await page.locator('#pg-api-key').fill(apiSecret);
  await page.getByRole('button', { name: 'Send request', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: `Response (${expectedStatus})` }),
  ).toBeVisible({ timeout: 45_000 });
}

export async function revokeApiKeyViaUi(
  page: Page,
  keyName: string,
): Promise<void> {
  await page.goto('/keys');
  await dismissCookieConsentIfVisible(page);
  await expect(page.getByText(keyName, { exact: true })).toBeVisible();
  await page
    .getByRole('button', {
      name: `Actions for ${keyName}`,
      exact: true,
    })
    .click();
  await page.getByRole('menuitem', { name: 'Revoke', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Revoke API key', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Revoke key', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Revoke API key', exact: true }),
  ).toBeHidden({ timeout: 15_000 });
}

export async function signInApiConsoleUser(
  page: Page,
  email: string,
  password = 'password123',
): Promise<void> {
  await page.goto('/auth/login');
  await dismissCookieConsentIfVisible(page);
  await page.locator('#login-email').fill(email);
  await page.locator('#login-password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/overview/);
}
