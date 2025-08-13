import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdapterRegistry } from '@/adapters/registry';
import { UserManagementConfiguration } from '@/core/config';

// Use the global mock from vitest.setup.ts instead of creating new mock
let getApiCsrfService: typeof import('../factory').getApiCsrfService;
let DefaultCsrfService: typeof import('../default-csrf.service').DefaultCsrfService;

describe('getApiCsrfService', () => {
  beforeEach(async () => {
    vi.resetModules();
    (AdapterRegistry as any).instance = null;
    UserManagementConfiguration.reset();
    vi.clearAllMocks();
    
    // Set required environment variables
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    
    ({ getApiCsrfService } = await import('../factory'));
    ({ DefaultCsrfService } = await import('../default-csrf.service'));
  });

  it('returns configured service if registered', () => {
    const service = {} as any;
    UserManagementConfiguration.configureServiceProviders({ csrfService: service });
    expect(getApiCsrfService()).toBe(service);
    expect(getApiCsrfService()).toBe(service);
  });

  it('creates default service with adapter when not configured', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('csrf', adapter);
    const service = getApiCsrfService();
    expect(service).toBeInstanceOf(DefaultCsrfService);
    // Services are now cached as singletons
    expect(getApiCsrfService()).toBe(service);
  });

  it('uses ServiceContainer override when configured', async () => {
    const { configureServices } = await import('@/lib/config/service-container');
    const svc = {} as any;
    configureServices({ csrfService: svc });
    const result = getApiCsrfService();
    expect(result).toBe(svc);
    expect(getApiCsrfService()).toBe(svc);
  });

  it('can reset cached instance', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('csrf', adapter);
    const first = getApiCsrfService();
    const second = getApiCsrfService();
    expect(first).toBe(second);

    const reset = getApiCsrfService({ reset: true });
    expect(reset).not.toBe(first);
  });
});
