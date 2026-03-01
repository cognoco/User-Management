/**
 * @group e2e
 * @group adapters
 */

import { AdapterRegistry } from '@/adapters/registry';
import { initializeUserManagement } from '@/core/initialization/initialize-adapters';
import { UserManagementConfiguration } from '@/core/config';

describe('Adapter Registry - E2E', () => {
  // Store the original environment variables
  const originalEnv = process.env;
  
  beforeAll(() => {
    // Set up test environment variables
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test-supabase-url.supabase.co';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-supabase-anon-key';
  });
  
  afterEach(() => {
    // Reset the configuration after each test
    UserManagementConfiguration.reset();
    
    // Clear all registered factories except the default ones
    const defaultAdapters = ['supabase'];
    AdapterRegistry.listAvailableAdapters().forEach(adapter => {
      if (!defaultAdapters.includes(adapter)) {
        // @ts-expect-error - Accessing private property for testing
        delete AdapterRegistry.factories[adapter];
      }
    });
  });
  
  afterAll(() => {
    // Restore original environment variables
    process.env = originalEnv;
  });
  
  test('should initialize with default Supabase adapter', async () => {
    // Act
    const services = initializeUserManagement({
      type: 'supabase',
      options: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
        supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      }
    });
    
    // Assert
    expect(services).toBeDefined();
    expect(services.authService).toBeDefined();
    expect(services.userService).toBeDefined();
    expect(services.teamService).toBeDefined();
    expect(services.permissionService).toBeDefined();
    
    // Verify the adapters are properly initialized
    expect(services.adapters).toBeDefined();
    expect(services.adapters.authAdapter).toBeDefined();
    expect(services.adapters.userAdapter).toBeDefined();
    expect(services.adapters.teamAdapter).toBeDefined();
    expect(services.adapters.permissionAdapter).toBeDefined();
    
    // Verify the configuration was updated
    const config = UserManagementConfiguration.getConfig();
    expect(config.serviceProviders.authService).toBe(services.authService);
    expect(config.serviceProviders.userService).toBe(services.userService);
    expect(config.serviceProviders.teamService).toBe(services.teamService);
    expect(config.serviceProviders.permissionService).toBe(services.permissionService);
  });
  
  test('should throw error for invalid adapter type', () => {
    // Act & Assert
    expect(() => {
      initializeUserManagement({
        type: 'invalid-adapter-type',
        options: {}
      });
    }).toThrow(/not found/);
  });
  
  test('should allow registering and using a custom adapter', () => {
    // Arrange
    const mockAuthProvider = {
      signInWithEmail: vi.fn().mockResolvedValue({ user: { id: 'test-user' }, error: null }),
      signUp: vi.fn().mockResolvedValue({ user: { id: 'test-user' }, error: null }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
      resetPasswordForEmail: vi.fn().mockResolvedValue({ error: null }),
      updateUser: vi.fn().mockResolvedValue({ user: { id: 'test-user' }, error: null }),
      getUser: vi.fn().mockResolvedValue({ user: { id: 'test-user' }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    };
    
    const mockUserProvider = {
      createUser: vi.fn().mockResolvedValue({ data: { id: 'test-user' }, error: null }),
      getUser: vi.fn().mockResolvedValue({ data: { id: 'test-user' }, error: null }),
      updateUser: vi.fn().mockResolvedValue({ data: { id: 'test-user' }, error: null }),
      deleteUser: vi.fn().mockResolvedValue({ error: null }),
    };
    
    const mockTeamProvider = {
      createTeam: vi.fn().mockResolvedValue({ data: { id: 'test-team' }, error: null }),
      getTeam: vi.fn().mockResolvedValue({ data: { id: 'test-team' }, error: null }),
      updateTeam: vi.fn().mockResolvedValue({ data: { id: 'test-team' }, error: null }),
      deleteTeam: vi.fn().mockResolvedValue({ error: null }),
    };
    
    const mockPermissionProvider = {
      checkPermission: vi.fn().mockResolvedValue({ hasPermission: true, error: null }),
      assignRole: vi.fn().mockResolvedValue({ error: null }),
      revokeRole: vi.fn().mockResolvedValue({ error: null }),
    };

    const mockSessionProvider = {
      createSession: vi.fn().mockResolvedValue({ data: { id: 'test-session' }, error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { id: 'test-session' }, error: null }),
      deleteSession: vi.fn().mockResolvedValue({ error: null }),
    };

    const mockSsoProvider = {
      initiateSso: vi.fn().mockResolvedValue({ url: 'https://sso.test', error: null }),
      handleSsoCallback: vi.fn().mockResolvedValue({ user: { id: 'test-user' }, error: null }),
    };

    const mockSubscriptionProvider = {
      getSubscription: vi.fn().mockResolvedValue({ data: { id: 'test-sub' }, error: null }),
      createSubscription: vi.fn().mockResolvedValue({ data: { id: 'test-sub' }, error: null }),
      cancelSubscription: vi.fn().mockResolvedValue({ error: null }),
    };

    const mockApiKeyProvider = {
      createApiKey: vi.fn().mockResolvedValue({ data: { id: 'test-key' }, error: null }),
      getApiKey: vi.fn().mockResolvedValue({ data: { id: 'test-key' }, error: null }),
      deleteApiKey: vi.fn().mockResolvedValue({ error: null }),
    };
    
    // Create and register a custom adapter factory
    const customFactory = {
      createAuthProvider: vi.fn().mockReturnValue(mockAuthProvider),
      createUserProvider: vi.fn().mockReturnValue(mockUserProvider),
      createTeamProvider: vi.fn().mockReturnValue(mockTeamProvider),
      createPermissionProvider: vi.fn().mockReturnValue(mockPermissionProvider),
      createSessionProvider: vi.fn().mockReturnValue(mockSessionProvider),
      createSsoProvider: vi.fn().mockReturnValue(mockSsoProvider),
      createSubscriptionProvider: vi.fn().mockReturnValue(mockSubscriptionProvider),
      createApiKeyProvider: vi.fn().mockReturnValue(mockApiKeyProvider),
    };
    
    AdapterRegistry.registerFactory('custom', () => customFactory);
    
    // Act
    const services = initializeUserManagement({
      type: 'custom',
      options: {
        customOption: 'test-value'
      }
    });
    
    // Assert
    expect(services).toBeDefined();
    expect(services.authService).toBeDefined();
    expect(services.userService).toBeDefined();
    expect(services.teamService).toBeDefined();
    expect(services.permissionService).toBeDefined();
    
    // Verify the factory methods were called
    expect(customFactory.createAuthProvider).toHaveBeenCalled();
    expect(customFactory.createUserProvider).toHaveBeenCalled();
    expect(customFactory.createTeamProvider).toHaveBeenCalled();
    expect(customFactory.createPermissionProvider).toHaveBeenCalled();
    
    // Verify the adapters were properly initialized
    expect(services.adapters).toBeDefined();
    expect(services.adapters.authAdapter).toBe(mockAuthProvider);
    expect(services.adapters.userAdapter).toBe(mockUserProvider);
    expect(services.adapters.teamAdapter).toBe(mockTeamProvider);
    expect(services.adapters.permissionAdapter).toBe(mockPermissionProvider);
  });
  
  test('should use environment variables when options are not provided', () => {
    // Act
    const services = initializeUserManagement({
      type: 'supabase'
    });
    
    // Assert
    expect(services).toBeDefined();
    
    // The actual Supabase client initialization is tested in unit tests
    // Here we just verify the service is created
    expect(services.authService).toBeDefined();
    expect(services.userService).toBeDefined();
    expect(services.teamService).toBeDefined();
    expect(services.permissionService).toBeDefined();
  });
});
