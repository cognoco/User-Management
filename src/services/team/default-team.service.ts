/**
 * Default Team Service Implementation
 * 
 * This file implements the TeamService interface defined in the core layer.
 * It provides the default implementation for team management operations.
 */

import {
  TeamService
} from '@/core/team/interfaces';
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
} from '@/core/team/models';
import { TeamEventType } from '@/core/team/events';
import type { ITeamDataProvider as TeamDataProvider } from '@/core/team/ITeamDataProvider';
import { translateError } from '@/lib/utils/error';
import { TypedEventEmitter } from '@/lib/utils/typed-event-emitter';
import { MemoryCache } from '@/lib/cache';
import { prisma } from '@/lib/database/prisma';
import { handleServiceError } from '@/services/common/service-error-handler';
import { ERROR_CODES } from '@/core/common/error-codes';

/**
 * Default implementation of the TeamService interface
 */
export class DefaultTeamService
  extends TypedEventEmitter<TeamEventType>
  implements TeamService
{
  private static teamCache = new MemoryCache<string, Team | null>({ ttl: 30_000 });
  private static memberCache = new MemoryCache<string, TeamMember[]>({ ttl: 30_000 });
  
  /**
   * Constructor for DefaultTeamService
   *
   * @param teamDataProvider - The data provider for team operations
   */
  constructor(private teamDataProvider: TeamDataProvider) {
    super();
  }

  /**
   * Emit a team event
   * 
   * @param event - The event to emit
   */
  private emitEvent(event: TeamEventType): void {
    this.emit(event);
  }

  /**
   * Create a new team
   * 
   * @param ownerId - ID of the user creating the team (will be the owner)
   * @param teamData - Team creation data including name, description, etc.
   * @returns Result object with success status and created team or error
   */
  async createTeam(ownerId: string, teamData: TeamCreatePayload): Promise<TeamResult> {
    try {
      const result = await this.teamDataProvider.createTeam(ownerId, teamData);

      if (!result.success || !result.team) {
        return result;
      }

      const team = result.team;
      
      // Emit team created event
      this.emitEvent({
        type: 'team_created',
        timestamp: Date.now(),
        team,
        createdBy: ownerId
      });
      
      return {
        success: true,
        team
      };
    } catch (error: any) {
      const errorMessage = translateError(error, { defaultMessage: 'Failed to create team' });
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Get a team by ID
   * 
   * @param teamId - ID of the team to fetch
   * @returns Team data or null if not found
   */
  async getTeam(teamId: string): Promise<Team | null> {
    try {
      return await DefaultTeamService.teamCache.getOrCreate(teamId, () =>
        this.teamDataProvider.getTeam(teamId)
      );
    } catch (error) {
      const { error: err } = handleServiceError(error, {
        service: 'DefaultTeamService',
        method: 'getTeam',
        resourceType: 'team',
        resourceId: teamId,
      }, ERROR_CODES.TEAM_NOT_FOUND);
      DefaultTeamService.teamCache.delete(teamId);
      throw err;
    }
  }
  
  /**
   * Update a team's information
   * 
   * @param teamId - ID of the team to update
   * @param teamData - Updated team data
   * @returns Result object with success status and updated team or error
   */
  async updateTeam(teamId: string, teamData: TeamUpdatePayload): Promise<TeamResult> {
    try {
      const result = await this.teamDataProvider.updateTeam(teamId, teamData);

      if (!result.success || !result.team) {
        return result;
      }

      const team = result.team;
      
      // Emit team updated event
      this.emitEvent({
        type: 'team_updated',
        timestamp: Date.now(),
        teamId,
        team,
        updatedBy: team.ownerId, // Assuming the owner is making the update
        updatedFields: Object.keys(teamData)
      });

      DefaultTeamService.teamCache.set(teamId, team);
      
      // If visibility was updated, emit a specific event for that
      if (teamData.visibility) {
        const previousTeam = await this.getTeam(teamId);
        if (previousTeam && previousTeam.visibility !== teamData.visibility) {
          this.emitEvent({
            type: 'team_visibility_changed',
            timestamp: Date.now(),
            teamId,
            previousVisibility: previousTeam.visibility,
            newVisibility: teamData.visibility,
            changedBy: team.ownerId // Assuming the owner is making the update
          });
        }
      }
      
      return {
        success: true,
        team
      };
    } catch (error: any) {
      const errorMessage = translateError(error, { defaultMessage: 'Failed to update team' });
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Delete a team
   * 
   * @param teamId - ID of the team to delete
   * @returns Result object with success status or error
   */
  async deleteTeam(teamId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the team before deleting to know who the owner is
      const team = await this.getTeam(teamId);
      if (!team) {
        return {
          success: false,
          error: 'Team not found'
        };
      }
      
      const deleteResult = await this.teamDataProvider.deleteTeam(teamId);

      if (!deleteResult.success) {
        return deleteResult;
      }
      
      // Emit team deleted event
      this.emitEvent({
        type: 'team_deleted',
        timestamp: Date.now(),
        teamId,
        deletedBy: team.ownerId // Assuming the owner is deleting the team
      });

      DefaultTeamService.teamCache.delete(teamId);
      DefaultTeamService.memberCache.delete(teamId);

      return { success: true };
    } catch (error: any) {
      const errorMessage = translateError(error, { defaultMessage: 'Failed to delete team' });
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Get all teams that a user belongs to
   * 
   * @param userId - ID of the user
   * @returns Array of teams the user belongs to
   */
  async getUserTeams(userId: string): Promise<Team[]> {
    try {
      return await this.teamDataProvider.getUserTeams(userId);
    } catch (error) {
      console.error('Error fetching user teams:', error);
      return [];
    }
  }
  
  /**
   * Get all members of a team
   * 
   * @param teamId - ID of the team
   * @returns Array of team members
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    try {
      return await DefaultTeamService.memberCache.getOrCreate(teamId, () =>
        this.teamDataProvider.getTeamMembers(teamId)
      );
    } catch (error) {
      console.error('Error fetching team members:', error);
      DefaultTeamService.memberCache.delete(teamId);
      return [];
    }
  }
  
  /**
   * Get a single team member by their record ID
   */
  async getTeamMemberById(memberId: string): Promise<TeamMember | null> {
    try {
      const row = await prisma.team_members.findUnique({
        where: { id: memberId },
      });
      if (!row) return null;
      return {
        id: row.id,
        teamId: row.team_license_id,
        userId: row.user_id,
        role: row.role,
        isActive: row.status === 'active',
        joinedAt: row.created_at.toISOString(),
        updatedAt: row.updated_at.toISOString(),
      };
    } catch (error) {
      console.error('Error fetching team member by ID:', error);
      return null;
    }
  }

  /**
   * Add a user to a team
   * 
   * @param teamId - ID of the team
   * @param userId - ID of the user to add
   * @param role - Role to assign to the user
   * @returns Result object with success status and team member data or error
   */
  async addTeamMember(teamId: string, userId: string, role: string): Promise<TeamMemberResult> {
    try {
      const license = await (prisma as any).team_licenses.findUnique({
        where: { id: teamId },
        select: { usedSeats: true, totalSeats: true },
      });

      if (license && license.usedSeats >= license.totalSeats) {
        return {
          success: false,
          error: "You have reached your plan's seat limit. Please upgrade your plan or remove an existing member.",
        };
      }

      const result = await this.teamDataProvider.addTeamMember(teamId, userId, role);

      if (!result.success || !result.member) {
        return result;
      }

      const member = result.member;
      
      // Get the team to know who the owner is
      const team = await this.getTeam(teamId);
      
      // Emit team member added event
      this.emitEvent({
        type: 'team_member_added',
        timestamp: Date.now(),
        teamId,
        member,
        addedBy: team?.ownerId || userId // If we can't get the team, assume the user added themselves
      });

      await (prisma as any).team_licenses.update({
        where: { id: teamId },
        data: { usedSeats: { increment: 1 } },
      });

      DefaultTeamService.memberCache.delete(teamId);

      return {
        success: true,
        member
      };
    } catch (error: any) {
      const errorMessage = translateError(error, { defaultMessage: 'Failed to add team member' });
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Update a team member's role
   * 
   * @param teamId - ID of the team
   * @param userId - ID of the user to update
   * @param updateData - Updated member data including role
   * @returns Result object with success status and updated team member data or error
   */
  async updateTeamMember(teamId: string, userId: string, updateData: TeamMemberUpdatePayload): Promise<TeamMemberResult> {
    try {
      // Get the current member to know their previous role
      const members = await this.getTeamMembers(teamId);
      const currentMember = members.find(m => m.userId === userId);
      
      if (!currentMember) {
        return {
          success: false,
          error: 'Team member not found'
        };
      }
      
      const previousRole = currentMember.role;
      
      const result = await this.teamDataProvider.updateTeamMember(teamId, userId, updateData);

      if (!result.success || !result.member) {
        return result;
      }

      const member = result.member;
      
      // Get the team to know who the owner is
      const team = await this.getTeam(teamId);
      
      // If the role was changed, emit a specific event for that
      if (updateData.role && updateData.role !== previousRole) {
        this.emitEvent({
          type: 'team_member_role_changed',
          timestamp: Date.now(),
          teamId,
          userId,
          previousRole,
          newRole: updateData.role,
          changedBy: team?.ownerId || userId // If we can't get the team, assume the user changed their own role
        });
      }

      DefaultTeamService.memberCache.delete(teamId);

      return {
        success: true,
        member
      };
    } catch (error: any) {
      const errorMessage = translateError(error, { defaultMessage: 'Failed to update team member' });
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Remove a user from a team
   * 
   * @param teamId - ID of the team
   * @param userId - ID of the user to remove
   * @returns Result object with success status or error
   */
  async removeTeamMember(teamId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get the team to know who the owner is
      const team = await this.getTeam(teamId);
      
      const result = await this.teamDataProvider.removeTeamMember(teamId, userId);

      if (!result.success) {
        return result;
      }
      
      // Emit team member removed event
      this.emitEvent({
        type: 'team_member_removed',
        timestamp: Date.now(),
        teamId,
        userId,
        removedBy: team?.ownerId || userId // If we can't get the team, assume the user removed themselves
      });

      DefaultTeamService.memberCache.delete(teamId);

      return { success: true };
    } catch (error: any) {
      const errorMessage = translateError(error, { defaultMessage: 'Failed to remove team member' });
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Transfer team ownership to another user
   * 
   * @param teamId - ID of the team
   * @param newOwnerId - ID of the user to transfer ownership to
   * @returns Result object with success status and updated team or error
   */
  async transferOwnership(teamId: string, newOwnerId: string): Promise<TeamResult> {
    try {
      // Get the team to know who the current owner is
      const team = await this.getTeam(teamId);
      
      if (!team) {
        return {
          success: false,
          error: 'Team not found'
        };
      }
      
      const previousOwnerId = team.ownerId;
      
      const result = await this.teamDataProvider.transferOwnership(teamId, newOwnerId);

      if (!result.success || !result.team) {
        return result;
      }

      const updatedTeam = result.team;
      
      // Emit team ownership transferred event
      this.emitEvent({
        type: 'team_ownership_transferred',
        timestamp: Date.now(),
        teamId,
        previousOwnerId,
        newOwnerId,
        initiatedBy: previousOwnerId // Assuming the current owner is initiating the transfer
      });

      DefaultTeamService.teamCache.set(teamId, updatedTeam);
      DefaultTeamService.memberCache.delete(teamId);

      return {
        success: true,
        team: updatedTeam
      };
    } catch (error: any) {
      const errorMessage = translateError(error, { defaultMessage: 'Failed to transfer team ownership' });
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Invite a user to join a team
   * 
   * @param teamId - ID of the team
   * @param invitationData - Invitation data including email and role
   * @returns Result object with success status and invitation data or error
   */
  async inviteToTeam(teamId: string, invitationData: TeamInvitationPayload): Promise<TeamInvitationResult> {
    try {
      const license = await (prisma as any).team_licenses.findUnique({
        where: { id: teamId },
        select: { usedSeats: true, totalSeats: true },
      });

      if (license && license.usedSeats >= license.totalSeats) {
        return {
          success: false,
          error: "You have reached your plan's seat limit. Please upgrade your plan or remove an existing member.",
        };
      }

      // Get the team to know who the owner is
      const team = await this.getTeam(teamId);
      
      if (!team) {
        return {
          success: false,
          error: 'Team not found'
        };
      }
      
      const result = await this.teamDataProvider.inviteToTeam(teamId, invitationData);

      if (!result.success || !result.invitation) {
        return result;
      }

      const invitation = result.invitation;
      
      // Emit team invitation created event
      this.emitEvent({
        type: 'team_invitation_created',
        timestamp: Date.now(),
        invitation,
        invitedBy: team.ownerId // Assuming the owner is sending the invitation
      });

      await (prisma as any).team_licenses.update({
        where: { id: teamId },
        data: { usedSeats: { increment: 1 } },
      });

      return {
        success: true,
        invitation
      };
    } catch (error: any) {
      const errorMessage = translateError(error, { defaultMessage: 'Failed to invite user to team' });
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Get license/seat info for a user's team membership
   */
  async getTeamLicenseInfo(userId: string): Promise<{ totalSeats: number; usedSeats: number } | null> {
    try {
      const membership = await prisma.team_members.findFirst({
        where: { user_id: userId },
        select: { team_license_id: true },
      });

      if (!membership?.team_license_id) return null;

      const license = await prisma.team_licenses.findUnique({
        where: { id: membership.team_license_id },
        select: { total_seats: true, used_seats: true },
      });

      if (!license) return null;

      return {
        totalSeats: license.total_seats,
        usedSeats: license.used_seats,
      };
    } catch (error) {
      console.error('Error fetching team license info:', error);
      return null;
    }
  }

  /**
   * Get all pending invitations for a team
   * 
   * @param teamId - ID of the team
   * @returns Array of pending invitations
   */
  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
    try {
      return await this.teamDataProvider.getTeamInvitations(teamId);
    } catch (error) {
      console.error('Error fetching team invitations:', error);
      return [];
    }
  }
  
  /**
   * Get all invitations for a user (by email)
   * 
   * @param email - Email of the user
   * @returns Array of invitations for the user
   */
  async getUserInvitations(email: string): Promise<TeamInvitation[]> {
    try {
      return await this.teamDataProvider.getUserInvitations(email);
    } catch (error) {
      console.error('Error fetching user invitations:', error);
      return [];
    }
  }
  
  /**
   * Accept a team invitation
   * 
   * @param invitationId - ID of the invitation to accept
   * @param userId - ID of the user accepting the invitation
   * @returns Result object with success status and team member data or error
   */
  async acceptInvitation(invitationId: string, userId: string): Promise<TeamMemberResult> {
    try {
      const result = await this.teamDataProvider.acceptInvitation(invitationId, userId);

      if (!result.success || !result.member) {
        return result;
      }

      const member = result.member;
      
      // Emit team invitation accepted event
      this.emitEvent({
        type: 'team_invitation_accepted',
        timestamp: Date.now(),
        invitationId,
        teamId: member.teamId,
        userId,
        role: member.role
      });
      
      return {
        success: true,
        member
      };
    } catch (error: any) {
      const errorMessage = translateError(error, { defaultMessage: 'Failed to accept invitation' });
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Decline a team invitation
   * 
   * @param invitationId - ID of the invitation to decline
   * @returns Result object with success status or error
   */
  async declineInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.teamDataProvider.declineInvitation(invitationId);

      if (!result.success) {
        return result;
      }

      this.emitEvent({
        type: 'team_invitation_declined',
        timestamp: Date.now(),
        invitationId,
        teamId: '',
        email: ''
      });

      return { success: true };
    } catch (error: any) {
      const errorMessage = translateError(error, { defaultMessage: 'Failed to decline invitation' });
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Cancel a pending invitation
   * 
   * @param invitationId - ID of the invitation to cancel
   * @returns Result object with success status or error
   */
  async cancelInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const result = await this.teamDataProvider.cancelInvitation(invitationId);

      if (!result.success) {
        return result;
      }

      this.emitEvent({
        type: 'team_invitation_cancelled',
        timestamp: Date.now(),
        invitationId,
        teamId: '',
        email: '',
        cancelledBy: ''
      });

      return { success: true };
    } catch (error: any) {
      const errorMessage = translateError(error, { defaultMessage: 'Failed to cancel invitation' });
      return {
        success: false,
        error: errorMessage
      };
    }
  }
  
  /**
   * Search for teams based on search parameters
   * 
   * @param params - Search parameters
   * @returns Search results with pagination
   */
  async searchTeams(params: TeamSearchParams): Promise<TeamSearchResult> {
    try {
      // Build query parameters
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
      
      return await this.teamDataProvider.searchTeams(params);
    } catch (error: any) {
      // Return empty result on error
      return {
        teams: [],
        total: 0,
        page: params.page || 1,
        limit: params.limit || 10,
        totalPages: 0
      };
    }
  }
  
  /**
   * Check if a user is a member of a team
   * 
   * @param teamId - ID of the team
   * @param userId - ID of the user
   * @returns True if the user is a member of the team, false otherwise
   */
  async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    try {
      const members = await this.getTeamMembers(teamId);
      return members.some(member => member.userId === userId && member.isActive);
    } catch (error) {
      console.error('Error checking team membership:', error);
      return false;
    }
  }
  
  /**
   * Check if a user has a specific role in a team
   * 
   * @param teamId - ID of the team
   * @param userId - ID of the user
   * @param role - Role to check for
   * @returns True if the user has the specified role, false otherwise
   */
  async hasTeamRole(teamId: string, userId: string, role: string): Promise<boolean> {
    try {
      const members = await this.getTeamMembers(teamId);
      return members.some(member => 
        member.userId === userId && 
        member.role === role && 
        member.isActive
      );
    } catch (error) {
      console.error('Error checking team role:', error);
      return false;
    }
  }
  
  /**
   * Subscribe to team changes
   * 
   * @param callback - Function to call when a team changes
   * @returns Unsubscribe function
   */
  onTeamChanged(callback: (team: Team) => void): () => void {
    return this.on(event => {
      if (event.type === 'team_created' || event.type === 'team_updated') {
        callback(event.team);
      }
    });
  }
  
  /**
   * Subscribe to team membership changes
   * 
   * @param callback - Function to call when team membership changes
   * @returns Unsubscribe function
   */
  onTeamMembershipChanged(callback: (teamId: string, members: TeamMember[]) => void): () => void {
    return this.on(async event => {
      if (
        event.type === 'team_member_added' ||
        event.type === 'team_member_role_changed' ||
        event.type === 'team_member_removed'
      ) {
        const members = await this.getTeamMembers(event.teamId);
        callback(event.teamId, members);
      }
    });
  }
}
