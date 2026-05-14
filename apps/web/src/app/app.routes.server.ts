import { RenderMode, ServerRoute } from '@angular/ssr';

/** Auth + data routes run in the browser so Supabase client and guards behave predictably. */
export const serverRoutes: ServerRoute[] = [
  { path: 'app/**', renderMode: RenderMode.Client },
  { path: 'orgs/**', renderMode: RenderMode.Client },
  { path: '**', renderMode: RenderMode.Prerender },
];
