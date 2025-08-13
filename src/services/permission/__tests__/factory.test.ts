import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdapterRegistry } from '@/adapters/registry';
import { getApiPermissionService } from '../factory';
import { DefaultPermissionService } from '../default-permission.service';

describe('getApiPermissionService', () => {
  beforeEach(() => {
    vi.resetModules();
    (AdapterRegistry as any).instance = null;
    vi.clearAllMocks();
    // Set required environment variables
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('returns new service instance using adapter from registry', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('permission', adapter);
    // Register resourceRelationship adapter which is required by DefaultPermissionService
    AdapterRegistry.getInstance().registerAdapter('resourceRelationship', adapter);
    const service1 = getApiPermissionService();
    const service2 = getApiPermissionService();
    expect(service1).toBeInstanceOf(DefaultPermissionService);
    expect(service2).toBeInstanceOf(DefaultPermissionService);
    // Services are now cached as singletons
    expect(service1).toBe(service2);
  });
});
