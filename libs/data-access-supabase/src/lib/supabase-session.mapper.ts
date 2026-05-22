import type { AuthClaims, AuthSession, OrgContextClaim, OrgRole } from '@oequ/ports';
import type { Session, User } from '@supabase/supabase-js';

const ACTIVE_ORG_SLUG_KEY = 'oequ-active-org-slug';

export function readActiveOrgSlug(): string | null {
  if (typeof localStorage === 'undefined') {
    return null;
  }
  return localStorage.getItem(ACTIVE_ORG_SLUG_KEY);
}

export function writeActiveOrgSlug(slug: string | null): void {
  if (typeof localStorage === 'undefined') {
    return;
  }
  if (!slug) {
    localStorage.removeItem(ACTIVE_ORG_SLUG_KEY);
    return;
  }
  localStorage.setItem(ACTIVE_ORG_SLUG_KEY, slug);
}

export function mapUser(user: User) {
  return {
    id: user.id,
    email: user.email ?? '',
    displayName: readDisplayName(user),
  };
}

function readDisplayName(user: User): string | null {
  const meta = user.user_metadata ?? {};
  const raw =
    meta['display_name'] ?? meta['full_name'] ?? meta['name'] ?? null;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

export function orgClaimFromJwt(user: User): OrgContextClaim | null {
  const meta = user.app_metadata ?? {};
  const org = meta['org'];
  if (!org || typeof org !== 'object') {
    return null;
  }
  const record = org as Record<string, unknown>;
  const organizationId = record['organization_id'] ?? record['organizationId'];
  const role = record['role'];
  if (typeof organizationId !== 'string' || typeof role !== 'string') {
    return null;
  }
  if (!isOrgRole(role)) {
    return null;
  }
  return { organizationId, role };
}

function isOrgRole(value: string): value is OrgRole {
  return value === 'owner' || value === 'admin' || value === 'member';
}

export function mapSession(
  session: Session,
  orgOverride?: OrgContextClaim | null,
): AuthSession {
  const user = mapUser(session.user);
  const jwtOrg = orgClaimFromJwt(session.user);
  const org = orgOverride !== undefined ? orgOverride : jwtOrg;
  const claims: AuthClaims = {
    sub: user.id,
    email: user.email,
    org,
  };
  return { user, claims };
}
