/**
 * Auth Service Factory for API Routes
 * 
 * This file provides factory functions for creating auth services for use in API routes.
 * It ensures consistent configuration and dependency injection across all API endpoints.
 */

import { AuthService } from '@/core/auth/interfaces';
import type { AuthDataProvider } from '@/adapters/auth/interfaces';
import { DefaultAuthService } from './default-auth.service';
import type { AuthStorage } from './auth-storage';
import { BrowserAuthStorage } from './auth-storage';
import { AdapterRegistry } from '@/adapters/registry';
import { createSupabaseAuthProvider } from '@/adapters/auth/factory';
import { getServiceSupabase } from '@/lib/database/supabase';
// Service container import removed - using new pure factory pattern

/**
 * Options for {@link getApiAuthService}
 */
export interface ApiAuthServiceOptions {
  /**
   * Optional AuthDataProvider instance to use instead of auto creation.
   */
  provider?: AuthDataProvider;
  /**
   * Custom storage implementation (defaults to BrowserAuthStorage).
   */
  storage?: AuthStorage;
  /**
   * When true, forces creation of a new service instance. Useful in tests.
   */
  reset?: boolean;
}

// Key used for caching the service instance on the global object
const GLOBAL_CACHE_KEY = '__UM_AUTH_SERVICE__';

let cachedService: AuthService | null = null;

/**
 * Resolve the {@link AuthDataProvider} from environment variables or the
 * {@link AdapterRegistry}. Falls back to registry when no environment
 * configuration is provided.
 */
function resolveProvider(): AuthDataProvider {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY;

  if (supabaseUrl && serviceKey) {
    return createSupabaseAuthProvider(supabaseUrl, serviceKey);
  }

  try {
    return AdapterRegistry.getInstance().getAdapter<AuthDataProvider>('auth');
  } catch (error) {
    throw new Error(
      'Auth provider not configured. Set NEXT_PUBLIC_SUPABASE_URL and authentication keys or register an auth adapter.'
    );
  }
}

/**
 * Get a configured auth service instance for API routes.
 *
 * The service is cached for subsequent calls. Environment variables are used
 * to configure the default Supabase implementation when no provider is
 * registered. A custom provider or storage can be supplied for testing.
 */
export function getApiAuthService(options: ApiAuthServiceOptions = {}): AuthService {
  if (options.reset) {
    cachedService = null;
    if (typeof globalThis !== 'undefined') {
      delete (globalThis as any)[GLOBAL_CACHE_KEY];
    }
  }

  if (!cachedService && typeof globalThis !== 'undefined') {
    cachedService = (globalThis as any)[GLOBAL_CACHE_KEY] as AuthService | null;
  }

  if (!cachedService) {
    if (options.provider) {
      const storage = options.storage ?? new BrowserAuthStorage();
      cachedService = new DefaultAuthService(options.provider, storage);
    } else {
      const config = getServiceConfiguration();
      if (config.authService) {
        cachedService = config.authService;
      } else {
        try {
          cachedService = getServiceContainer().auth;
        } catch {
          // ServiceContainer not fully configured
        }

        if (!cachedService) {
          const provider = resolveProvider();
          const storage = options.storage ?? new BrowserAuthStorage();
          cachedService = new DefaultAuthService(provider, storage);
        }
      }
    }

    // Store on the global object for thread safety in server environments
    if (typeof globalThis !== 'undefined') {
      (globalThis as any)[GLOBAL_CACHE_KEY] = cachedService;
    }
  }

  return cachedService;
}

/**
 * Retrieve a Supabase user session directly from an access token.
 */
export async function getSessionFromToken(token: string) {
  if (!token) return null;
  const supabase = getServiceSupabase();
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user;
}
