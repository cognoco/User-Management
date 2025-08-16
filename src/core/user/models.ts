/**
 * User Management Domain Models
 * 
 * This file re-exports user types from the centralized user types
 * to maintain backward compatibility while using the single source of truth.
 */

// Re-export all user-related types from the centralized location
export {
  // Core types
  User,
  UserProfile,
  UserType,
  VisibilityLevel,
  
  // Related structures
  CompanyInfo,
  Address,
  ProfileVisibility,
  UserPreferences,
  EmailNotificationPreferences,
  PushNotificationPreferences,
  
  // Payload types
  ProfileUpdatePayload,
  PreferencesUpdatePayload,
  
  // Result types
  UserProfileResult,
  UserSearchResult,
  UserSearchParams,
  
  // Validation schemas
  usernameSchema,
  nameSchema,
  profileUpdateSchema,
  preferencesUpdateSchema,
  
  // Type inference
  ProfileUpdateData,
  PreferencesUpdateData
} from '@/core/common/user-types';