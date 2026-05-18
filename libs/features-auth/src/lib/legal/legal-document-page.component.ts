import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { getLegalDocument } from './legal-documents';

@Component({
  selector: 'oequ-legal-document-page',
  imports: [RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (document(); as doc) {
      <article>
        <p class="text-primary text-sm font-medium tracking-wide uppercase">
          Legal
        </p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">
          {{ doc.title }}
        </h1>
        <p class="text-muted-foreground mt-3 text-sm leading-6">
          {{ doc.description }}
        </p>
        <p class="text-muted-foreground mt-2 text-xs">
          Last updated {{ doc.lastUpdated }}
        </p>

        <div class="mt-10 space-y-8">
          @for (section of doc.sections; track section.heading) {
            <section>
              <h2 class="text-lg font-semibold tracking-tight">
                {{ section.heading }}
              </h2>
              @for (paragraph of section.paragraphs; track paragraph) {
                <p class="text-muted-foreground mt-3 text-sm leading-7">
                  {{ paragraph }}
                </p>
              }
            </section>
          }
        </div>

        <nav
          class="border-border mt-12 flex flex-wrap gap-x-4 gap-y-2 border-t pt-6 text-sm"
          aria-label="Related legal documents"
        >
          @for (link of relatedLinks(); track link.path) {
            <a
              [routerLink]="link.path"
              class="text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              {{ link.label }}
            </a>
          }
        </nav>
      </article>
    } @else {
      <div class="text-center">
        <h1 class="text-xl font-semibold">Document not found</h1>
        <p class="text-muted-foreground mt-2 text-sm">
          <a routerLink="/auth/login" class="underline">Return to sign in</a>
        </p>
      </div>
    }
  `,
})
export class LegalDocumentPageComponent {
  private readonly route = inject(ActivatedRoute);

  private readonly documentId = computed(
    () => this.route.snapshot.data['legalDocId'] as string | undefined,
  );

  protected readonly document = computed(() => {
    const id = this.documentId();
    return id ? getLegalDocument(id) : null;
  });

  protected readonly relatedLinks = computed(() => {
    const current = this.documentId();
    const links = [
      { path: '/auth/terms', label: 'Terms of Service', id: 'terms' },
      { path: '/auth/privacy', label: 'Privacy Policy', id: 'privacy' },
      { path: '/auth/security', label: 'Security', id: 'security' },
      { path: '/auth/cookies', label: 'Cookie Policy', id: 'cookies' },
    ];
    return links.filter((link) => link.id !== current);
  });
}
