/**
 * API Route Wrapper with Service Validation
 * 
 * This provides the new pattern for creating API routes with validated services,
 * authentication, and consistent error handling.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { timingSafeEqual } from 'crypto';
import type { 
  ServiceContainer,
  AuthContext
} from '@/core/config/interfaces';
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';
import { createAuthMiddleware } from './auth-middleware';
import { 
  createSuccessResponse, 
  createErrorResponse, 
  ApiError, 
  ERROR_CODES 
} from './common';
import { initializeApiServices } from '@/lib/initialization/api-init';

/**
 * Safe token comparison to prevent timing attacks
 */
function safeCompareTokens(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) {
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}

/**
 * Handler context with validated services
 */
export interface WithServicesContext<T = any> {
  /** Validated request data */
  data: T;
  /** HTTP request object */
  request: NextRequest;
  /** User ID if authenticated */
  userId?: string;
  /** Full user object if includeUser enabled */
  user?: any;
  /** User permissions if includePermissions enabled */
  permissions?: string[];
  /** Validated services container */
  services: ServiceContainer;
  /** Route parameters (for dynamic routes like [id]) */
  params?: Record<string, string>;
}

/**
 * Configuration for withValidatedServices
 */
export interface WithServicesOptions<T = any> {
  /** Zod schema for request validation */
  schema: z.ZodSchema<T>;
  /** Array of required service keys */
  requiredServices: (keyof ServiceContainer)[];
  /** Whether authentication is required */
  requireAuth?: boolean;
  /** Specific permissions required */
  requiredPermissions?: string[];
  /** Whether to include user object in context */
  includeUser?: boolean;
  /** Whether to include user permissions in context */
  includePermissions?: boolean;
  /** Whether to enable CSRF protection (defaults to true for state-changing methods) */
  enableCSRF?: boolean;
  /** Rate limiting configuration */
  rateLimit?: { windowMs: number; max: number };
  /** Handler function */
  handler: (context: WithServicesContext<T>) => Promise<NextResponse>;
}

/**
 * Mapping of service names to ServiceKeys
 */
const SERVICE_KEY_MAP: Record<string, string> = {
  'auth': ServiceKeys.AUTH_SERVICE,
  'user': ServiceKeys.USER_SERVICE,
  'permission': ServiceKeys.PERMISSION_SERVICE,
  'team': ServiceKeys.TEAM_SERVICE,
  'sso': ServiceKeys.SSO_SERVICE,
  'gdpr': ServiceKeys.GDPR_SERVICE,
  'twoFactor': ServiceKeys.TWO_FACTOR_SERVICE,
  'subscription': ServiceKeys.SUBSCRIPTION_SERVICE,
  'apiKey': ServiceKeys.API_KEY_SERVICE,
  'notification': ServiceKeys.NOTIFICATION_SERVICE,
  'webhook': ServiceKeys.WEBHOOK_SERVICE,
  'session': ServiceKeys.SESSION_SERVICE,
  'organization': ServiceKeys.ORGANIZATION_SERVICE,
  'csrf': ServiceKeys.CSRF_SERVICE,
  'consent': ServiceKeys.CONSENT_SERVICE,
  'audit': ServiceKeys.AUDIT_SERVICE,
  'admin': ServiceKeys.ADMIN_SERVICE,
  'role': ServiceKeys.ROLE_SERVICE,
  'address': ServiceKeys.ADDRESS_SERVICE,
  'company': ServiceKeys.COMPANY_SERVICE,
  'oauth': ServiceKeys.OAUTH_SERVICE,
  'companyNotification': ServiceKeys.COMPANY_NOTIFICATION_SERVICE,
  'resourceRelationship': ServiceKeys.RESOURCE_RELATIONSHIP_SERVICE,
};

/**
 * Create a service container from required services
 */
function createValidatedServiceContainer(requiredServices: (keyof ServiceContainer)[]): ServiceContainer {
  // Ensure API services are initialized before accessing them
  initializeApiServices();
  
  const locator = ServiceLocator.getInstance();
  const container: Partial<ServiceContainer> = {};
  
  for (const serviceName of requiredServices) {
    const serviceKey = SERVICE_KEY_MAP[serviceName];
    if (!serviceKey) {
      throw new Error(`Unknown service: ${serviceName}`);
    }
    
    if (!locator.has(serviceKey)) {
      throw new Error(`Required service '${serviceName}' is not registered`);
    }
    
    container[serviceName] = locator.get(serviceKey);
  }
  
  return container as ServiceContainer;
}

/**
 * Extract route parameters from request URL
 */
function extractParams(request: NextRequest): Record<string, string> {
  const url = new URL(request.url);
  const pathSegments = url.pathname.split('/').filter(Boolean);
  const params: Record<string, string> = {};
  
  // Simple parameter extraction (works for common cases)
  // For more complex cases, Next.js will provide these in the route context
  pathSegments.forEach((segment, index) => {
    if (segment.startsWith('[') && segment.endsWith(']')) {
      const paramName = segment.slice(1, -1);
      const nextSegment = pathSegments[index + 1];
      if (nextSegment && !nextSegment.startsWith('[')) {
        params[paramName] = decodeURIComponent(nextSegment);
      }
    }
  });
  
  return params;
}

/**
 * Main wrapper function for API routes with validated services
 */
export function withValidatedServices<T = any>(
  options: WithServicesOptions<T>
): (request: NextRequest, context?: { params: Promise<Record<string, string>> }) => Promise<NextResponse> {
  
  return async (
    request: NextRequest, 
    context?: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse> => {
    try {
      // 1. Check CSRF protection for state-changing methods
      const shouldCheckCSRF = options.enableCSRF !== false && 
        ['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method);
      
      if (shouldCheckCSRF) {
        const csrfToken = request.headers.get('X-CSRF-Token');
        const storedToken = request.cookies.get('csrf-token')?.value;
        
        if (!csrfToken || !storedToken || !safeCompareTokens(csrfToken, storedToken)) {
          return createErrorResponse(
            new ApiError(
              ERROR_CODES.FORBIDDEN,
              'Invalid or missing CSRF token',
              403
            )
          );
        }
      }
      
      // 2. Validate required services are available
      const services = createValidatedServiceContainer(options.requiredServices);
      
      // 3. Create authentication middleware if needed
      let authContext: AuthContext = { isAuthenticated: false };
      
      if (options.requireAuth || options.requiredPermissions?.length) {
        const authMiddleware = createAuthMiddleware({
          authService: services.auth!,
          permissionService: services.permission,
          requireAuth: options.requireAuth ?? false,
          requiredPermissions: options.requiredPermissions,
          includeUser: options.includeUser ?? false,
          includePermissions: options.includePermissions ?? false,
        });
        
        authContext = await authMiddleware(request);
      }
      
      // 4. Validate request data
      let validatedData: T;
      try {
        const body = request.method === 'GET' 
          ? Object.fromEntries(new URL(request.url).searchParams)
          : await request.json().catch(() => ({}));
        
        validatedData = options.schema.parse(body);
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
      
      // 5. Extract route parameters
      const params = context?.params ? await context.params : extractParams(request);
      
      // 6. Create handler context
      const handlerContext: WithServicesContext<T> = {
        data: validatedData,
        request,
        userId: authContext.userId,
        user: authContext.user,
        permissions: authContext.permissions,
        services,
        params,
      };
      
      // 7. Call the handler
      return await options.handler(handlerContext);
      
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
 * Utility schemas for common use cases
 */
export const schemas = {
  /** Empty schema for handlers that don't need request data */
  empty: z.object({}),
  
  /** Schema for ID-based requests */
  withId: z.object({
    id: z.string().min(1, 'ID is required'),
  }),
  
  /** Schema for pagination */
  paginated: z.object({
    page: z.coerce.number().min(1).default(1),
    limit: z.coerce.number().min(1).max(100).default(20),
  }),
};

/**
 * Type helpers for common handler patterns
 */
export type EmptyHandler = (context: WithServicesContext<Record<string, never>>) => Promise<NextResponse>;
export type IdHandler<T = any> = (context: WithServicesContext<T & { id: string }>) => Promise<NextResponse>;
export type PaginatedHandler<T = any> = (context: WithServicesContext<T & { page: number; limit: number }>) => Promise<NextResponse>;

// Keep the legacy function for backward compatibility during migration
export const emptySchema = z.object({});
export type EmptyApiHandler = (context: WithServicesContext<Record<string, never>>) => Promise<NextResponse>;