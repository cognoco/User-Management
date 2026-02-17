import { useEffect } from 'react';
import { useTeams } from '@/hooks/team/useTeams';
import { useTeamMembers } from '@/hooks/team/useTeamMembers';
import { useTeamInvitations } from '@/hooks/team/useTeamInvitations';
import { Team, TeamMember, TeamInvitation } from '@/core/team/models';

export interface TeamManagementRenderProps {
  team: Team | null;
  members: TeamMember[];
  invitations: TeamInvitation[];
  refreshMembers: () => Promise<void>;
  refreshInvitations: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export interface TeamManagementProps {
  teamId: string;
  children: (props: TeamManagementRenderProps) => React.ReactNode;
}

export function TeamManagement({ teamId, children }: TeamManagementProps) {
  const {
    fetchTeam,
    currentTeam,
    isLoading: teamsLoading,
    error: teamsError
  } = useTeams();
  const {
    members,
    fetchTeamMembers,
    isLoading: membersLoading,
    error: membersError
  } = useTeamMembers(teamId);
  const {
    teamInvitations,
    fetchTeamInvitations,
    isLoading: invitesLoading,
    error: invitesError
  } = useTeamInvitations(teamId);

  useEffect(() => {
    fetchTeam(teamId);
    fetchTeamMembers();
    fetchTeamInvitations(teamId);
  }, [teamId, fetchTeam, fetchTeamMembers, fetchTeamInvitations]);

  const isLoading = teamsLoading || membersLoading || invitesLoading;
  const error = teamsError || membersError || invitesError || null;

  return children({
    team: currentTeam,
    members,
    invitations: teamInvitations,
    refreshMembers: async () => { await fetchTeamMembers(); },
    refreshInvitations: async () => { await fetchTeamInvitations(teamId); },
    isLoading,
    error
  });
}
