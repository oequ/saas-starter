import { ActivatedRouteSnapshot, Router } from '@angular/router';

/** SSOT: settings page content width (see docs/design/ACCOUNT_VS_WORKSPACE.md). */
export type SettingsContext = 'account' | 'workspace';

/**
 * One content column for all settings routes (account + workspace).
 * Form controls stay narrow via {@link SETTINGS_FORM_FIELD_CLASS}.
 */
export const SETTINGS_PAGE_MAX_WIDTH_CLASS = 'max-w-[1200px]';

/** @deprecated Use {@link SETTINGS_PAGE_MAX_WIDTH_CLASS} — kept for context-specific layout later. */
export const SETTINGS_PAGE_MAX_WIDTH: Record<SettingsContext, string> = {
  account: SETTINGS_PAGE_MAX_WIDTH_CLASS,
  workspace: SETTINGS_PAGE_MAX_WIDTH_CLASS,
};

/** Narrow column for inputs inside settings cards (Vercel-style). */
export const SETTINGS_FORM_FIELD_CLASS = 'max-w-[300px]';

/** Form / confirm dialogs — slightly narrower than default `sm:max-w-lg`. */
export const SETTINGS_DIALOG_CONTENT_CLASS = 'sm:!max-w-[380px]';

/** Plan picker paywall — wide enough for three pricing columns. */
export const PAYWALL_DIALOG_CONTENT_CLASS = 'sm:!max-w-5xl';

/** Full-width fields inside dialogs (overrides {@link SETTINGS_FORM_FIELD_CLASS}). */
export const SETTINGS_DIALOG_FIELD_CLASS = 'w-full min-w-0';

/** Workspace switcher + user menu triggers (light/dark via sidebar tokens). */
export const SHELL_SIDEBAR_SELECT_TRIGGER_CLASS =
  'text-sidebar-foreground !h-9 w-full !justify-start !gap-0 !rounded-md !border-0 !bg-transparent !p-0 !shadow-none hover:!bg-sidebar-accent hover:!text-sidebar-accent-foreground focus-visible:!ring-sidebar-ring focus-visible:!ring-2 [&>ng-icon]:hidden';

/** Layout only — colors from hlmSidebarMenuButton defaults. */
export const SHELL_SIDEBAR_NAV_BUTTON_CLASS = '!h-9 !gap-0 !p-0';

function contextFromSnapshotData(
  data: Record<string, unknown> | undefined,
): SettingsContext | null {
  const ctx = data?.['settingsContext'];
  if (ctx === 'account' || ctx === 'workspace') {
    return ctx;
  }
  return null;
}

function walkSnapshots(
  root: ActivatedRouteSnapshot | null | undefined,
): SettingsContext | null {
  if (!root) {
    return null;
  }

  const stack: ActivatedRouteSnapshot[] = [root];
  while (stack.length > 0) {
    const node = stack.pop();
    if (!node) {
      break;
    }
    const ctx = contextFromSnapshotData(node.data);
    if (ctx) {
      return ctx;
    }
    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push(node.children[i]);
    }
  }

  return null;
}

export function resolveSettingsContext(router: Router): SettingsContext {
  const fromState = walkSnapshots(router.routerState?.snapshot?.root);
  if (fromState) {
    return fromState;
  }

  const url = router.url;
  if (url.includes('/account/') || url.endsWith('/account')) {
    return 'account';
  }

  return 'workspace';
}

export function settingsPageMaxWidthClass(): string {
  return SETTINGS_PAGE_MAX_WIDTH_CLASS;
}
