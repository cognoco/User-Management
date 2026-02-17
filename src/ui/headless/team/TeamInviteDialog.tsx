import { useEffect } from 'react';
import { useTeamInvitations } from '@/hooks/team/useTeamInvitations';
import { InvitationStatus, TeamInvitation } from '@/core/team/models';

export interface TeamInviteDialogRenderProps {
  invitations: (TeamInvitation & { isExpired: boolean })[];
  resend: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

export interface TeamInviteDialogProps {
  teamId: string;
  children: (props: TeamInviteDialogRenderProps) => React.ReactNode;
}

export function TeamInviteDialog({ teamId, children }: TeamInviteDialogProps) {
  const {
    teamInvitations,
    fetchTeamInvitations,
    resendInvitation,
    cancelInvitation,
    isLoading,
    error
  } = useTeamInvitations(teamId);

  useEffect(() => {
    if (teamId) {
      fetchTeamInvitations(teamId);
    }
  }, [teamId, fetchTeamInvitations]);

  const invitationsWithExpiry: (typeof teamInvitations[0] & { isExpired: boolean })[] = teamInvitations.map((inv) => ({
    ...inv,
    isExpired: Boolean(inv.status === InvitationStatus.EXPIRED || (inv.expiresAt && new Date(inv.expiresAt) < new Date()))
  }));

  return children({
    invitations: invitationsWithExpiry,
    resend: async (id: string) => { await resendInvitation(id); },
    cancel: async (id: string) => { await cancelInvitation(id); },
    refresh: async () => { await fetchTeamInvitations(teamId); },
    isLoading,
    error
  });
}
