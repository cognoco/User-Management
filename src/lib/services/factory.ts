/**
 * Pure Service Factory - Circular Dependency Solution
 * 
 * This factory creates services in explicit dependency order with no circular references.
 * Key principles:
 * - All dependencies are explicitly passed
 * - Services are created in topological order
 * - No service calls getServiceContainer() during creation
 * - Easy to test with dependency injection
 * - Aligned with Next.js App Router patterns
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';

// Core service interfaces
import type { AuthService } from '@/core/auth/interfaces';
import type { UserService } from '@/core/user/interfaces';
import type { PermissionService } from '@/core/permission/interfaces';
import type { TeamService } from '@/core/team/interfaces';
import type { SessionService } from '@/core/session/interfaces';

// Service implementations
import { DefaultAuthService } from '@/services/auth/default-auth.service';
import { DefaultUserService } from '@/services/user/default-user.service';

// Data providers
import { createSupabaseAuthProvider } from '@/adapters/auth/factory';
import { createSupabaseUserProvider } from '@/adapters/user/factory';
import { createSupabasePermissionProvider } from '@/adapters/permission/factory';
import { createSupabaseTeamProvider } from '@/adapters/team/factory';
import { createSupabaseSessionProvider } from '@/adapters/session/factory';

// Auth storage
import { BrowserAuthStorage } from '@/services/auth/auth-storage';

/**
 * Core dependencies needed to create services
 */
export interface ServiceDependencies {
  supabase: SupabaseClient;
  config?: {
    environment: 'development' | 'production' | 'test';
    features?: {
      permissions?: boolean;
      teams?: boolean;
      sessions?: boolean;
    };
  };
  overrides?: Partial<ServiceContainer>;
}

/**
 * The complete service container with all available services
 */
export interface ServiceContainer {
  auth: AuthService;
  user: UserService;
  permission?: PermissionService;
  team?: TeamService;
  session?: SessionService;
}

/**
 * Create all user management services in correct dependency order
 * 
 * This function eliminates circular dependencies by:
 * 1. Creating data providers first (no dependencies)
 * 2. Creating core services with explicit dependency injection
 * 3. Never calling getServiceContainer() or other factory functions
 * 
 * @param deps - Service dependencies including Supabase client
 * @returns Complete service container with all services
 */
export function createUserManagementServices(deps: ServiceDependencies): ServiceContainer {
  const { supabase, config = {}, overrides = {} } = deps;
  const { environment = 'production', features = {} } = config;

  // Apply overrides first - useful for testing
  if (overrides.auth && overrides.user) {
    return {
      auth: overrides.auth,
      user: overrides.user,
      permission: overrides.permission,
      team: overrides.team,
      session: overrides.session,
    };
  }

  // 1. Create data providers (Level 0 - no dependencies)
  const authProvider = createSupabaseAuthProvider(
    supabase.supabaseUrl,
    supabase.supabaseKey
  );
  const userProvider = createSupabaseUserProvider({ 
    supabaseUrl: supabase.supabaseUrl,
    supabaseKey: supabase.supabaseKey,
    isServer: true 
  });

  // 2. Create auth service (Level 0 - only needs data provider)
  const authStorage = new BrowserAuthStorage();
  const authService = overrides.auth || new DefaultAuthService(authProvider, authStorage);

  // 3. Create user service (Level 1 - depends on auth)
  const userService = overrides.user || new DefaultUserService(userProvider, authService);

  // 4. Create optional services if enabled
  let permissionService: PermissionService | undefined;
  let teamService: TeamService | undefined;
  let sessionService: SessionService | undefined;

  if (features.permissions !== false) {
    const permissionProvider = createSupabasePermissionProvider({
      supabaseUrl: supabase.supabaseUrl,
      supabaseKey: supabase.supabaseKey,
      isServer: true
    });
    permissionService = overrides.permission || new DefaultPermissionService(
      permissionProvider,
      authService
    );
  }

  if (features.teams !== false) {
    const teamProvider = createSupabaseTeamProvider({
      supabaseUrl: supabase.supabaseUrl,
      supabaseKey: supabase.supabaseKey,
      isServer: true
    });
    teamService = overrides.team || new DefaultTeamService(
      teamProvider,
      authService,
      userService,
      permissionService // Optional dependency
    );
  }

  if (features.sessions !== false) {
    const sessionProvider = createSupabaseSessionProvider({
      supabaseUrl: supabase.supabaseUrl,
      supabaseKey: supabase.supabaseKey,
      isServer: true
    });
    sessionService = overrides.session || new DefaultSessionService(
      sessionProvider,
      authService
    );
  }

  return {
    auth: authService,
    user: userService,
    permission: permissionService,
    team: teamService,
    session: sessionService,
  };
}

/**
 * Create services with default configuration for API routes
 * Uses environment variables and cookies for Supabase client
 */
export function createApiServices(overrides?: Partial<ServiceContainer>): ServiceContainer {
  const supabase = createRouteHandlerClient({ cookies: () => new Map() });
  
  return createUserManagementServices({
    supabase: supabase as any, // Type assertion for compatibility
    config: {
      environment: process.env.NODE_ENV as any || 'production',
      features: {
        permissions: true,
        teams: true,
        sessions: true,
      }
    },
    overrides
  });
}

/**
 * Create minimal services for testing
 * Disables optional features by default for faster test execution
 */
export function createTestServices(overrides: Partial<ServiceContainer> = {}): ServiceContainer {
  // Create a mock Supabase client for testing
  const mockSupabase = {
    supabaseUrl: 'http://localhost:54321',
    supabaseKey: 'test-key',
    auth: {
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    },
    from: () => ({
      select: () => ({ data: [], error: null }),
      insert: () => ({ data: [], error: null }),
      update: () => ({ data: [], error: null }),
      delete: () => ({ data: [], error: null }),
    })
  } as any;

  return createUserManagementServices({
    supabase: mockSupabase,
    config: {
      environment: 'test',
      features: {
        permissions: false, // Disable by default for speed
        teams: false,
        sessions: false,
      }
    },
    overrides
  });
}

// Placeholder service implementations for compilation
// These would be replaced with actual implementations
class DefaultPermissionService {
  constructor(
    private provider: any,
    private authService: AuthService
  ) {}
}

class DefaultTeamService {
  constructor(
    private provider: any,
    private authService: AuthService,
    private userService: UserService,
    private permissionService?: PermissionService
  ) {}
}

class DefaultSessionService {
  constructor(
    private provider: any,
    private authService: AuthService
  ) {}
}