import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  resource,
  signal,
} from '@angular/core';
import type { IntegrationCatalogItem } from '@oequ/ports';
import { INTEGRATIONS_PORT } from '@oequ/ports-angular';
import {
  TranslocoPipe,
  TranslocoService,
  portErrorToError,
  translatePortError,
} from '@oequ/i18n';
import { toast } from '@spartan-ng/brain/sonner';

import { ConnectIntegrationDialogComponent } from './connect-integration-dialog.component';
import { DisconnectIntegrationDialogComponent } from './disconnect-integration-dialog.component';
import { IntegrationCardComponent } from './integration-card.component';
import { IntegrationsPageSkeletonComponent } from './integrations-page-skeleton.component';

@Component({
  selector: 'oequ-org-integrations',
  imports: [
    IntegrationCardComponent,
    IntegrationsPageSkeletonComponent,
    ConnectIntegrationDialogComponent,
    DisconnectIntegrationDialogComponent,
    TranslocoPipe,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-6">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ 'org.integrations.title' | transloco }}
        </h1>
        <p class="text-muted-foreground mt-1 text-sm">
          {{ 'org.integrations.subtitle' | transloco }}
        </p>
      </div>

      @if (pageLoading()) {
        <oequ-integrations-page-skeleton />
      } @else if (loadError(); as error) {
        <p class="text-destructive text-sm" role="alert">{{ error }}</p>
      } @else {
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          @for (item of catalog(); track item.id) {
            <oequ-integration-card
              [item]="item"
              [connected]="isConnected(item.id)"
              (connectClicked)="openConnectDialog(item)"
              (disconnectClicked)="openDisconnectDialog(item)"
            />
          }
        </div>
      }
    </div>

    <oequ-connect-integration-dialog
      [open]="connectDialogOpen()"
      [integrationName]="dialogIntegrationName()"
      [connecting]="connecting()"
      (confirmed)="confirmConnect()"
      (cancelled)="closeConnectDialog()"
    />

    <oequ-disconnect-integration-dialog
      [open]="disconnectDialogOpen()"
      [integrationName]="dialogIntegrationName()"
      [disconnecting]="disconnecting()"
      (confirmed)="confirmDisconnect()"
      (cancelled)="closeDisconnectDialog()"
    />
  `,
})
export class OrgIntegrationsComponent {
  readonly organizationId = input.required<string>();

  private readonly integrationsPort = inject(INTEGRATIONS_PORT);
  private readonly transloco = inject(TranslocoService);

  private readonly dataRefresh = signal(0);

  protected readonly pageResource = resource({
    params: () => ({
      orgId: this.organizationId(),
      refresh: this.dataRefresh(),
    }),
    loader: async ({ params }) => {
      const [catalogResult, connectedResult] = await Promise.all([
        this.integrationsPort.listCatalog(),
        this.integrationsPort.listConnected(params.orgId),
      ]);

      if (!catalogResult.ok) {
        throw portErrorToError(catalogResult.error, this.transloco);
      }
      if (!connectedResult.ok) {
        throw portErrorToError(connectedResult.error, this.transloco);
      }

      return {
        catalog: catalogResult.data,
        connected: connectedResult.data,
      };
    },
  });

  protected readonly catalog = computed(
    () => this.pageResource.value()?.catalog ?? [],
  );

  protected readonly connectedIds = computed(() => {
    const connected = this.pageResource.value()?.connected ?? [];
    return new Set(connected.map((item) => item.integrationId));
  });

  protected readonly pageLoading = computed(
    () => this.pageResource.isLoading() && !this.pageResource.value(),
  );

  protected readonly loadError = computed(() => {
    const error = this.pageResource.error();
    return error instanceof Error ? error.message : null;
  });

  protected readonly connectDialogOpen = signal(false);
  protected readonly disconnectDialogOpen = signal(false);
  protected readonly dialogTarget = signal<IntegrationCatalogItem | null>(null);
  protected readonly connecting = signal(false);
  protected readonly disconnecting = signal(false);

  protected readonly dialogIntegrationName = computed(
    () => this.dialogTarget()?.name ?? '',
  );

  protected isConnected(integrationId: string): boolean {
    return this.connectedIds().has(integrationId);
  }

  protected openConnectDialog(item: IntegrationCatalogItem): void {
    this.dialogTarget.set(item);
    this.connectDialogOpen.set(true);
  }

  protected closeConnectDialog(): void {
    if (this.connecting()) {
      return;
    }
    this.connectDialogOpen.set(false);
    this.dialogTarget.set(null);
  }

  protected openDisconnectDialog(item: IntegrationCatalogItem): void {
    this.dialogTarget.set(item);
    this.disconnectDialogOpen.set(true);
  }

  protected closeDisconnectDialog(): void {
    if (this.disconnecting()) {
      return;
    }
    this.disconnectDialogOpen.set(false);
    this.dialogTarget.set(null);
  }

  protected async confirmConnect(): Promise<void> {
    const item = this.dialogTarget();
    if (!item || this.connecting()) {
      return;
    }

    this.connecting.set(true);
    const result = await this.integrationsPort.connect(
      this.organizationId(),
      item.id,
    );
    this.connecting.set(false);

    if (!result.ok) {
      toast.error(translatePortError(result.error, this.transloco));
      return;
    }

    this.connectDialogOpen.set(false);
    this.dialogTarget.set(null);
    this.dataRefresh.update((value) => value + 1);
    toast.success(
      this.transloco.translate('org.integrations.toast.connected', {
        name: item.name,
      }),
    );
  }

  protected async confirmDisconnect(): Promise<void> {
    const item = this.dialogTarget();
    if (!item || this.disconnecting()) {
      return;
    }

    this.disconnecting.set(true);
    const result = await this.integrationsPort.disconnect(
      this.organizationId(),
      item.id,
    );
    this.disconnecting.set(false);

    if (!result.ok) {
      toast.error(translatePortError(result.error, this.transloco));
      return;
    }

    this.disconnectDialogOpen.set(false);
    this.dialogTarget.set(null);
    this.dataRefresh.update((value) => value + 1);
    toast.success(
      this.transloco.translate('org.integrations.toast.disconnected', {
        name: item.name,
      }),
    );
  }
}
