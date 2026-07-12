import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoPipe } from '@oequ/i18n';
import { HlmButtonImports } from '@spartan-ng/helm/button';

import { CookieConsentPreferencesDialogComponent } from './cookie-consent-preferences-dialog.component';
import { CookieConsentService } from './cookie-consent.service';

@Component({
  selector: 'oequ-cookie-consent-banner',
  imports: [
    RouterLink,
    HlmButtonImports,
    CookieConsentPreferencesDialogComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (cookieConsent.bannerVisible()) {
      <section
        class="border-border bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed inset-x-0 bottom-0 z-[100] border-t p-4 shadow-lg backdrop-blur sm:p-5"
        role="region"
        [attr.aria-label]="'cookie.banner.ariaLabel' | transloco"
      >
        <div
          class="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div class="min-w-0 flex-1 space-y-2">
            <h2 class="text-sm font-semibold tracking-tight">
              {{ 'cookie.banner.title' | transloco }}
            </h2>
            <p class="text-muted-foreground text-sm leading-6">
              {{ 'cookie.banner.leadPrefix' | transloco }}
              <a
                routerLink="/auth/cookies"
                class="text-foreground underline underline-offset-4 hover:opacity-80"
                >{{ 'cookie.banner.cookiePolicy' | transloco }}</a
              >
              {{ 'cookie.banner.and' | transloco }}
              <a
                routerLink="/auth/privacy"
                class="text-foreground underline underline-offset-4 hover:opacity-80"
                >{{ 'cookie.banner.privacyPolicy' | transloco }}</a
              >.
            </p>
          </div>
          <div
            class="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:min-w-[280px]"
          >
            <div class="grid grid-cols-2 gap-2">
              <button
                hlmBtn
                type="button"
                variant="outline"
                class="w-full"
                (click)="rejectAll()"
              >
                {{ 'cookie.banner.rejectAll' | transloco }}
              </button>
              <button
                hlmBtn
                type="button"
                variant="outline"
                class="w-full"
                (click)="acceptAll()"
              >
                {{ 'cookie.banner.acceptAll' | transloco }}
              </button>
            </div>
            <button
              hlmBtn
              type="button"
              variant="secondary"
              class="w-full"
              (click)="openPreferences()"
            >
              {{ 'cookie.banner.managePreferences' | transloco }}
            </button>
          </div>
        </div>
      </section>
    }
    <!-- Keep preferences outside bannerVisible: opening prefs hides the banner. -->
    <oequ-cookie-consent-preferences-dialog />
  `,
})
export class CookieConsentBannerComponent {
  protected readonly cookieConsent = inject(CookieConsentService);

  protected rejectAll(): void {
    this.cookieConsent.rejectAll();
  }

  protected acceptAll(): void {
    this.cookieConsent.acceptAll();
  }

  protected openPreferences(): void {
    this.cookieConsent.openPreferences();
  }
}
