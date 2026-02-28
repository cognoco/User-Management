// API-based TeamService implementation for client-side use
import { TeamService } from '@/core/team/interfaces';
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
  TeamSearchResult,
} from '@/core/team/models';

/** Client-side {@link TeamService} communicating with `/api/team` endpoints. */
export class ApiTeamService implements TeamService {
  /**
   * Create a new team.
   */
  async createTeam(ownerId: string, teamData: TeamCreatePayload): Promise<TeamResult> {
    const res = await fetch('/api/team', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId, ...teamData }),
      credentials: 'include',
    });
    if (!res.ok) return { success: false, error: 'Failed to create team' };
    const team = await res.json();
    return { success: true, team };
  }

  /**
   * Get a team by its ID.
   */
  async getTeam(teamId: string): Promise<Team | null> {
    const res = await fetch(`/api/team/${teamId}`, { credentials: 'include' });
    if (!res.ok) return null;
    return res.json();
  }

  /**
   * Update an existing team.
   */
  async updateTeam(teamId: string, teamData: TeamUpdatePayload): Promise<TeamResult> {
    const res = await fetch(`/api/team/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamData),
      credentials: 'include',
    });
    if (!res.ok) return { success: false, error: 'Failed to update team' };
    const team = await res.json();
    return { success: true, team };
  }

  /**
   * Delete a team by ID.
   */
  async deleteTeam(teamId: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`/api/team/${teamId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) return { success: false, error: 'Failed to delete team' };
    return { success: true };
  }

  /**
   * Get all teams that a user belongs to.
   */
  async getUserTeams(userId: string): Promise<Team[]> {
    const res = await fetch(`/api/team?userId=${userId}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch user teams');
    return res.json();
  }

  /**
   * Get all members belonging to a team.
   */
  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    const res = await fetch(`/api/team/${teamId}/members`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch team members');
    return res.json();
  }

  /**
   * Get a single team member by their record ID.
   */
  async getTeamMemberById(memberId: string): Promise<TeamMember | null> {
    // Client-side: not directly supported without knowing the teamId.
    // This method is primarily used server-side.
    return null;
  }

  /**
   * Add a user to a team.
   */
  async addTeamMember(teamId: string, userId: string, role: string): Promise<TeamMemberResult> {
    const res = await fetch(`/api/team/${teamId}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, role }),
      credentials: 'include',
    });
    if (!res.ok) return { success: false, error: 'Failed to add team member' };
    const member = await res.json();
    return { success: true, member };
  }

  /**
   * Update a team member's role.
   */
  async updateTeamMember(teamId: string, userId: string, updateData: TeamMemberUpdatePayload): Promise<TeamMemberResult> {
    const res = await fetch(`/api/team/${teamId}/members/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData),
      credentials: 'include',
    });
    if (!res.ok) return { success: false, error: 'Failed to update team member' };
    const member = await res.json();
    return { success: true, member };
  }

  /**
   * Remove a member from a team.
   */
  async removeTeamMember(teamId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`/api/team/${teamId}/members/${userId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) return { success: false, error: 'Failed to remove team member' };
    return { success: true };
  }

  /**
   * Transfer team ownership to another user.
   */
  async transferOwnership(teamId: string, newOwnerId: string): Promise<TeamResult> {
    const res = await fetch(`/api/team/${teamId}/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newOwnerId }),
      credentials: 'include',
    });
    if (!res.ok) return { success: false, error: 'Failed to transfer ownership' };
    const team = await res.json();
    return { success: true, team };
  }

  /**
   * Invite a user to join a team.
   */
  async inviteToTeam(teamId: string, invitationData: TeamInvitationPayload): Promise<TeamInvitationResult> {
    const res = await fetch(`/api/team/${teamId}/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(invitationData),
      credentials: 'include',
    });
    if (!res.ok) return { success: false, error: 'Failed to invite to team' };
    const invitation = await res.json();
    return { success: true, invitation };
  }

  /**
   * Get all pending invitations for a team.
   */
  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
    const res = await fetch(`/api/team/${teamId}/invites`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch team invitations');
    return res.json();
  }

  /**
   * Get all invitations for a user (by email).
   */
  async getUserInvitations(email: string): Promise<TeamInvitation[]> {
    const res = await fetch(`/api/team/invites?email=${encodeURIComponent(email)}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to fetch user invitations');
    return res.json();
  }

  /**
   * Accept a team invitation.
   */
  async acceptInvitation(invitationId: string, userId: string): Promise<TeamMemberResult> {
    const res = await fetch(`/api/team/invites/${invitationId}/accept`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
      credentials: 'include',
    });
    if (!res.ok) return { success: false, error: 'Failed to accept invite' };
    const member = await res.json();
    return { success: true, member };
  }

  /**
   * Decline a team invitation.
   */
  async declineInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`/api/team/invites/${invitationId}/decline`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return { success: false, error: 'Failed to decline invite' };
    return { success: true };
  }

  /**
   * Cancel a pending invitation.
   */
  async cancelInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(`/api/team/invites/${invitationId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (!res.ok) return { success: false, error: 'Failed to cancel invite' };
    return { success: true };
  }

  /**
   * Search for teams based on search parameters.
   */
  async searchTeams(params: TeamSearchParams): Promise<TeamSearchResult> {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const res = await fetch(`/api/team/search?${query}`, { credentials: 'include' });
    if (!res.ok) throw new Error('Failed to search teams');
    return res.json();
  }

  /**
   * Check if a user is a member of a team.
   */
  async isTeamMember(teamId: string, userId: string): Promise<boolean> {
    const res = await fetch(`/api/team/${teamId}/members/${userId}`, { credentials: 'include' });
    return res.ok;
  }

  /**
   * Check if a user has a specific role in a team.
   */
  async hasTeamRole(teamId: string, userId: string, role: string): Promise<boolean> {
    const res = await fetch(`/api/team/${teamId}/members/${userId}/role?role=${role}`, { credentials: 'include' });
    return res.ok;
  }

  /**
   * Subscribe to team changes (no-op in API implementation).
   */
  onTeamChanged(_callback: (team: Team) => void): () => void {
    return () => {};
  }

  /**
   * Subscribe to team membership changes (no-op in API implementation).
   */
  onTeamMembershipChanged(_callback: (teamId: string, members: TeamMember[]) => void): () => void {
    return () => {};
  }

  async getTeamLicenseInfo(_userId: string): Promise<{ totalSeats: number; usedSeats: number } | null> {
    const res = await fetch('/api/team/license-info');
    if (!res.ok) return null;
    return res.json();
  }
}

/**
 * Factory helper to create the browser {@link ApiTeamService}.
 */
export function getApiTeamService(): TeamService {
  return new ApiTeamService();
}
