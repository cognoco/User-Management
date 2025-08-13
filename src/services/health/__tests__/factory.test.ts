import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use the global mock from vitest.setup.ts instead of creating new mock
let AdapterRegistry: typeof import('@/adapters/registry').AdapterRegistry;
let createHealthService: typeof import('../factory').createHealthService;
let getHealthService: typeof import('../factory').getHealthService;
let DefaultHealthService: typeof import('../default-health.service').DefaultHealthService;

describe('createHealthService', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ AdapterRegistry } = await import('@/adapters/registry'));
    (AdapterRegistry as any).instance = null;
    vi.clearAllMocks();
    
    // Set required environment variables
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    
    ({ createHealthService, getHealthService } = await import('../factory'));
    ({ DefaultHealthService } = await import('../default-health.service'));
  });

  it('creates service using health adapter', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('health', adapter);
    const svc = createHealthService();
    expect(svc).toBeInstanceOf(DefaultHealthService);
  });
});

describe('getHealthService', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ AdapterRegistry } = await import('@/adapters/registry'));
    (AdapterRegistry as any).instance = null;
    vi.clearAllMocks();
    
    // Set required environment variables
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    
    ({ createHealthService, getHealthService } = await import('../factory'));
    ({ DefaultHealthService } = await import('../default-health.service'));
  });

  it('returns new service instance', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('health', adapter);
    const svc = getHealthService();
    expect(svc).toBeInstanceOf(DefaultHealthService);
  });
});