import { z } from 'zod';
import { createApiHandlerWithServices } from '@/lib/api/route-helpers-v2';
import { configureUserManagement } from '@/lib/config/configure-user-management';
import { LoginPayload } from '@/core/auth/models';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';
import { createInvalidCredentialsError, createEmailNotVerifiedError } from '@/lib/api/auth/error-handler';

// Configure services at module level using dependency injection
const services = configureUserManagement();

// Zod schema for login data
const LoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
  rememberMe: z.boolean().optional(), 
});

/**
 * POST handler for login endpoint
 */
export const POST = createApiHandlerWithServices(
  LoginSchema,
  async (request, _authContext, data, injectedServices) => {
    // Extract request context for the service
    const context = {
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    };
    
    // Prepare login payload
    const loginPayload: LoginPayload = {
      email: data.email,
      password: data.password,
      rememberMe: data.rememberMe || false
    };
    
    // Call auth service with context - all business logic is now in the service
    const authResult = await injectedServices.auth.login(loginPayload, context);

    // Handle Login Errors - service now handles audit logging and error classification
    if (!authResult.success) {
      console.error('Login error:', authResult.error);
      
      // Handle specific error cases based on service classification
      if (authResult.code === 'INVALID_CREDENTIALS') {
        throw createInvalidCredentialsError();
      } 
      if (authResult.code === 'EMAIL_NOT_VERIFIED') {
        throw createEmailNotVerifiedError();
      }
      if (authResult.code === 'RATE_LIMIT_EXCEEDED') {
        throw new ApiError(
          ERROR_CODES.INTERNAL_ERROR,
          authResult.error || 'Rate limit exceeded',
          429,
          { retryAfter: authResult.retryAfter, remainingAttempts: authResult.remainingAttempts }
        );
      }
      
      // Generic authentication failure
      throw new ApiError(
        ERROR_CODES.UNAUTHORIZED,
        authResult.error || 'Authentication failed',
        401
      );
    }

    // Handle Success - service now includes all necessary data
    if (!authResult.user) {
      console.error('Login successful but no user returned');
      throw new ApiError(
        ERROR_CODES.INTERNAL_ERROR,
        'Login failed unexpectedly after authentication',
        500
      );
    }

    console.log('Login successful for:', data.email, data.rememberMe ? '(with extended session)' : '');
    
    return createSuccessResponse({
      user: authResult.user,
      token: authResult.token,
      requiresMfa: authResult.requiresMfa,
      expiresAt: authResult.expiresAt
    });
  },
  services,
  { 
    requireAuth: false, // Login doesn't require auth
    rateLimit: { windowMs: 15 * 60 * 1000, max: 30 } // Rate limiting config
  }
);
