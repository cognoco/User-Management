/**
 * User Management Domain Models
 * 
 * This file defines the core entity models for the user management domain.
 * These models represent the domain objects that are used by the user service.
 */

import { z } from 'zod';
import { UserType } from '../../types/user-type';

/**
 * User profile entity representing a user's profile information
 */
export interface UserProfile {
  /**
   * Unique identifier for the user
   */
  id: string;
  
  /**
   * User's email address
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
   * User's full name (optional, may be generated from first and last name)
   */
  fullName?: string;
  
  /**
   * URL to the user's profile picture (optional)
   */
  profilePictureUrl?: string;

  /**
   * URL to the user's avatar (alias for profilePictureUrl)
   */
  avatarUrl?: string;
  
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
   * Company information for corporate users
   */
  company?: {
    name: string;
    size?: string;
    industry?: string;
    website?: string;
    /**
     * URL to the company's logo (optional)
     */
    logoUrl?: string;
    position?: string;
    department?: string;
    vatId?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  
  /**
   * Timestamp when the user was created
   */
  createdAt?: string;
  
  /**
   * Timestamp when the user was last updated
   */
  updatedAt?: string;
  
  /**
   * Timestamp of the user's last login
   */
  lastLogin?: string;
  
  /**
   * Short biography / about text
   */
  bio?: string | null;

  /**
   * Privacy settings controlling profile field visibility
   */
  privacySettings?: {
    showEmail: boolean;
    showPhone: boolean;
    showLocation: boolean;
    profileVisibility: 'public' | 'private' | 'contacts';
  };

  /**
   * Additional metadata for the user
   */
  metadata?: Record<string, any>;
  
  /**
   * Profile visibility settings
   */
  visibility?: ProfileVisibility;
}

/**
 * Profile visibility settings
 */
export interface ProfileVisibility {
  /**
   * Who can see the user's email
   */
  email: VisibilityLevel;
  
  /**
   * Who can see the user's full name
   */
  fullName: VisibilityLevel;
  
  /**
   * Who can see the user's profile picture
   */
  profilePicture: VisibilityLevel;
  
  /**
   * Who can see the user's company information
   */
  companyInfo: VisibilityLevel;
  
  /**
   * Who can see the user's last login time
   */
  lastLogin: VisibilityLevel;

  /** Whether email is visible (boolean shorthand) */
  emailVisible?: boolean;
  /** Whether name is visible (boolean shorthand) */
  nameVisible?: boolean;
  /** Whether bio is visible (boolean shorthand) */
  bioVisible?: boolean;
  /** Whether location is visible (boolean shorthand) */
  locationVisible?: boolean;
  /** Whether website is visible (boolean shorthand) */
  websiteVisible?: boolean;
}

/**
 * Visibility level enum
 */
export enum VisibilityLevel {
  PUBLIC = 'public',
  TEAM_ONLY = 'team_only',
  PRIVATE = 'private'
}

/**
 * User preferences entity
 */
export interface UserPreferences {
  /**
   * User's preferred language
   */
  language: string;
  
  /**
   * User's preferred theme
   */
  theme: 'light' | 'dark' | 'system';
  
  /**
   * Email notification preferences
   */
  emailNotifications: {
    /**
     * Whether to receive marketing emails
     */
    marketing: boolean;
    
    /**
     * Whether to receive security alerts
     */
    securityAlerts: boolean;
    
    /**
     * Whether to receive account updates
     */
    accountUpdates: boolean;
    
    /**
     * Whether to receive team invitations
     */
    teamInvitations: boolean;
  };
  
  /**
   * Push notification preferences
   */
  pushNotifications: {
    /**
     * Whether to receive push notifications
     */
    enabled: boolean;
    
    /**
     * Types of events to receive push notifications for
     */
    events: string[];
  };
  
  /**
   * Additional preference settings
   */
  additionalSettings?: Record<string, any>;
}

/**
 * Payload for updating a user's profile
 */
export interface ProfileUpdatePayload {
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
   * Company information for corporate users (optional)
   */
  company?: {
    name?: string;
    size?: string;
    industry?: string;
    website?: string;
    /**
     * URL to the company's logo (optional)
     */
    logoUrl?: string;
    position?: string;
    department?: string;
    vatId?: string;
    address?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    };
  };
  
  /**
   * Display name (optional shorthand for firstName + lastName)
   */
  displayName?: string;

  /**
   * User's bio / about text (optional)
   */
  bio?: string;

  /**
   * User's location (optional)
   */
  location?: string;

  /**
   * User's website URL (optional)
   */
  website?: string;

  /**
   * User's phone number (optional)
   */
  phoneNumber?: string;

  /**
   * URL to the user's avatar (optional)
   */
  avatarUrl?: string;

  /**
   * Profile visibility settings (optional)
   */
  visibility?: ProfileVisibility;

  /**
   * Additional metadata for the user (optional)
   */
  metadata?: Record<string, any>;
}

/**
 * Payload for updating a user's preferences
 */
export interface PreferencesUpdatePayload {
  /**
   * User's preferred language (optional)
   */
  language?: string;
  
  /**
   * User's preferred theme (optional)
   */
  theme?: 'light' | 'dark' | 'system';
  
  /**
   * Email notification preferences (optional)
   */
  emailNotifications?: {
    /**
     * Whether to receive marketing emails (optional)
     */
    marketing?: boolean;
    
    /**
     * Whether to receive security alerts (optional)
     */
    securityAlerts?: boolean;
    
    /**
     * Whether to receive account updates (optional)
     */
    accountUpdates?: boolean;
    
    /**
     * Whether to receive team invitations (optional)
     */
    teamInvitations?: boolean;
  };
  
  /**
   * Push notification preferences (optional)
   */
  pushNotifications?: {
    /**
     * Whether to receive push notifications (optional)
     */
    enabled?: boolean;
    
    /**
     * Types of events to receive push notifications for (optional)
     */
    events?: string[];
  };
  
  /**
   * Additional preference settings (optional)
   */
  additionalSettings?: Record<string, any>;

  /**
   * User's preferred timezone (optional)
   */
  timezone?: string;

  /**
   * User's preferred date format (optional)
   */
  dateFormat?: string;

  /**
   * User's preferred time format (optional)
   */
  timeFormat?: string;
}

/**
 * Result of a user profile operation
 */
export interface UserProfileResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Updated user profile if the operation was successful
   */
  profile?: UserProfile;
  
  /**
   * Error message if the operation failed
   */
  error?: string;
}

/**
 * Parameters for searching users
 */
export interface UserSearchParams {
  /**
   * Search query (searches across name, email, username)
   */
  query?: string;
  
  /**
   * Filter by user type
   */
  userType?: UserType;
  
  /**
   * Filter by active status
   */
  isActive?: boolean;
  
  /**
   * Filter by verified status
   */
  isVerified?: boolean;
  
  /**
   * Filter by company (for corporate users)
   */
  company?: string;
  
  /**
   * Sort by field
   */
  sortBy?: 'name' | 'email' | 'createdAt' | 'lastLogin';
  
  /**
   * Sort direction
   */
  sortDirection?: 'asc' | 'desc';
  
  /**
   * Pagination: page number (1-based)
   */
  page?: number;
  
  /**
   * Pagination: items per page
   */
  limit?: number;

  /**
   * Alias for limit (items per page)
   */
  pageSize?: number;

  /**
   * Additional filter criteria (key-value pairs)
   */
  filters?: Record<string, any>;
}

/**
 * Result of a user search operation
 */
export interface UserSearchResult {
  /**
   * List of users matching the search criteria
   */
  users: UserProfile[];
  
  /**
   * Total number of users matching the search criteria
   */
  total: number;
  
  /**
   * Current page number
   */
  page: number;
  
  /**
   * Number of items per page
   */
  limit: number;
  
  /**
   * Total number of pages
   */
  totalPages: number;
}

// Validation schemas
export const usernameSchema = z.string().min(3, 'Username must be at least 3 characters').max(30, 'Username must be at most 30 characters').regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and hyphens');
export const nameSchema = z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters');

export const profileUpdateSchema = z.object({
  username: usernameSchema.optional(),
  firstName: nameSchema.optional(),
  lastName: nameSchema.optional(),
  company: z.object({
    name: z.string().min(1, 'Company name is required').optional(),
    size: z.enum(['1-10', '11-50', '51-200', '201-500', '501-1000', '1000+']).optional(),
    industry: z.string().optional(),
    website: z.string().url('Invalid website URL').optional().or(z.literal('')),
    logoUrl: z
      .string()
      .url('Invalid logo URL')
      .optional()
      .or(z.literal('')),
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
export type ProfileUpdateData = z.infer<typeof profileUpdateSchema>;
export type PreferencesUpdateData = z.infer<typeof preferencesUpdateSchema>;
