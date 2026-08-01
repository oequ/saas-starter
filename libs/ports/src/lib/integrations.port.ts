import type {
  IntegrationCatalogItem,
  WorkspaceIntegration,
} from './models/integration.model';
import type { PortResult } from './models/common.model';
import type { OrganizationId } from './models/org.model';

export interface IntegrationsPort {
  listCatalog(): Promise<PortResult<readonly IntegrationCatalogItem[]>>;

  listConnected(
    organizationId: OrganizationId,
  ): Promise<PortResult<readonly WorkspaceIntegration[]>>;

  connect(
    organizationId: OrganizationId,
    integrationId: string,
  ): Promise<PortResult<WorkspaceIntegration>>;

  disconnect(
    organizationId: OrganizationId,
    integrationId: string,
  ): Promise<PortResult<void>>;
}

