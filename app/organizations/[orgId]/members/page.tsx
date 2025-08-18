'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { SeatManagement, SeatUsage, Member } from '@/components/organization/SeatManagement';
import { api } from '@/lib/api/axios';
import { Card, CardContent, CardHeader, CardTitle } from '@/ui/primitives/card';
import { Users, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/ui/primitives/alert';

export default function OrganizationMembersPage(): React.ReactElement {
  const params = useParams();
  const organizationId = params.orgId as string;
  
  const [seatUsage, setSeatUsage] = useState<SeatUsage | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [organizationId]);

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true);
      const [seatsResponse, membersResponse] = await Promise.all([
        api.get(`/api/organizations/${organizationId}/seats`),
        api.get(`/api/organizations/${organizationId}/members`)
      ]);
      
      setSeatUsage(seatsResponse.data);
      setMembers(membersResponse.data.members || []);
    } catch (err) {
      setError('Failed to load organization data');
      console.error('Error fetching organization data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSeats = async (newSeatCount: number): Promise<void> => {
    try {
      const response = await api.put(`/api/organizations/${organizationId}/seats`, {
        totalSeats: newSeatCount
      });
      
      setSeatUsage(response.data);
    } catch (error) {
      console.error('Failed to update seats:', error);
      throw new Error('Failed to update seat count');
    }
  };

  const handleInviteMember = async (email: string, role: string): Promise<void> => {
    try {
      const response = await api.post(`/api/organizations/${organizationId}/members`, {
        email,
        role
      });
      
      // Add the new member to the list (as pending)
      const newMember: Member = {
        id: response.data.inviteId,
        email,
        name: email.split('@')[0],
        role,
        status: 'pending',
        seatType: 'regular'
      };
      
      setMembers([...members, newMember]);
      
      // Update seat usage
      if (seatUsage) {
        setSeatUsage({
          ...seatUsage,
          usedSeats: seatUsage.usedSeats + 1,
          availableSeats: seatUsage.availableSeats - 1,
          pendingInvites: seatUsage.pendingInvites + 1
        });
      }
    } catch (error) {
      console.error('Failed to invite member:', error);
      throw new Error('Failed to send invitation');
    }
  };

  const handleRemoveMember = async (memberId: string): Promise<void> => {
    try {
      await api.delete(`/api/organizations/${organizationId}/members/${memberId}`);
      setMembers(members.filter(m => m.id !== memberId));
      
      // Update seat usage
      if (seatUsage) {
        setSeatUsage({
          ...seatUsage,
          usedSeats: seatUsage.usedSeats - 1,
          availableSeats: seatUsage.availableSeats + 1
        });
      }
    } catch (error) {
      console.error('Failed to remove member:', error);
      throw new Error('Failed to remove member');
    }
  };

  const handleDeactivateMember = async (memberId: string): Promise<void> => {
    try {
      await api.put(`/api/organizations/${organizationId}/members/${memberId}`, {
        status: 'deactivated'
      });
      
      setMembers(members.map(m => 
        m.id === memberId ? { ...m, status: 'deactivated' as const } : m
      ));
      
      // Update seat usage
      if (seatUsage) {
        setSeatUsage({
          ...seatUsage,
          usedSeats: seatUsage.usedSeats - 1,
          availableSeats: seatUsage.availableSeats + 1,
          deactivatedSeats: seatUsage.deactivatedSeats + 1
        });
      }
    } catch (error) {
      console.error('Failed to deactivate member:', error);
      throw new Error('Failed to deactivate member');
    }
  };

  const handleReactivateMember = async (memberId: string): Promise<void> => {
    try {
      await api.put(`/api/organizations/${organizationId}/members/${memberId}`, {
        status: 'active'
      });
      
      setMembers(members.map(m => 
        m.id === memberId ? { ...m, status: 'active' as const } : m
      ));
      
      // Update seat usage
      if (seatUsage) {
        setSeatUsage({
          ...seatUsage,
          usedSeats: seatUsage.usedSeats + 1,
          availableSeats: seatUsage.availableSeats - 1,
          deactivatedSeats: seatUsage.deactivatedSeats - 1
        });
      }
    } catch (error) {
      console.error('Failed to reactivate member:', error);
      throw new Error('Failed to reactivate member');
    }
  };

  const handleUpgradePlan = (): void => {
    // Redirect to billing page or open upgrade modal
    window.location.href = `/organizations/${organizationId}/billing`;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Team Members
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-center py-12">
              <div className="flex items-center gap-3">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Loading team data...</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error || !seatUsage) {
    return (
      <div className="container mx-auto py-8">
        <div className="max-w-6xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error || 'Failed to load team data'}</AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="max-w-6xl mx-auto">
        <SeatManagement
          organizationId={organizationId}
          seatUsage={seatUsage}
          members={members}
          onUpdateSeats={handleUpdateSeats}
          onInviteMember={handleInviteMember}
          onRemoveMember={handleRemoveMember}
          onDeactivateMember={handleDeactivateMember}
          onReactivateMember={handleReactivateMember}
          onUpgradePlan={handleUpgradePlan}
          showPricing={true}
          allowSeatPurchase={true}
        />
      </div>
    </div>
  );
}