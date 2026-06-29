import { InjectionToken } from '@angular/core';

/** `api` = OSS API Developer Console (auto workspace bootstrap). */
export type ShellMode = 'b2b' | 'api';

export interface ShellConfig {
  readonly mode: ShellMode;
  /** Post-auth landing route (no leading slash). */
  readonly postAuthRoute: string;
}

export const DEFAULT_SHELL_CONFIG: ShellConfig = {
  mode: 'b2b',
  postAuthRoute: 'workspace',
};

export const SHELL_CONFIG = new InjectionToken<ShellConfig>('SHELL_CONFIG', {
  factory: () => DEFAULT_SHELL_CONFIG,
});

export function provideShellConfig(config: Partial<ShellConfig>) {
  return {
    provide: SHELL_CONFIG,
    useValue: { ...DEFAULT_SHELL_CONFIG, ...config } satisfies ShellConfig,
  };
}

export function isApiShell(config: ShellConfig | null): boolean {
  return config?.mode === 'api';
}
