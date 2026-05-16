import { TestBed } from '@angular/core/testing';
import { ORG_PORT } from '@oequ/ports';

import { provideDemoAdapters } from './provide-demo-adapters';

describe('adapters-mock', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideDemoAdapters()],
    });
  });

  it('provides auth and org ports', async () => {
    const orgPort = TestBed.inject(ORG_PORT);
    const list = await orgPort.listOrganizations();
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect(list.data.length).toBeGreaterThan(0);
    }
  });
});
