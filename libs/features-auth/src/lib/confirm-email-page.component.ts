import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
import {
  CONFIRM_EMAIL_RESEND_COOLDOWN_SECONDS,
  markConfirmEmailResendCooldown,
  readConfirmEmailResendUntil,
} from './confirm-email-resend-cooldown';

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
                  class="text-muted-foreground hover:text-foreground disabled:pointer-events-none disabled:opacity-50 w-full text-sm underline-offset-4 hover:underline disabled:no-underline"
                  [disabled]="resending() || resendCooldownSeconds() > 0"
                  (click)="resend()"
                >
                  @if (resendCooldownSeconds() > 0) {
                    {{
                      'auth.confirmEmail.resendCooldown'
                        | transloco: { seconds: resendCooldownSeconds() }
                    }}
                  } @else if (resending()) {
                    {{ 'auth.confirmEmail.resending' | transloco }}
                  } @else {
                    {{ 'auth.confirmEmail.resend' | transloco }}
                  }
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
  private readonly destroyRef = inject(DestroyRef);

  private resendCooldownTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly inputClass = AUTH_INPUT_CLASS;
  protected readonly confirmState = signal<ConfirmState>('loading');
  protected readonly displayEmail = signal('');
  protected readonly submitAttempted = signal(false);
  protected readonly submitting = signal(false);
  protected readonly resending = signal(false);
  protected readonly resendCooldownSeconds = signal(0);
  protected readonly submitError = signal<string | null>(null);
  protected readonly resendStatus = signal<string | null>(null);

  protected readonly form = new FormGroup({
    otp: new FormControl('', {
      nonNullable: true,
      validators: [
        Validators.required,
        Validators.pattern(/^\d{6}$/),
      ],
    }),
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.clearResendCooldownTimer());

    const emailParam = this.route.snapshot.queryParamMap.get('email')?.trim();
    if (emailParam) {
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

    if (!this.displayEmail().trim()) {
      this.confirmState.set('invalid');
      return;
    }
    this.confirmState.set('ready');
    this.restoreResendCooldown();
  }

  protected async submitOtp(): Promise<void> {
    this.submitAttempted.set(true);
    this.submitError.set(null);

    if (this.form.invalid) {
      return;
    }

    const email = this.displayEmail().trim();
    if (!email) {
      return;
    }

    this.submitting.set(true);
    const { otp } = this.form.getRawValue();
    const result = await this.authPort.verifyEmailConfirmationOtp(email, otp);
    this.submitting.set(false);

    if (!result.ok) {
      this.submitError.set(translatePortError(result.error, this.transloco));
      return;
    }

    await this.router.navigate(['/onboarding']);
  }

  protected async resend(): Promise<void> {
    const email = this.displayEmail().trim();
    if (!email || this.resendCooldownSeconds() > 0) {
      return;
    }

    this.resending.set(true);
    this.resendStatus.set(null);
    this.submitError.set(null);

    const result = await this.authPort.resendEmailConfirmation(email);
    this.resending.set(false);

    if (!result.ok) {
      if (
        result.error.code === 'RATE_LIMITED' ||
        result.error.reason === 'rateLimited'
      ) {
        this.startResendCooldown(CONFIRM_EMAIL_RESEND_COOLDOWN_SECONDS);
      }
      this.submitError.set(translatePortError(result.error, this.transloco));
      return;
    }

    this.resendStatus.set(
      this.transloco.translate('auth.confirmEmail.resendSent'),
    );
    this.startResendCooldown(CONFIRM_EMAIL_RESEND_COOLDOWN_SECONDS);
  }

  private restoreResendCooldown(): void {
    const email = this.displayEmail().trim();
    if (!email) {
      return;
    }
    const until = readConfirmEmailResendUntil(email);
    if (until && until > Date.now()) {
      this.runResendCooldownTimer(until);
    } else {
      this.resendCooldownSeconds.set(0);
    }
  }

  private startResendCooldown(seconds: number): void {
    const email = this.displayEmail().trim();
    if (!email) {
      return;
    }
    const until = markConfirmEmailResendCooldown(email, seconds);
    this.runResendCooldownTimer(until);
  }

  private runResendCooldownTimer(until: number): void {
    this.clearResendCooldownTimer();

    const tick = (): void => {
      const remaining = Math.max(0, Math.ceil((until - Date.now()) / 1000));
      this.resendCooldownSeconds.set(remaining);
      if (remaining === 0) {
        this.clearResendCooldownTimer();
      }
    };

    tick();
    this.resendCooldownTimer = setInterval(tick, 1000);
  }

  private clearResendCooldownTimer(): void {
    if (this.resendCooldownTimer !== null) {
      clearInterval(this.resendCooldownTimer);
      this.resendCooldownTimer = null;
    }
  }
}
