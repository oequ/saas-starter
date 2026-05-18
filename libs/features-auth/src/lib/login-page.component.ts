import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
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

const DEMO_LOGIN_EMAIL = 'demo@example.com';

function safeReturnUrl(raw: string | null): string {
  if (!raw?.startsWith('/') || raw.startsWith('//')) {
    return '/workspace';
  }
  return raw;
}

@Component({
  selector: 'oequ-login-page',
  imports: [ReactiveFormsModule, HlmCardImports, HlmButtonImports, HlmInput],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="bg-muted/30 flex min-h-svh flex-col items-center justify-center px-4 py-12"
    >
      <div class="w-full max-w-md">
        <div class="mb-8 text-center">
          <p class="text-primary text-sm font-medium tracking-wide uppercase">
            Sign in
          </p>
          <h1 class="mt-2 text-2xl font-semibold tracking-tight">
            Welcome back
          </h1>
          <p class="text-muted-foreground mt-2 text-sm leading-6">
            Demo: demo@example.com / demo
          </p>
        </div>

        <section hlmCard class="gap-0 overflow-hidden py-0">
          <div hlmCardContent class="!p-6">
            <form class="space-y-4" [formGroup]="form" (ngSubmit)="submit()">
              <div>
                <label for="login-email" class="mb-1.5 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="login-email"
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
                  for="login-password"
                  class="mb-1.5 block text-sm font-medium"
                >
                  Password
                </label>
                <input
                  id="login-password"
                  hlmInput
                  type="password"
                  autocomplete="current-password"
                  class="border-input bg-background h-9 w-full rounded-[5px] shadow-none"
                  formControlName="password"
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
              <div class="flex justify-end pt-2">
                <button
                  hlmBtn
                  type="submit"
                  [disabled]="signingIn()"
                >
                  {{ signingIn() ? 'Signing in…' : 'Sign in' }}
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  `,
})
export class LoginPageComponent {
  private readonly authPort = inject(AUTH_PORT);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly signingIn = signal(false);
  protected readonly submitAttempted = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly form = new FormGroup({
    email: new FormControl(DEMO_LOGIN_EMAIL, {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl('', {
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
