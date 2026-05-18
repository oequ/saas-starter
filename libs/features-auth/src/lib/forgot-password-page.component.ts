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
    <div
      class="bg-muted/30 flex min-h-svh flex-col items-center justify-center px-4 py-12"
    >
      <div class="w-full max-w-md">
        <div class="mb-8 text-center">
          <p class="text-primary text-sm font-medium tracking-wide uppercase">
            Account
          </p>
          <h1 class="mt-2 text-2xl font-semibold tracking-tight">
            Reset your password
          </h1>
          <p class="text-muted-foreground mt-2 text-sm leading-6">
            Enter your email and we will send a reset link if an account exists.
          </p>
        </div>

        <section hlmCard class="gap-0 overflow-hidden py-0">
          <div hlmCardContent class="!p-6">
            @if (sent()) {
              <p class="text-sm leading-6" role="status">
                If an account exists for
                <span class="font-medium">{{ submittedEmail() }}</span>, you will
                receive instructions shortly. In this demo, no email is sent.
              </p>
              <div class="mt-6 flex justify-end">
                <a hlmBtn routerLink="/auth/login">Back to sign in</a>
              </div>
            } @else {
              <form
                class="space-y-4"
                [formGroup]="form"
                (ngSubmit)="submit()"
              >
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
                    class="border-input bg-background h-9 w-full rounded-[5px] shadow-none"
                    formControlName="email"
                  />
                  @if (submitAttempted() && form.controls.email.invalid) {
                    <p class="text-destructive mt-1.5 text-sm">
                      Enter a valid email address.
                    </p>
                  }
                </div>
                <div class="flex justify-between gap-3 pt-2">
                  <a
                    hlmBtn
                    variant="secondary"
                    type="button"
                    routerLink="/auth/login"
                  >
                    Cancel
                  </a>
                  <button hlmBtn type="submit" [disabled]="submitting()">
                    {{ submitting() ? 'Sending…' : 'Send reset link' }}
                  </button>
                </div>
              </form>
            }
          </div>
        </section>

        <p class="text-muted-foreground mt-6 text-center text-xs leading-relaxed">
          <a
            routerLink="/auth/login"
            class="hover:text-foreground underline-offset-4 hover:underline"
          >
            Back to sign in
          </a>
        </p>
      </div>
    </div>
  `,
})
export class ForgotPasswordPageComponent {
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
