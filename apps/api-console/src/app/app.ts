import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { CookieConsentBannerComponent } from '@oequ/shell';
import { HlmToaster } from '@spartan-ng/helm/sonner';
import { filter, map, startWith } from 'rxjs';

@Component({
  imports: [RouterOutlet, HlmToaster, CookieConsentBannerComponent],
  selector: 'ac-root',
  template: `
    <router-outlet />
    <hlm-toaster position="top-center" />
    @if (!onShowcasePage()) {
      <oequ-cookie-consent-banner />
    }
  `,
})
export class App {
  private readonly router = inject(Router);

  protected readonly onShowcasePage = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.router.url.startsWith('/showcase')),
      startWith(this.router.url.startsWith('/showcase')),
    ),
    { initialValue: this.router.url.startsWith('/showcase') },
  );
}
