import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use the global mock from vitest.setup.ts instead of creating new mock
let AdapterRegistry: typeof import('@/adapters/registry').AdapterRegistry;
let UserManagementConfiguration: typeof import('@/core/config').UserManagementConfiguration;
let getApiSubscriptionService: typeof import('../factory').getApiSubscriptionService;
let DefaultSubscriptionService: typeof import('../default-subscription.service').DefaultSubscriptionService;

describe('getApiSubscriptionService', () => {
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
    
    ({ getApiSubscriptionService } = await import('../factory'));
    ({ DefaultSubscriptionService } = await import('../default-subscription.service'));
  });

  it('returns configured service if registered', () => {
    const svc = {} as any;
    UserManagementConfiguration.configureServiceProviders({ subscriptionService: svc });
    expect(getApiSubscriptionService({ reset: true })).toBe(svc);
    expect(getApiSubscriptionService()).toBe(svc);
  });

  it('creates default service with adapter when not configured', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('subscription', adapter);
    const service = getApiSubscriptionService({ reset: true });
    expect(service).toBeInstanceOf(DefaultSubscriptionService);
    // Services are now cached as singletons
    expect(getApiSubscriptionService()).toBe(service);
  });

  it('uses ServiceContainer override when configured', async () => {
    const { configureServices } = await import('@/lib/config/service-container');
    const svc = {} as any;
    configureServices({ subscriptionService: svc });
    expect(getApiSubscriptionService({ reset: true })).toBe(svc);
    expect(getApiSubscriptionService()).toBe(svc);
  });

  it('allows resetting the cached instance', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('subscription', adapter);
    const first = getApiSubscriptionService({ reset: true });
    const second = getApiSubscriptionService();
    const third = getApiSubscriptionService({ reset: true });
    expect(first).toBe(second);
    expect(third).not.toBe(first);
  });
});
