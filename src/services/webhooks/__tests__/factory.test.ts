import { describe, it, expect, beforeEach, vi } from 'vitest';

// Use the global mock from vitest.setup.ts instead of creating new mock
let AdapterRegistry: typeof import('@/adapters/registry').AdapterRegistry;
let UserManagementConfiguration: typeof import('@/core/config').UserManagementConfiguration;
let getApiWebhookService: typeof import('../factory').getApiWebhookService;
let WebhookServiceClass: typeof import('../WebhookService').WebhookService;

describe('getApiWebhookService', () => {
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
    
    ({ getApiWebhookService } = await import('../factory'));
    ({ WebhookService: WebhookServiceClass } = await import('../WebhookService'));
  });

  it('returns configured service if registered', () => {
    const svc = {} as any;
    UserManagementConfiguration.configureServiceProviders({ webhookService: svc });
    expect(getApiWebhookService({ reset: true })).toBe(svc);
    expect(getApiWebhookService()).toBe(svc);
  });

  it('creates default service with adapter when not configured', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('webhook', adapter);
    const service = getApiWebhookService({ reset: true });
    expect(service).toBeInstanceOf(WebhookServiceClass);
    // Services are now cached as singletons
    expect(getApiWebhookService()).toBe(service);
  });

  it('uses ServiceContainer override when configured', async () => {
    const { configureServices } = await import('@/lib/config/service-container');
    const svc = {} as any;
    configureServices({ webhookService: svc });
    expect(getApiWebhookService({ reset: true })).toBe(svc);
    expect(getApiWebhookService()).toBe(svc);
  });

  it('allows resetting the cached instance', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('webhook', adapter);
    const first = getApiWebhookService({ reset: true });
    const second = getApiWebhookService();
    const third = getApiWebhookService({ reset: true });
    expect(first).toBe(second);
    expect(third).not.toBe(first);
  });
});
