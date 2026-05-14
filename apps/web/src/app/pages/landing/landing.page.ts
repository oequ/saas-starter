import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-landing-page',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      <h1>Oequ Starter</h1>
      <p>Angular + Supabase spike. Configure <code>.env</code> then try login.</p>
      <nav>
        <a routerLink="/login">Login</a>
        <a routerLink="/app">App (auth)</a>
        <a routerLink="/orgs/demo">Org “demo” (auth)</a>
      </nav>
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
        margin-top: 1rem;
      }
      code {
        background: #f4f4f4;
        padding: 0.1rem 0.3rem;
      }
    `,
  ],
})
export class LandingPage {}
