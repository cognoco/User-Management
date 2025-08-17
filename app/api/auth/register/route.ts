import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { User } from '@/core/common/user-types';
import {
  createSuccessResponse,
  createCreatedResponse,
  ApiError,
  ERROR_CODES
} from '@/lib/api/common';
import { createUserAlreadyExistsError } from '@/lib/api/user/error-handler';

// Extended interfaces for registration that include corporate fields
interface ExtendedRegistrationPayload {
  email: string;
  password: string;
  userType: 'private' | 'corporate';
  firstName: string;
  lastName: string;
  acceptTerms: boolean;
  companyName?: string;
  companyWebsite?: string;
  department?: string;
  industry?: string;
  companySize?: string;
  position?: string;
  metadata?: Record<string, any>;
}

// Zod schema for registration data
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
      .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, { message: 'Password must contain at least one special character' }),
    firstName: z.string().min(1, { message: 'First name is required' }),
    lastName: z.string().min(1, { message: 'Last name is required' }),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions and privacy policy',
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
      .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, { message: 'Password must contain at least one special character' }),
    firstName: z.string().min(1, { message: 'First name is required' }),
    lastName: z.string().min(1, { message: 'Last name is required' }),
    companyName: z.string().min(1, { message: 'Company name is required' }),
    companyWebsite: z.string().url({ message: 'Invalid company website URL' }).optional(),
    department: z.string().optional(),
    industry: z.string().min(1, { message: 'Industry is required' }),
    companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional(),
    position: z.string().optional(),
    acceptTerms: z.boolean().refine(val => val === true, {
      message: 'You must accept the terms and conditions and privacy policy',
    }),
  }),
]);

/**
 * POST handler for registration endpoint
 */
export const POST = withValidatedServices({
  schema: RegistrationSchema,
  requiredServices: ['auth', 'user', 'company'],
  requireAuth: false, // Registration doesn't require auth
  rateLimit: { windowMs: 60 * 60 * 1000, max: 10 }, // Rate limiting for registration
  handler: async ({ request, data, services }) => {
    // Extract request context for the service
    const context = {
      ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
    };

    // Check if the email is already registered - improved to leverage service
    const existingUser = await services.auth.checkUserExists(data.email);
    if (existingUser) {
      throw createUserAlreadyExistsError(data.email);
    }

    // Register the user through auth service
    const registrationResult = await services.auth.register({
      email: data.email,
      password: data.password,
      userType: data.userType,
      metadata: {
        firstName: data.firstName,
        lastName: data.lastName,
        acceptTerms: data.acceptTerms,
        ...(data.userType === 'corporate' ? {
          companyName: data.companyName,
          companyWebsite: data.companyWebsite,
          department: data.department,
          industry: data.industry,
          companySize: data.companySize,
          position: data.position,
        } : {})
      }
    }, context);

    // Handle Registration Errors
    if (!registrationResult.success) {
      console.error('Registration error:', registrationResult.error);
      throw new ApiError(
        ERROR_CODES.OPERATION_FAILED,
        registrationResult.error || 'Registration failed',
        400
      );
    }

    // Handle Success
    if (!registrationResult.user) {
      console.error('Registration successful but no user returned');
      throw new ApiError(
        ERROR_CODES.INTERNAL_ERROR,
        'Registration failed unexpectedly',
        500
      );
    }

    // Create user profile with the registered user
    const profileResult = await services.user.createUserProfile(registrationResult.user.id, {
      firstName: data.firstName,
      lastName: data.lastName,
      displayName: `${data.firstName} ${data.lastName}`,
      userType: data.userType,
      metadata: data.userType === 'corporate' ? {
        companyName: data.companyName,
        department: data.department,
        position: data.position,
      } : undefined
    });

    if (!profileResult.success) {
      console.error('Failed to create user profile:', profileResult.error);
      // Don't fail the registration, but log the issue
    }

    // Create company profile if corporate user
    if (data.userType === 'corporate' && data.companyName) {
      const companyResult = await services.company?.createProfile(registrationResult.user.id, {
        name: data.companyName,
        legal_name: data.companyName,
        website: data.companyWebsite,
        industry: data.industry!,
        size_range: data.companySize || '1-10',
        founded_year: new Date().getFullYear(),
      });

      if (!companyResult || !companyResult.success) {
        console.error('Failed to create company profile:', companyResult?.error);
        // Don't fail the registration, but log the issue
      }
    }

    console.log('Registration successful for:', data.email, `(${data.userType} user)`);

    return createCreatedResponse({
      user: registrationResult.user,
      requiresEmailVerification: registrationResult.requiresEmailVerification,
      message: registrationResult.requiresEmailVerification
        ? 'Registration successful. Please check your email to verify your account.'
        : 'Registration successful. You can now log in to your account.'
    });
  },
});