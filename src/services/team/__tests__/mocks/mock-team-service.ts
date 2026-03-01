// src/services/team/__tests__/mocks/mock-team-service.ts
import { vi } from 'vitest';
import { TeamService } from '../../../../core/team/interfaces';
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
  TeamVisibility,
  InvitationStatus
} from '../../../../core/team/models';

/**
 * Mock implementation of the TeamService interface for testing
 */
export class MockTeamService implements TeamService {
  private teamChangeListeners: ((team: Team) => void)[] = [];
  private membershipChangeListeners: ((teamId: string, members: TeamMember[]) => void)[] = [];
  private mockTeams: Record<string, Team> = {};
  private mockTeamMembers: Record<string, TeamMember[]> = {};
  private mockInvitations: Record<string, TeamInvitation> = {};
  private mockTeamInvitations: Record<string, string[]> = {}; // teamId -> invitationIds[]
  private mockUserInvitations: Record<string, string[]> = {}; // email -> invitationIds[]
  
  // Mock implementations with Vitest spies
  createTeam = vi.fn().mockImplementation(async (ownerId: string, teamData: TeamCreatePayload): Promise<TeamResult> => {
    const teamId = `team-${Date.now()}`;
    const team: Team = {
      id: teamId,
      name: teamData.name,
      description: teamData.description || '',
      ownerId,
      isActive: true,
      visibility: teamData.visibility || TeamVisibility.PRIVATE,
      memberLimit: teamData.memberLimit || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      metadata: teamData.metadata || {}
    };
    
    this.mockTeams[teamId] = team;
    
    // Add owner as a member
    const ownerMember: TeamMember = {
      id: `member-${Date.now()}`,
      teamId,
      userId: ownerId,
      role: 'owner',
      isActive: true,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: '',
      email: '',
      avatarUrl: null,
      isCurrentUser: false,
      canRemove: true,
      canUpdateRole: true
    };
    
    this.mockTeamMembers[teamId] = [ownerMember];
    this.notifyTeamChange(team);
    this.notifyMembershipChange(teamId, this.mockTeamMembers[teamId]);
    
    return {
      success: true,
      team
    };
  });

  getTeam = vi.fn().mockImplementation(async (teamId: string): Promise<Team | null> => {
    return this.mockTeams[teamId] || null;
  });

  updateTeam = vi.fn().mockImplementation(async (teamId: string, teamData: TeamUpdatePayload): Promise<TeamResult> => {
    if (!this.mockTeams[teamId]) {
      return { success: false, error: 'Team not found' };
    }
    
    this.mockTeams[teamId] = {
      ...this.mockTeams[teamId],
      ...teamData,
      updatedAt: new Date().toISOString()
    };
    
    this.notifyTeamChange(this.mockTeams[teamId]);
    
    return {
      success: true,
      team: this.mockTeams[teamId]
    };
  });

  deleteTeam = vi.fn().mockImplementation(async (teamId: string): Promise<{ success: boolean; error?: string }> => {
    if (!this.mockTeams[teamId]) {
      return { success: false, error: 'Team not found' };
    }
    
    const team = { ...this.mockTeams[teamId] };
    delete this.mockTeams[teamId];
    delete this.mockTeamMembers[teamId];
    
    // Delete team invitations
    const invitationIds = this.mockTeamInvitations[teamId] || [];
    invitationIds.forEach(id => {
      delete this.mockInvitations[id];
    });
    delete this.mockTeamInvitations[teamId];
    
    this.notifyTeamChange(team);
    
    return { success: true };
  });

  getUserTeams = vi.fn().mockImplementation(async (userId: string): Promise<Team[]> => {
    const teams: Team[] = [];
    
    // Find all teams where the user is a member
    Object.entries(this.mockTeamMembers).forEach(([teamId, members]) => {
      const isMember = members.some(member => member.userId === userId);
      if (isMember && this.mockTeams[teamId]) {
        teams.push(this.mockTeams[teamId]);
      }
    });
    
    return teams;
  });

  getTeamMembers = vi.fn().mockImplementation(async (teamId: string): Promise<TeamMember[]> => {
    return this.mockTeamMembers[teamId] || [];
  });

  getTeamMemberById = vi.fn().mockImplementation(async (memberId: string): Promise<TeamMember | null> => {
    for (const members of Object.values(this.mockTeamMembers)) {
      const found = (members as TeamMember[]).find(m => m.id === memberId);
      if (found) return found;
    }
    return null;
  });

  addTeamMember = vi.fn().mockImplementation(async (teamId: string, userId: string, role: string): Promise<TeamMemberResult> => {
    if (!this.mockTeams[teamId]) {
      return { success: false, error: 'Team not found' };
    }
    
    // Check if user is already a member
    const existingMembers = this.mockTeamMembers[teamId] || [];
    const existingMember = existingMembers.find(m => m.userId === userId);
    
    if (existingMember) {
      return { success: false, error: 'User is already a member of this team' };
    }
    
    const member: TeamMember = {
      id: `member-${Date.now()}`,
      teamId,
      userId,
      role,
      isActive: true,
      joinedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      name: '',
      email: '',
      avatarUrl: null,
      isCurrentUser: false,
      canRemove: true,
      canUpdateRole: true
    };
    
    this.mockTeamMembers[teamId] = [...existingMembers, member];
    this.notifyMembershipChange(teamId, this.mockTeamMembers[teamId]);
    
    return {
      success: true,
      member
    };
  });

  updateTeamMember = vi.fn().mockImplementation(async (teamId: string, userId: string, updateData: TeamMemberUpdatePayload): Promise<TeamMemberResult> => {
    if (!this.mockTeams[teamId]) {
      return { success: false, error: 'Team not found' };
    }
    
    const members = this.mockTeamMembers[teamId] || [];
    const memberIndex = members.findIndex(m => m.userId === userId);
    
    if (memberIndex === -1) {
      return { success: false, error: 'User is not a member of this team' };
    }
    
    // Cannot change owner's role
    if (members[memberIndex].role === 'owner' && updateData.role && updateData.role !== 'owner') {
      return { success: false, error: 'Cannot change the role of the team owner' };
    }
    
    members[memberIndex] = {
      ...members[memberIndex],
      ...updateData
    };
    
    this.mockTeamMembers[teamId] = [...members];
    this.notifyMembershipChange(teamId, this.mockTeamMembers[teamId]);
    
    return {
      success: true,
      member: members[memberIndex]
    };
  });

  removeTeamMember = vi.fn().mockImplementation(async (teamId: string, userId: string): Promise<{ success: boolean; error?: string }> => {
    if (!this.mockTeams[teamId]) {
      return { success: false, error: 'Team not found' };
    }
    
    const members = this.mockTeamMembers[teamId] || [];
    const memberIndex = members.findIndex(m => m.userId === userId);
    
    if (memberIndex === -1) {
      return { success: false, error: 'User is not a member of this team' };
    }
    
    // Cannot remove the owner
    if (members[memberIndex].role === 'owner') {
      return { success: false, error: 'Cannot remove the team owner' };
    }
    
    members.splice(memberIndex, 1);
    this.mockTeamMembers[teamId] = [...members];
    this.notifyMembershipChange(teamId, this.mockTeamMembers[teamId]);
    
    return { success: true };
  });

  transferOwnership = vi.fn().mockImplementation(async (teamId: string, newOwnerId: string): Promise<TeamResult> => {
    if (!this.mockTeams[teamId]) {
      return { success: false, error: 'Team not found' };
    }
    
    const members = this.mockTeamMembers[teamId] || [];
    const newOwnerIndex = members.findIndex(m => m.userId === newOwnerId);
    
    if (newOwnerIndex === -1) {
      return { success: false, error: 'New owner is not a member of this team' };
    }
    
    const oldOwnerIndex = members.findIndex(m => m.role === 'owner');
    
    if (oldOwnerIndex !== -1) {
      members[oldOwnerIndex].role = 'member';
    }
    
    members[newOwnerIndex].role = 'owner';
    
    this.mockTeams[teamId] = {
      ...this.mockTeams[teamId],
      ownerId: newOwnerId,
      updatedAt: new Date().toISOString()
    };
    
    this.mockTeamMembers[teamId] = [...members];
    this.notifyTeamChange(this.mockTeams[teamId]);
    this.notifyMembershipChange(teamId, this.mockTeamMembers[teamId]);
    
    return {
      success: true,
      team: this.mockTeams[teamId]
    };
  });

  inviteToTeam = vi.fn().mockImplementation(async (teamId: string, invitationData: TeamInvitationPayload): Promise<TeamInvitationResult> => {
    if (!this.mockTeams[teamId]) {
      return { success: false, error: 'Team not found' };
    }
    
    const invitationId = `invitation-${Date.now()}`;
    const invitation: TeamInvitation = {
      id: invitationId,
      teamId,
      email: invitationData.email,
      role: invitationData.role || 'member',
      invitedBy: invitationData.invitedBy || '',
      status: InvitationStatus.PENDING,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
    
    this.mockInvitations[invitationId] = invitation;
    
    // Add to team invitations
    if (!this.mockTeamInvitations[teamId]) {
      this.mockTeamInvitations[teamId] = [];
    }
    this.mockTeamInvitations[teamId].push(invitationId);
    
    // Add to user invitations
    if (!this.mockUserInvitations[invitationData.email]) {
      this.mockUserInvitations[invitationData.email] = [];
    }
    this.mockUserInvitations[invitationData.email].push(invitationId);
    
    return {
      success: true,
      invitation
    };
  });

  getTeamInvitations = vi.fn().mockImplementation(async (teamId: string): Promise<TeamInvitation[]> => {
    if (!this.mockTeamInvitations[teamId]) {
      return [];
    }
    
    return this.mockTeamInvitations[teamId]
      .map(id => this.mockInvitations[id])
      .filter(Boolean);
  });

  getUserInvitations = vi.fn().mockImplementation(async (email: string): Promise<TeamInvitation[]> => {
    if (!this.mockUserInvitations[email]) {
      return [];
    }
    
    return this.mockUserInvitations[email]
      .map(id => this.mockInvitations[id])
      .filter(Boolean);
  });

  acceptInvitation = vi.fn().mockImplementation(async (invitationId: string, userId: string): Promise<TeamMemberResult> => {
    const invitation = this.mockInvitations[invitationId];
    
    if (!invitation) {
      return { success: false, error: 'Invitation not found' };
    }
    
    const { teamId, role } = invitation;
    
    // Add user to team
    const result = await this.addTeamMember(teamId, userId, role);
    
    if (result.success) {
      // Remove invitation
      this._removeInvitation(invitationId);
    }
    
    return result;
  });

  declineInvitation = vi.fn().mockImplementation(async (invitationId: string): Promise<{ success: boolean; error?: string }> => {
    const invitation = this.mockInvitations[invitationId];
    
    if (!invitation) {
      return { success: false, error: 'Invitation not found' };
    }
    
    // Remove invitation
    this._removeInvitation(invitationId);
    
    return { success: true };
  });

  cancelInvitation = vi.fn().mockImplementation(async (invitationId: string): Promise<{ success: boolean; error?: string }> => {
    const invitation = this.mockInvitations[invitationId];
    
    if (!invitation) {
      return { success: false, error: 'Invitation not found' };
    }
    
    // Remove invitation
    this._removeInvitation(invitationId);
    
    return { success: true };
  });

  searchTeams = vi.fn().mockImplementation(async (params: TeamSearchParams): Promise<TeamSearchResult> => {
    let filteredTeams = Object.values(this.mockTeams);
    
    // Apply filters
    if (params.query) {
      const query = params.query.toLowerCase();
      filteredTeams = filteredTeams.filter(team => 
        team.name.toLowerCase().includes(query) || 
        (team.description && team.description.toLowerCase().includes(query))
      );
    }
    
    if (params.ownerId) {
      filteredTeams = filteredTeams.filter(team => team.ownerId === params.ownerId);
    }
    
    if (params.visibility !== undefined) {
      filteredTeams = filteredTeams.filter(team => team.visibility === params.visibility);
    }
    
    // Apply sorting
    if (params.sortBy) {
      filteredTeams.sort((a, b) => {
        let valueA, valueB;
        
        switch (params.sortBy) {
          case 'name':
            valueA = a.name;
            valueB = b.name;
            break;
          case 'createdAt':
            valueA = a.createdAt || '';
            valueB = b.createdAt || '';
            break;
          case 'memberCount':
            valueA = '0';
            valueB = '0';
            break;
          default:
            return 0;
        }
        
        if (params.sortDirection === 'desc') {
          return valueB.localeCompare(valueA);
        }
        return valueA.localeCompare(valueB);
      });
    }
    
    // Apply pagination
    const page = params.page || 1;
    const limit = params.limit || 10;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginatedTeams = filteredTeams.slice(start, end);
    
    return {
      teams: paginatedTeams,
      total: filteredTeams.length,
      page,
      limit,
      totalPages: Math.ceil(filteredTeams.length / limit)
    };
  });

  isTeamMember = vi.fn().mockImplementation(async (teamId: string, userId: string): Promise<boolean> => {
    const members = this.mockTeamMembers[teamId] || [];
    return members.some(member => member.userId === userId);
  });

  hasTeamRole = vi.fn().mockImplementation(async (teamId: string, userId: string, role: string): Promise<boolean> => {
    const members = this.mockTeamMembers[teamId] || [];
    return members.some(member => member.userId === userId && member.role === role);
  });

  getTeamLicenseInfo = vi.fn().mockImplementation(async (_userId: string): Promise<{ totalSeats: number; usedSeats: number } | null> => {
    return null;
  });

  onTeamChanged = vi.fn().mockImplementation((callback: (team: Team) => void): (() => void) => {
    this.teamChangeListeners.push(callback);
    return () => {
      const index = this.teamChangeListeners.indexOf(callback);
      if (index !== -1) {
        this.teamChangeListeners.splice(index, 1);
      }
    };
  });

  onTeamMembershipChanged = vi.fn().mockImplementation((callback: (teamId: string, members: TeamMember[]) => void): (() => void) => {
    this.membershipChangeListeners.push(callback);
    return () => {
      const index = this.membershipChangeListeners.indexOf(callback);
      if (index !== -1) {
        this.membershipChangeListeners.splice(index, 1);
      }
    };
  });

  // Helper methods
  private notifyTeamChange(team: Team): void {
    this.teamChangeListeners.forEach(listener => listener(team));
  }

  private notifyMembershipChange(teamId: string, members: TeamMember[]): void {
    this.membershipChangeListeners.forEach(listener => listener(teamId, members));
  }

  private _removeInvitation(invitationId: string): void {
    const invitation = this.mockInvitations[invitationId];
    if (!invitation) return;
    
    // Remove from invitations map
    delete this.mockInvitations[invitationId];
    
    // Remove from team invitations
    const teamInvitations = this.mockTeamInvitations[invitation.teamId] || [];
    const teamIndex = teamInvitations.indexOf(invitationId);
    if (teamIndex !== -1) {
      teamInvitations.splice(teamIndex, 1);
    }
    
    // Remove from user invitations
    const userInvitations = this.mockUserInvitations[invitation.email] || [];
    const userIndex = userInvitations.indexOf(invitationId);
    if (userIndex !== -1) {
      userInvitations.splice(userIndex, 1);
    }
  }

  // Methods to control mock behavior in tests
  setMockTeam(team: Team): void {
    this.mockTeams[team.id] = team;
    
    // Ensure team has members
    if (!this.mockTeamMembers[team.id]) {
      this.mockTeamMembers[team.id] = [{
        id: `member-${Date.now()}`,
        teamId: team.id,
        userId: team.ownerId,
        role: 'owner',
        isActive: true,
        joinedAt: team.createdAt,
        updatedAt: team.updatedAt,
        name: '',
        email: '',
        avatarUrl: null,
        isCurrentUser: false,
        canRemove: true,
        canUpdateRole: true
      }];
    }
    
    this.notifyTeamChange(team);
  }

  setMockTeamMembers(teamId: string, members: TeamMember[]): void {
    this.mockTeamMembers[teamId] = members;
    this.notifyMembershipChange(teamId, members);
  }

  setMockInvitation(invitation: TeamInvitation): void {
    this.mockInvitations[invitation.id] = invitation;
    
    // Add to team invitations
    if (!this.mockTeamInvitations[invitation.teamId]) {
      this.mockTeamInvitations[invitation.teamId] = [];
    }
    if (!this.mockTeamInvitations[invitation.teamId].includes(invitation.id)) {
      this.mockTeamInvitations[invitation.teamId].push(invitation.id);
    }
    
    // Add to user invitations
    if (!this.mockUserInvitations[invitation.email]) {
      this.mockUserInvitations[invitation.email] = [];
    }
    if (!this.mockUserInvitations[invitation.email].includes(invitation.id)) {
      this.mockUserInvitations[invitation.email].push(invitation.id);
    }
  }

  clearMocks(): void {
    this.mockTeams = {};
    this.mockTeamMembers = {};
    this.mockInvitations = {};
    this.mockTeamInvitations = {};
    this.mockUserInvitations = {};
    this.teamChangeListeners = [];
    this.membershipChangeListeners = [];
  }
}
