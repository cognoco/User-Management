import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use the global mock from vitest.setup.ts instead of creating new mock
let getApiAddressService: typeof import('../factory').getApiAddressService;
let getApiPersonalAddressService: typeof import('../factory').getApiPersonalAddressService;
let DefaultAddressService: typeof import('../default-address.service').DefaultAddressService;
let AdapterRegistry: typeof import('@/adapters/registry').AdapterRegistry;
let UserManagementConfiguration: typeof import('@/core/config').UserManagementConfiguration;

describe('getApiAddressService', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ AdapterRegistry } = await import('@/adapters/registry'));
    ({ UserManagementConfiguration } = await import('@/core/config'));
    (AdapterRegistry as any).instance = null;
    UserManagementConfiguration.reset();
    vi.clearAllMocks();
    
    // Set required environment variables
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    
    ({ getApiAddressService, getApiPersonalAddressService } = await import('../factory'));
    ({ DefaultAddressService } = await import('../default-address.service'));
  });

  it('returns configured service if registered', async () => {
    const { configureServices } = await import('@/lib/config/service-container');
    const svc = {} as any;
    configureServices({ addressService: svc });
    expect(getApiAddressService()).toBe(svc);
    expect(getApiAddressService()).toBe(svc);
  });

  it('creates default service with adapter when not configured', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('address', adapter);
    const service = getApiAddressService({ reset: true });
    expect(service).toBeInstanceOf(DefaultAddressService);
    // Services are now cached as singletons
    expect(getApiAddressService()).toBe(service);
  });

  it('allows resetting the cached instance', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('address', adapter);
    const first = getApiAddressService({ reset: true });
    const second = getApiAddressService();
    const third = getApiAddressService({ reset: true });
    expect(first).toBe(second);
    expect(third).not.toBe(first);
  });
});

describe('getApiPersonalAddressService', () => {
  beforeEach(async () => {
    vi.resetModules();
    ({ AdapterRegistry } = await import('@/adapters/registry'));
    ({ UserManagementConfiguration } = await import('@/core/config'));
    (AdapterRegistry as any).instance = null;
    UserManagementConfiguration.reset();
    vi.clearAllMocks();
    
    // Set required environment variables
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    
    ({ getApiAddressService, getApiPersonalAddressService } = await import('../factory'));
    ({ DefaultAddressService } = await import('../default-address.service'));
  });

  it('returns configured personal service if registered', () => {
    const svc = {} as any;
    UserManagementConfiguration.configureServiceProviders({ personalAddressService: svc });
    expect(getApiPersonalAddressService()).toBe(svc);
    expect(getApiPersonalAddressService()).toBe(svc);
  });

  it('creates default personal service with adapter when not configured', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('address', adapter);
    const svc = getApiPersonalAddressService({ reset: true });
    expect(svc).toBeInstanceOf(DefaultAddressService);
    // Services are now cached as singletons
    expect(getApiPersonalAddressService()).toBe(svc);
  });

  it('allows resetting the cached personal instance', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('address', adapter);
    const first = getApiPersonalAddressService({ reset: true });
    const second = getApiPersonalAddressService();
    const third = getApiPersonalAddressService({ reset: true });
    expect(first).toBe(second);
    expect(third).not.toBe(first);
  });
});
