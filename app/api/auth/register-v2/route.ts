/**
 * Registration Route - Demonstrating Circular Dependency-Free Architecture
 * 
 * This route demonstrates the pragmatic hybrid DI solution:
 * - No circular dependencies through explicit service injection
 * - Clean testing with service mocking
 * - Follows Next.js App Router patterns
 * - Type-safe validation with Zod
 * - Proper error handling
 */

import { z } from 'zod';
import { withValidatedServices } from '@/lib/api/with-services';
import { NextResponse } from 'next/server';

// Registration schema with discriminated union for user types
const RegistrationSchema = z.discriminatedUnion('userType', [
  // Private user registration
  z.object({
    userType: z.literal('private'),
    email: z.string().email('Invalid email address'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'Password must contain at least one special character'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
  }),
  // Corporate user registration
  z.object({
    userType: z.literal('corporate'),
    email: z.string().email('Invalid email address'),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/, 'Password must contain at least one special character'),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().min(1, 'Company name is required'),
    companyWebsite: z.string().url('Please enter a valid website URL').optional(),
    department: z.string().optional(),
    industry: z.string().optional(),
    companySize: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+', 'Other']).optional(),
    position: z.string().optional(),
    acceptTerms: z.boolean().refine(val => val === true, 'You must accept the terms and conditions'),
  })
]);

/**
 * POST /api/auth/register-v2
 * 
 * Register a new user account (private or corporate)
 * 
 * Key improvements:
 * 1. Services injected via withValidatedServices - no circular deps!
 * 2. Clean separation of validation, business logic, and response
 * 3. Easy to test with service mocking
 * 4. Type-safe throughout the pipeline
 */
export const POST = withValidatedServices(
  RegistrationSchema,
  async (services, data, request) => {
    // Extract request context for audit logging
    const context = {
      ipAddress: request.headers.get('x-forwarded-for') || 
                 request.headers.get('x-real-ip') || 
                 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      timestamp: new Date().toISOString(),
    };

    try {
      // Prepare registration data based on user type
      const registrationData = data.userType === 'private' 
        ? {
            email: data.email,
            password: data.password,
            firstName: data.firstName,
            lastName: data.lastName,
            userType: 'private' as const,
            profile: {
              acceptTerms: data.acceptTerms,
              registrationDate: new Date().toISOString(),
            }
          }
        : {
            email: data.email,
            password: data.password,
            firstName: data.firstName || '',
            lastName: data.lastName || '',
            userType: 'corporate' as const,
            profile: {
              acceptTerms: data.acceptTerms,
              registrationDate: new Date().toISOString(),
              company: {
                name: data.companyName,
                website: data.companyWebsite,
                department: data.department,
                industry: data.industry,
                size: data.companySize,
              },
              position: data.position,
            }
          };

      // Register user through auth service
      // Service handles all business logic: validation, creation, audit logging
      const result = await services.auth.register(registrationData, context);

      // Handle success response
      return NextResponse.json({
        success: true,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          userType: result.user.userType,
          emailVerified: result.user.emailVerified,
        },
        token: result.token,
        refreshToken: result.refreshToken,
        requiresEmailConfirmation: result.requiresEmailConfirmation || false,
        message: 'Registration successful'
      }, { status: 201 });

    } catch (error: any) {
      console.error('Registration error:', error);

      // Handle specific business logic errors
      if (error.code === 'USER_ALREADY_EXISTS') {
        return NextResponse.json({
          success: false,
          error: 'User already exists',
          message: 'An account with this email address already exists'
        }, { status: 409 });
      }

      if (error.code === 'INVALID_EMAIL_DOMAIN') {
        return NextResponse.json({
          success: false,
          error: 'Invalid email domain',
          message: 'Email domain is not allowed for registration'
        }, { status: 400 });
      }

      if (error.code === 'PASSWORD_TOO_WEAK') {
        return NextResponse.json({
          success: false,
          error: 'Password too weak',
          message: 'Password does not meet security requirements'
        }, { status: 400 });
      }

      // Generic server error
      return NextResponse.json({
        success: false,
        error: 'Registration failed',
        message: process.env.NODE_ENV === 'development' 
          ? error.message 
          : 'An error occurred during registration'
      }, { status: 500 });
    }
  }
);