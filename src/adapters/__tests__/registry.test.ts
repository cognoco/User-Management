
import { AdapterRegistry, AdapterFactory, FactoryCreator } from '../registry';
import { SupabaseAdapterFactory, createSupabaseAdapterFactory } from '../supabase-factory';
import type { AuthDataProvider } from '@/adapters/auth/interfaces';
import type { IUserDataProvider } from '@/core/user/IUserDataProvider';
import type { ITeamDataProvider } from '@/core/team/ITeamDataProvider';
import type { IPermissionDataProvider } from '@/core/permission/IPermissionDataProvider';
import type { SessionDataProvider } from '@/core/session/ISessionDataProvider';
import type { SsoDataProvider } from '@/core/sso/ISsoDataProvider';
import type { ISubscriptionDataProvider } from '@/core/subscription/ISubscriptionDataProvider';
import type { IApiKeyDataProvider } from '@/core/api-keys/IApiKeyDataProvider';

// Mock the environment variables
const originalEnv = process.env;

/**
 * Create a minimal mock that satisfies a provider interface for registry tests.
 * The registry only stores and retrieves providers — it never calls their methods —
 * so we only need the correct shape at the type level.
 */
function mockProvider<T>(label: string): T {
  return { __mock: label } as unknown as T;
}

/**
 * A test factory that satisfies all required AdapterFactory methods.
 * Returns lightweight mock objects for each provider type.
 */
class TestAdapterFactory implements AdapterFactory {
  createAuthProvider(): AuthDataProvider {
    return mockProvider<AuthDataProvider>('auth');
  }
  createUserProvider(): IUserDataProvider {
    return mockProvider<IUserDataProvider>('user');
  }
  createTeamProvider(): ITeamDataProvider {
    return mockProvider<ITeamDataProvider>('team');
  }
  createPermissionProvider(): IPermissionDataProvider {
    return mockProvider<IPermissionDataProvider>('permission');
  }
  createSessionProvider(): SessionDataProvider {
    return mockProvider<SessionDataProvider>('session');
  }
  createSsoProvider(): SsoDataProvider {
    return mockProvider<SsoDataProvider>('sso');
  }
  createSubscriptionProvider(): ISubscriptionDataProvider {
    return mockProvider<ISubscriptionDataProvider>('subscription');
  }
  createApiKeyProvider(): IApiKeyDataProvider {
    return mockProvider<IApiKeyDataProvider>('apiKey');
  }
}

describe('AdapterRegistry', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    (AdapterRegistry as any).factories = {};
    (AdapterRegistry as any).instance = null;
  });

  afterAll(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('registerFactory', () => {
    it('should register a factory', () => {
      const factoryCreator: FactoryCreator = () => new TestAdapterFactory();
      AdapterRegistry.registerFactory('test', factoryCreator);
      
      expect(AdapterRegistry.listAvailableAdapters()).toContain('test');
    });

    it('should throw if factory is already registered', () => {
      const factoryCreator: FactoryCreator = () => new TestAdapterFactory();
      AdapterRegistry.registerFactory('test', factoryCreator);
      
      expect(() => {
        AdapterRegistry.registerFactory('test', factoryCreator);
      }).toThrow(/already registered/);
    });
  });

  describe('getFactory', () => {
    it('should get a registered factory', () => {
      const factoryCreator = vi.fn().mockReturnValue(new TestAdapterFactory());
      AdapterRegistry.registerFactory('test', factoryCreator);
      
      const options = { testOption: 'value' };
      const factory = AdapterRegistry.getFactory('test', options);
      
      expect(factory).toBeInstanceOf(TestAdapterFactory);
      expect(factoryCreator).toHaveBeenCalledWith(options);
    });

    it('should throw if factory is not found', () => {
      expect(() => {
        AdapterRegistry.getFactory('nonexistent', {});
      }).toThrow(/not found/);
    });
  });

  describe('isAdapterAvailable', () => {
    it('should return true for registered adapters', () => {
      const factoryCreator: FactoryCreator = () => new TestAdapterFactory();
      AdapterRegistry.registerFactory('test', factoryCreator);
      expect(AdapterRegistry.isAdapterAvailable('test')).toBe(true);
    });

    it('should return false for unregistered adapters', () => {
      expect(AdapterRegistry.isAdapterAvailable('nonexistent')).toBe(false);
    });
  });
});

describe('SupabaseAdapterFactory', () => {
  const mockOptions = {
    supabaseUrl: 'https://test.supabase.co',
    supabaseKey: 'test-key'
  };

  it('should create a SupabaseAdapterFactory instance', () => {
    const factory = new SupabaseAdapterFactory(mockOptions);
    expect(factory).toBeInstanceOf(SupabaseAdapterFactory);
  });

  describe('createAuthProvider', () => {
    it('should create an auth provider with the provided options', () => {
      const factory = new SupabaseAdapterFactory(mockOptions);
      const provider = factory.createAuthProvider();
      
      expect(provider).toBeDefined();
    });
  });
});

describe('createSupabaseAdapterFactory', () => {
  it('should create a SupabaseAdapterFactory with the provided options', () => {
    const options = {
      supabaseUrl: 'https://test.supabase.co',
      supabaseKey: 'test-key',
      extraOption: 'value'
    };
    
    const factory = createSupabaseAdapterFactory(options);
    expect(factory).toBeInstanceOf(SupabaseAdapterFactory);
  });
});

describe('instance adapter registry', () => {
  beforeEach(() => {
    // reset singleton and adapters
    (AdapterRegistry as any).instance = null;
  });

  it('registers and retrieves adapters', () => {
    const registry = AdapterRegistry.getInstance();
    const adapter = { test: true };
    registry.registerAdapter('sample', adapter);
    expect(registry.getAdapter('sample')).toBe(adapter);
  });

  it('throws when adapter missing', () => {
    const registry = AdapterRegistry.getInstance();
    expect(() => registry.getAdapter('missing')).toThrow();
  });
});
