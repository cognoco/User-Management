/**
 * Team Management Domain Models
 * 
 * This file defines the core entity models for the team management domain.
 * These models represent the domain objects that are used by the team service.
 */

import { z } from 'zod';

/**
 * Team entity representing a group of users
 */
export interface Team {
  /**
   * Unique identifier for the team
   */
  id: string;
  
  /**
   * Name of the team
   */
  name: string;
  
  /**
   * Description of the team
   */
  description?: string;
  
  /**
   * URL to the team's avatar/logo
   */
  avatarUrl?: string;
  
  /**
   * ID of the team owner
   */
  ownerId: string;
  
  /**
   * Whether the team is active
   */
  isActive: boolean;
  
  /**
   * Team visibility: public, private, or hidden
   */
  visibility: TeamVisibility;
  
  /**
   * Maximum number of members allowed in the team (0 for unlimited)
   */
  memberLimit: number;
  
  /**
   * Timestamp when the team was created
   */
  createdAt: string;
  
  /**
   * Timestamp when the team was last updated
   */
  updatedAt: string;
  
  /**
   * Additional metadata for the team
   */
  metadata?: Record<string, any>;
}

/**
 * Team visibility enum
 */
export enum TeamVisibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  HIDDEN = 'hidden'
}

/**
 * Team member entity representing a user's membership in a team
 */
export interface TeamMember {
  /**
   * Unique identifier for the team member record
   */
  id: string;

  /**
   * ID of the team
   */
  teamId: string;
  
  /**
   * ID of the user
  */
  userId: string;

  /**
   * Full display name of the user
   */
  name?: string;

  /**
   * Email address of the user
   */
  email?: string;

  /**
   * URL of the user's avatar image (optional)
   */
  avatarUrl?: string | null;

  /**
   * Whether this member entry represents the current user
   */
  isCurrentUser?: boolean;

  /**
   * Whether the current user can remove this member
   */
  canRemove?: boolean;

  /**
   * Whether the current user can update this member's role
   */
  canUpdateRole?: boolean;
  
  /**
   * Role of the user in the team
   */
  role: string;
  
  /**
   * Whether the user is active in the team
   */
  isActive: boolean;
  
  /**
   * Timestamp when the user joined the team
   */
  joinedAt: string;
  
  /**
   * Timestamp when the user's role was last updated
   */
  updatedAt: string;
  
  /**
   * Additional metadata for the team member
   */
  metadata?: Record<string, any>;
}

/**
 * Team invitation entity representing an invitation to join a team
 */
export interface TeamInvitation {
  /**
   * Unique identifier for the invitation
   */
  id: string;
  
  /**
   * ID of the team
   */
  teamId: string;
  
  /**
   * Email of the invited user
   */
  email: string;
  
  /**
   * Role that will be assigned to the user upon acceptance
   */
  role: string;
  
  /**
   * ID of the user who sent the invitation
   */
  invitedBy: string;
  
  /**
   * Status of the invitation
   */
  status: InvitationStatus;
  
  /**
   * Timestamp when the invitation was created
   */
  createdAt: string;
  
  /**
   * Timestamp when the invitation expires
   */
  expiresAt: string;
  
  /**
   * Timestamp when the invitation was accepted or declined
   */
  respondedAt?: string;
  
  /**
   * Additional metadata for the invitation
   */
  metadata?: Record<string, any>;
}

/**
 * Invitation status enum
 */
export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  CANCELLED = 'cancelled',
  EXPIRED = 'expired'
}

/**
 * Payload for creating a new team
 */
export interface TeamCreatePayload {
  /**
   * Name of the team
   */
  name: string;
  
  /**
   * Description of the team (optional)
   */
  description?: string;
  
  /**
   * Team visibility (optional, defaults to PRIVATE)
   */
  visibility?: TeamVisibility;
  
  /**
   * Maximum number of members allowed (optional, defaults to 0 for unlimited)
   */
  memberLimit?: number;
  
  /**
   * Whether the team is public (optional)
   */
  isPublic?: boolean;

  /**
   * Team settings (optional)
   */
  settings?: Record<string, any>;

  /**
   * Additional metadata for the team (optional)
   */
  metadata?: Record<string, any>;
}

/**
 * Payload for updating a team
 */
export interface TeamUpdatePayload {
  /**
   * Name of the team (optional)
   */
  name?: string;
  
  /**
   * Description of the team (optional)
   */
  description?: string;
  
  /**
   * Team visibility (optional)
   */
  visibility?: TeamVisibility;
  
  /**
   * Maximum number of members allowed (optional)
   */
  memberLimit?: number;

  /**
   * Whether the team is public (optional)
   */
  isPublic?: boolean;

  /**
   * Team settings (optional)
   */
  settings?: Record<string, any>;
  
  /**
   * Additional metadata for the team (optional)
   */
  metadata?: Record<string, any>;
}

/**
 * Payload for updating a team member
 */
export interface TeamMemberUpdatePayload {
  /**
   * Role of the user in the team
   */
  role: string;
  
  /**
   * Whether the user is active in the team (optional)
   */
  isActive?: boolean;
  
  /**
   * Additional metadata for the team member (optional)
   */
  metadata?: Record<string, any>;
}

/**
 * Payload for inviting a user to a team
 */
export interface TeamInvitationPayload {
  /**
   * Email of the user to invite
   */
  email: string;
  
  /**
   * Role to assign to the user upon acceptance
   */
  role: string;
  
  /**
   * Custom message to include in the invitation (optional)
   */
  message?: string;
  
  /**
   * Expiration time in hours (optional, defaults to 48)
   */
  expirationHours?: number;

  /**
   * ID of the user sending the invitation (optional)
   */
  invitedBy?: string;

  /**
   * Explicit expiration date for the invitation (optional)
   */
  expiresAt?: Date;
}

/**
 * Result of a team operation
 */
export interface TeamResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Team data if the operation was successful
   */
  team?: Team;
  
  /**
   * Error message if the operation failed
   */
  error?: string;
}

/**
 * Result of a team member operation
 */
export interface TeamMemberResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Team member data if the operation was successful
   */
  member?: TeamMember;
  
  /**
   * Error message if the operation failed
   */
  error?: string;
}

/**
 * Result of a team invitation operation
 */
export interface TeamInvitationResult {
  /**
   * Whether the operation was successful
   */
  success: boolean;
  
  /**
   * Invitation data if the operation was successful
   */
  invitation?: TeamInvitation;
  
  /**
   * Error message if the operation failed
   */
  error?: string;
}

/**
 * Parameters for searching teams
 */
export interface TeamSearchParams {
  /**
   * Search query (searches across name, description)
   */
  query?: string;
  
  /**
   * Filter by visibility
   */
  visibility?: TeamVisibility;
  
  /**
   * Filter by owner ID
   */
  ownerId?: string;
  
  /**
   * Filter by member ID (teams that have this member)
   */
  memberId?: string;
  
  /**
   * Filter by active status
   */
  isActive?: boolean;
  
  /**
   * Sort by field
   */
  sortBy?: 'name' | 'createdAt' | 'memberCount';
  
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
 * Result of a team search operation
 */
export interface TeamSearchResult {
  /**
   * List of teams matching the search criteria
   */
  teams: Team[];
  
  /**
   * Total number of teams matching the search criteria
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
export const teamNameSchema = z.string().min(1, 'Team name is required').max(100, 'Team name must be at most 100 characters');
export const teamDescriptionSchema = z.string().max(500, 'Team description must be at most 500 characters').optional();

export const teamCreateSchema = z.object({
  name: teamNameSchema,
  description: teamDescriptionSchema,
  visibility: z.nativeEnum(TeamVisibility).optional(),
  memberLimit: z.number().min(0).optional(),
  metadata: z.record(z.any()).optional(),
});

export const teamUpdateSchema = z.object({
  name: teamNameSchema.optional(),
  description: teamDescriptionSchema,
  visibility: z.nativeEnum(TeamVisibility).optional(),
  memberLimit: z.number().min(0).optional(),
  metadata: z.record(z.any()).optional(),
});

export const teamMemberUpdateSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  isActive: z.boolean().optional(),
  metadata: z.record(z.any()).optional(),
});

export const teamInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.string().min(1, 'Role is required'),
  message: z.string().max(500, 'Message must be at most 500 characters').optional(),
  expirationHours: z.number().min(1).max(168).optional(), // 1 hour to 7 days
});

// Type inference from schemas
export type TeamCreateData = z.infer<typeof teamCreateSchema>;
export type TeamUpdateData = z.infer<typeof teamUpdateSchema>;
export type TeamMemberUpdateData = z.infer<typeof teamMemberUpdateSchema>;
export type TeamInvitationData = z.infer<typeof teamInvitationSchema>;
