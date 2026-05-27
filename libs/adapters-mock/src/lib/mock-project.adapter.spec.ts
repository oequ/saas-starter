import { MOCK_ORGANIZATIONS } from './data/mock-data';
import { MockProjectAdapter } from './mock-project.adapter';

describe('MockProjectAdapter', () => {
  it('lists seed projects for the first demo organization', async () => {
    const adapter = new MockProjectAdapter();
    const parcelId = MOCK_ORGANIZATIONS[0].id;
    const list = await adapter.listProjects(parcelId);
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect(list.data.length).toBe(2);
      expect(list.data.every((p) => p.organizationId === parcelId)).toBe(true);
    }
  });

  it('resetMockState restores seed after mutations', async () => {
    const adapter = new MockProjectAdapter();
    const parcelId = MOCK_ORGANIZATIONS[0].id;
    const created = await adapter.createProject(parcelId, { name: 'Temp' });
    expect(created.ok).toBe(true);
    adapter.resetMockState();
    const list = await adapter.listProjects(parcelId);
    expect(list.ok).toBe(true);
    if (list.ok) {
      expect(list.data.length).toBe(2);
    }
  });
});
