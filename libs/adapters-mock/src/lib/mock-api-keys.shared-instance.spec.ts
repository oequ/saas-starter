import { TestBed } from '@angular/core/testing';
import { API_KEYS_PORT } from '@oequ/ports-angular';

import {
  MockApiKeysAdapter,
  provideMockApiKeys,
} from './mock-api-keys.adapter';

describe('provideMockApiKeys', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [...provideMockApiKeys()],
    });
  });

  it('registers one shared instance for MockApiKeysAdapter and API_KEYS_PORT', () => {
    const asClass = TestBed.inject(MockApiKeysAdapter);
    const asPort = TestBed.inject(API_KEYS_PORT);
    expect(asClass).toBe(asPort);
    expect(asClass).toBe(TestBed.inject(MockApiKeysAdapter));
  });
});
