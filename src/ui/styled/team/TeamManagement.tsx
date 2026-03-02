// NOTE: Seat and license management logic here has no equivalent headless
// component yet, so this styled component remains as is.
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../../components/ui/table';
import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Progress } from '../../../components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '../../../components/ui/alert';
import { Users, AlertCircle, Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { TeamInviteDialog } from './TeamInviteDialog';

interface User {
  id: string;
  name: string | null;
  email: string | null;
}

interface TeamMember {
  id: string;
  user: User;
  invitedEmail?: string;
  role: 'admin' | 'member';
  status: 'active' | 'pending' | 'inactive';
}

interface TeamLicense {
  totalSeats: number;
  usedSeats: number;
  members: TeamMember[];
}


async function fetchTeamLicense(): Promise<TeamLicense> {
  const response = await fetch('/api/subscriptions/team/license');
  if (!response.ok) {
    const error = await response.json();
    if (process.env.NODE_ENV === 'development') { console.error('Failed to fetch team license', error); }
    throw new Error(error.message || 'Failed to fetch team license');
  }
  return response.json();
}

async function updateSeats(seats: number): Promise<TeamLicense> {
  const response = await fetch('/api/subscriptions/team/seats', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ seats }),
  });
  if (!response.ok) {
    const error = await response.json();
    if (process.env.NODE_ENV === 'development') { console.error('Failed to update seats', error); }
    throw new Error(error.message || 'Failed to update seats');
  }
  return response.json();
}

async function removeMember(memberId: string): Promise<void> {
  const response = await fetch(`/api/subscriptions/team/members/${memberId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json();
    if (process.env.NODE_ENV === 'development') { console.error('Failed to remove member', error); }
    throw new Error(error.message || 'Failed to remove member');
  }
}

export function TeamManagement(): React.ReactElement {
  const [isUpdateOpen, setIsUpdateOpen] = useState<boolean>(false);
  const [newSeatCount, setNewSeatCount] = useState<string>('');
  const queryClient = useQueryClient();

  const { data: teamLicense, isLoading, error } = useQuery<TeamLicense, Error>({
    queryKey: ['teamLicense'],
    queryFn: fetchTeamLicense,
  });

  const updateSeatsMutation = useMutation<TeamLicense, Error, number>({
    mutationFn: updateSeats,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamLicense'] });
      setIsUpdateOpen(false);
      setNewSeatCount('');
      toast.success('Successfully updated seat count');
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') { console.error('Failed to update seats', error); }
      toast.error('Failed to update seats: ' + error.message);
    },
  });

  const removeMemberMutation = useMutation<void, Error, string>({
    mutationFn: removeMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamLicense'] });
      toast.success('Successfully removed team member');
    },
    onError: (error: Error) => {
      if (process.env.NODE_ENV === 'development') { console.error('Failed to remove member', error); }
      toast.error('Failed to remove member: ' + error.message);
    },
  });

  if (error) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>Manage your team members and seats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>Failed to load team information: {error.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading || !teamLicense) {
    return (
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Team Management</CardTitle>
          <CardDescription>Manage your team members and seats</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            <p>Loading team information...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const seatUsagePercentage = (teamLicense.usedSeats / teamLicense.totalSeats) * 100;
  const availableSeats = teamLicense.totalSeats - teamLicense.usedSeats;
  const isNearLimit = availableSeats <= 2;

  const handleSeatUpdate = () => {
    const seats = parseInt(newSeatCount);
    if (!isNaN(seats) && seats >= teamLicense.usedSeats) {
      updateSeatsMutation.mutate(seats);
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Team Management</CardTitle>
            <CardDescription>Manage your team members and seats</CardDescription>
          </div>
          <Dialog open={isUpdateOpen} onOpenChange={setIsUpdateOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Users className="mr-2 h-4 w-4" />
                Update Seats
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Seat Count</DialogTitle>
                <DialogDescription>
                  Adjust the number of seats for your team. This will update your
                  subscription billing.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="seats">Number of Seats</Label>
                  <Input
                    id="seats"
                    type="number"
                    value={newSeatCount}
                    onChange={(e) => setNewSeatCount(e.target.value)}
                    min={teamLicense.usedSeats}
                  />
                  {newSeatCount && parseInt(newSeatCount) < teamLicense.usedSeats && (
                    <p className="text-sm text-destructive">
                      Cannot reduce seats below current usage ({teamLicense.usedSeats})
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsUpdateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSeatUpdate}
                  disabled={
                    updateSeatsMutation.isPending ||
                    !newSeatCount ||
                    parseInt(newSeatCount) < teamLicense.usedSeats
                  }
                >
                  {updateSeatsMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Update Seats
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Seats Used: {teamLicense.usedSeats} of {teamLicense.totalSeats}
              </p>
              <p className="text-sm text-muted-foreground">
                {seatUsagePercentage.toFixed(0)}%
              </p>
            </div>
            <Progress value={seatUsagePercentage} className="h-2" />
          </div>

          {isNearLimit && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Running Low on Seats</AlertTitle>
              <AlertDescription>
                You have {availableSeats} seat{availableSeats !== 1 ? 's' : ''} remaining.
                Consider updating your seat count to accommodate more team members.
              </AlertDescription>
            </Alert>
          )}

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamLicense.members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>{member.user.name || 'Pending'}</TableCell>
                    <TableCell>{member.user.email || member.invitedEmail}</TableCell>
                    <TableCell className="capitalize">{member.role}</TableCell>
                    <TableCell className="capitalize">{member.status}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeMemberMutation.mutate(member.id)}
                        disabled={removeMemberMutation.isPending}
                      >
                        {removeMemberMutation.isPending && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <TeamInviteDialog availableSeats={availableSeats} />
        </div>
      </CardContent>
    </Card>
  );
} 