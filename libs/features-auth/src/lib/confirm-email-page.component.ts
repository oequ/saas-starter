import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
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

type ConfirmState = 'loading' | 'ready' | 'invalid';

@Component({
  selector: 'oequ-confirm-email-page',
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
          {{ 'auth.confirmEmail.title' | transloco }}
        </h1>

        @if (confirmState() === 'loading') {
          <p class="${AUTH_PAGE_LEAD_CLASS}" role="status">
            {{ 'auth.confirmEmail.verifying' | transloco }}
          </p>
        } @else if (confirmState() === 'invalid') {
          <p class="${AUTH_PAGE_LEAD_CLASS}">
            {{ 'auth.confirmEmail.invalidLink' | transloco }}
          </p>
        } @else {
          <p class="${AUTH_PAGE_LEAD_CLASS}">
            {{
              'auth.confirmEmail.lead' | transloco: { email: displayEmail() }
            }}
          </p>
          <p class="text-muted-foreground mb-6 text-sm">
            {{ 'auth.confirmEmail.linkHint' | transloco }}
          </p>
        }

        <section hlmCard class="${AUTH_CARD_CLASS}">
          <div hlmCardContent class="!p-6">
            @if (confirmState() === 'loading') {
              <p class="text-muted-foreground text-sm" role="status">
                {{ 'auth.confirmEmail.verifying' | transloco }}
              </p>
            } @else if (confirmState() === 'invalid') {
              <a
                hlmBtn
                class="h-9 w-full shadow-none"
                routerLink="/auth/register"
              >
                {{ 'auth.register.title' | transloco }}
              </a>
            } @else {
              <form class="space-y-5" [formGroup]="form" (ngSubmit)="submitOtp()">
                <div>
                  <label
                    for="confirm-email"
                    class="mb-1.5 block text-sm font-medium"
                  >
                    {{ 'common.email' | transloco }}
                  </label>
                  <input
                    id="confirm-email"
                    hlmInput
                    type="email"
                    autocomplete="email"
                    readonly
                    [class]="inputClass"
                    formControlName="email"
                  />
                </div>

                <div>
                  <label
                    for="confirm-otp"
                    class="mb-1.5 block text-sm font-medium"
                  >
                    {{ 'auth.confirmEmail.otpLabel' | transloco }}
                  </label>
                  <input
                    id="confirm-otp"
                    hlmInput
                    type="text"
                    inputmode="numeric"
                    autocomplete="one-time-code"
                    maxlength="6"
                    [placeholder]="'auth.confirmEmail.otpPlaceholder' | transloco"
                    [class]="inputClass"
                    formControlName="otp"
                  />
                  @if (submitAttempted() && form.controls.otp.invalid) {
                    <p class="text-destructive mt-1.5 text-sm">
                      {{ 'auth.confirmEmail.otpInvalid' | transloco }}
                    </p>
                  }
                </div>

                @if (submitError()) {
                  <p class="text-destructive text-sm" role="alert">
                    {{ submitError() }}
                  </p>
                }

                @if (resendStatus()) {
                  <p class="text-sm leading-6" role="status">
                    {{ resendStatus() }}
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
                      ? ('auth.confirmEmail.submitting' | transloco)
                      : ('auth.confirmEmail.submit' | transloco)
                  }}
                </button>

                <button
                  type="button"
                  class="text-muted-foreground hover:text-foreground w-full text-sm underline-offset-4 hover:underline"
                  [disabled]="resending()"
                  (click)="resend()"
                >
                  {{
                    resending()
                      ? ('auth.confirmEmail.resending' | transloco)
                      : ('auth.confirmEmail.resend' | transloco)
                  }}
                </button>
              </form>
            }
          </div>
        </section>

        @if (confirmState() === 'ready') {
          <div class="${AUTH_PAGE_FOOTER_CLASS}">
            <p class="${AUTH_PAGE_FOOTER_TEXT_CLASS}">
              {{ 'auth.confirmEmail.alreadyConfirmed' | transloco }}
              <a
                routerLink="/auth/login"
                class="text-foreground ms-1 underline-offset-4 hover:underline"
              >
                {{ 'auth.register.signIn' | transloco }}
              </a>
            </p>
          </div>
        }
      </div>
    </div>
  `,
})
export class ConfirmEmailPageComponent implements OnInit {
  private readonly authPort = inject(AUTH_PORT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);

  protected readonly inputClass = AUTH_INPUT_CLASS;
  protected readonly confirmState = signal<ConfirmState>('loading');
  protected readonly displayEmail = signal('');
  protected readonly submitAttempted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly resending = signal(false);
  protected readonly submitError = signal<string | null>(null);
  protected readonly resendStatus = signal<string | null>(null);

  protected readonly form = new FormGroup({
    email: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    otp: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^\d{6}$/),
      ],
    }),
  });

  ngOnInit(): void {
    const emailParam = this.route.snapshot.queryParamMap.get('email')?.trim();
    if (emailParam) {
      this.form.controls.email.setValue(emailParam);
      this.displayEmail.set(emailParam);
    }
    void this.resolveConfirmationState();
  }

  private async resolveConfirmationState(): Promise<void> {
    const redirectResult =
      await this.authPort.completeEmailConfirmationFromRedirect();
    if (!redirectResult.ok) {
      this.confirmState.set('invalid');
      return;
    }
    if (redirectResult.data) {
      await this.router.navigate(['/onboarding']);
      return;
    }

    const email = this.form.controls.email.value.trim();
    if (!email) {
      this.confirmState.set('invalid');
      return;
    }
    this.confirmState.set('ready');
  }

  protected async submitOtp(): Promise<void> {
    this.submitAttempted.set(true);
    this.submitError.set(null);

    if (this.form.invalid) {
      return;
    }

    this.submitting.set(true);
    const { email, otp } = this.form.getRawValue();
    const result = await this.authPort.verifyEmailConfirmationOtp(email, otp);
    this.submitting.set(false);

    if (!result.ok) {
      this.submitError.set(translatePortError(result.error, this.transloco));
      return;
    }

    await this.router.navigate(['/onboarding']);
  }

  protected async resend(): Promise<void> {
    const email = this.form.controls.email.value.trim();
    if (!email) {
      return;
    }

    this.resending.set(true);
    this.resendStatus.set(null);
    this.submitError.set(null);

    const result = await this.authPort.resendEmailConfirmation(email);
    this.resending.set(false);

    if (!result.ok) {
      this.submitError.set(translatePortError(result.error, this.transloco));
      return;
    }

    this.resendStatus.set(
      this.transloco.translate('auth.confirmEmail.resendSent'),
    );
  }
}
