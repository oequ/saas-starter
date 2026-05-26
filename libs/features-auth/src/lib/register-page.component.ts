import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  TranslocoPipe,
  TranslocoService,
  translatePortError,
} from '@oequ/i18n';
import { AUTH_PORT, isEmailConfirmationRequiredError } from '@oequ/ports';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmInput } from '@spartan-ng/helm/input';

import { markConfirmEmailResendCooldown } from './confirm-email-resend-cooldown';
import { AuthPasswordInputComponent } from './auth-password-input.component';
import {
  AUTH_CARD_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_PAGE_CONTENT_CLASS,
  AUTH_PAGE_FOOTER_CLASS,
  AUTH_PAGE_FOOTER_TEXT_CLASS,
  AUTH_PAGE_HEADING_CLASS,
  AUTH_PAGE_SHELL_CLASS,
} from './auth-form.tokens';

function passwordsMatch(group: AbstractControl): ValidationErrors | null {
  const password = group.get('password')?.value;
  const confirmPassword = group.get('confirmPassword')?.value;
  if (!password || !confirmPassword) {
    return null;
  }
  return password === confirmPassword ? null : { passwordMismatch: true };
}

@Component({
  selector: 'oequ-register-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmCardImports,
    HlmButtonImports,
    HlmCheckboxImports,
    HlmInput,
    AuthPasswordInputComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="${AUTH_PAGE_SHELL_CLASS}">
      <div class="${AUTH_PAGE_CONTENT_CLASS}">
        <h1 class="${AUTH_PAGE_HEADING_CLASS}">
          {{ 'auth.register.title' | transloco }}
        </h1>

        <section hlmCard class="${AUTH_CARD_CLASS}">
          <div hlmCardContent class="!p-6">
            <form class="space-y-5" [formGroup]="form" (ngSubmit)="submit()">
              <div>
                <label
                  for="register-email"
                  class="mb-1.5 block text-sm font-medium"
                >
                  {{ 'common.email' | transloco }}
                </label>
                <input
                  id="register-email"
                  hlmInput
                  type="email"
                  autocomplete="email"
                  [placeholder]="'auth.login.emailPlaceholder' | transloco"
                  [class]="inputClass"
                  formControlName="email"
                />
                @if (submitAttempted() && form.controls.email.invalid) {
                  <p class="text-destructive mt-1.5 text-sm">
                    {{ 'auth.register.emailInvalid' | transloco }}
                  </p>
                }
              </div>

              <div>
                <label
                  for="register-password"
                  class="mb-1.5 block text-sm font-medium"
                >
                  {{ 'common.password' | transloco }}
                </label>
                <oequ-auth-password-input
                  inputId="register-password"
                  [control]="form.controls.password"
                  autocomplete="new-password"
                />
                @if (submitAttempted() && form.controls.password.invalid) {
                  <p class="text-destructive mt-1.5 text-sm">
                    {{ 'auth.register.passwordMinLength' | transloco }}
                  </p>
                }
              </div>

              <div>
                <label
                  for="register-confirm-password"
                  class="mb-1.5 block text-sm font-medium"
                >
                  {{ 'auth.register.confirmPassword' | transloco }}
                </label>
                <oequ-auth-password-input
                  inputId="register-confirm-password"
                  [control]="form.controls.confirmPassword"
                  autocomplete="new-password"
                />
                @if (
                  submitAttempted() &&
                  (form.controls.confirmPassword.invalid ||
                    form.hasError('passwordMismatch'))
                ) {
                  <p class="text-destructive mt-1.5 text-sm">
                    {{ 'auth.register.passwordMismatch' | transloco }}
                  </p>
                }
              </div>

              <div class="space-y-3">
                <div class="flex items-start gap-3">
                  <hlm-checkbox
                    id="register-accept-terms"
                    formControlName="acceptTerms"
                    class="mt-0.5"
                  />
                  <label
                    for="register-accept-terms"
                    class="text-muted-foreground text-sm leading-5"
                  >
                    {{ 'auth.register.acceptTermsPrefix' | transloco }}
                    <a
                      routerLink="/auth/terms"
                      class="text-foreground underline-offset-4 hover:underline"
                      >{{ 'auth.login.terms' | transloco }}</a
                    >.
                  </label>
                </div>
                @if (submitAttempted() && form.controls.acceptTerms.invalid) {
                  <p class="text-destructive text-sm">
                    {{ 'auth.register.acceptTermsRequired' | transloco }}
                  </p>
                }

                <div class="flex items-start gap-3">
                  <hlm-checkbox
                    id="register-accept-privacy"
                    formControlName="acceptPrivacy"
                    class="mt-0.5"
                  />
                  <label
                    for="register-accept-privacy"
                    class="text-muted-foreground text-sm leading-5"
                  >
                    {{ 'auth.register.acceptPrivacyPrefix' | transloco }}
                    <a
                      routerLink="/auth/privacy"
                      class="text-foreground underline-offset-4 hover:underline"
                      >{{ 'auth.login.privacy' | transloco }}</a
                    >.
                  </label>
                </div>
                @if (submitAttempted() && form.controls.acceptPrivacy.invalid) {
                  <p class="text-destructive text-sm">
                    {{ 'auth.register.acceptPrivacyRequired' | transloco }}
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
                [disabled]="signingUp()"
              >
                {{
                  signingUp()
                    ? ('auth.register.submitting' | transloco)
                    : ('auth.register.submit' | transloco)
                }}
              </button>
            </form>
          </div>
        </section>

        <div class="${AUTH_PAGE_FOOTER_CLASS}">
          <p class="${AUTH_PAGE_FOOTER_TEXT_CLASS}">
            {{ 'auth.register.hasAccount' | transloco }}
            <a
              routerLink="/auth/login"
              class="text-foreground ms-1 underline-offset-4 hover:underline"
              >{{ 'auth.register.signIn' | transloco }}</a
            >
          </p>
        </div>
      </div>
    </div>
  `,
})
export class RegisterPageComponent {
  private readonly authPort = inject(AUTH_PORT);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly inputClass = AUTH_INPUT_CLASS;
  protected readonly signingUp = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup(
    {
      email: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8)],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      acceptTerms: new FormControl(false, {
        nonNullable: true,
        validators: [Validators.requiredTrue],
      }),
      acceptPrivacy: new FormControl(false, {
        nonNullable: true,
        validators: [Validators.requiredTrue],
      }),
    },
    { validators: [passwordsMatch] },
  );

  protected async submit(): Promise<void> {
    this.submitAttempted.set(true);
    if (this.form.invalid) {
      return;
    }

    this.signingUp.set(true);
    this.errorMessage.set(null);

    const { email, password, acceptTerms, acceptPrivacy } =
      this.form.getRawValue();
    const result = await this.authPort.signUpWithPassword({
      email,
      password,
      acceptTerms,
      acceptPrivacy,
    });
    this.signingUp.set(false);

    if (!result.ok) {
      if (isEmailConfirmationRequiredError(result.error)) {
        markConfirmEmailResendCooldown(email);
        await this.router.navigate(['/auth/confirm-email'], {
          queryParams: { email },
        });
        return;
      }
      this.errorMessage.set(
        translatePortError(result.error, this.transloco),
      );
      return;
    }

    await this.router.navigate(['/onboarding']);
  }
}
