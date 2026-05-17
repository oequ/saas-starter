import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ORG_PORT } from '@oequ/ports';
import { firstValueFrom } from 'rxjs';

/** Workspace settings require an active workspace in OrgPort. */
export const workspaceContextGuard: CanActivateFn = async () => {
  const orgPort = inject(ORG_PORT);
  const router = inject(Router);
  const active = await firstValueFrom(orgPort.activeOrganization$);

  if (active) {
    return true;
  }

  return router.createUrlTree(['/account/profile']);
};

/** Entering account routes clears workspace selection (personal context). */
export const accountContextGuard: CanActivateFn = async () => {
  const orgPort = inject(ORG_PORT);
  await orgPort.selectPersonal();
  return true;
};
