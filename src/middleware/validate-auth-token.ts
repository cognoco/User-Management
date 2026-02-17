import { NextRequest } from 'next/server';
import type { User } from '@supabase/auth-js';
import { getSessionFromToken } from '@/services/auth/factory';
import { ApiError } from '@/lib/api/common/api-error';
import { createAuthApiError } from './auth-errors';
import { extractAuthToken } from '@/lib/auth/utils';

export interface TokenValidationResult {
  success: boolean;
  user?: User;
  error?: ApiError;
}

/**
 * Validate the authorization token contained in the request.
 *
 * The function extracts the bearer token from the Authorization header or
 * cookie using {@link extractAuthToken} and verifies it with Supabase via
 * {@link getSessionFromToken}. A standardized result is returned so callers can
 * handle authentication errors consistently.
 */
export async function validateAuthToken(req: NextRequest): Promise<TokenValidationResult> {
  const token = extractAuthToken(req);

  if (!token) {
    return {
      success: false,
      error: createAuthApiError('MISSING_TOKEN'),
    };
  }

  try {
    const user = await getSessionFromToken(token);
    if (!user) {
      return {
        success: false,
        error: createAuthApiError('INVALID_TOKEN'),
      };
    }

    return { success: true, user };
  } catch (err: any) {
    const error = new ApiError(
      'SERVER_GENERAL_001',
      err instanceof Error ? err.message : 'Token validation failed',
      500,
    );
    return { success: false, error };
  }
}
