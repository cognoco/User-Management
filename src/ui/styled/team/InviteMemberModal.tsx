import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/ui/primitives/dialog';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/ui/primitives/select';
import { Progress } from '@/ui/primitives/progress';
import { Alert, AlertDescription } from '@/ui/primitives/alert';
import { UserPlus } from 'lucide-react';
import {
  InviteMemberModal as InviteMemberModalHeadless,
  SeatUsage
} from '@/ui/headless/team/InviteMemberModal';

interface InviteMemberModalProps {
  teamId: string;
  seatUsage: SeatUsage;
}

export function InviteMemberModal({ teamId, seatUsage }: InviteMemberModalProps): JSX.Element {
  return (
    <InviteMemberModalHeadless teamId={teamId} seatUsage={seatUsage}>
      {({ isOpen, open, close, seatUsage: usage, formProps }) => {
        const hasAvailableSeats = usage.used < usage.total;
        return (
          <Dialog open={isOpen} onOpenChange={(v) => (v ? open() : close())}>
            <DialogTrigger asChild>
              <Button disabled={!hasAvailableSeats}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>

                  <DialogDescription>
                    Send an invitation to join your team. They&apos;ll receive an email with instructions.
                  </DialogDescription>

              </DialogHeader>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Seat Usage</span>
                  <span>
                    {usage.used}/{usage.total} seats used
                  </span>
                </div>
                <Progress value={usage.total > 0 ? (usage.used / usage.total) * 100 : 0} className="h-2" />
                {!hasAvailableSeats && (
                  <Alert variant="destructive">

                      <AlertDescription>
                        You&apos;ve reached your seat limit. Upgrade your plan or remove inactive members to invite more.
                      </AlertDescription>

                  </Alert>
                )}
              </div>

              <form onSubmit={formProps.handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <Input
                    placeholder="Enter email address"
                    type="email"
                    value={formProps.email}
                    onChange={(e) => formProps.setEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <Select value={formProps.role} onValueChange={formProps.setRole}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                      <SelectItem value="viewer">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {formProps.error && (
                  <Alert variant="destructive">
                    <AlertDescription>{formProps.error}</AlertDescription>
                  </Alert>
                )}
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={close}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={formProps.isSubmitting || !hasAvailableSeats}>
                    {formProps.isSubmitting ? 'Sending...' : 'Send Invitation'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        );
      }}
    </InviteMemberModalHeadless>
  );
}