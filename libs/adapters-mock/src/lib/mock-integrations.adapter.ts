import type { Provider } from '@angular/core';
import { type IntegrationCatalogItem, type IntegrationsPort, type OrganizationId, portOk, type PortResult, type WorkspaceIntegration } from '@oequ/ports';
import { provideIntegrationsPort } from '@oequ/ports-angular';

import {
  cloneMockIntegrationsSeed,
  MOCK_INTEGRATIONS_CATALOG,
} from './data/mock-integrations-data';
import { MOCK_DEMO_EMAIL } from './data/mock-data';
import { mockErr } from './mock-port-error';

const DEMO_INTEGRATIONS_SNAPSHOT_KEY = 'oequ-demo-integrations';
const MOCK_LATENCY_MS = 250;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readSnapshot(): Map<string, WorkspaceIntegration[]> | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  const raw = sessionStorage.getItem(DEMO_INTEGRATIONS_SNAPSHOT_KEY);
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as Record<string, WorkspaceIntegration[]>;
    return new Map(
      Object.entries(parsed).map(([orgId, items]) => [
        orgId,
        items.map((item) => ({ ...item })),
      ]),
    );
  } catch {
    return null;
  }
}

function writeSnapshot(connectedByOrg: Map<string, WorkspaceIntegration[]>): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  const record: Record<string, WorkspaceIntegration[]> = {};
  for (const [orgId, items] of connectedByOrg) {
    record[orgId] = items;
  }
  sessionStorage.setItem(DEMO_INTEGRATIONS_SNAPSHOT_KEY, JSON.stringify(record));
}

/** Plain IntegrationsPort mock — wire via provideMockIntegrations() (no @Injectable). */
export class MockIntegrationsAdapter implements IntegrationsPort {
  private connectedByOrg = readSnapshot() ?? cloneMockIntegrationsSeed();

  resetMockState(): void {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem(DEMO_INTEGRATIONS_SNAPSHOT_KEY);
    }
    this.connectedByOrg = cloneMockIntegrationsSeed();
  }

  async listCatalog(): Promise<PortResult<readonly IntegrationCatalogItem[]>> {
    await delay(MOCK_LATENCY_MS);
    return portOk(MOCK_INTEGRATIONS_CATALOG);
  }

  async listConnected(
    organizationId: OrganizationId,
  ): Promise<PortResult<readonly WorkspaceIntegration[]>> {
    await delay(MOCK_LATENCY_MS);
    return portOk(this.connectedByOrg.get(organizationId) ?? []);
  }

  async connect(
    organizationId: OrganizationId,
    integrationId: string,
  ): Promise<PortResult<WorkspaceIntegration>> {
    await delay(MOCK_LATENCY_MS);

    const catalogItem = MOCK_INTEGRATIONS_CATALOG.find(
      (item) => item.id === integrationId,
    );
    if (!catalogItem) {
      return mockErr('NOT_FOUND', 'integrationNotFound');
    }

    const existing = this.connectedByOrg.get(organizationId) ?? [];
    if (existing.some((item) => item.integrationId === integrationId)) {
      return mockErr('CONFLICT', 'integrationAlreadyConnected', {
        name: catalogItem.name,
      });
    }

    const connection: WorkspaceIntegration = {
      integrationId,
      organizationId,
      connectedAt: new Date().toISOString(),
      connectedByEmail: MOCK_DEMO_EMAIL,
    };

    this.connectedByOrg.set(organizationId, [...existing, connection]);
    writeSnapshot(this.connectedByOrg);
    return portOk(connection);
  }

  async disconnect(
    organizationId: OrganizationId,
    integrationId: string,
  ): Promise<PortResult<void>> {
    await delay(MOCK_LATENCY_MS);

    const existing = this.connectedByOrg.get(organizationId) ?? [];
    const next = existing.filter((item) => item.integrationId !== integrationId);
    if (next.length === existing.length) {
      return mockErr('NOT_FOUND', 'integrationNotConnected');
    }

    this.connectedByOrg.set(organizationId, next);
    writeSnapshot(this.connectedByOrg);
    return portOk(undefined);
  }
}

/** Single shared MockIntegrationsAdapter instance for INTEGRATIONS_PORT + concrete class token. */
export function provideMockIntegrations(): Provider[] {
  const integrations = new MockIntegrationsAdapter();
  return [
    { provide: MockIntegrationsAdapter, useValue: integrations },
    provideIntegrationsPort(integrations),
  ];
}
