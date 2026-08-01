import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  resource,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  TranslocoPipe,
  TranslocoService,
  portErrorToError,
} from '@oequ/i18n';
import { billingStatusBanner } from '@oequ/ports';
import { BILLING_PORT, ORG_PORT } from '@oequ/ports-angular';
import { toSignal } from '@angular/core/rxjs-interop';
import { HlmButtonImports } from '@spartan-ng/helm/button';

@Component({
  selector: 'oequ-billing-status-banner',
  imports: [RouterLink, HlmButtonImports, TranslocoPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (banner(); as alert) {
      <div
        role="status"
        class="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm"
        [class]="bannerClass(alert.tone)"
      >
        <p class="min-w-0 flex-1 leading-relaxed">{{ bannerMessage(alert) }}</p>
        <a hlmBtn size="sm" variant="secondary" [routerLink]="alert.ctaPath">
          {{ alert.ctaLabelKey | transloco }}
        </a>
      </div>
    }
  `,
})
export class BillingStatusBannerComponent {
  private readonly orgPort = inject(ORG_PORT);
  private readonly billingPort = inject(BILLING_PORT);
  private readonly transloco = inject(TranslocoService);

  private readonly activeOrganization = toSignal(
    this.orgPort.activeOrganization$,
    { initialValue: null },
  );

  private readonly billingResource = resource({
    params: () => {
      const org = this.activeOrganization();
      return org ? { orgId: org.id } : undefined;
    },
    loader: async ({ params, abortSignal }) => {
      const result = await this.billingPort.getSummary(params.orgId, abortSignal);
      if (!result.ok) {
        throw portErrorToError(result.error, this.transloco);
      }
      return result.data;
    },
  });

  protected readonly banner = computed(() =>
    billingStatusBanner(this.billingResource.value()),
  );

  protected bannerMessage(alert: NonNullable<ReturnType<typeof billingStatusBanner>>): string {
    return this.transloco.translate(
      alert.messageKey,
      alert.messageParams,
    );
  }

  protected bannerClass(tone: 'info' | 'warning' | 'critical'): string {
    switch (tone) {
      case 'critical':
        return 'border-destructive/30 bg-destructive/10 text-destructive';
      case 'warning':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200';
      default:
        return 'border-primary/20 bg-primary/5 text-foreground';
    }
  }
}
