import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use the global mock from vitest.setup.ts instead of creating new mock
let AdapterRegistry: typeof import('@/adapters/registry').AdapterRegistry;
let UserManagementConfiguration: typeof import('@/core/config').UserManagementConfiguration;
let getApiNotificationService: typeof import('../factory').getApiNotificationService;
let DefaultNotificationService: typeof import('../default-notification.service').DefaultNotificationService;

describe('getApiNotificationService', () => {
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
    
    ({ getApiNotificationService } = await import('../factory'));
    ({ DefaultNotificationService } = await import('../default-notification.service'));
  });

  it('returns configured service if registered', () => {
    const service = {} as any;
    UserManagementConfiguration.configureServiceProviders({ notificationService: service });
    expect(getApiNotificationService({ reset: true })).toBe(service);
    expect(getApiNotificationService()).toBe(service);
  });

  it('creates default service with adapter when not configured', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('notification', adapter);
    const service = getApiNotificationService({ reset: true });
    expect(service).toBeInstanceOf(DefaultNotificationService);
    // Services are now cached as singletons
    expect(getApiNotificationService()).toBe(service);
  });

  it('uses ServiceContainer override when configured', async () => {
    const { configureServices } = await import('@/lib/config/service-container');
    const svc = {} as any;
    configureServices({ notificationService: svc });
    expect(getApiNotificationService({ reset: true })).toBe(svc);
    expect(getApiNotificationService()).toBe(svc);
  });

  it('allows resetting the cached instance', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('notification', adapter);
    const first = getApiNotificationService({ reset: true });
    const second = getApiNotificationService();
    const third = getApiNotificationService({ reset: true });
    expect(first).toBe(second);
    expect(third).not.toBe(first);
  });
});
