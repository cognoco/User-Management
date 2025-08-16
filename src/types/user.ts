/**
 * User Types
 * 
 * This file re-exports user types from the centralized user types
 * to maintain backward compatibility while using the single source of truth.
 */

// Re-export everything from centralized user types
export * from '@/core/common/user-types';

// Also re-export UserType enum from user-type file for backward compatibility
export { UserType } from './user-type';