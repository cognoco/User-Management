'use client';

import { useEffect } from 'react';
import { Skeleton } from '@/ui/primitives/skeleton';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

// Import from our new architecture
import { TeamMemberManager } from '@/ui/styled/team/TeamMemberManager';
import { useTeams } from '@/hooks/team/useTeams';
import { useTeamMembers } from '@/hooks/team/useTeamMembers';

export default function TeamManagementPageClient() {
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
    members,
    addTeamMember: addMember,
    removeTeamMember: removeMember,
    updateTeamMember: updateMemberRole,
    isLoading: membersLoading,
    error: membersError
  } = useTeamMembers(teamId || '');
  
  // Combine loading and error states
  const isLoading = teamsLoading || membersLoading;
  const error = teamsError || membersError;

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
        <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
        <p className="text-muted-foreground">
          Manage team members and their roles
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
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Team Details</CardTitle>
              <CardDescription>View and manage team information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-medium">Team Name</h3>
                <p>{selectedTeam.name}</p>
              </div>
              
              <div>
                <h3 className="font-medium">Description</h3>
                <p>{selectedTeam.description || 'No description provided'}</p>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  variant="outline"
                  onClick={() => router.push('/teams')}
                >
                  Back to Teams
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <TeamMemberManager
            teamId={selectedTeam.id}
            onRemoveMember={async (userId: string) => { await removeMember(userId); }}
            onUpdateMember={async (userId: string, data: { role: string }) => { await updateMemberRole(userId, data); }}
            footer={
              <div className="flex justify-between w-full">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/teams/invitations?id=${selectedTeam.id}`)}
                >
                  Manage Invitations
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
        </div>
      ) : (
        <Alert>
          <AlertDescription>
            Please select a team to manage.{' '}
            <Link href="/teams" className="underline">
              Go to Teams Dashboard
            </Link>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
