import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
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
import { AUTH_PORT } from '@oequ/ports';
import { HlmButtonImports } from '@spartan-ng/helm/button';
import { HlmCardImports } from '@spartan-ng/helm/card';

import { AuthPasswordInputComponent } from './auth-password-input.component';
import {
  AUTH_CARD_CLASS,
  AUTH_INPUT_CLASS,
  AUTH_PAGE_CONTENT_CLASS,
  AUTH_PAGE_FOOTER_CLASS,
  AUTH_PAGE_FOOTER_TEXT_CLASS,
  AUTH_PAGE_HEADING_CLASS,
  AUTH_PAGE_LEAD_CLASS,
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

type RecoveryState = 'loading' | 'ready' | 'invalid';

@Component({
  selector: 'oequ-reset-password-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmCardImports,
    HlmButtonImports,
    AuthPasswordInputComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="${AUTH_PAGE_SHELL_CLASS}">
      <div class="${AUTH_PAGE_CONTENT_CLASS}">
        <h1 class="${AUTH_PAGE_HEADING_CLASS}">
          {{ 'auth.resetPassword.title' | transloco }}
        </h1>
        <p class="${AUTH_PAGE_LEAD_CLASS}">
          {{ 'auth.resetPassword.lead' | transloco }}
        </p>

        <section hlmCard class="${AUTH_CARD_CLASS}">
          <div hlmCardContent class="!p-6">
            @if (recoveryState() === 'loading') {
              <p class="text-muted-foreground text-sm" role="status">
                {{ 'auth.resetPassword.verifying' | transloco }}
              </p>
            } @else if (recoveryState() === 'invalid') {
              <p class="text-destructive text-sm" role="alert">
                {{ 'auth.resetPassword.invalidLink' | transloco }}
              </p>
              <a
                hlmBtn
                class="mt-6 h-9 w-full shadow-none"
                routerLink="/auth/forgot-password"
              >
                {{ 'auth.resetPassword.requestNewLink' | transloco }}
              </a>
            } @else {
              <form class="space-y-5" [formGroup]="form" (ngSubmit)="submit()">
                <div>
                  <label
                    for="reset-password"
                    class="mb-1.5 block text-sm font-medium"
                  >
                    {{ 'common.password' | transloco }}
                  </label>
                  <oequ-auth-password-input
                    inputId="reset-password"
                    autocomplete="new-password"
                    [placeholder]="'auth.register.passwordMinLength' | transloco"
                    [control]="form.controls.password"
                  />
                  @if (submitAttempted() && form.controls.password.invalid) {
                    <p class="text-destructive mt-1.5 text-sm">
                      {{ 'auth.register.passwordMinLength' | transloco }}
                    </p>
                  }
                </div>

                <div>
                  <label
                    for="reset-confirm-password"
                    class="mb-1.5 block text-sm font-medium"
                  >
                    {{ 'auth.register.confirmPassword' | transloco }}
                  </label>
                  <oequ-auth-password-input
                    inputId="reset-confirm-password"
                    autocomplete="new-password"
                    [placeholder]="'auth.register.confirmPassword' | transloco"
                    [control]="form.controls.confirmPassword"
                  />
                  @if (submitAttempted() && form.hasError('passwordMismatch')) {
                    <p class="text-destructive mt-1.5 text-sm">
                      {{ 'auth.register.passwordMismatch' | transloco }}
                    </p>
                  }
                </div>

                @if (submitError()) {
                  <p class="text-destructive text-sm" role="alert">
                    {{ submitError() }}
                  </p>
                }

                <button
                  hlmBtn
                  type="submit"
                  class="h-9 w-full shadow-none"
                  [disabled]="submitting()"
                >
                  {{
                    submitting()
                      ? ('auth.resetPassword.submitting' | transloco)
                      : ('auth.resetPassword.submit' | transloco)
                  }}
                </button>
              </form>
            }
          </div>
        </section>

        @if (recoveryState() === 'ready') {
          <div class="${AUTH_PAGE_FOOTER_CLASS}">
            <p class="${AUTH_PAGE_FOOTER_TEXT_CLASS}">
              <a
                routerLink="/auth/login"
                class="text-foreground underline-offset-4 hover:underline"
              >
                {{ 'auth.forgotPassword.backToSignIn' | transloco }}
              </a>
            </p>
          </div>
        }
      </div>
    </div>
  `,
})
export class ResetPasswordPageComponent implements OnInit {
  private readonly authPort = inject(AUTH_PORT);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly inputClass = AUTH_INPUT_CLASS;

  protected readonly form = new FormGroup(
    {
      password: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required, Validators.minLength(8)],
      }),
      confirmPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
    },
    { validators: passwordsMatch },
  );

  protected readonly recoveryState = signal<RecoveryState>('loading');
  protected readonly submitAttempted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly submitError = signal<string | null>(null);

  ngOnInit(): void {
    void this.resolveRecoveryState();
  }

  private async resolveRecoveryState(): Promise<void> {
    const result = await this.authPort.isPasswordRecoveryActive();
    if (!result.ok) {
      this.recoveryState.set('invalid');
      return;
    }
    if (result.data) {
      if (
        typeof globalThis.location !== 'undefined' &&
        globalThis.location.hash
      ) {
        globalThis.history.replaceState(
          null,
          '',
          globalThis.location.pathname + globalThis.location.search,
        );
      }
      this.recoveryState.set('ready');
      return;
    }
    this.recoveryState.set('invalid');
  }

  protected async submit(): Promise<void> {
    this.submitAttempted.set(true);
    this.submitError.set(null);

    if (this.form.invalid) {
      return;
    }

    this.submitting.set(true);
    const result = await this.authPort.updatePassword(
      this.form.controls.password.value,
    );
    this.submitting.set(false);

    if (!result.ok) {
      this.submitError.set(translatePortError(result.error, this.transloco));
      return;
    }

    await this.router.navigate(['/auth/login'], {
      queryParams: { reset: 'success' },
    });
  }
}
