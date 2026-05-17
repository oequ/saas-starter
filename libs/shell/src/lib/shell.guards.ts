import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ORG_PORT } from '@oequ/ports';
import { firstValueFrom } from 'rxjs';

async function organizationCount(): Promise<number> {
  const orgPort = inject(ORG_PORT);
  return (await firstValueFrom(orgPort.organizations$)).length;
}

/** First-run wizard — only when the user belongs to zero workspaces. */
export const onboardingGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const count = await organizationCount();
  if (count > 0) {
    return router.createUrlTree(['/workspace']);
  }
  return true;
};

/**
 * Workspace routes require at least one org; auto-select first when in personal context.
 * Registered on `canActivate` and `canActivateChild` so org loss re-triggers redirect.
 */
export const workspaceContextGuard: CanActivateFn = async () => {
  const orgPort = inject(ORG_PORT);
  const router = inject(Router);
  const orgs = await firstValueFrom(orgPort.organizations$);

  if (orgs.length === 0) {
    return router.createUrlTree(['/onboarding']);
  }

  const active = await firstValueFrom(orgPort.activeOrganization$);
  if (active) {
    return true;
  }

  const result = await orgPort.selectOrganization(orgs[0].slug);
  return result.ok ? true : router.createUrlTree(['/onboarding']);
};

/** Entering account routes clears workspace selection (personal context). */
export const accountContextGuard: CanActivateFn = async () => {
  const orgPort = inject(ORG_PORT);
  await orgPort.selectPersonal();
  return true;
};
