import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdapterRegistry } from '@/adapters/registry';
import { getApiUserService } from '../factory';
import { DefaultUserService } from '../default-user.service';

describe('getApiUserService', () => {
  beforeEach(() => {
    vi.resetModules();
    (AdapterRegistry as any).instance = null;
    // Clear any mocks from vitest.setup.ts
    vi.clearAllMocks();
  });

  it('returns new service instance using adapter from registry', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('user', adapter);
    const service1 = getApiUserService();
    const service2 = getApiUserService();
    expect(service1).toBeInstanceOf(DefaultUserService);
    expect(service2).toBeInstanceOf(DefaultUserService);
    // Note: The factory now returns cached instances, so they will be the same
    expect(service1).toBe(service2);
  });
});
