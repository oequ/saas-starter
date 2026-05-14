import { isPlatformBrowser } from '@angular/common';
import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { SupabaseService } from './supabase.service';

export const authGuard: CanActivateFn = async (_route, state): Promise<boolean | UrlTree> => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);
  if (!isPlatformBrowser(platformId)) {
    return true;
  }
  const supabase = inject(SupabaseService);
  const client = supabase.getClient();
  if (!client) {
    return router.createUrlTree(['/login'], {
      queryParams: { returnUrl: state.url, reason: 'missing-env' },
    });
  }
  const {
    data: { session },
  } = await client.auth.getSession();
  if (!session) {
    return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
  }
  return true;
};
