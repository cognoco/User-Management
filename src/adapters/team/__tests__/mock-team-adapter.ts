import { ITeamDataProvider } from '@/core/team/ITeamDataProvider';
import { Team, TeamMember, CreateTeamPayload, UpdateTeamPayload, TeamInvitation } from '@/core/team/models';

export class MockTeamAdapter implements ITeamDataProvider {
  private teams: Map<string, Team> = new Map();
  private members: Map<string, TeamMember[]> = new Map();
  private invitations: Map<string, TeamInvitation[]> = new Map();

  constructor() {
    // Set up default mock data
    const defaultTeam: Team = {
      id: 'team-123',
      name: 'Test Team',
      description: 'A team for testing',
      ownerId: 'user-123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: false,
      memberCount: 1,
    };
    this.teams.set('team-123', defaultTeam);

    const defaultMember: TeamMember = {
      id: 'member-123',
      teamId: 'team-123',
      userId: 'user-123',
      role: 'owner',
      joinedAt: new Date().toISOString(),
      user: {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      },
    };
    this.members.set('team-123', [defaultMember]);
  }

  async createTeam(data: CreateTeamPayload, ownerId: string): Promise<{ success: boolean; team?: Team; error?: string }> {
    const team: Team = {
      id: `team-${Date.now()}`,
      name: data.name,
      description: data.description,
      ownerId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isPublic: data.isPublic || false,
      memberCount: 1,
    };

    this.teams.set(team.id, team);

    const ownerMember: TeamMember = {
      id: `member-${Date.now()}`,
      teamId: team.id,
      userId: ownerId,
      role: 'owner',
      joinedAt: new Date().toISOString(),
      user: {
        id: ownerId,
        email: 'owner@example.com',
        name: 'Team Owner',
      },
    };
    this.members.set(team.id, [ownerMember]);

    return { success: true, team };
  }

  async getTeam(teamId: string): Promise<Team | null> {
    return this.teams.get(teamId) || null;
  }

  async updateTeam(teamId: string, data: UpdateTeamPayload): Promise<{ success: boolean; team?: Team; error?: string }> {
    const team = this.teams.get(teamId);
    if (!team) {
      return { success: false, error: 'Team not found' };
    }

    const updated = {
      ...team,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.teams.set(teamId, updated);

    return { success: true, team: updated };
  }

  async deleteTeam(teamId: string): Promise<{ success: boolean; error?: string }> {
    const deleted = this.teams.delete(teamId);
    this.members.delete(teamId);
    this.invitations.delete(teamId);
    return { success: deleted, error: deleted ? undefined : 'Team not found' };
  }

  async getUserTeams(userId: string): Promise<Team[]> {
    const userTeams: Team[] = [];
    for (const [teamId, members] of this.members.entries()) {
      if (members.some(m => m.userId === userId)) {
        const team = this.teams.get(teamId);
        if (team) userTeams.push(team);
      }
    }
    return userTeams;
  }

  async getTeamMembers(teamId: string): Promise<TeamMember[]> {
    return this.members.get(teamId) || [];
  }

  async addTeamMember(teamId: string, userId: string, role: string): Promise<{ success: boolean; member?: TeamMember; error?: string }> {
    const team = this.teams.get(teamId);
    if (!team) {
      return { success: false, error: 'Team not found' };
    }

    const members = this.members.get(teamId) || [];
    if (members.some(m => m.userId === userId)) {
      return { success: false, error: 'User already a member' };
    }

    const member: TeamMember = {
      id: `member-${Date.now()}`,
      teamId,
      userId,
      role,
      joinedAt: new Date().toISOString(),
      user: {
        id: userId,
        email: `user${userId}@example.com`,
        name: `User ${userId}`,
      },
    };

    members.push(member);
    this.members.set(teamId, members);

    // Update member count
    team.memberCount = members.length;
    this.teams.set(teamId, team);

    return { success: true, member };
  }

  async removeTeamMember(teamId: string, userId: string): Promise<{ success: boolean; error?: string }> {
    const members = this.members.get(teamId) || [];
    const memberIndex = members.findIndex(m => m.userId === userId);
    
    if (memberIndex === -1) {
      return { success: false, error: 'Member not found' };
    }

    members.splice(memberIndex, 1);
    this.members.set(teamId, members);

    // Update member count
    const team = this.teams.get(teamId);
    if (team) {
      team.memberCount = members.length;
      this.teams.set(teamId, team);
    }

    return { success: true };
  }

  async updateMemberRole(teamId: string, userId: string, role: string): Promise<{ success: boolean; member?: TeamMember; error?: string }> {
    const members = this.members.get(teamId) || [];
    const member = members.find(m => m.userId === userId);
    
    if (!member) {
      return { success: false, error: 'Member not found' };
    }

    member.role = role;
    this.members.set(teamId, members);

    return { success: true, member };
  }

  async inviteToTeam(teamId: string, email: string, role: string, inviterId: string): Promise<{ success: boolean; invitation?: TeamInvitation; error?: string }> {
    const invitation: TeamInvitation = {
      id: `invite-${Date.now()}`,
      teamId,
      email,
      role,
      inviterId,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
    };

    const invitations = this.invitations.get(teamId) || [];
    invitations.push(invitation);
    this.invitations.set(teamId, invitations);

    return { success: true, invitation };
  }

  async getTeamInvitations(teamId: string): Promise<TeamInvitation[]> {
    return this.invitations.get(teamId) || [];
  }

  async acceptInvitation(invitationId: string, userId: string): Promise<{ success: boolean; member?: TeamMember; error?: string }> {
    // Find the invitation
    let invitation: TeamInvitation | undefined;
    let teamId: string | undefined;
    
    for (const [tId, invites] of this.invitations.entries()) {
      invitation = invites.find(i => i.id === invitationId);
      if (invitation) {
        teamId = tId;
        break;
      }
    }

    if (!invitation || !teamId) {
      return { success: false, error: 'Invitation not found' };
    }

    if (invitation.status !== 'pending') {
      return { success: false, error: 'Invitation already processed' };
    }

    // Add member
    const result = await this.addTeamMember(teamId, userId, invitation.role);
    if (!result.success) {
      return result;
    }

    // Mark invitation as accepted
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date().toISOString();

    return result;
  }

  async rejectInvitation(invitationId: string): Promise<{ success: boolean; error?: string }> {
    // Find and update invitation
    for (const [teamId, invites] of this.invitations.entries()) {
      const invitation = invites.find(i => i.id === invitationId);
      if (invitation) {
        invitation.status = 'rejected';
        invitation.rejectedAt = new Date().toISOString();
        return { success: true };
      }
    }

    return { success: false, error: 'Invitation not found' };
  }

  // Helper methods for testing
  setMockTeam(team: Team) {
    this.teams.set(team.id, team);
  }

  clearMockData() {
    this.teams.clear();
    this.members.clear();
    this.invitations.clear();
  }
}