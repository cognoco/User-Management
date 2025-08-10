/**
 * Route Helper with Service Injection
 * 
 * This helper eliminates circular dependencies in route handlers by:
 * - Creating services per request (stateless)
 * - Injecting dependencies explicitly
 * - Making testing trivial with service mocking
 * - Following Next.js App Router patterns
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createApiServices, ServiceContainer } from '@/lib/services/factory';

/**
 * Route handler function type with services injected
 */
export type ServiceRouteHandler<T = any> = (
  services: ServiceContainer,
  request: NextRequest,
  context?: T
) => Promise<NextResponse>;

/**
 * Route handler function type with services and validated data
 */
export type ValidatedServiceRouteHandler<TSchema extends z.ZodSchema, T = any> = (
  services: ServiceContainer,
  data: z.infer<TSchema>,
  request: NextRequest,
  context?: T
) => Promise<NextResponse>;

/**
 * Higher-order function that injects services into route handlers
 * 
 * Usage:
 * ```typescript
 * export const POST = withServices(async (services, request) => {
 *   const user = await services.auth.getCurrentUser();
 *   return NextResponse.json({ user });
 * });
 * ```
 */
export function withServices<T = any>(
  handler: ServiceRouteHandler<T>
): (request: NextRequest, context?: T) => Promise<NextResponse> {
  return async (request: NextRequest, context?: T) => {
    try {
      // Create fresh services for each request - no shared state!
      const services = createApiServices();
      
      return await handler(services, request, context);
    } catch (error) {
      console.error('Route handler error:', error);
      
      return NextResponse.json(
        { 
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Higher-order function that injects services and validates request data
 * 
 * Usage:
 * ```typescript
 * const schema = z.object({
 *   email: z.string().email(),
 *   password: z.string().min(8),
 * });
 * 
 * export const POST = withValidatedServices(schema, async (services, data, request) => {
 *   const user = await services.auth.register(data);
 *   return NextResponse.json({ user });
 * });
 * ```
 */
export function withValidatedServices<TSchema extends z.ZodSchema, T = any>(
  schema: TSchema,
  handler: ValidatedServiceRouteHandler<TSchema, T>
): (request: NextRequest, context?: T) => Promise<NextResponse> {
  return async (request: NextRequest, context?: T) => {
    try {
      // Parse and validate request body
      let body: any;
      try {
        const text = await request.text();
        body = text ? JSON.parse(text) : {};
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        );
      }

      // Validate data against schema
      const parseResult = schema.safeParse(body);
      if (!parseResult.success) {
        return NextResponse.json(
          { 
            error: 'Validation failed',
            details: parseResult.error.errors
          },
          { status: 400 }
        );
      }

      // Create fresh services for each request
      const services = createApiServices();
      
      return await handler(services, parseResult.data, request, context);
    } catch (error) {
      console.error('Validated route handler error:', error);
      
      return NextResponse.json(
        { 
          error: 'Internal server error',
          message: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Test-friendly version of withServices that accepts service overrides
 * Only used in development/test environments
 */
export function withTestServices<T = any>(
  serviceOverrides: Partial<ServiceContainer>,
  handler: ServiceRouteHandler<T>
): (request: NextRequest, context?: T) => Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('withTestServices cannot be used in production');
  }

  return async (request: NextRequest, context?: T) => {
    try {
      // Create services with test overrides
      const services = createApiServices(serviceOverrides);
      
      return await handler(services, request, context);
    } catch (error) {
      console.error('Test route handler error:', error);
      
      return NextResponse.json(
        { 
          error: 'Internal server error',
          message: (error as Error).message
        },
        { status: 500 }
      );
    }
  };
}

/**
 * Utility to extract user context from request
 * Common pattern in authenticated routes
 */
export async function getUserContext(services: ServiceContainer, request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const user = await services.auth.validateToken(token);
    
    return user;
  } catch {
    return null;
  }
}

/**
 * Higher-order function for authenticated routes
 * Automatically handles authentication and passes user context
 */
export function withAuthenticatedServices<T = any>(
  handler: (
    services: ServiceContainer,
    user: any, // Replace with proper user type
    request: NextRequest,
    context?: T
  ) => Promise<NextResponse>
): (request: NextRequest, context?: T) => Promise<NextResponse> {
  return withServices(async (services, request, context) => {
    const user = await getUserContext(services, request);
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    return handler(services, user, request, context);
  });
}

/**
 * Error handling utilities
 */
export function handleServiceError(error: any): NextResponse {
  console.error('Service error:', error);

  // Handle known error types
  if (error.code === 'VALIDATION_ERROR') {
    return NextResponse.json(
      { error: error.message, details: error.details },
      { status: 400 }
    );
  }

  if (error.code === 'UNAUTHORIZED') {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  if (error.code === 'FORBIDDEN') {
    return NextResponse.json(
      { error: 'Forbidden' },
      { status: 403 }
    );
  }

  if (error.code === 'NOT_FOUND') {
    return NextResponse.json(
      { error: 'Not found' },
      { status: 404 }
    );
  }

  // Generic server error
  return NextResponse.json(
    { 
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? error.message : undefined
    },
    { status: 500 }
  );
}