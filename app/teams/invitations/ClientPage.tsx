'use client';

import { useEffect } from 'react';
import { Skeleton } from '@/ui/primitives/skeleton';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Button } from '@/ui/primitives/button';
import { useRouter, useSearchParams } from 'next/navigation';

// Import from our new architecture
import { InvitationManager } from '@/ui/styled/team/InvitationManager';
import { useTeams } from '@/hooks/team/useTeams';
import { useTeamInvitations } from '@/hooks/team/useTeamInvitations';

export default function TeamInvitationsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const teamId = searchParams.get('id');
  
  // Use our hooks from the new architecture
  const {
    teams,
    currentTeam: selectedTeam,
    setCurrentTeam: setSelectedTeam,
    isLoading: teamsLoading,
    error: teamsError
  } = useTeams();
  
  const {
    teamInvitations: pendingInvitations,
    userInvitations: sentInvitations,
    cancelInvitation,
    resendInvitation,
    isLoading: invitationsLoading,
    error: invitationsError
  } = useTeamInvitations(teamId ?? undefined);
  
  // Combine loading and error states
  const isLoading = teamsLoading || invitationsLoading;
  const error = teamsError || invitationsError;

  // Set the selected team based on the URL parameter
  useEffect(() => {
    if (teams && teams.length > 0 && teamId) {
      const team = teams.find(t => t.id === teamId);
      if (team) {
        setSelectedTeam(team);
      } else {
        // If team ID is invalid, redirect to teams dashboard
        router.push('/teams');
      }
    }
  }, [teams, teamId, setSelectedTeam, router]);

  // If no team ID is provided, redirect to teams dashboard
  useEffect(() => {
    if (!teamId && !isLoading) {
      router.push('/teams');
    }
  }, [teamId, isLoading, router]);

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Invitations</h1>
        <p className="text-muted-foreground">
          Manage invitations for {selectedTeam?.name || 'your team'}
        </p>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      ) : error ? (
        <Alert variant="destructive" className="my-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : selectedTeam ? (
        <InvitationManager
          teamId={selectedTeam.id}
          footer={
            <div className="flex justify-between w-full">
              <Button
                variant="outline"
                onClick={() => router.push(`/teams/manage?id=${selectedTeam.id}`)}
              >
                Manage Team Members
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/teams')}
              >
                Back to Teams
              </Button>
            </div>
          }
        />
      ) : (
        <Alert>
          <AlertDescription>
            Please select a team to manage invitations.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
