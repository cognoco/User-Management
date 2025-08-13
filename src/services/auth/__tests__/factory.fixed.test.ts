import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AdapterRegistry } from '@/adapters/registry';
import { DefaultAuthService } from '../default-auth.service';
import type { AuthService } from '@/core/auth/interfaces';

describe('getApiAuthService - Fixed', () => {
  beforeEach(async () => {
    // Clear any module cache
    vi.resetModules();
    
    // Clear adapter registry
    (AdapterRegistry as any).instance = null;
    
    // Clear global auth service cache
    delete (globalThis as any).__UM_AUTH_SERVICE__;
    
    // Clear ServiceLocator
    const { ServiceLocator } = await import('@/lib/config/service-locator');
    ServiceLocator.getInstance().clear();
    
    // Set required environment variables
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
  });

  it('creates service with adapter and caches instance', async () => {
    // Create a mock provider directly with all required methods
    const mockProvider = {
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      updatePasswordWithToken: vi.fn(),
      verifyPasswordResetToken: vi.fn(),
      sendVerificationEmail: vi.fn(),
      sendMagicLink: vi.fn(),
      verifyEmail: vi.fn(),
      verifyMagicLink: vi.fn(),
      deleteAccount: vi.fn(),
      onAuthStateChanged: vi.fn(() => vi.fn()), // Returns unsubscribe function
      onSessionExpiry: vi.fn(),
      setupTwoFactor: vi.fn(),
      verifyTwoFactor: vi.fn(),
      disableTwoFactor: vi.fn(),
      generateBackupCodes: vi.fn(),
      verifyBackupCode: vi.fn(),
    } as any;
    
    // Import factory dynamically to avoid circular dependencies
    const { getApiAuthService } = await import('../factory');
    
    // Create service twice with provider option
    const service1 = getApiAuthService({ reset: true, provider: mockProvider });
    const service2 = getApiAuthService();
    
    // Verify it's the same cached instance and has the expected structure
    expect(service1).toHaveProperty('login');
    expect(service1).toHaveProperty('register');
    expect(service1).toHaveProperty('logout');
    expect(service1.constructor.name).toBe('DefaultAuthService');
    expect(service1).toBe(service2);
  });

  it('throws when no provider is configured', async () => {
    // Clear environment variables
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', '');
    
    // Import factory dynamically
    const { getApiAuthService } = await import('../factory');
    
    // Should throw without configuration
    expect(() => getApiAuthService({ reset: true })).toThrow(
      'Auth provider not configured'
    );
    
    vi.unstubAllEnvs();
  });

  it('allows resetting the cached instance', async () => {
    // Register a mock adapter
    const mockAdapter = {} as any;
    AdapterRegistry.getInstance().registerAdapter('auth', mockAdapter);
    
    // Import factory dynamically
    const { getApiAuthService } = await import('../factory');
    
    // Create instances
    const first = getApiAuthService({ reset: true });
    const second = getApiAuthService();
    const third = getApiAuthService({ reset: true });
    
    // First and second should be same, third should be different
    expect(first).toBe(second);
    expect(third).not.toBe(first);
  });
  
  it('can use ServiceLocator when available', async () => {
    // Import the modules dynamically to ensure clean state
    const { ServiceLocator, ServiceKeys } = await import('@/lib/config/service-locator');
    const { getApiAuthService } = await import('../factory');
    
    // Create a mock auth service
    const mockAuthService: AuthService = {
      login: vi.fn(),
      register: vi.fn(),
      logout: vi.fn(),
      getCurrentUser: vi.fn(),
      resetPassword: vi.fn(),
      updatePassword: vi.fn(),
      updatePasswordWithToken: vi.fn(),
      verifyPasswordResetToken: vi.fn(),
      sendVerificationEmail: vi.fn(),
      sendMagicLink: vi.fn(),
      verifyEmail: vi.fn(),
      verifyMagicLink: vi.fn(),
      deleteAccount: vi.fn(),
      setupMFA: vi.fn(),
      verifyMFA: vi.fn(),
      disableMFA: vi.fn(),
      refreshToken: vi.fn(),
      getTokenExpiry: vi.fn(),
      onAuthStateChanged: vi.fn(),
      invalidateSessions: vi.fn(),
    } as any;
    
    // Clear and register in ServiceLocator
    ServiceLocator.getInstance().clear();
    ServiceLocator.getInstance().register(ServiceKeys.AUTH_SERVICE, mockAuthService);
    
    // Get service - should return the one from ServiceLocator
    const service = getApiAuthService({ reset: true });
    
    // Should be the mock service we registered
    expect(service).toBe(mockAuthService);
  });
});