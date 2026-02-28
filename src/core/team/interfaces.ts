/**
 * Team Management Service Interface
 * 
 * This file defines the core interfaces for the team management domain.
 * Following the interface-first design principle, these interfaces define
 * the contract that any implementation must fulfill.
 */

import { 
  Team, 
  TeamMember, 
  TeamInvitation, 
  TeamCreatePayload, 
  TeamUpdatePayload,
  TeamMemberUpdatePayload,
  TeamInvitationPayload,
  TeamResult,
  TeamMemberResult,
  TeamInvitationResult,
  TeamSearchParams,
  TeamSearchResult
} from './models';

/**
 * Core team management service interface
 *
 * This interface defines all team management operations that can be performed.
 * Any implementation of this interface must provide all these methods.
 *
 * **Error handling:**
 * Operations resolving to objects will include an `error` property when the
 * action cannot be completed because of business rules. Unexpected failures
 * should cause the returned promise to be rejected.
 */
export interface TeamService {
  /**
   * Create a new team
   * 
   * @param ownerId ID of the user creating the team (will be the owner)
   * @param teamData Team creation data including name, description, etc.
   * @returns Result object with success status and created team or error
   */
  createTeam(ownerId: string, teamData: TeamCreatePayload): Promise<TeamResult>;
  
  /**
   * Get a team by ID
   * 
   * @param teamId ID of the team to fetch
   * @returns Team data or null if not found
   */
  getTeam(teamId: string): Promise<Team | null>;
  
  /**
   * Update a team's information
   * 
   * @param teamId ID of the team to update
   * @param teamData Updated team data
   * @returns Result object with success status and updated team or error
   */
  updateTeam(teamId: string, teamData: TeamUpdatePayload): Promise<TeamResult>;
  
  /**
   * Delete a team
   * 
   * @param teamId ID of the team to delete
   * @returns Result object with success status or error
   */
  deleteTeam(teamId: string): Promise<{ success: boolean; error?: string }>;
  
  /**
   * Get all teams that a user belongs to
   * 
   * @param userId ID of the user
   * @returns Array of teams the user belongs to
   */
  getUserTeams(userId: string): Promise<Team[]>;
  
  /**
   * Get all members of a team
   * 
   * @param teamId ID of the team
   * @returns Array of team members
   */
  getTeamMembers(teamId: string): Promise<TeamMember[]>;

  /**
   * Get a single team member by their record ID
   * 
   * @param memberId ID of the team member record
   * @returns Team member data or null if not found
   */
  getTeamMemberById(memberId: string): Promise<TeamMember | null>;
  
  /**
   * Add a user to a team
   * 
   * @param teamId ID of the team
   * @param userId ID of the user to add
   * @param role Role to assign to the user
   * @returns Result object with success status and team member data or error
   */
  addTeamMember(teamId: string, userId: string, role: string): Promise<TeamMemberResult>;
  
  /**
   * Update a team member's role
   * 
   * @param teamId ID of the team
   * @param userId ID of the user to update
   * @param updateData Updated member data including role
   * @returns Result object with success status and updated team member data or error
   */
  updateTeamMember(teamId: string, userId: string, updateData: TeamMemberUpdatePayload): Promise<TeamMemberResult>;
  
  /**
   * Remove a user from a team
   * 
   * @param teamId ID of the team
   * @param userId ID of the user to remove
   * @returns Result object with success status or error
   */
  removeTeamMember(teamId: string, userId: string): Promise<{ success: boolean; error?: string }>;
  
  /**
   * Transfer team ownership to another user
   * 
   * @param teamId ID of the team
   * @param newOwnerId ID of the user to transfer ownership to
   * @returns Result object with success status and updated team or error
   */
  transferOwnership(teamId: string, newOwnerId: string): Promise<TeamResult>;
  
  /**
   * Invite a user to join a team
   * 
   * @param teamId ID of the team
   * @param invitationData Invitation data including email and role
   * @returns Result object with success status and invitation data or error
   */
  inviteToTeam(teamId: string, invitationData: TeamInvitationPayload): Promise<TeamInvitationResult>;
  
  /**
   * Get all pending invitations for a team
   * 
   * @param teamId ID of the team
   * @returns Array of pending invitations
   */
  getTeamInvitations(teamId: string): Promise<TeamInvitation[]>;
  
  /**
   * Get all invitations for a user (by email)
   * 
   * @param email Email of the user
   * @returns Array of invitations for the user
   */
  getUserInvitations(email: string): Promise<TeamInvitation[]>;
  
  /**
   * Accept a team invitation
   * 
   * @param invitationId ID of the invitation to accept
   * @param userId ID of the user accepting the invitation
   * @returns Result object with success status and team member data or error
   */
  acceptInvitation(invitationId: string, userId: string): Promise<TeamMemberResult>;
  
  /**
   * Decline a team invitation
   * 
   * @param invitationId ID of the invitation to decline
   * @returns Result object with success status or error
   */
  declineInvitation(invitationId: string): Promise<{ success: boolean; error?: string }>;
  
  /**
   * Cancel a pending invitation
   * 
   * @param invitationId ID of the invitation to cancel
   * @returns Result object with success status or error
   */
  cancelInvitation(invitationId: string): Promise<{ success: boolean; error?: string }>;
  
  /**
   * Search for teams based on search parameters
   * 
   * @param params Search parameters
   * @returns Search results with pagination
   */
  searchTeams(params: TeamSearchParams): Promise<TeamSearchResult>;
  
  /**
   * Check if a user is a member of a team
   * 
   * @param teamId ID of the team
   * @param userId ID of the user
   * @returns True if the user is a member of the team, false otherwise
   */
  isTeamMember(teamId: string, userId: string): Promise<boolean>;
  
  /**
   * Check if a user has a specific role in a team
   * 
   * @param teamId ID of the team
   * @param userId ID of the user
   * @param role Role to check for
   * @returns True if the user has the specified role, false otherwise
   */
  hasTeamRole(teamId: string, userId: string, role: string): Promise<boolean>;
  
  /**
   * Get license/seat info for a user's team membership
   * 
   * @param userId ID of the user
   * @returns License info with total and used seats, or null if no license found
   */
  getTeamLicenseInfo(userId: string): Promise<{ totalSeats: number; usedSeats: number } | null>;
  
  /**
   * Subscribe to team changes
   * 
   * @param callback Function to call when a team changes
   * @returns Unsubscribe function
   */
  onTeamChanged(callback: (team: Team) => void): () => void;
  
  /**
   * Subscribe to team membership changes
   * 
   * @param callback Function to call when team membership changes
   * @returns Unsubscribe function
   */
  onTeamMembershipChanged(callback: (teamId: string, members: TeamMember[]) => void): () => void;
}

/**
 * Team management state interface
 * 
 * This interface defines the team management state that can be observed.
 */
export interface TeamState {
  /**
   * Current user's teams or null if not loaded
   */
  teams: Team[] | null;
  
  /**
   * Currently selected team or null if none selected
   */
  currentTeam: Team | null;
  
  /**
   * Members of the currently selected team or null if not loaded
   */
  teamMembers: TeamMember[] | null;
  
  /**
   * Pending invitations for the currently selected team or null if not loaded
   */
  teamInvitations: TeamInvitation[] | null;
  
  /**
   * Invitations for the current user or null if not loaded
   */
  userInvitations: TeamInvitation[] | null;
  
  /**
   * True if team operations are in progress
   */
  isLoading: boolean;
  
  /**
   * Error message if a team operation failed
   */
  error: string | null;
  
  /**
   * Success message after a successful operation
   */
  successMessage: string | null;
}
