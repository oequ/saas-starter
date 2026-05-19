import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { AUTH_PORT } from '@oequ/ports';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmInput } from '@spartan-ng/helm/input';

import { AuthPasswordInputComponent } from './auth-password-input.component';
import {
  AUTH_CARD_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_PAGE_CONTENT_CLASS,
  AUTH_PAGE_FOOTER_CLASS,
  AUTH_PAGE_FOOTER_TEXT_CLASS,
  AUTH_PAGE_HEADING_CLASS,
  AUTH_PAGE_LEGAL_CLASS,
  AUTH_PAGE_SHELL_CLASS,
} from './auth-form.tokens';

const DEMO_LOGIN_EMAIL = 'demo@example.com';
const DEMO_LOGIN_PASSWORD = 'demo';

function safeReturnUrl(raw: string | null): string {
  if (!raw?.startsWith('/') || raw.startsWith('//')) {
    return '/workspace';
  }
  return raw;
}

@Component({
  selector: 'oequ-login-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmCardImports,
    HlmButtonImports,
    HlmInput,
    AuthPasswordInputComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="${AUTH_PAGE_SHELL_CLASS}">
      <div class="${AUTH_PAGE_CONTENT_CLASS}">
        <h1 class="${AUTH_PAGE_HEADING_CLASS}">Sign in</h1>

        <section hlmCard class="${AUTH_CARD_CLASS}">
          <div hlmCardContent class="!p-6">
            <form class="space-y-5" [formGroup]="form" (ngSubmit)="submit()">
              <div>
                <label for="login-email" class="mb-1.5 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="login-email"
                  hlmInput
                  type="email"
                  autocomplete="email"
                  placeholder="you@example.com"
                  [class]="inputClass"
                  formControlName="email"
                />
                @if (submitAttempted() && form.controls.email.invalid) {
                  <p class="text-destructive mt-1.5 text-sm">
                    Enter a valid email address.
                  </p>
                }
              </div>

              <div>
                <div class="mb-1.5 flex items-center justify-between gap-2">
                  <label for="login-password" class="text-sm font-medium">
                    Password
                  </label>
                  <a
                    routerLink="/auth/forgot-password"
                    class="text-muted-foreground hover:text-foreground text-sm underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </a>
                </div>
                <oequ-auth-password-input
                  inputId="login-password"
                  [control]="form.controls.password"
                  autocomplete="current-password"
                />
                @if (submitAttempted() && form.controls.password.invalid) {
                  <p class="text-destructive mt-1.5 text-sm">
                    Password is required.
                  </p>
                }
              </div>

              @if (errorMessage(); as message) {
                <p class="text-destructive text-sm" role="alert">{{ message }}</p>
              }

              <button
                hlmBtn
                type="submit"
                class="h-9 w-full shadow-none"
                [disabled]="signingIn()"
              >
                {{ signingIn() ? 'Signing in…' : 'Sign in' }}
              </button>
            </form>
          </div>
        </section>

        <div class="${AUTH_PAGE_FOOTER_CLASS}">
          <p class="${AUTH_PAGE_FOOTER_TEXT_CLASS}">
            Don&apos;t have an account?
            <a
              routerLink="/auth/register"
              class="text-foreground ms-1 underline-offset-4 hover:underline"
              >Sign up</a
            >
          </p>
          <p class="${AUTH_PAGE_LEGAL_CLASS}">
            By continuing, you agree to our
            <a
              routerLink="/auth/terms"
              class="text-foreground underline-offset-4 hover:underline"
              >Terms of Service</a
            >
            and
            <a
              routerLink="/auth/privacy"
              class="text-foreground underline-offset-4 hover:underline"
              >Privacy Policy</a
            >.
          </p>
        </div>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  private readonly authPort = inject(AUTH_PORT);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly inputClass = AUTH_INPUT_CLASS;
  protected readonly signingIn = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup({
    email: new FormControl(DEMO_LOGIN_EMAIL, {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl(DEMO_LOGIN_PASSWORD, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  protected async submit(): Promise<void> {
    this.submitAttempted.set(true);
    if (this.form.invalid) {
      return;
    }

    this.signingIn.set(true);
    this.errorMessage.set(null);

    const { email, password } = this.form.getRawValue();
    const result = await this.authPort.signInWithPassword({ email, password });
    this.signingIn.set(false);

    if (!result.ok) {
      this.errorMessage.set(result.error.message);
      return;
    }

    const returnUrl = safeReturnUrl(
      this.route.snapshot.queryParamMap.get('returnUrl'),
    );
    await this.router.navigateByUrl(returnUrl);
  }
}
