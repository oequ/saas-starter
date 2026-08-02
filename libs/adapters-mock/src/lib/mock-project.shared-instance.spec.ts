import { TestBed } from '@angular/core/testing';
import { PROJECT_PORT } from '@oequ/ports-angular';

import {
  MockProjectAdapter,
  provideMockProject,
} from './mock-project.adapter';

describe('provideMockProject', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideMockProject()],
    });
  });

  it('registers one shared instance for MockProjectAdapter and PROJECT_PORT', () => {
    const asClass = TestBed.inject(MockProjectAdapter);
    const asPort = TestBed.inject(PROJECT_PORT);
    expect(asClass).toBe(asPort);
    expect(asClass).toBe(TestBed.inject(MockProjectAdapter));
  });
});
