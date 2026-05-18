import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ACTIVATION_PORT, AUTH_PORT, ORG_PORT } from '@oequ/ports';
import { firstValueFrom } from 'rxjs';

/** Requires a signed-in session; redirects to login with optional returnUrl. */
export const authGuard: CanActivateFn = async (_route, state) => {
  const authPort = inject(AUTH_PORT);
  const router = inject(Router);
  const session = await firstValueFrom(authPort.session$);

  if (session) {
    return true;
  }

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};

/** Login/register screens — redirect authenticated users into the app. */
export const guestGuard: CanActivateFn = async () => {
  const authPort = inject(AUTH_PORT);
  const router = inject(Router);
  const session = await firstValueFrom(authPort.session$);

  if (!session) {
    return true;
  }

  return router.createUrlTree(['/workspace']);
};

/**
 * `/onboarding` — create workspace (0 orgs) or activation checklist (pending).
 * Redirect away when activation is already complete.
 */
export const onboardingRouteGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const orgPort = inject(ORG_PORT);
  const activationPort = inject(ACTIVATION_PORT);

  const orgs = await firstValueFrom(orgPort.organizations$);
  if (orgs.length === 0) {
    return true;
  }

  let active = await firstValueFrom(orgPort.activeOrganization$);
  if (!active) {
    const selectResult = await orgPort.selectOrganization(orgs[0].slug);
    if (!selectResult.ok) {
      return true;
    }
    active = selectResult.data;
  }

  const result = await activationPort.getStatus(active.id);
  if (result.ok && result.data === 'complete') {
    return router.createUrlTree(['/workspace/settings/general']);
  }

  return true;
};

/** @deprecated Use onboardingRouteGuard */
export const onboardingGuard = onboardingRouteGuard;

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
