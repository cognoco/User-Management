/**
 * API Route Helpers V2 - Dependency Injection Pattern
 * 
 * This version eliminates circular dependencies by using explicit dependency injection.
 * Services are created once and injected into route handlers, making testing simple.
 * 
 * Key improvements over V1:
 * 1. No circular dependencies - services are injected, not retrieved from container
 * 2. Simple testing - mock services can be easily injected
 * 3. Pure functions - no global state or side effects
 * 4. Explicit dependencies - clear what each route needs
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { 
  AuthContext, 
  ServiceContainer 
} from '@/core/config/interfaces';
import { createAuthMiddleware } from './auth-middleware';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  ApiError, 
  ERROR_CODES 
} from './common';

/**
 * Configuration for route handlers
 */
export interface RouteHandlerOptions {
  /** Whether authentication is required */
  requireAuth?: boolean;
  
  /** Required permissions for this route */
  requiredPermissions?: string[];
  
  /** Whether to include user data in auth context */
  includeUser?: boolean;
  
  /** Whether to include user permissions in auth context */
  includePermissions?: boolean;
  
  /** Rate limiting configuration */
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

/**
 * API Handler function signature with injected services
 */
export type ApiHandlerV2<T = any> = (
  request: NextRequest,
  context: AuthContext,
  data: T,
  services: ServiceContainer
) => Promise<NextResponse>;

/**
 * Create an API handler with dependency injection
 * 
 * This function takes a pre-configured service container and creates
 * a route handler that uses those services. No circular dependencies!
 * 
 * @param schema Zod schema for request validation
 * @param handler The actual handler function
 * @param services Pre-configured services container
 * @param options Configuration options for the handler
 * @returns NextJS route handler
 */
export function createApiHandlerWithServices<T>(
  schema: z.ZodSchema<T>,
  handler: ApiHandlerV2<T>,
  services: ServiceContainer,
  options: RouteHandlerOptions = {}
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Create authentication middleware with injected services
      const authMiddleware = createAuthMiddleware({
        authService: services.auth,
        permissionService: services.permission,
        requireAuth: options.requireAuth ?? false,
        requiredPermissions: options.requiredPermissions,
        includeUser: options.includeUser ?? false,
        includePermissions: options.includePermissions ?? false,
      });
      
      // 2. Run authentication middleware
      const authContext = await authMiddleware(request);
      
      // 3. Validate request data
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
      
      // 4. Call the actual handler with injected services
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
 * Factory for creating route handlers with a specific service configuration
 * 
 * This allows you to pre-configure services once and create multiple handlers.
 * Perfect for testing - just inject mock services!
 */
export class RouteHandlerFactory {
  constructor(private services: ServiceContainer) {}

  /**
   * Create a route handler with the pre-configured services
   */
  createHandler<T>(
    schema: z.ZodSchema<T>,
    handler: ApiHandlerV2<T>,
    options: RouteHandlerOptions = {}
  ) {
    return createApiHandlerWithServices(schema, handler, this.services, options);
  }

  /**
   * Create an authenticated handler
   */
  createAuthenticatedHandler<T>(
    schema: z.ZodSchema<T>,
    handler: ApiHandlerV2<T>,
    options: Omit<RouteHandlerOptions, 'requireAuth'> = {}
  ) {
    return this.createHandler(schema, handler, {
      ...options,
      requireAuth: true,
    });
  }

  /**
   * Create a public handler (no authentication required)
   */
  createPublicHandler<T>(
    schema: z.ZodSchema<T>,
    handler: ApiHandlerV2<T>,
    options: Omit<RouteHandlerOptions, 'requireAuth'> = {}
  ) {
    return this.createHandler(schema, handler, {
      ...options,
      requireAuth: false,
    });
  }
}

/**
 * Utility to create empty schema for handlers that don't need request data
 */
export const emptySchema = z.object({});

/**
 * Type helper for handlers that don't need request data
 */
export type EmptyHandlerV2 = ApiHandlerV2<Record<string, never>>;

/**
 * Helper function to create a route handler factory for testing
 * 
 * @param serviceOverrides Services to override for testing
 * @returns RouteHandlerFactory with test services
 */
export function createTestRouteHandlerFactory(
  serviceOverrides: Partial<ServiceContainer> = {}
): RouteHandlerFactory {
  // Import the centralized configuration here to avoid circular dependencies
  const { configureUserManagement, createMinimalServices } = require('@/lib/config/configure-user-management');
  
  // Create minimal services for testing with overrides
  const services = createMinimalServices(serviceOverrides);
  
  return new RouteHandlerFactory(services);
}