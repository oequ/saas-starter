import { inject } from '@angular/core';
import { CanActivateFn, Router, type UrlTree } from '@angular/router';
import { AUTH_PORT, ORG_PORT, type Organization } from '@oequ/ports';
import { firstValueFrom } from 'rxjs';

import { isApiShell, SHELL_CONFIG } from './shell-config';

/** Build a URL tree from `postAuthRoute` (e.g. `overview` or `workspace`). */
export function postAuthUrlTree(router: Router, postAuthRoute: string): UrlTree {
  const segments = postAuthRoute.split('/').filter((segment) => segment.length > 0);
  return router.createUrlTree(['/', ...segments]);
}

/** Await org list hydration after full reload (Supabase starts with []). */
async function ensureOrganizationsLoaded(): Promise<readonly Organization[]> {
  const authPort = inject(AUTH_PORT);
  const orgPort = inject(ORG_PORT);
  const session = await firstValueFrom(authPort.session$);
  if (session) {
    await orgPort.listOrganizations();
  }
  return firstValueFrom(orgPort.organizations$);
}

/** API console: ensure a workspace exists (auto-create on first visit). */
async function ensureApiConsoleOrganization(): Promise<boolean> {
  const authPort = inject(AUTH_PORT);
  const orgPort = inject(ORG_PORT);
  const orgs = await ensureOrganizationsLoaded();

  if (orgs.length > 0) {
    const active = await firstValueFrom(orgPort.activeOrganization$);
    if (active) {
      return true;
    }
    const selected = await orgPort.selectOrganization(orgs[0].slug);
    return selected.ok;
  }

  const session = await firstValueFrom(authPort.session$);
  const suffix = (session?.user.id ?? 'local').replace(/-/g, '').slice(0, 8);
  const slug = `api-${suffix}`.toLowerCase();
  const created = await orgPort.createOrganization({
    name: 'API Project',
    slug,
  });

  if (created.ok) {
    const selected = await orgPort.selectOrganization(created.data.slug);
    return selected.ok;
  }

  const listed = await orgPort.listOrganizations();
  if (listed.ok && listed.data.length > 0) {
    const selected = await orgPort.selectOrganization(listed.data[0].slug);
    return selected.ok;
  }

  return false;
}

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
  const shell = inject(SHELL_CONFIG);
  const session = await firstValueFrom(authPort.session$);

  if (!session) {
    return true;
  }

  return postAuthUrlTree(router, shell.postAuthRoute);
};

/**
 * `/onboarding` — create workspace (0 orgs) or activation checklist.
 * API console skips onboarding (auto bootstrap in workspaceContextGuard).
 */
export const onboardingRouteGuard: CanActivateFn = async () => {
  const router = inject(Router);
  const shell = inject(SHELL_CONFIG);

  if (isApiShell(shell)) {
    return postAuthUrlTree(router, shell.postAuthRoute);
  }

  const orgPort = inject(ORG_PORT);
  const orgs = await ensureOrganizationsLoaded();
  if (orgs.length === 0) {
    return true;
  }

  const active = await firstValueFrom(orgPort.activeOrganization$);
  if (active) {
    return true;
  }

  const selectResult = await orgPort.selectOrganization(orgs[0].slug);
  return selectResult.ok;
};

/** @deprecated Use onboardingRouteGuard */
export const onboardingGuard = onboardingRouteGuard;

/**
 * Workspace routes require at least one org; auto-select first when in personal context.
 * API console auto-creates a workspace when none exists.
 */
export const workspaceContextGuard: CanActivateFn = async () => {
  const orgPort = inject(ORG_PORT);
  const router = inject(Router);
  const shell = inject(SHELL_CONFIG);

  if (isApiShell(shell)) {
    const ready = await ensureApiConsoleOrganization();
    if (ready) {
      return true;
    }
    return router.createUrlTree(['/', shell.postAuthRoute], {
      queryParams: { bootstrap: 'failed' },
    });
  }

  const orgs = await ensureOrganizationsLoaded();

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

/**
 * Admin-only workspace routes (settings, billing, members).
 * Requires an active org with role admin or owner; redirects members to the workspace root.
 */
export const workspaceAdminGuard: CanActivateFn = async () => {
  const authPort = inject(AUTH_PORT);
  const router = inject(Router);
  const shell = inject(SHELL_CONFIG);
  const session = await firstValueFrom(authPort.session$);
  const role = session?.claims.org?.role;

  if (role === 'admin' || role === 'owner') {
    return true;
  }

  if (isApiShell(shell)) {
    return postAuthUrlTree(router, shell.postAuthRoute);
  }

  return router.createUrlTree(['/workspace']);
};

/** Account routes: B2B clears workspace; API console keeps org context. */
export const accountContextGuard: CanActivateFn = async () => {
  const shell = inject(SHELL_CONFIG);
  if (isApiShell(shell)) {
    return true;
  }

  const orgPort = inject(ORG_PORT);
  await orgPort.selectPersonal();
  return true;
};
