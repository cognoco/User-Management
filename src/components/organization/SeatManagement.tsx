import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Button } from '@/ui/primitives/button';
import { Input } from '@/ui/primitives/input';
import { Label } from '@/ui/primitives/label';
import { Badge } from '@/ui/primitives/badge';
import { Progress } from '@/ui/primitives/progress';
import { Alert, AlertDescription, AlertTitle } from '@/ui/primitives/alert';
import { Separator } from '@/ui/primitives/separator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/ui/primitives/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table';
import {
  Users,
  UserPlus,
  UserMinus,
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingUp,
  DollarSign,
  Mail,
  Clock,
  Shield,
  Settings,
  ChevronRight,
} from 'lucide-react';

export interface SeatUsage {
  organizationId: string;
  planName: string;
  totalSeats: number;
  usedSeats: number;
  availableSeats: number;
  pendingInvites: number;
  deactivatedSeats: number;
  reservedSeats: number;
  seatPrice: number;
  currency: string;
  billingCycle: 'monthly' | 'yearly';
  overageAllowed: boolean;
  overagePrice?: number;
  nextBillingDate?: Date;
}

export interface Member {
  id: string;
  email: string;
  name: string;
  role: string;
  status: 'active' | 'pending' | 'deactivated';
  joinedAt?: Date;
  lastActiveAt?: Date;
  seatType: 'regular' | 'guest' | 'admin';
}

interface SeatManagementProps {
  organizationId: string;
  seatUsage: SeatUsage;
  members?: Member[];
  onUpdateSeats: (newSeatCount: number) => Promise<void>;
  onInviteMember: (email: string, role: string) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
  onDeactivateMember: (memberId: string) => Promise<void>;
  onReactivateMember: (memberId: string) => Promise<void>;
  onUpgradePlan?: () => void;
  showPricing?: boolean;
  allowSeatPurchase?: boolean;
}

export function SeatManagement({
  organizationId,
  seatUsage,
  members = [],
  onUpdateSeats,
  onInviteMember,
  onRemoveMember,
  onDeactivateMember,
  onReactivateMember,
  onUpgradePlan,
  showPricing = true,
  allowSeatPurchase = true,
}: SeatManagementProps): React.ReactElement {
  const [isAddingSeats, setIsAddingSeats] = useState(false);
  const [additionalSeats, setAdditionalSeats] = useState(1);
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  const usagePercentage = (seatUsage.usedSeats / seatUsage.totalSeats) * 100;
  const isNearLimit = usagePercentage >= 80;
  const isAtLimit = seatUsage.availableSeats <= 0;

  const calculateAdditionalCost = (): number => {
    const basePrice = additionalSeats * seatUsage.seatPrice;
    if (seatUsage.billingCycle === 'yearly') {
      return basePrice * 12;
    }
    return basePrice;
  };

  const handleAddSeats = async (): Promise<void> => {
    setIsProcessing(true);
    setError(null);
    try {
      await onUpdateSeats(seatUsage.totalSeats + additionalSeats);
      setSuccess(`Successfully added ${additionalSeats} seat${additionalSeats > 1 ? 's' : ''}`);
      setIsAddingSeats(false);
      setAdditionalSeats(1);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to add seats. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleInviteMember = async (): Promise<void> => {
    if (!inviteEmail) {
      setError('Please enter an email address');
      return;
    }

    if (seatUsage.availableSeats <= 0 && !seatUsage.overageAllowed) {
      setError('No seats available. Please add more seats or remove existing members.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      await onInviteMember(inviteEmail, inviteRole);
      setSuccess(`Invitation sent to ${inviteEmail}`);
      setIsInviting(false);
      setInviteEmail('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to send invitation. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveMember = async (member: Member): Promise<void> => {
    setIsProcessing(true);
    setError(null);
    try {
      if (member.status === 'deactivated') {
        await onRemoveMember(member.id);
        setSuccess(`${member.name} has been removed`);
      } else {
        await onDeactivateMember(member.id);
        setSuccess(`${member.name} has been deactivated`);
      }
      setSelectedMember(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to update member. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReactivateMember = async (member: Member): Promise<void> => {
    if (seatUsage.availableSeats <= 0 && !seatUsage.overageAllowed) {
      setError('No seats available. Please add more seats first.');
      return;
    }

    setIsProcessing(true);
    setError(null);
    try {
      await onReactivateMember(member.id);
      setSuccess(`${member.name} has been reactivated`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to reactivate member. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusBadge = (status: Member['status']): React.ReactElement => {
    const configs = {
      active: { variant: 'default' as const, text: 'Active' },
      pending: { variant: 'secondary' as const, text: 'Pending' },
      deactivated: { variant: 'outline' as const, text: 'Deactivated' },
    };
    
    const config = configs[status];
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

  const getRoleBadge = (role: string): React.ReactElement => {
    const colors: Record<string, string> = {
      owner: 'text-purple-600 bg-purple-100',
      admin: 'text-blue-600 bg-blue-100',
      member: 'text-gray-600 bg-gray-100',
      guest: 'text-green-600 bg-green-100',
    };
    
    return (
      <Badge className={colors[role.toLowerCase()] || colors.member}>
        {role.charAt(0).toUpperCase() + role.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Seat Usage Overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Seat Management
              </CardTitle>
              <CardDescription>
                Manage team members and seat allocation
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {allowSeatPurchase && (
                <Button
                  variant="outline"
                  onClick={() => setIsAddingSeats(true)}
                  disabled={isProcessing}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Seats
                </Button>
              )}
              <Button
                onClick={() => setIsInviting(true)}
                disabled={isAtLimit && !seatUsage.overageAllowed}
              >
                <Mail className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* Usage Statistics */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Seat Usage</p>
                <p className="text-2xl font-bold">
                  {seatUsage.usedSeats} / {seatUsage.totalSeats}
                </p>
                <p className="text-sm text-muted-foreground">
                  {seatUsage.availableSeats} available
                </p>
              </div>
              <div className="text-right">
                <Badge variant="secondary" className="mb-2">
                  {seatUsage.planName}
                </Badge>
                {showPricing && (
                  <p className="text-sm text-muted-foreground">
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: seatUsage.currency,
                    }).format(seatUsage.seatPrice)}/seat/{seatUsage.billingCycle === 'monthly' ? 'mo' : 'yr'}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Usage</span>
                <span>{Math.round(usagePercentage)}%</span>
              </div>
              <Progress value={usagePercentage} className={isNearLimit ? 'bg-orange-100' : ''} />
            </div>

            {isNearLimit && (
              <Alert variant={isAtLimit ? 'destructive' : 'default'}>
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>
                  {isAtLimit ? 'Seat Limit Reached' : 'Approaching Seat Limit'}
                </AlertTitle>
                <AlertDescription>
                  {isAtLimit
                    ? 'You have no available seats. Add more seats to invite new members.'
                    : `You have only ${seatUsage.availableSeats} seat${seatUsage.availableSeats !== 1 ? 's' : ''} remaining.`}
                  {onUpgradePlan && (
                    <Button
                      variant="link"
                      className="px-0 mt-2"
                      onClick={onUpgradePlan}
                    >
                      Upgrade your plan
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Seat Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Active Members</p>
                <p className="text-xl font-semibold">{seatUsage.usedSeats - seatUsage.pendingInvites}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Pending Invites</p>
                <p className="text-xl font-semibold">{seatUsage.pendingInvites}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Deactivated</p>
                <p className="text-xl font-semibold">{seatUsage.deactivatedSeats}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Reserved</p>
                <p className="text-xl font-semibold">{seatUsage.reservedSeats}</p>
              </div>
            </div>

            {seatUsage.overageAllowed && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Overage Allowed</AlertTitle>
                <AlertDescription>
                  You can exceed your seat limit. Additional seats will be charged at{' '}
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: seatUsage.currency,
                  }).format(seatUsage.overagePrice || seatUsage.seatPrice)}/seat/{seatUsage.billingCycle === 'monthly' ? 'month' : 'year'}.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Manage your team members and their access
          </CardDescription>
        </CardHeader>
        <CardContent>
          {members.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No team members yet</p>
              <Button onClick={() => setIsInviting(true)}>
                <Mail className="h-4 w-4 mr-2" />
                Invite Your First Member
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{member.name}</p>
                        <p className="text-sm text-muted-foreground">{member.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>{getRoleBadge(member.role)}</TableCell>
                    <TableCell>{getStatusBadge(member.status)}</TableCell>
                    <TableCell>
                      {member.joinedAt ? (
                        <div className="text-sm">
                          <p>{new Date(member.joinedAt).toLocaleDateString()}</p>
                          {member.lastActiveAt && (
                            <p className="text-muted-foreground">
                              Active {new Date(member.lastActiveAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Pending</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {member.status === 'deactivated' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReactivateMember(member)}
                            disabled={isProcessing}
                          >
                            Reactivate
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedMember(member)}
                            disabled={isProcessing || member.role === 'owner'}
                          >
                            <Settings className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Seats Dialog */}
      <Dialog open={isAddingSeats} onOpenChange={setIsAddingSeats}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Seats</DialogTitle>
            <DialogDescription>
              Add more seats to your organization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="seat-count">Number of Seats</Label>
              <Input
                id="seat-count"
                type="number"
                min="1"
                max="100"
                value={additionalSeats}
                onChange={(e) => setAdditionalSeats(parseInt(e.target.value) || 1)}
              />
            </div>

            {showPricing && (
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Additional seats</span>
                  <span>{additionalSeats}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price per seat</span>
                  <span>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: seatUsage.currency,
                    }).format(seatUsage.seatPrice)}/{seatUsage.billingCycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between font-medium">
                  <span>Total additional cost</span>
                  <span>
                    {new Intl.NumberFormat('en-US', {
                      style: 'currency',
                      currency: seatUsage.currency,
                    }).format(calculateAdditionalCost())}/{seatUsage.billingCycle === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </div>
              </div>
            )}

            {seatUsage.nextBillingDate && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Changes will be reflected in your next billing cycle on{' '}
                  {new Date(seatUsage.nextBillingDate).toLocaleDateString()}.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddingSeats(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSeats} disabled={isProcessing}>
              {isProcessing ? 'Adding...' : `Add ${additionalSeats} Seat${additionalSeats > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Member Dialog */}
      <Dialog open={isInviting} onOpenChange={setIsInviting}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your organization
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colleague@example.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <select
                id="invite-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="guest">Guest</option>
              </select>
            </div>

            {seatUsage.availableSeats <= 0 && seatUsage.overageAllowed && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  You have no available seats. This invitation will use overage pricing at{' '}
                  {new Intl.NumberFormat('en-US', {
                    style: 'currency',
                    currency: seatUsage.currency,
                  }).format(seatUsage.overagePrice || seatUsage.seatPrice)}/seat.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviting(false)}>
              Cancel
            </Button>
            <Button onClick={handleInviteMember} disabled={isProcessing || !inviteEmail}>
              {isProcessing ? 'Sending...' : 'Send Invitation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Member Management Dialog */}
      {selectedMember && (
        <Dialog open={!!selectedMember} onOpenChange={() => setSelectedMember(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Member</DialogTitle>
              <DialogDescription>
                {selectedMember.name} ({selectedMember.email})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Current Role</p>
                <div>{getRoleBadge(selectedMember.role)}</div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Status</p>
                <div>{getStatusBadge(selectedMember.status)}</div>
              </div>

              {selectedMember.joinedAt && (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Member Since</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(selectedMember.joinedAt).toLocaleDateString()}
                  </p>
                </div>
              )}

              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  {selectedMember.status === 'active'
                    ? 'Deactivating this member will free up their seat but preserve their data.'
                    : 'This member is currently deactivated. You can reactivate them or permanently remove them.'}
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedMember(null)}>
                Cancel
              </Button>
              {selectedMember.status === 'active' ? (
                <Button
                  variant="destructive"
                  onClick={() => handleRemoveMember(selectedMember)}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Deactivate Member'}
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => handleRemoveMember(selectedMember)}
                  disabled={isProcessing}
                >
                  {isProcessing ? 'Processing...' : 'Remove Permanently'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}