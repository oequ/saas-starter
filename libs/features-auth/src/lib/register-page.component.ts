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
import { AUTH_PORT } from '@oequ/ports';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';
import { HlmCheckboxImports } from '@spartan-ng/helm/checkbox';
import { HlmInput } from '@spartan-ng/helm/input';

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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-muted/30 flex min-h-svh flex-col items-center justify-center px-4 py-12"
    >
      <div class="w-full max-w-md">
        <div class="mb-8 text-center">
          <p class="text-primary text-sm font-medium tracking-wide uppercase">
            Sign up
          </p>
          <h1 class="mt-2 text-2xl font-semibold tracking-tight">
            Create your account
          </h1>
        </div>

        <section hlmCard class="gap-0 overflow-hidden py-0">
          <div hlmCardContent class="!p-6">
            <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
              <div>
                <label
                  for="register-email"
                  class="mb-1.5 block text-sm font-medium"
                >
                  Email
                </label>
                <input
                  id="register-email"
                  hlmInput
                  type="email"
                  autocomplete="email"
                  class="border-input bg-background h-9 w-full rounded-[5px] shadow-none"
                  formControlName="email"
                />
                @if (submitAttempted() && form.controls.email.invalid) {
                  <p class="text-destructive mt-1.5 text-sm">
                    Enter a valid email address.
                  </p>
                }
              </div>

              <div>
                <label
                  for="register-password"
                  class="mb-1.5 block text-sm font-medium"
                >
                  Password
                </label>
                <input
                  id="register-password"
                  hlmInput
                  type="password"
                  autocomplete="new-password"
                  class="border-input bg-background h-9 w-full rounded-[5px] shadow-none"
                  formControlName="password"
                />
                @if (submitAttempted() && form.controls.password.invalid) {
                  <p class="text-destructive mt-1.5 text-sm">
                    Password must be at least 8 characters.
                  </p>
                }
              </div>

              <div>
                <label
                  for="register-confirm-password"
                  class="mb-1.5 block text-sm font-medium"
                >
                  Confirm password
                </label>
                <input
                  id="register-confirm-password"
                  hlmInput
                  type="password"
                  autocomplete="new-password"
                  class="border-input bg-background h-9 w-full rounded-[5px] shadow-none"
                  formControlName="confirmPassword"
                />
                @if (
                  submitAttempted() &&
                  (form.controls.confirmPassword.invalid ||
                    form.hasError('passwordMismatch'))
                ) {
                  <p class="text-destructive mt-1.5 text-sm">
                    Passwords do not match.
                  </p>
                }
              </div>

              <div class="space-y-3 pt-1">
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
                    I agree to the
                    <a
                      routerLink="/auth/terms"
                      class="text-foreground underline-offset-4 hover:underline"
                      >Terms of Service</a
                    >.
                  </label>
                </div>
                @if (submitAttempted() && form.controls.acceptTerms.invalid) {
                  <p class="text-destructive text-sm">
                    You must accept the Terms of Service.
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
                    I agree to the
                    <a
                      routerLink="/auth/privacy"
                      class="text-foreground underline-offset-4 hover:underline"
                      >Privacy Policy</a
                    >.
                  </label>
                </div>
                @if (submitAttempted() && form.controls.acceptPrivacy.invalid) {
                  <p class="text-destructive text-sm">
                    You must accept the Privacy Policy.
                  </p>
                }
              </div>

              @if (errorMessage(); as message) {
                <p class="text-destructive text-sm" role="alert">{{ message }}</p>
              }

              <div class="flex justify-end pt-2">
                <button hlmBtn type="submit" [disabled]="signingUp()">
                  {{ signingUp() ? 'Creating account…' : 'Create account' }}
                </button>
              </div>
            </form>
          </div>
        </section>

        <p class="text-muted-foreground mt-6 text-center text-sm">
          Already have an account?
          <a
            routerLink="/auth/login"
            class="text-foreground ml-1 underline-offset-4 hover:underline"
            >Sign in</a
          >
        </p>
      </div>
    </div>
  `,
})
export class RegisterPageComponent {
  private readonly authPort = inject(AUTH_PORT);
  private readonly router = inject(Router);

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
      this.errorMessage.set(result.error.message);
      return;
    }

    await this.router.navigate(['/onboarding']);
  }
}
