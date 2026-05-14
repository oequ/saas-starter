import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { from, of, map, switchMap } from 'rxjs';
import { SupabaseService } from '../../core/supabase.service';

@Component({
  selector: 'app-org-shell-page',
  imports: [RouterLink],
  template: `
    <main class="wrap">
      <h1>Organization</h1>
      @if (loading()) {
        <p>Loading…</p>
      } @else if (error()) {
        <p class="err">{{ error() }}</p>
      } @else if (row()) {
        <p><strong>{{ row()!.name }}</strong> ({{ row()!.slug }})</p>
      } @else {
        <p>No row returned (RLS or missing slug).</p>
      }
      <nav>
        <a routerLink="/app">Back to app</a>
        <a routerLink="/">Home</a>
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
      .err {
        color: #b91c1c;
      }
      nav {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
      }
    `,
  ],
})
export class OrgShellPage implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly supabase = inject(SupabaseService);

  protected readonly loading = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly row = signal<{ name: string; slug: string } | null>(null);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        map((pm) => pm.get('slug')),
        switchMap((slug) => {
          this.loading.set(true);
          this.error.set(null);
          this.row.set(null);
          if (!slug) {
            this.loading.set(false);
            return of({ data: null, error: null as PostgrestErrorish | null });
          }
          const client = this.supabase.getClient();
          if (!client) {
            this.loading.set(false);
            return of({
              data: null,
              error: { message: 'Supabase not configured' } as PostgrestErrorish,
            });
          }
          return from(
            client.from('organizations').select('name, slug').eq('slug', slug).maybeSingle()
          );
        })
      )
      .subscribe((res) => {
        this.loading.set(false);
        if (res.error) {
          this.error.set(res.error.message);
          return;
        }
        this.row.set(res.data);
      });
  }
}

/** Minimal shape so we do not depend on generated DB types yet. */
type PostgrestErrorish = { message: string };
