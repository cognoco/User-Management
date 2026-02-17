/**
 * Supabase Team Provider Implementation
 * 
 * This file implements the TeamDataProvider interface using Supabase.
 * It adapts Supabase's database API to the interface required by our core business logic.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
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

import type { ITeamDataProvider } from '@/core/team/ITeamDataProvider';


/**
 * Supabase implementation of the TeamDataProvider interface
 */
export class SupabaseTeamProvider implements ITeamDataProvider {
  private supabase: SupabaseClient;
  private teamCallbacks: ((team: Team) => void)[] = [];
  private membershipCallbacks: ((teamId: string, members: TeamMember[]) => void)[] = [];
  
  /**
   * Create a new SupabaseTeamProvider instance
   * 
   * @param supabaseUrl Supabase project URL
   * @param supabaseKey Supabase API key
   */
  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
    
    // Set up realtime subscription for team changes
    // This would require setting up Supabase realtime subscriptions
  }
  
  /**
   * Create a new team
   * 
   * @param ownerId ID of the user creating the team (will be the owner)
   * @param teamData Team creation data including name, description, etc.
   * @returns Result object with success status and created team or error
   */
  async createTeam(ownerId: string, teamData: TeamCreatePayload): Promise<TeamResult> {
    try {
      // Insert the team record
    const { data: createdTeam, error: teamError } = await this.supabase
        .from('teams')
        .insert({
          name: teamData.name,
          description: teamData.description,
          owner_id: ownerId,
          is_public: teamData.isPublic || false,
          settings: teamData.settings || {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (teamError) {
        return {
          success: false,
          error: teamError.message
        };
      }
      
      const team = this.mapDbTeamToTeam(createdTeam);
      
      // Add the owner as a team member with the owner role
      await this.addTeamMember(team.id, ownerId, 'owner');
      
      // Notify subscribers
      this.notifyTeamChanged(team);
      
      return {
        success: true,
        team
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while creating team'
      };
    }
  }
  
  /**
   * Get a team by ID
   * 
   * @param teamId ID of the team to fetch
   * @returns Team data or null if not found
   */
  async getTeam(teamId: string): Promise<Team | null> {
    const { data, error } = await this.supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single();
    
    if (error || !data) {
      return null;
    }
    
    return this.mapDbTeamToTeam(data);
  }
  
  /**
   * Update a team's information
   * 
   * @param teamId ID of the team to update
   * @param teamData Updated team data
   * @returns Result object with success status and updated team or error
   */
  async updateTeam(teamId: string, teamData: TeamUpdatePayload): Promise<TeamResult> {
    try {
      const { data, error } = await this.supabase
        .from('teams')
        .update({
          name: teamData.name,
          description: teamData.description,
          is_public: teamData.isPublic,
          settings: teamData.settings,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId)
        .select()
        .single();
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      const team = this.mapDbTeamToTeam(data);
      
      // Notify subscribers
      this.notifyTeamChanged(team);
      
      return {
        success: true,
        team
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while updating team'
      };
    }
  }
  
  /**
   * Delete a team
   * 
   * @param teamId ID of the team to delete
   * @returns Result object with success status or error
   */
  async deleteTeam(teamId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Delete team members first (foreign key constraint)
      await this.supabase
        .from('team_members')
        .delete()
        .eq('team_license_id', teamId);
      
      // Delete team invitations (foreign key constraint)
      await this.supabase
        .from('team_invitations')
        .delete()
        .eq('team_license_id', teamId);
      
      // Delete the team
      const { error } = await this.supabase
        .from('teams')
        .delete()
        .eq('id', teamId);
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while deleting team'
      };
    }
  }
  
  /**
   * Get all teams that a user belongs to
   * 
   * @param userId ID of the user
   * @returns Array of teams the user belongs to
   */
  async getUserTeams(userId: string): Promise<Team[]> {
    const { data, error } = await this.supabase
      .from('team_members')
      .select('team_id')
      .eq('user_id', userId);
    
    if (error || !data || data.length === 0) {
      return [];
    }
    
    const teamIds = data.map(item => item.team_id);
    
    const { data: teamsData, error: teamsError } = await this.supabase
      .from('teams')
      .select('*')
      .in('id', teamIds);
    
    if (teamsError || !teamsData) {
      return [];
    }
    
    return teamsData.map(this.mapDbTeamToTeam);
  }
  
  /**
   * Get all members of a team
   * 
   * @param teamId ID of the team
   * @returns Array of team members
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const { data, error } = await this.supabase
      .from('team_members')
      .select('*, profiles(first_name, last_name, avatar_url)')
      .eq('team_license_id', teamId);
    
    if (error || !data) {
      return [];
    }
    
    return data.map(this.mapDbMemberToTeamMember);
  }
  
  /**
   * Add a user to a team
   * 
   * @param teamId ID of the team
   * @param userId ID of the user to add
   * @param role Role to assign to the user
   * @returns Result object with success status and team member data or error
   */
  async addTeamMember(teamId: string, userId: string, role: string): Promise<TeamMemberResult> {
    try {
      const { data, error } = await this.supabase
        .from('team_members')
        .insert({
          team_license_id: teamId,
          user_id: userId,
          role,
          joined_at: new Date().toISOString()
        })
        .select('*, profiles(first_name, last_name, avatar_url)')
        .single();
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      const member = this.mapDbMemberToTeamMember(data);
      
      // Get all team members to notify subscribers
      const members = await this.getTeamMembers(teamId);
      this.notifyTeamMembershipChanged(teamId, members);
      
      return {
        success: true,
        member
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while adding team member'
      };
    }
  }
  
  /**
   * Update a team member's role
   * 
   * @param teamId ID of the team
   * @param userId ID of the user to update
   * @param updateData Updated member data including role
   * @returns Result object with success status and updated team member data or error
   */
  async updateTeamMember(teamId: string, userId: string, updateData: TeamMemberUpdatePayload): Promise<TeamMemberResult> {
    try {
      const { data, error } = await this.supabase
        .from('team_members')
        .update({
          role: updateData.role,
          updated_at: new Date().toISOString()
        })
        .eq('team_license_id', teamId)
        .eq('user_id', userId)
        .select('*, profiles(first_name, last_name, avatar_url)')
        .single();
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      const member = this.mapDbMemberToTeamMember(data);
      
      // Get all team members to notify subscribers
      const members = await this.getTeamMembers(teamId);
      this.notifyTeamMembershipChanged(teamId, members);
      
      return {
        success: true,
        member
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while updating team member'
      };
    }
  }
  
  /**
   * Remove a user from a team
   * 
   * @param teamId ID of the team
   * @param userId ID of the user to remove
   * @returns Result object with success status or error
   */
  async removeTeamMember(teamId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('team_members')
        .delete()
        .eq('team_license_id', teamId)
        .eq('user_id', userId);
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      // Get all team members to notify subscribers
      const members = await this.getTeamMembers(teamId);
      this.notifyTeamMembershipChanged(teamId, members);
      
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while removing team member'
      };
    }
  }
  
  /**
   * Transfer team ownership to another user
   * 
   * @param teamId ID of the team
   * @param newOwnerId ID of the user to transfer ownership to
   * @returns Result object with success status and updated team or error
   */
  async transferOwnership(teamId: string, newOwnerId: string): Promise<TeamResult> {
    try {
      // Update the team owner
      const { data, error } = await this.supabase
        .from('teams')
        .update({
          owner_id: newOwnerId,
          updated_at: new Date().toISOString()
        })
        .eq('id', teamId)
        .select()
        .single();
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      // Update the new owner's role to 'owner'
      await this.updateTeamMember(teamId, newOwnerId, { role: 'owner' });
      
      const team = this.mapDbTeamToTeam(data);
      
      // Notify subscribers
      this.notifyTeamChanged(team);
      
      return {
        success: true,
        team
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while transferring ownership'
      };
    }
  }
  
  /**
   * Invite a user to join a team
   * 
   * @param teamId ID of the team
   * @param invitationData Invitation data including email and role
   * @returns Result object with success status and invitation data or error
   */
  async inviteToTeam(teamId: string, invitationData: TeamInvitationPayload): Promise<TeamInvitationResult> {
    try {
      const { data, error } = await this.supabase
        .from('team_invitations')
        .insert({
          team_license_id: teamId,
          email: invitationData.email,
          role: invitationData.role,
          invited_by: invitationData.invitedBy,
          expires_at: invitationData.expiresAt?.toISOString(),
          created_at: new Date().toISOString()
        })
        .select('*, teams(name)')
        .single();
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      const invitation = this.mapDbInvitationToTeamInvitation(data);
      
      return {
        success: true,
        invitation
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while inviting to team'
      };
    }
  }
  
  /**
   * Get all pending invitations for a team
   * 
   * @param teamId ID of the team
   * @returns Array of pending invitations
   */
  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
    const { data, error } = await this.supabase
      .from('team_invitations')
      .select('*, teams(name)')
      .eq('team_license_id', teamId)
      .is('accepted_at', null)
      .is('declined_at', null);
    
    if (error || !data) {
      return [];
    }
    
    return data.map(this.mapDbInvitationToTeamInvitation);
  }
  
  /**
   * Get all invitations for a user (by email)
   * 
   * @param email Email of the user
   * @returns Array of invitations for the user
   */
  async getUserInvitations(email: string): Promise<TeamInvitation[]> {
    const { data, error } = await this.supabase
      .from('team_invitations')
      .select('*, teams(name)')
      .eq('email', email)
      .is('accepted_at', null)
      .is('declined_at', null);
    
    if (error || !data) {
      return [];
    }
    
    return data.map(this.mapDbInvitationToTeamInvitation);
  }
  
  /**
   * Accept a team invitation
   * 
   * @param invitationId ID of the invitation to accept
   * @param userId ID of the user accepting the invitation
   * @returns Result object with success status and team member data or error
   */
  async acceptInvitation(invitationId: string, userId: string): Promise<TeamMemberResult> {
    try {
      // Get the invitation
      const { data: invitation, error: invitationError } = await this.supabase
        .from('team_invitations')
        .select('*')
        .eq('id', invitationId)
        .single();
      
      if (invitationError || !invitation) {
        return {
          success: false,
          error: invitationError?.message || 'Invitation not found'
        };
      }
      
      // Update the invitation as accepted
      await this.supabase
        .from('team_invitations')
        .update({
          accepted_at: new Date().toISOString(),
          accepted_by: userId
        })
        .eq('id', invitationId);
      
      // Add the user to the team
      return await this.addTeamMember(invitation.team_id, userId, invitation.role);
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while accepting invitation'
      };
    }
  }
  
  /**
   * Decline a team invitation
   * 
   * @param invitationId ID of the invitation to decline
   * @returns Result object with success status or error
   */
  async declineInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('team_invitations')
        .update({
          declined_at: new Date().toISOString()
        })
        .eq('id', invitationId);
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while declining invitation'
      };
    }
  }
  
  /**
   * Cancel a pending invitation
   * 
   * @param invitationId ID of the invitation to cancel
   * @returns Result object with success status or error
   */
  async cancelInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const { error } = await this.supabase
        .from('team_invitations')
        .delete()
        .eq('id', invitationId);
      
      if (error) {
        return {
          success: false,
          error: error.message
        };
      }
      
      return {
        success: true
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'An error occurred while canceling invitation'
      };
    }
  }
  
  /**
   * Search for teams based on search parameters
   * 
   * @param params Search parameters
   * @returns Search results with pagination
   */
  async searchTeams(params: TeamSearchParams): Promise<TeamSearchResult> {
    try {
      let query = this.supabase
        .from('teams')
        .select('*', { count: 'exact' });
      
      // Apply search filters
      if (params.query) {
        query = query.or(`name.ilike.%${params.query}%,description.ilike.%${params.query}%`);
      }
      
      if (params.filters) {
        if (params.filters.isPublic !== undefined) {
          query = query.eq('is_public', params.filters.isPublic);
        }
        
        if (params.filters.ownerId) {
          query = query.eq('owner_id', params.filters.ownerId);
        }
      }
      
      // Apply pagination
      const page = params.page ?? 0;
      const pageSize = params.pageSize ?? 20;
      const from = page * pageSize;
      const to = from + pageSize - 1;
      
      query = query.range(from, to);
      
      // Apply sorting
      if (params.sortBy) {
        const direction = params.sortDirection === 'desc' ? 'desc' : 'asc';
        query = query.order(params.sortBy, { ascending: direction === 'asc' });
      } else {
        query = query.order('created_at', { ascending: false });
      }
      
      const { data, error, count } = await query;
      
      if (error) {
        throw new Error(error.message);
      }
      
      const totalCount = count || 0;
      const totalPages = Math.ceil(totalCount / pageSize);
      
      const teams = data.map(this.mapDbTeamToTeam);
      
      return {
        teams,
        total: totalCount,
        page,
        limit: pageSize,
        totalPages,
      };
    } catch (error: any) {
      return {
        teams: [],
        total: 0,
        page: params.page ?? 0,
        limit: params.pageSize ?? 20,
        totalPages: 0,
      };
    }
  }
  
  /**
   * Check if a user is a member of a team
   * 
   * @param teamId ID of the team
   * @param userId ID of the user
   * @returns True if the user is a member of the team, false otherwise
   */
  async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('team_members')
      .select('id')
      .eq('team_license_id', teamId)
      .eq('user_id', userId)
      .single();
    
    return !error && !!data;
  }
  
  /**
   * Check if a user has a specific role in a team
   * 
   * @param teamId ID of the team
   * @param userId ID of the user
   * @param role Role to check for
   * @returns True if the user has the specified role, false otherwise
   */
  async hasTeamRole(teamId: string, userId: string, role: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('team_members')
      .select('id')
      .eq('team_license_id', teamId)
      .eq('user_id', userId)
      .eq('role', role)
      .single();
    
    return !error && !!data;
  }
  
  /**
   * Subscribe to team changes
   * 
   * @param callback Function to call when a team changes
   * @returns Unsubscribe function
   */
  onTeamChanged(callback: (team: Team) => void): () => void {
    this.teamCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.teamCallbacks.indexOf(callback);
      if (index !== -1) {
        this.teamCallbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * Subscribe to team membership changes
   * 
   * @param callback Function to call when team membership changes
   * @returns Unsubscribe function
   */
  onTeamMembershipChanged(callback: (teamId: string, members: TeamMember[]) => void): () => void {
    this.membershipCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.membershipCallbacks.indexOf(callback);
      if (index !== -1) {
        this.membershipCallbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * Notify all team change callbacks
   * 
   * @param team Updated team
   */
  private notifyTeamChanged(team: Team): void {
    for (const callback of this.teamCallbacks) {
      callback(team);
    }
  }
  
  /**
   * Notify all team membership change callbacks
   * 
   * @param teamId ID of the team
   * @param members Updated team members
   */
  private notifyTeamMembershipChanged(teamId: string, members: TeamMember[]): void {
    for (const callback of this.membershipCallbacks) {
      callback(teamId, members);
    }
  }
  
  /**
   * Map a database team record to a Team model
   * 
   * @param dbTeam Database team record
   * @returns Team model
   */
  private mapDbTeamToTeam(dbTeam: any): Team {
    return {
      id: dbTeam.id,
      name: dbTeam.name,
      description: dbTeam.description,
      ownerId: dbTeam.owner_id,
      isActive: dbTeam.is_active ?? true,
      visibility: dbTeam.visibility ?? 'private',
      memberLimit: dbTeam.member_limit ?? 0,
      createdAt: dbTeam.created_at ? new Date(dbTeam.created_at).toISOString() : new Date().toISOString(),
      updatedAt: dbTeam.updated_at ? new Date(dbTeam.updated_at).toISOString() : new Date().toISOString(),
    };
  }
  
  /**
   * Map a database team member record to a TeamMember model
   * 
   * @param dbMember Database team member record
   * @returns TeamMember model
   */
  private mapDbMemberToTeamMember(dbMember: any): TeamMember {
    const firstName = dbMember.profiles?.first_name || '';
    const lastName = dbMember.profiles?.last_name || '';
    const name = [firstName, lastName].filter(Boolean).join(' ') || undefined;
    return {
      id: dbMember.id,
      teamId: dbMember.team_license_id || dbMember.team_id,
      userId: dbMember.user_id,
      role: dbMember.role,
      name,
      avatarUrl: dbMember.profiles?.avatar_url || null,
      isActive: dbMember.is_active ?? true,
      joinedAt: dbMember.joined_at ? new Date(dbMember.joined_at).toISOString() : new Date().toISOString(),
      updatedAt: dbMember.updated_at ? new Date(dbMember.updated_at).toISOString() : new Date().toISOString(),
    };
  }
  
  /**
   * Map a database invitation record to a TeamInvitation model
   * 
   * @param dbInvitation Database invitation record
   * @returns TeamInvitation model
   */
  private mapDbInvitationToTeamInvitation(dbInvitation: any): TeamInvitation {
    return {
      id: dbInvitation.id,
      teamId: dbInvitation.team_license_id || dbInvitation.team_id,
      email: dbInvitation.email,
      role: dbInvitation.role,
      invitedBy: dbInvitation.invited_by,
      status: dbInvitation.status ?? 'pending',
      createdAt: dbInvitation.created_at ? new Date(dbInvitation.created_at).toISOString() : new Date().toISOString(),
      expiresAt: dbInvitation.expires_at ? new Date(dbInvitation.expires_at).toISOString() : new Date().toISOString(),
      respondedAt: dbInvitation.accepted_at
        ? new Date(dbInvitation.accepted_at).toISOString()
        : dbInvitation.declined_at
        ? new Date(dbInvitation.declined_at).toISOString()
        : undefined,
    };
  }
}
