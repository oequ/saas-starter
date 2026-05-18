import type { ApiKeyPermission } from './models/api-keys.model';

const PERMISSION_LABELS: Record<ApiKeyPermission, string> = {
  full_access: 'Full access',
  sending_access: 'Sending access',
};

export function apiKeyPermissionLabel(permission: ApiKeyPermission): string {
  return PERMISSION_LABELS[permission];
}

export type ApiKeyPermissionFilter = 'all' | ApiKeyPermission;

export function apiKeyPermissionFilterLabel(
  filter: ApiKeyPermissionFilter,
): string {
  if (filter === 'all') {
    return 'All permissions';
  }
  return apiKeyPermissionLabel(filter);
}

export const API_KEY_DOMAIN_SCOPE_LABEL = 'All domains';

const relativeTime = new Intl.RelativeTimeFormat('en', { numeric: 'auto' });

export function formatRelativeTime(iso: string | null): string {
  if (!iso) {
    return 'No activity';
  }

  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) {
    return 'No activity';
  }

  const diffMs = then - Date.now();
  const absSec = Math.abs(diffMs) / 1000;

  if (absSec < 60) {
    return relativeTime.format(Math.round(diffMs / 1000), 'second');
  }
  if (absSec < 3600) {
    return `about ${relativeTime.format(Math.round(diffMs / 60_000), 'minute')}`;
  }
  if (absSec < 86_400) {
    return `about ${relativeTime.format(Math.round(diffMs / 3_600_000), 'hour')}`;
  }
  if (absSec < 2_592_000) {
    return `about ${relativeTime.format(Math.round(diffMs / 86_400_000), 'day')}`;
  }
  return `about ${relativeTime.format(Math.round(diffMs / 2_592_000_000), 'month')}`;
}

export function formatCreatedRelativeTime(iso: string): string {
  const label = formatRelativeTime(iso);
  if (label === 'No activity') {
    return 'just now';
  }
  return label;
}
