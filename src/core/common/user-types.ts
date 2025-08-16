/**
 * Centralized User Type Definitions
 * 
 * This file provides the single source of truth for all user-related types
 * across the application, resolving conflicts between multiple definitions.
 */

import { z } from 'zod';

/**
 * User account type enum
 */
export enum UserType {
  PRIVATE = 'PRIVATE',
  CORPORATE = 'CORPORATE'
}

/**
 * Profile visibility level enum
 */
export enum VisibilityLevel {
  PUBLIC = 'public',
  TEAM_ONLY = 'team_only',
  PRIVATE = 'private'
}

/**
 * Core user entity - base definition used across all services
 * This is the canonical User type that all services should use
 */
export interface User {
  /**
   * Unique identifier for the user
   */
  id: string;
  
  /**
   * User's email address (primary identifier)
   */
  email: string;
  
  /**
   * User's username (optional)
   */
  username?: string;
  
  /**
   * User's first name (optional)
   */
  firstName?: string;
  
  /**
   * User's last name (optional)
   */
  lastName?: string;
  
  /**
   * User's full name (computed from first + last or provided)
   */
  fullName?: string;
  
  /**
   * Whether the user account is active
   */
  isActive: boolean;
  
  /**
   * Whether the user's email is verified
   */
  isVerified: boolean;
  
  /**
   * User's account type (private or corporate)
   */
  userType: UserType;
  
  /**
   * User's role in the system
   */
  role?: string;
  
  /**
   * Whether MFA is enabled for this user
   */
  mfaEnabled?: boolean;
  
  /**
   * Timestamp when the user was created
   */
  createdAt?: string | Date;
  
  /**
   * Timestamp when the user was last updated
   */
  updatedAt?: string | Date;
  
  /**
   * Timestamp of the user's last login
   */
  lastLogin?: string | Date;
  
  /**
   * Application metadata (controlled by the application)
   */
  app_metadata?: Record<string, any>;
  
  /**
   * User metadata (can be modified by the user)
   */
  user_metadata?: Record<string, any>;
  
  /**
   * Generic metadata for backward compatibility
   */
  metadata?: Record<string, any>;
}

/**
 * Extended user profile with additional information
 * Used by the profile service for detailed user information
 */
export interface UserProfile extends User {
  /**
   * URL to the user's profile picture (optional)
   */
  profilePictureUrl?: string;
  
  /**
   * Company information for corporate users
   */
  company?: CompanyInfo;
  
  /**
   * Profile visibility settings
   */
  visibility?: ProfileVisibility;
  
  /**
   * User preferences
   */
  preferences?: UserPreferences;
}

/**
 * Company information for corporate users
 */
export interface CompanyInfo {
  name: string;
  size?: string;
  industry?: string;
  website?: string;
  logoUrl?: string;
  position?: string;
  department?: string;
  vatId?: string;
  address?: Address;
}

/**
 * Address structure
 */
export interface Address {
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Profile visibility settings
 */
export interface ProfileVisibility {
  email: VisibilityLevel;
  fullName: VisibilityLevel;
  profilePicture: VisibilityLevel;
  companyInfo: VisibilityLevel;
  lastLogin: VisibilityLevel;
}

/**
 * User preferences
 */
export interface UserPreferences {
  language: string;
  theme: 'light' | 'dark' | 'system';
  emailNotifications: EmailNotificationPreferences;
  pushNotifications: PushNotificationPreferences;
  additionalSettings?: Record<string, any>;
}

/**
 * Email notification preferences
 */
export interface EmailNotificationPreferences {
  marketing: boolean;
  securityAlerts: boolean;
  accountUpdates: boolean;
  teamInvitations: boolean;
}

/**
 * Push notification preferences
 */
export interface PushNotificationPreferences {
  enabled: boolean;
  events: string[];
}

// ============================================================================
// Payload Types - Used for API requests
// ============================================================================

/**
 * Login credentials payload
 */
export interface LoginPayload {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Registration payload for creating a new user
 */
export interface RegistrationPayload {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  acceptedTerms: boolean;
  metadata?: Record<string, any>;
  userType?: UserType;
}

/**
 * Profile update payload
 */
export interface ProfileUpdatePayload {
  username?: string;
  firstName?: string;
  lastName?: string;
  company?: Partial<CompanyInfo>;
  metadata?: Record<string, any>;
  visibility?: Partial<ProfileVisibility>;
}

/**
 * Preferences update payload
 */
export interface PreferencesUpdatePayload {
  language?: string;
  theme?: 'light' | 'dark' | 'system';
  emailNotifications?: Partial<EmailNotificationPreferences>;
  pushNotifications?: Partial<PushNotificationPreferences>;
  additionalSettings?: Record<string, any>;
}

// ============================================================================
// Result Types - Used for service responses
// ============================================================================

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  expiresAt?: string;
  requiresMfa?: boolean;
  error?: string;
  code?: string;
  retryAfter?: number;
  remainingAttempts?: number;
}

/**
 * User profile operation result
 */
export interface UserProfileResult {
  success: boolean;
  profile?: UserProfile;
  error?: string;
}

/**
 * User search result
 */
export interface UserSearchResult {
  users: UserProfile[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * User search parameters
 */
export interface UserSearchParams {
  query?: string;
  userType?: UserType;
  isActive?: boolean;
  isVerified?: boolean;
  company?: string;
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLogin';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ============================================================================
// Validation Schemas - Zod schemas for runtime validation
// ============================================================================

export const emailSchema = z.string().email('Invalid email address');
export const passwordSchema = z.string().min(8, 'Password must be at least 8 characters');
export const usernameSchema = z.string()
  .min(3, 'Username must be at least 3 characters')
  .max(30, 'Username must be at most 30 characters')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');
export const nameSchema = z.string()
  .min(1, 'Name is required')
  .max(100, 'Name must be at most 100 characters');

export const loginSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  rememberMe: z.boolean().optional(),
});

export const registrationSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  acceptedTerms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms and conditions' })
  }),
  metadata: z.record(z.any()).optional(),
  userType: z.nativeEnum(UserType).optional(),
});

export const profileUpdateSchema = z.object({
  username: usernameSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  company: z.object({
    name: z.string().min(1, 'Company name is required').optional(),
    size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
    industry: z.string().optional(),
    website: z.string().url('Invalid website URL').optional().or(z.literal('')),
    logoUrl: z.string().url('Invalid logo URL').optional().or(z.literal('')),
    position: z.string().optional(),
    department: z.string().optional(),
    vatId: z.string().optional(),
    address: z.object({
      street: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      postalCode: z.string().optional(),
      country: z.string().optional(),
    }).optional(),
  }).optional(),
  metadata: z.record(z.any()).optional(),
  visibility: z.object({
    email: z.nativeEnum(VisibilityLevel).optional(),
    fullName: z.nativeEnum(VisibilityLevel).optional(),
    profilePicture: z.nativeEnum(VisibilityLevel).optional(),
    companyInfo: z.nativeEnum(VisibilityLevel).optional(),
    lastLogin: z.nativeEnum(VisibilityLevel).optional(),
  }).optional(),
});

export const preferencesUpdateSchema = z.object({
  language: z.string().optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  emailNotifications: z.object({
    marketing: z.boolean().optional(),
    securityAlerts: z.boolean().optional(),
    accountUpdates: z.boolean().optional(),
    teamInvitations: z.boolean().optional(),
  }).optional(),
  pushNotifications: z.object({
    enabled: z.boolean().optional(),
    events: z.array(z.string()).optional(),
  }).optional(),
  additionalSettings: z.record(z.any()).optional(),
});

// Type inference from schemas
export type LoginData = z.infer<typeof loginSchema>;
export type RegistrationData = z.infer<typeof registrationSchema>;
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type PreferencesUpdateData = z.infer<typeof preferencesUpdateSchema>;

// Re-export all interfaces explicitly for better module resolution
export type {
  User,
  UserProfile,
  CompanyInfo,
  Address,
  ProfileVisibility,
  UserPreferences,
  EmailNotificationPreferences,
  PushNotificationPreferences,
  LoginPayload,
  RegistrationPayload,
  ProfileUpdatePayload,
  PreferencesUpdatePayload,
  AuthResult,
  UserProfileResult,
  UserSearchResult,
  UserSearchParams
};

// ============================================================================
// Backward Compatibility Exports
// These exports maintain compatibility with existing code
// ============================================================================

/** @deprecated Use User from @/core/common/user-types */
export type AuthUser = User;

/** @deprecated Use UserProfile from @/core/common/user-types */
export type DetailedUser = UserProfile;

/** @deprecated Use RegistrationPayload from @/core/common/user-types */
export type CreateUserDto = RegistrationPayload;