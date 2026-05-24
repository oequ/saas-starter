import { test, expect } from '@playwright/test';

import {
  completeActivationViaOnboarding,
  createWorkspaceViaOnboarding,
  goToApiKeysPage,
  registerUser,
  uniqueEmail,
} from './web.helpers';

test.describe('API keys tenant isolation @web', () => {
  test('user B does not see user A workspace on API keys route', async ({
    browser,
  }) => {
    const workspaceName = `Keys ${Date.now()}`;
    const emailA = uniqueEmail('keys-a');
    const emailB = uniqueEmail('keys-b');

    const contextA = await browser.newContext();
    const contextB = await browser.newContext();
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    await registerUser(pageA, emailA);
    await createWorkspaceViaOnboarding(pageA, workspaceName);
    await completeActivationViaOnboarding(pageA);

    await goToApiKeysPage(pageA);

    await registerUser(pageB, emailB);
    await createWorkspaceViaOnboarding(pageB, `Other ${Date.now()}`);

    await goToApiKeysPage(pageB);
    await expect(pageB.getByText(workspaceName)).toHaveCount(0);

    await contextA.close();
    await contextB.close();
  });
});
