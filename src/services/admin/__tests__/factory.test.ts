import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use the global mock from vitest.setup.ts instead of creating new mock
let AdapterRegistry: typeof import('@/adapters/registry').AdapterRegistry;
let getApiAdminService: typeof import('../factory').getApiAdminService;
let DefaultAdminService: typeof import('../default-admin.service').DefaultAdminService;

describe('getApiAdminService', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ AdapterRegistry } = await import('@/adapters/registry'));
    (AdapterRegistry as any).instance = null;
    vi.clearAllMocks();
    
    // Set required environment variables
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    
    ({ getApiAdminService } = await import('../factory'));
    ({ DefaultAdminService } = await import('../default-admin.service'));
  });

  it('returns configured service if registered in ServiceContainer', () => {
    const { configureServices } = require('@/lib/config/service-container');
    const svc = { searchUsers: vi.fn() } as any;
    configureServices({ adminService: svc });
    expect(getApiAdminService()).toBe(svc);
    expect(getApiAdminService()).toBe(svc);
  });

  it('creates default service with adapter when not configured', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('admin', adapter);
    const service = getApiAdminService({ reset: true });
    expect(service).toBeInstanceOf(DefaultAdminService);
    // Services are now cached as singletons
    expect(getApiAdminService()).toBe(service);
  });

  it('supports reset option to clear cache', () => {
    const { configureServices } = require('@/lib/config/service-container');
    const svc1 = { searchUsers: vi.fn() } as any;
    const svc2 = { searchUsers: vi.fn() } as any;
    configureServices({ adminService: svc1 });
    expect(getApiAdminService()).toBe(svc1);
    configureServices({ adminService: svc2 });
    // Still cached
    expect(getApiAdminService()).toBe(svc1);
    expect(getApiAdminService({ reset: true })).toBe(svc2);
  });
});
