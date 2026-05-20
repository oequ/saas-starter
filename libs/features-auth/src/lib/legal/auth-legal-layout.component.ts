import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { TranslocoPipe } from '@oequ/i18n';

@Component({
  selector: 'oequ-auth-legal-layout',
  imports: [RouterLink, RouterOutlet, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="bg-muted/30 flex min-h-svh flex-col">
      <header
        class="border-border bg-background/80 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10 border-b backdrop-blur"
      >
        <div
          class="mx-auto flex h-14 max-w-3xl items-center justify-between px-4"
        >
          <a
            routerLink="/auth/login"
            class="text-muted-foreground hover:text-foreground text-sm transition-colors"
          >
            {{ 'legal.layout.backToSignIn' | transloco }}
          </a>
          <span class="text-muted-foreground text-xs">{{
            'legal.layout.demoLabel' | transloco
          }}</span>
        </div>
      </header>

      <main class="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <router-outlet />
      </main>
    </div>
  `,
})
export class AuthLegalLayoutComponent {}
