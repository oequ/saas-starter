import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { OequLocaleSwitcherComponent } from '@oequ/i18n';
import { ThemeService } from '@oequ/shell';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

@Component({
  selector: 'ac-settings-page',
  imports: [HlmCardImports, HlmButtonImports, OequLocaleSwitcherComponent],
  template: `
    <div class="space-y-8">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
        <p class="text-muted-foreground mt-1 text-sm">Console preferences.</p>
      </div>

      <section hlmCard>
        <div hlmCardHeader class="pb-2">
          <h2 hlmCardTitle class="text-sm font-medium">Appearance</h2>
        </div>
        <div hlmCardContent class="flex flex-wrap items-center gap-3">
          <button hlmBtn type="button" variant="outline" (click)="toggleTheme()">
            Switch to {{ themeIsDark() ? 'light' : 'dark' }} mode
          </button>
        </div>
      </section>

      <section hlmCard>
        <div hlmCardHeader class="pb-2">
          <h2 hlmCardTitle class="text-sm font-medium">Language</h2>
        </div>
        <div hlmCardContent>
          <oequ-locale-switcher />
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsPageComponent {
  private readonly themeService = inject(ThemeService);

  protected readonly themeIsDark = this.themeService.resolvedDark;

  protected toggleTheme(): void {
    this.themeService.toggle();
  }
}
