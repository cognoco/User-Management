/**
 * Pure Auth Service Factory
 * 
 * This factory creates AuthService instances without any circular dependencies.
 * All dependencies are explicitly passed in, making testing simple.
 */

import { AuthService } from '@/core/auth/interfaces';
import type { AuthDataProvider } from '@/adapters/auth/interfaces';
import { DefaultAuthService } from './default-auth.service';
import type { AuthStorage } from './auth-storage';
import { BrowserAuthStorage } from './auth-storage';
import { AdapterRegistry } from '@/adapters/registry';
import { createSupabaseAuthProvider } from '@/adapters/auth/factory';

/**
 * Dependencies required to create an AuthService
 */
export interface AuthServiceDependencies {
  adapterRegistry: AdapterRegistry;
  provider?: AuthDataProvider;
  storage?: AuthStorage;
}

/**
 * Create an AuthService instance with explicit dependencies
 * 
 * This is a pure function with no global state or circular dependencies.
 * All dependencies are passed explicitly, making it easy to test.
 * 
 * @param deps Dependencies required to create the service
 * @returns Configured AuthService instance
 */
export function createAuthService(deps: AuthServiceDependencies): AuthService {
  const { adapterRegistry, provider, storage } = deps;

  // Use provided provider or resolve from environment/registry
  const authProvider = provider || resolveAuthProvider(adapterRegistry);
  
  // Use provided storage or default to browser storage
  const authStorage = storage || new BrowserAuthStorage();

  return new DefaultAuthService(authProvider, authStorage);
}

/**
 * Resolve AuthDataProvider from environment or adapter registry
 * 
 * @param adapterRegistry Registry to get providers from
 * @returns Configured AuthDataProvider
 */
function resolveAuthProvider(adapterRegistry: AdapterRegistry): AuthDataProvider {
  // Try to create Supabase provider from environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && serviceKey) {
    return createSupabaseAuthProvider(supabaseUrl, serviceKey);
  }

  // Fall back to adapter registry
  try {
    return adapterRegistry.getAdapter<AuthDataProvider>('auth');
  } catch (error) {
    throw new Error(
      'Auth provider not configured. Set NEXT_PUBLIC_SUPABASE_URL and authentication keys or register an auth adapter.'
    );
  }
}