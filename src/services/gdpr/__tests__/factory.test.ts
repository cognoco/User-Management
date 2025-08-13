import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use the global mock from vitest.setup.ts instead of creating new mock
let AdapterRegistry: typeof import('@/adapters/registry').AdapterRegistry;
let getApiGdprService: typeof import('../factory').getApiGdprService;
let DefaultGdprService: typeof import('../default-gdpr.service').DefaultGdprService;

describe('getApiGdprService', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ AdapterRegistry } = await import('@/adapters/registry'));
    (AdapterRegistry as any).instance = null;
    vi.clearAllMocks();
    
    // Set required environment variables
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    
    ({ getApiGdprService } = await import('../factory'));
    ({ DefaultGdprService } = await import('../default-gdpr.service'));
  });

  it('returns configured service if registered', async () => {
    const { configureServices } = await import('@/lib/config/service-container');
    const service = {} as any;
    configureServices({ gdprService: service });
    expect(getApiGdprService()).toBe(service);
    expect(getApiGdprService()).toBe(service);
  });

  it('creates default service with adapter when not configured', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('gdpr', adapter);
    const service = getApiGdprService({ reset: true });
    expect(service).toBeInstanceOf(DefaultGdprService);
    // Services are now cached as singletons
    expect(getApiGdprService()).toBe(service);
  });

  it('allows resetting the cached instance', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('gdpr', adapter);
    const first = getApiGdprService({ reset: true });
    const second = getApiGdprService();
    const third = getApiGdprService({ reset: true });
    expect(first).toBe(second);
    expect(third).not.toBe(first);
  });
});
