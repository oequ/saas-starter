import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CookieConsentBannerComponent } from '@oequ/shell';
import { HlmToaster } from '@spartan-ng/helm/sonner';

@Component({
  imports: [RouterOutlet, HlmToaster, CookieConsentBannerComponent],
  selector: 'app-root',
  template: `
    <router-outlet />
    <hlm-toaster position="top-center" />
    <oequ-cookie-consent-banner />
  `,
})
export class App {}
