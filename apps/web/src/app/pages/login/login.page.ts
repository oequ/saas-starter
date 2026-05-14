import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/supabase.service';

@Component({
  selector: 'app-login-page',
  imports: [FormsModule, RouterLink],
  template: `
    <main class="wrap">
      <h1>Login</h1>
      @if (!supabase.envConfigured()) {
        <p class="warn">
          Missing <code>VITE_SUPABASE_URL</code> or <code>VITE_SUPABASE_ANON_KEY</code> in
          <code>.env</code> at repo root.
        </p>
      } @else if (error()) {
        <p class="err">{{ error() }}</p>
      }
      <form (ngSubmit)="submit()">
        <label>
          Email
          <input name="email" type="email" [(ngModel)]="email" required autocomplete="username" />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            [(ngModel)]="password"
            required
            autocomplete="current-password"
          />
        </label>
        <button type="submit" [disabled]="busy()">Sign in</button>
      </form>
      <p><a routerLink="/">Home</a></p>
    </main>
  `,
  styles: [
    `
      .wrap {
        max-width: 22rem;
        margin: 2rem auto;
        font-family: system-ui, sans-serif;
      }
      label {
        display: block;
        margin-bottom: 0.75rem;
      }
      input {
        display: block;
        width: 100%;
        margin-top: 0.25rem;
      }
      button {
        margin-top: 0.5rem;
      }
      .warn {
        color: #92400e;
      }
      .err {
        color: #b91c1c;
      }
    `,
  ],
})
export class LoginPage {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly supabase = inject(SupabaseService);

  protected email = '';
  protected password = '';
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  async submit(): Promise<void> {
    this.error.set(null);
    const client = this.supabase.getClient();
    if (!client) {
      this.error.set('Supabase is not configured.');
      return;
    }
    this.busy.set(true);
    const { error } = await client.auth.signInWithPassword({
      email: this.email.trim(),
      password: this.password,
    });
    this.busy.set(false);
    if (error) {
      this.error.set(error.message);
      return;
    }
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') || '/app';
    await this.router.navigateByUrl(returnUrl);
  }
}
