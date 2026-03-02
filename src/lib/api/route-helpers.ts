/**
 * API Route Helpers
 * 
 * This file provides utilities for creating consistent API routes with
 * authentication, validation, and service injection following the
 * architecture guidelines.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { 
  AuthContext, 
  ApiHandlerOptions, 
  ServiceContainer 
} from '@/core/config/interfaces';
import { getServiceContainer } from '@/lib/config/service-container';
import { createAuthMiddleware } from './auth-middleware';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  ApiError, 
  ERROR_CODES 
} from './common';

/**
 * API Handler function signature
 */
export type ApiHandler<T = any> = (
  request: NextRequest,
  context: AuthContext,
  data: T,
  services: ServiceContainer
) => Promise<NextResponse>;

/**
 * Create an API handler with validation, authentication, and service injection
 * 
 * @param schema Zod schema for request validation
 * @param handler The actual handler function
 * @param options Configuration options for the handler
 * @returns NextJS route handler
 */
export function createApiHandler<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  handler: ApiHandler<T>,
  options: ApiHandlerOptions = {}
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Get service container with any overrides
      const services = getServiceContainer(options.services);
      
      // 2. Create authentication middleware
      const authMiddleware = createAuthMiddleware({
        authService: services.auth,
        permissionService: services.permission,
        requireAuth: options.requireAuth ?? false,
        requiredPermissions: options.requiredPermissions,
        includeUser: options.includeUser ?? false,
        includePermissions: options.includePermissions ?? false,
      });
      
      // 3. Run authentication middleware
      const authContext = await authMiddleware(request);
      
      // 4. Validate request data
      let validatedData: T;
      try {
        const body = request.method === 'GET' 
          ? Object.fromEntries(new URL(request.url).searchParams)
          : await request.json().catch(() => ({}));
        
        validatedData = schema.parse(body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.errors.map(err => 
            `${err.path.join('.')}: ${err.message}`
          ).join(', ');
          
          return createErrorResponse(
            new ApiError(
              ERROR_CODES.INVALID_REQUEST,
              `Validation failed: ${errorMessages}`,
              400,
              { errors: error.errors }
            )
          );
        }
        throw error;
      }
      
      // 5. Call the actual handler
      return await handler(request, authContext, validatedData, services);
      
    } catch (error) {
      // Handle known API errors
      if (error instanceof ApiError) {
        return createErrorResponse(error);
      }
      
      // Handle unexpected errors
      console.error('Unexpected API error:', error);
      return createErrorResponse(
        new ApiError(
          ERROR_CODES.INTERNAL_ERROR,
          'Internal server error',
          500
        )
      );
    }
  };
}

/**
 * Create a simple authenticated GET handler
 */
export function createAuthenticatedGetHandler<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  handler: ApiHandler<T>,
  options: Omit<ApiHandlerOptions, 'requireAuth'> = {}
) {
  return createApiHandler(schema, handler, {
    ...options,
    requireAuth: true,
  });
}

/**
 * Create a simple public handler (no authentication required)
 */
export function createPublicHandler<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  handler: ApiHandler<T>,
  options: Omit<ApiHandlerOptions, 'requireAuth'> = {}
) {
  return createApiHandler(schema, handler, {
    ...options,
    requireAuth: false,
  });
}

/**
 * Utility to create empty schema for handlers that don't need request data
 */
export const emptySchema = z.object({});

/**
 * Type helper for handlers that don't need request data
 */
export type EmptyHandler = ApiHandler<Record<string, never>>;
