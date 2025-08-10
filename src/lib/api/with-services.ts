/**
 * Route Helper with Dependency Injection
 * 
 * This module provides clean service injection for Next.js route handlers,
 * eliminating circular dependencies and making testing simple.
 * 
 * Key features:
 * 1. Services are injected, not retrieved from a global container
 * 2. No circular dependencies - services created in proper order
 * 3. Simple testing - mock services can be easily injected
 * 4. Type-safe - full TypeScript support
 * 5. Middleware support - authentication, validation, etc.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { 
  ServiceContainer,
  AuthContext
} from '@/core/config/interfaces';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  ApiError, 
  ERROR_CODES 
} from './common';
import { createDefaultApiServices } from '@/lib/services/factory';

/**
 * Configuration for route handlers
 */
export interface RouteConfig {
  /** Whether authentication is required */
  requireAuth?: boolean;
  
  /** Required permissions for this route */
  requiredPermissions?: string[];
  
  /** Whether to include user data in auth context */
  includeUser?: boolean;
  
  /** Whether to include user permissions in auth context */
  includePermissions?: boolean;
  
  /** Custom services to use (defaults to createDefaultApiServices()) */
  services?: ServiceContainer;
}

/**
 * Handler function signature with services
 */
export type ServiceHandler<T = any> = (
  services: ServiceContainer,
  data: T,
  request: NextRequest,
  context: AuthContext
) => Promise<NextResponse>;

/**
 * Handler function signature without validation
 */
export type SimpleServiceHandler = (
  services: ServiceContainer,
  request: NextRequest,
  context: AuthContext
) => Promise<NextResponse>;

/**
 * Create a route handler with injected services and validation
 * 
 * This is the main function for creating clean route handlers.
 * Services are injected, not retrieved from a global container.
 * 
 * @param schema Zod schema for request validation
 * @param handler The handler function
 * @param config Optional configuration
 * @returns Next.js route handler
 * 
 * @example
 * ```typescript
 * export const POST = withValidatedServices(
 *   z.object({ email: z.string().email() }),
 *   async (services, data) => {
 *     const user = await services.auth.register(data);
 *     return NextResponse.json({ user });
 *   }
 * );
 * ```
 */
export function withValidatedServices<T>(
  schema: z.ZodSchema<T>,
  handler: ServiceHandler<T>,
  config: RouteConfig = {}
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Get services (use provided or create default)
      const services = config.services || createDefaultApiServices();
      
      // 2. Handle authentication if required
      let authContext: AuthContext = { 
        authenticated: false,
        sessionId: null,
        userId: null,
        user: null,
        permissions: null
      };
      
      if (config.requireAuth) {
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');
        
        if (!token) {
          return createErrorResponse(
            new ApiError(
              ERROR_CODES.UNAUTHORIZED,
              'Authentication required',
              401
            )
          );
        }
        
        try {
          const session = await services.auth.validateSession(token);
          if (!session || !session.user) {
            return createErrorResponse(
              new ApiError(
                ERROR_CODES.UNAUTHORIZED,
                'Invalid or expired session',
                401
              )
            );
          }
          
          authContext = {
            authenticated: true,
            sessionId: session.id,
            userId: session.user.id,
            user: config.includeUser ? session.user : null,
            permissions: null
          };
          
          // Check permissions if required
          if (config.requiredPermissions?.length && services.permission) {
            const hasPermissions = await services.permission.checkPermissions(
              session.user.id,
              config.requiredPermissions
            );
            
            if (!hasPermissions) {
              return createErrorResponse(
                new ApiError(
                  ERROR_CODES.FORBIDDEN,
                  'Insufficient permissions',
                  403
                )
              );
            }
          }
          
          // Include permissions if requested
          if (config.includePermissions && services.permission) {
            const permissions = await services.permission.getUserPermissions(
              session.user.id
            );
            authContext.permissions = permissions;
          }
        } catch (error) {
          console.error('Authentication error:', error);
          return createErrorResponse(
            new ApiError(
              ERROR_CODES.UNAUTHORIZED,
              'Authentication failed',
              401
            )
          );
        }
      }
      
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
      
      // 4. Call the handler with services
      return await handler(services, validatedData, request, authContext);
      
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
 * Create a route handler with injected services (no validation)
 * 
 * Use this for simple routes that don't need request validation.
 * 
 * @param handler The handler function
 * @param config Optional configuration
 * @returns Next.js route handler
 * 
 * @example
 * ```typescript
 * export const GET = withServices(async (services, request) => {
 *   const users = await services.user.findAll();
 *   return NextResponse.json({ users });
 * });
 * ```
 */
export function withServices(
  handler: SimpleServiceHandler,
  config: RouteConfig = {}
): (request: NextRequest) => Promise<NextResponse> {
  return async (request: NextRequest): Promise<NextResponse> => {
    try {
      // 1. Get services (use provided or create default)
      const services = config.services || createDefaultApiServices();
      
      // 2. Handle authentication if required
      let authContext: AuthContext = { 
        authenticated: false,
        sessionId: null,
        userId: null,
        user: null,
        permissions: null
      };
      
      if (config.requireAuth) {
        const authHeader = request.headers.get('authorization');
        const token = authHeader?.replace('Bearer ', '');
        
        if (!token) {
          return createErrorResponse(
            new ApiError(
              ERROR_CODES.UNAUTHORIZED,
              'Authentication required',
              401
            )
          );
        }
        
        try {
          const session = await services.auth.validateSession(token);
          if (!session || !session.user) {
            return createErrorResponse(
              new ApiError(
                ERROR_CODES.UNAUTHORIZED,
                'Invalid or expired session',
                401
              )
            );
          }
          
          authContext = {
            authenticated: true,
            sessionId: session.id,
            userId: session.user.id,
            user: config.includeUser ? session.user : null,
            permissions: null
          };
          
          // Check permissions if required
          if (config.requiredPermissions?.length && services.permission) {
            const hasPermissions = await services.permission.checkPermissions(
              session.user.id,
              config.requiredPermissions
            );
            
            if (!hasPermissions) {
              return createErrorResponse(
                new ApiError(
                  ERROR_CODES.FORBIDDEN,
                  'Insufficient permissions',
                  403
                )
              );
            }
          }
          
          // Include permissions if requested
          if (config.includePermissions && services.permission) {
            const permissions = await services.permission.getUserPermissions(
              session.user.id
            );
            authContext.permissions = permissions;
          }
        } catch (error) {
          console.error('Authentication error:', error);
          return createErrorResponse(
            new ApiError(
              ERROR_CODES.UNAUTHORIZED,
              'Authentication failed',
              401
            )
          );
        }
      }
      
      // 3. Call the handler with services
      return await handler(services, request, authContext);
      
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
 * Create services for a specific route configuration
 * 
 * This is useful when you want to pre-configure services
 * for multiple routes with the same configuration.
 * 
 * @param config Service configuration
 * @returns Configured services
 * 
 * @example
 * ```typescript
 * // In a route file
 * const services = createRouteServices({
 *   featureFlags: { teams: false }
 * });
 * 
 * export const GET = withServices(
 *   async (services) => { ... },
 *   { services }
 * );
 * ```
 */
export function createRouteServices(config?: Parameters<typeof createDefaultApiServices>[0]): ServiceContainer {
  return createDefaultApiServices();
}