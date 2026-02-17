import type { User } from '@/core/auth/models';
import { getApiAuthService } from '@/services/auth/factory';

/**
 * Cache entry used to memoize the last fetched user. The cache is stored on the
 * global object to persist across module reloads in development. A very small
 * TTL is used because serverless functions may live only for a single request.
 */
interface UserCache {
  user: User | null;
  expires: number;
}

const GLOBAL_CACHE_KEY = '__UM_GET_USER_CACHE__';

function getCache(): UserCache | null {
  if (typeof globalThis === 'undefined') return null;
  return (globalThis as any)[GLOBAL_CACHE_KEY] as UserCache | undefined || null;
}

function setCache(cache: UserCache): void {
  if (typeof globalThis === 'undefined') return;
  (globalThis as any)[GLOBAL_CACHE_KEY] = cache;
}

/**
 * Retrieve the currently authenticated user using the configured AuthService.
 *
 * The function automatically returns a mock user in development and test
 * environments. When running on the server it uses {@link getApiAuthService}
 * to obtain the active user from Supabase. Results are cached for a short
 * period to avoid repeated network calls within the same execution context.
 *
 * **Usage Examples**
 * ```ts
 * // In a server component
 * const user = await getUser();
 * if (user) {
 *   // render user specific content
 * }
 *
 * // In an API route
 * export async function GET() {
 *   const user = await getUser();
 *   if (!user) return new Response('Unauthorized', { status: 401 });
 *   return NextResponse.json(user);
 * }
 * ```
 *
 * @returns Resolves with the authenticated {@link User} or `null` when the
 *          request is not authenticated.
 */
export async function getUser(): Promise<User | null> {
  // For E2E tests and development, return a mock user
  if (process.env.NODE_ENV === 'development' || process.env.E2E_TEST === 'true') {
    console.log('[DEV/TEST] Returning mock user');
    return {
      id: 'mock-user-id',
      firstName: 'Mock',
      lastName: 'Admin',
      email: 'admin@example.com',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    } as any;
  }
  
  const now = Date.now();
  const cached = getCache();
  if (cached && cached.expires > now) {
    return cached.user;
  }

  try {
    const authService = getApiAuthService();
    const user = await authService.getCurrentUser();

    setCache({ user: user ?? null, expires: now + 5000 });

    return user ?? null;
  } catch (error) {
    console.error('Error retrieving user:', error);
    setCache({ user: null, expires: now + 5000 });
    return null;
  }
}
