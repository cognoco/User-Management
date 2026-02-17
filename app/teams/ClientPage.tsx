'use client';

import { useEffect, useState } from 'react';
import { Skeleton } from '@/ui/primitives/skeleton';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/ui/primitives/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/primitives/card';

// Import from our new architecture
import { TeamCreator } from '@/ui/styled/team/TeamCreator';
import { TeamMemberManager } from '@/ui/styled/team/TeamMemberManager';
import { useTeams } from '@/hooks/team/useTeams';
import { useTeamMembers } from '@/hooks/team/useTeamMembers';
import { useTeamInvitations } from '@/hooks/team/useTeamInvitations';
import type { TeamInvitation } from '@/core/team/models';

export default function TeamDashboardPageClient() {
  const [activeTab, setActiveTab] = useState('overview');
  
  // Use our hooks from the new architecture
  const {
    teams,
    currentTeam: selectedTeam,
    setCurrentTeam: setSelectedTeam,
    createTeam,
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
  } = useTeamMembers(selectedTeam?.id || '');
  
  const {
    teamInvitations: invitations,
    cancelInvitation,
    resendInvitation,
    isLoading: invitationsLoading,
    error: invitationsError
  } = useTeamInvitations(selectedTeam?.id);
  
  // Combine loading and error states
  const isLoading = teamsLoading || membersLoading || invitationsLoading;
  const error = teamsError || membersError || invitationsError;

  // Set the first team as selected when teams are loaded
  useEffect(() => {
    if (teams && teams.length > 0 && !selectedTeam) {
      setSelectedTeam(teams[0]);
    }
  }, [teams, selectedTeam, setSelectedTeam]);

  return (
    <div className="container py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Team Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your teams, members, and invitations
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
      ) : (
        <div className="space-y-6">
          {/* Team Creator Section */}
          <Card>
            <CardHeader>
              <CardTitle>Create a New Team</CardTitle>
              <CardDescription>Create a new team and invite members</CardDescription>
            </CardHeader>
            <CardContent>
              <TeamCreator />
            </CardContent>
          </Card>
          
          {/* Team Management Section */}
          {teams && teams.length > 0 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="invitations">Invitations</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Team Overview</CardTitle>
                    <CardDescription>View and manage your team details</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedTeam && (
                      <div className="space-y-4">
                        <div>
                          <h3 className="font-medium">Team Name</h3>
                          <p>{selectedTeam.name}</p>
                        </div>
                        
                        <div>
                          <h3 className="font-medium">Description</h3>
                          <p>{selectedTeam.description || 'No description provided'}</p>
                        </div>
                        
                        <div>
                          <h3 className="font-medium">Members</h3>
                          <p>{members?.length || 0} members</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="members" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Team Members</CardTitle>
                    <CardDescription>Manage team members and their roles</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedTeam && (
                      <TeamMemberManager
                        teamId={selectedTeam.id}
                        onRemoveMember={async (userId: string) => { await removeMember(userId); }}
                        onUpdateMember={async (userId: string, data: { role: string }) => { await updateMemberRole(userId, data); }}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="invitations" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Invitations</CardTitle>
                    <CardDescription>Manage pending invitations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {selectedTeam && invitations && (
                      <div className="space-y-4">
                        {invitations.length === 0 ? (
                          <p>No pending invitations</p>
                        ) : (
                          <div className="space-y-4">
                            {invitations.map((invitation: TeamInvitation) => (
                              <div key={invitation.id} className="flex items-center justify-between p-4 border rounded-md">
                                <div>
                                  <p className="font-medium">{invitation.email}</p>
                                  <p className="text-sm text-muted-foreground">
                                    Invited on {new Date(invitation.createdAt).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() => resendInvitation(invitation.id)}
                                    className="text-sm text-blue-600 hover:underline"
                                  >
                                    Resend
                                  </button>
                                  <button
                                    onClick={() => cancelInvitation(invitation.id)}
                                    className="text-sm text-red-600 hover:underline"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No teams found. Create a team to get started.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
