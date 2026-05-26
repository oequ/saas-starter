import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
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
import { HlmInput } from '@spartan-ng/helm/input';

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

@Component({
  selector: 'oequ-forgot-password-page',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    HlmCardImports,
    HlmButtonImports,
    HlmInput,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="${AUTH_PAGE_SHELL_CLASS}">
      <div class="${AUTH_PAGE_CONTENT_CLASS}">
        <h1 class="${AUTH_PAGE_HEADING_CLASS}">
          {{ 'auth.forgotPassword.title' | transloco }}
        </h1>
        <p class="${AUTH_PAGE_LEAD_CLASS}">
          {{ 'auth.forgotPassword.lead' | transloco }}
        </p>

        <section hlmCard class="${AUTH_CARD_CLASS}">
          <div hlmCardContent class="!p-6">
            @if (sent()) {
              <p class="text-sm leading-6" role="status">
                {{
                  'auth.forgotPassword.sentStatus'
                    | transloco: { email: submittedEmail() }
                }}
              </p>
              <a
                hlmBtn
                class="mt-6 h-9 w-full shadow-none"
                routerLink="/auth/login"
              >
                {{ 'auth.forgotPassword.backToSignIn' | transloco }}
              </a>
            } @else {
              <form class="space-y-5" [formGroup]="form" (ngSubmit)="submit()">
                <div>
                  <label
                    for="reset-email"
                    class="mb-1.5 block text-sm font-medium"
                  >
                    {{ 'common.email' | transloco }}
                  </label>
                  <input
                    id="reset-email"
                    hlmInput
                    type="email"
                    autocomplete="email"
                    [placeholder]="'auth.login.emailPlaceholder' | transloco"
                    [class]="inputClass"
                    formControlName="email"
                  />
                  @if (submitAttempted() && form.controls.email.invalid) {
                    <p class="text-destructive mt-1.5 text-sm">
                      {{ 'auth.forgotPassword.emailInvalid' | transloco }}
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
                      ? ('auth.forgotPassword.submitting' | transloco)
                      : ('auth.forgotPassword.submit' | transloco)
                  }}
                </button>
              </form>
            }
          </div>
        </section>

        @if (!sent()) {
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
export class ForgotPasswordPageComponent {
  private readonly authPort = inject(AUTH_PORT);
  private readonly transloco = inject(TranslocoService);

  protected readonly inputClass = AUTH_INPUT_CLASS;

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  protected readonly submitAttempted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly sent = signal(false);
  protected readonly submittedEmail = signal('');
  protected readonly submitError = signal<string | null>(null);

  protected async submit(): Promise<void> {
    this.submitAttempted.set(true);
    this.submitError.set(null);

    if (this.form.invalid) {
      return;
    }

    const email = this.form.controls.email.value.trim();
    this.submitting.set(true);
    const result = await this.authPort.requestPasswordReset(email);
    this.submitting.set(false);

    if (!result.ok) {
      this.submitError.set(translatePortError(result.error, this.transloco));
      return;
    }

    this.submittedEmail.set(email);
    this.sent.set(true);
  }
}
