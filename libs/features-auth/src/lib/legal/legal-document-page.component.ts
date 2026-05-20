import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TranslocoPipe, TranslocoService } from '@oequ/i18n';

import {
  isLegalDocumentId,
  type LegalDocument,
  type LegalDocumentId,
} from './legal-documents';

interface LegalDocumentTranslation {
  readonly title?: string;
  readonly description?: string;
  readonly lastUpdated?: string;
  readonly sections?: readonly LegalDocumentSectionTranslation[];
}

interface LegalDocumentSectionTranslation {
  readonly heading?: string;
  readonly paragraphs?: readonly string[];
}

@Component({
  selector: 'oequ-legal-document-page',
  imports: [RouterLink, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (document(); as doc) {
      <article>
        <p class="text-primary text-sm font-medium tracking-wide uppercase">
          {{ 'legal.eyebrow' | transloco }}
        </p>
        <h1 class="mt-2 text-3xl font-semibold tracking-tight">
          {{ doc.title }}
        </h1>
        <p class="text-muted-foreground mt-3 text-sm leading-6">
          {{ doc.description }}
        </p>
        <p class="text-muted-foreground mt-2 text-xs">
          {{
            'legal.lastUpdated'
              | transloco: { date: doc.lastUpdated }
          }}
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
          [attr.aria-label]="'legal.relatedAria' | transloco"
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
        <h1 class="text-xl font-semibold">
          {{ 'legal.notFound.title' | transloco }}
        </h1>
        <p class="text-muted-foreground mt-2 text-sm">
          <a routerLink="/auth/login" class="underline">{{
            'legal.notFound.returnToSignIn' | transloco
          }}</a>
        </p>
      </div>
    }
  `,
})
export class LegalDocumentPageComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly transloco = inject(TranslocoService);

  private readonly documentId = computed(
    () => this.route.snapshot.data['legalDocId'] as string | undefined,
  );

  protected readonly document = computed((): LegalDocument | null => {
    const id = this.documentId();
    if (!id || !isLegalDocumentId(id)) {
      return null;
    }
    return this.resolveLegalDocument(id);
  });

  protected readonly relatedLinks = computed(() => {
    const current = this.documentId();
    const links: readonly {
      readonly path: string;
      readonly labelKey: string;
      readonly id: LegalDocumentId;
    }[] = [
      { path: '/auth/terms', labelKey: 'legal.links.terms', id: 'terms' },
      { path: '/auth/privacy', labelKey: 'legal.links.privacy', id: 'privacy' },
      { path: '/auth/security', labelKey: 'legal.links.security', id: 'security' },
      { path: '/auth/cookies', labelKey: 'legal.links.cookies', id: 'cookies' },
    ];
    return links
      .filter((link) => link.id !== current)
      .map((link) => ({
        path: link.path,
        label: this.transloco.translate(link.labelKey),
      }));
  });

  private resolveLegalDocument(id: LegalDocumentId): LegalDocument {
    const raw = this.transloco.translateObject(
      `legal.${id}`,
    ) as LegalDocumentTranslation;

    const sections =
      raw.sections?.map((section) => ({
        heading: section.heading ?? '',
        paragraphs: section.paragraphs ?? [],
      })) ?? [];

    return {
      id,
      title: raw.title ?? id,
      description: raw.description ?? '',
      lastUpdated: raw.lastUpdated ?? '',
      sections,
    };
  }
}
