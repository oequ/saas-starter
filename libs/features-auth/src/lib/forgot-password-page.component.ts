import {
  ChangeDetectionStrategy,
  Component,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
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
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="${AUTH_PAGE_SHELL_CLASS}">
      <div class="${AUTH_PAGE_CONTENT_CLASS}">
        <h1 class="${AUTH_PAGE_HEADING_CLASS}">Reset your password</h1>
        <p class="${AUTH_PAGE_LEAD_CLASS}">
          Enter your email and we will send a reset link if an account exists.
        </p>

        <section hlmCard class="${AUTH_CARD_CLASS}">
          <div hlmCardContent class="!p-6">
            @if (sent()) {
              <p class="text-sm leading-6" role="status">
                If an account exists for
                <span class="font-medium">{{ submittedEmail() }}</span>, you will
                receive instructions shortly. In this demo, no email is sent.
              </p>
              <a
                hlmBtn
                class="mt-6 h-9 w-full shadow-none"
                routerLink="/auth/login"
              >
                Back to sign in
              </a>
            } @else {
              <form class="space-y-5" [formGroup]="form" (ngSubmit)="submit()">
                <div>
                  <label
                    for="reset-email"
                    class="mb-1.5 block text-sm font-medium"
                  >
                    Email
                  </label>
                  <input
                    id="reset-email"
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

                <button
                  hlmBtn
                  type="submit"
                  class="h-9 w-full shadow-none"
                  [disabled]="submitting()"
                >
                  {{ submitting() ? 'Sending…' : 'Send reset link' }}
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
                Back to sign in
              </a>
            </p>
          </div>
        }
      </div>
    </div>
  `,
})
export class ForgotPasswordPageComponent {
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

  protected async submit(): Promise<void> {
    this.submitAttempted.set(true);
    if (this.form.invalid) {
      return;
    }

    this.submitting.set(true);
    await new Promise((resolve) => setTimeout(resolve, 400));
    this.submittedEmail.set(this.form.controls.email.value.trim());
    this.submitting.set(false);
    this.sent.set(true);
  }
}
