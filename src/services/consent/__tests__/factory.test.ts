import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdapterRegistry } from '@/adapters/registry';
import { UserManagementConfiguration } from '@/core/config';

// Use the global mock from vitest.setup.ts instead of creating new mock
let getApiConsentService: typeof import('../factory').getApiConsentService;
let DefaultConsentService: typeof import('../default-consent.service').DefaultConsentService;

describe('getApiConsentService', () => {
  beforeEach(async () => {
    vi.resetModules();
    (AdapterRegistry as any).instance = null;
    UserManagementConfiguration.reset();
    vi.clearAllMocks();
    
    // Set required environment variables
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    
    ({ getApiConsentService } = await import('../factory'));
    ({ DefaultConsentService } = await import('../default-consent.service'));
  });

  it('returns configured service if registered', () => {
    const svc = {} as any;
    UserManagementConfiguration.configureServiceProviders({ consentService: svc });
    expect(getApiConsentService({ reset: true })).toBe(svc);
    expect(getApiConsentService()).toBe(svc);
  });

  it('creates default service with adapter when not configured', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('consent', adapter);
    const service = getApiConsentService({ reset: true });
    expect(service).toBeInstanceOf(DefaultConsentService);
    // Services are now cached as singletons
    expect(getApiConsentService()).toBe(service);
  });

  it('allows resetting the cached instance', () => {
    const adapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('consent', adapter);
    const first = getApiConsentService({ reset: true });
    const second = getApiConsentService();
    const third = getApiConsentService({ reset: true });
    expect(first).toBe(second);
    expect(third).not.toBe(first);
  });
});
