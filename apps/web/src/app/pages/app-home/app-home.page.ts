import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SupabaseService } from '../../core/supabase.service';

@Component({
  selector: 'app-app-home-page',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      <h1>App</h1>
      <p>You are signed in.</p>
      @if (email()) {
        <p class="meta">{{ email() }}</p>
      }
      <nav>
        <a routerLink="/orgs/demo">Open org “demo”</a>
        <a routerLink="/">Home</a>
      </nav>
      <button type="button" (click)="logout()">Sign out</button>
    </main>
  `,
  styles: [
    `
      .wrap {
        max-width: 40rem;
        margin: 2rem auto;
        font-family: system-ui, sans-serif;
      }
      nav {
        display: flex;
        gap: 1rem;
        margin: 1rem 0;
      }
      .meta {
        color: #555;
        font-size: 0.9rem;
      }
    `,
  ],
})
export class AppHomePage {
  private readonly supabase = inject(SupabaseService);
  private readonly router = inject(Router);
  protected readonly email = signal<string | null>(null);

  constructor() {
    void this.loadUser();
  }

  private async loadUser(): Promise<void> {
    const client = this.supabase.getClient();
    if (!client) return;
    const {
      data: { user },
    } = await client.auth.getUser();
    this.email.set(user?.email ?? null);
  }

  async logout(): Promise<void> {
    const client = this.supabase.getClient();
    await client?.auth.signOut();
    await this.router.navigateByUrl('/login');
  }
}
