/**
 * User Registration Route - Migrated to New Architecture
 * 
 * This route demonstrates the new dependency injection pattern that
 * eliminates circular dependencies. Services are injected cleanly
 * without using the old service container.
 * 
 * Key improvements:
 * 1. No circular dependencies
 * 2. Easy to test with mock services
 * 3. Clean separation of concerns
 * 4. Type-safe throughout
 */

import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { 
  createSuccessResponse,
  createErrorResponse,
  ApiError,
  ERROR_CODES
} from '@/lib/api/common';
import { NextResponse } from 'next/server';

/**
 * Registration schema with discriminated union for user types
 */
const RegistrationSchema = z.discriminatedUnion('userType', [
  z.object({
    userType: z.literal('private'),
    email: z.string().email({ message: 'Invalid email address' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters long' })
      .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
      .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
      .regex(/[0-9]/, { message: 'Password must contain at least one number' })
      .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, { 
        message: 'Password must contain at least one special character' 
      }),
    firstName: z.string().min(1, { message: 'First name is required' }),
    lastName: z.string().min(1, { message: 'Last name is required' }),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  }),
  z.object({
    userType: z.literal('corporate'),
    email: z.string().email({ message: 'Invalid email address' }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters long' })
      .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
      .regex(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
      .regex(/[0-9]/, { message: 'Password must contain at least one number' })
      .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, { 
        message: 'Password must contain at least one special character' 
      }),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().min(1, { message: 'Company name is required' }),
    companyWebsite: z.string().optional().refine(
      (val) => !val || /^(https?:\/\/)?([\w-]+\.)+[\w-]+(\/\S*)?$/.test(val),
      { message: 'Please enter a valid website URL' }
    ),
    department: z.string().optional(),
    industry: z.string().optional(),
    companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+', 'Other/Not Specified']).optional(),
    position: z.string().optional(),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions',
    }),
  })
]);

type RegistrationData = z.infer<typeof RegistrationSchema>;

/**
 * POST /api/auth/register-v2
 * 
 * Register a new user account.
 * 
 * This handler uses the new withValidatedServices helper which:
 * 1. Creates services using the pure factory (no circular deps)
 * 2. Validates the request data
 * 3. Injects services into the handler
 * 4. Handles errors consistently
 */
export const POST = withValidatedServices(
  RegistrationSchema,
  async (services, data, request, context) => {
    try {
      // Check if user already exists
      const existingUser = await services.user.findByEmail(data.email);
      if (existingUser) {
        return createErrorResponse(
          new ApiError(
            ERROR_CODES.USER_ALREADY_EXISTS,
            'An account with this email already exists',
            409
          )
        );
      }
      
      // Prepare registration data
      const registrationData = {
        email: data.email,
        password: data.password,
        firstName: data.userType === 'private' 
          ? data.firstName 
          : (data.firstName || ''),
        lastName: data.userType === 'private' 
          ? data.lastName 
          : (data.lastName || ''),
        metadata: {
          userType: data.userType,
          acceptTerms: data.acceptTerms,
          registeredAt: new Date().toISOString(),
          ipAddress: request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
          ...(data.userType === 'corporate' && {
            companyName: data.companyName,
            companyWebsite: data.companyWebsite,
            department: data.department,
            industry: data.industry,
            companySize: data.companySize,
            position: data.position,
          }),
        },
      };
      
      // Register the user
      const user = await services.auth.register(registrationData);
      
      // Create a session for the new user
      const session = await services.auth.login({
        email: data.email,
        password: data.password,
      });
      
      // Log the registration event if audit service is available
      if (services.audit) {
        await services.audit.logEvent({
          userId: user.id,
          action: 'USER_REGISTERED',
          details: {
            userType: data.userType,
            email: data.email,
          },
          ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
          userAgent: request.headers.get('user-agent') || 'unknown',
        });
      }
      
      // Send welcome email if notification service is available
      if (services.notification) {
        await services.notification.sendEmail({
          to: data.email,
          subject: 'Welcome to Our Platform',
          template: 'welcome',
          data: {
            firstName: user.firstName || 'User',
            userType: data.userType,
          },
        });
      }
      
      // Return success response with user and session
      return createSuccessResponse({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          createdAt: user.createdAt,
        },
        session: {
          token: session.token,
          expiresAt: session.expiresAt,
        },
      }, 201);
      
    } catch (error) {
      // Handle specific auth errors
      if (error && typeof error === 'object' && 'code' in error) {
        const authError = error as { code: string; message: string };
        
        if (authError.code === 'WEAK_PASSWORD') {
          return createErrorResponse(
            new ApiError(
              ERROR_CODES.INVALID_REQUEST,
              'Password does not meet security requirements',
              400
            )
          );
        }
        
        if (authError.code === 'INVALID_EMAIL') {
          return createErrorResponse(
            new ApiError(
              ERROR_CODES.INVALID_REQUEST,
              'Invalid email address format',
              400
            )
          );
        }
      }
      
      // Log unexpected errors
      console.error('Registration error:', error);
      
      // Return generic error for security
      return createErrorResponse(
        new ApiError(
          ERROR_CODES.INTERNAL_ERROR,
          'Registration failed. Please try again.',
          500
        )
      );
    }
  }
);