import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdapterRegistry } from '@/adapters/registry';

// Use the global mock from vitest.setup.ts instead of creating new mock
let getApiKeyService: typeof import('../factory').getApiKeyService;
let DefaultApiKeysService: typeof import('../default-api-keys.service').DefaultApiKeysService;

describe('getApiKeyService', () => {
  beforeEach(async () => {
    vi.resetModules();
    (AdapterRegistry as any).instance = null;
    vi.clearAllMocks();
    
    // Set required environment variables
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    
    ({ getApiKeyService } = await import('../factory'));
    ({ DefaultApiKeysService } = await import('../default-api-keys.service'));
  });

  it('returns configured service if registered', () => {
    const { configureServices } = require('@/lib/config/service-container');
    const svc = {} as any;
    configureServices({ apiKeyService: svc });
    expect(getApiKeyService()).toBe(svc);
    expect(getApiKeyService()).toBe(svc);
  });

  it('creates default service with adapter when not configured', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('apiKey', adapter);
    const service = getApiKeyService({ reset: true });
    expect(service).toBeInstanceOf(DefaultApiKeysService);
    // Services are now cached as singletons
    expect(getApiKeyService()).toBe(service);
  });

  it('allows resetting the cached instance', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('apiKey', adapter);
    const first = getApiKeyService({ reset: true });
    const second = getApiKeyService();
    const third = getApiKeyService({ reset: true });
    expect(first).toBe(second);
    expect(third).not.toBe(first);
  });
});
