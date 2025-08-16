/**
 * Authentication Domain Models
 * 
 * This file re-exports authentication types from the centralized user types
 * to maintain backward compatibility while using the single source of truth.
 */

import { z } from 'zod';

// Re-export core types from the centralized location
export {
  User,
  LoginPayload,
  RegistrationPayload,
  AuthResult,
  LoginData,
  RegistrationData
} from '@/core/common/user-types';

// Re-export validation schemas for backward compatibility
// Note: These might have slight differences from the centralized ones
export { 
  emailSchema,
  passwordSchema,
  loginSchema as loginSchemaBase,
  registrationSchema as registerSchemaBase
} from '@/core/common/user-types';

// Auth-specific schemas with additional validations
export const loginSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
  rememberMe: z.boolean().optional(),
});

export const registerSchema = z.object({
  email: z.string().email({ message: 'Please enter a valid email address' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  confirmPassword: z.string().min(1, { message: 'Please confirm your password' }),
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  acceptTerms: z.boolean().refine(val => val === true, { message: 'You must accept the terms and conditions' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Type inference from auth-specific schemas
export type RegisterData = z.infer<typeof registerSchema>;

// Auth-specific types that don't exist in common

/**
 * Response from authentication operation  
 */
export interface AuthResponse {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Authenticated user if the operation was successful
   */
  user?: User;
  
  /**
   * Authentication token
   */
  token?: string;
  
  /**
   * Refresh token
   */
  refreshToken?: string;
  
  /**
   * Token expiration time
   */
  expiresAt?: string;
  
  /**
   * Whether MFA is required
   */
  requiresMfa?: boolean;
  
  /**
   * Error message if the operation failed
   */
  error?: string;
  
  /**
   * Error code for programmatic handling
   */
  code?: string;
  
  /**
   * Retry after time in seconds for rate limiting
   */
  retryAfter?: number;
  
  /**
   * Number of attempts remaining
   */
  remainingAttempts?: number;
  
  /**
   * Time window in milliseconds for rate limiting
   */
  windowMs?: number;
}

/**
 * Response from MFA setup operation
 */
export interface MFASetupResponse {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * MFA secret key
   */
  secret?: string;
  
  /**
   * QR code for scanning with authenticator app
   */
  qrCode?: string;
  
  /**
   * Backup codes for account recovery
   */
  backupCodes?: string[];
  
  /**
   * Error message if the operation failed
   */
  error?: string;
}

/**
 * Response from MFA verification operation
 */
export interface MFAVerifyResponse {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Backup codes for account recovery
   */
  backupCodes?: string[];
  
  /**
   * Authentication token if verification was successful
   */
  token?: string;
  
  /**
   * Error message if the operation failed
   */
  error?: string;
}

/**
 * Password reset token model
 */
export interface PasswordResetToken {
  token: string;
  userId: string;
  expiresAt: number;
}