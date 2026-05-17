import { computed, Injectable, signal } from '@angular/core';

export type ColorSchemePreference = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'oequ-color-scheme';

const VALID_PREFERENCES = new Set<ColorSchemePreference>([
  'light',
  'dark',
  'system',
]);

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly preference = signal<ColorSchemePreference>('system');

  readonly resolvedDark = computed(() => {
    this.preference();
    return this.isDarkResolved();
  });

  private mediaQuery: MediaQueryList | null = null;
  private readonly onSystemChange = (): void => {
    if (this.preference() === 'system') {
      this.applyResolvedScheme();
    }
  };

  init(): void {
    if (typeof document === 'undefined') {
      return;
    }

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_PREFERENCES.has(stored as ColorSchemePreference)) {
      this.preference.set(stored as ColorSchemePreference);
    }

    this.mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    this.mediaQuery.addEventListener('change', this.onSystemChange);
    this.applyResolvedScheme();
  }

  setPreference(preference: ColorSchemePreference): void {
    this.preference.set(preference);
    localStorage.setItem(STORAGE_KEY, preference);
    this.applyResolvedScheme();
  }

  /** Flip between light and dark based on the current appearance. */
  toggle(): void {
    this.setPreference(this.isDarkResolved() ? 'light' : 'dark');
  }

  isDarkResolved(): boolean {
    const preference = this.preference();
    if (preference === 'dark') {
      return true;
    }
    if (preference === 'light') {
      return false;
    }
    return this.mediaQuery?.matches ?? false;
  }

  private applyResolvedScheme(): void {
    document.documentElement.classList.toggle('dark', this.isDarkResolved());
  }
}
