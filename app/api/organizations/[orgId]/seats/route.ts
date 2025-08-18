import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidatedServices, schemas } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import { SeatManager } from '@/services/subscription/seat-manager';
import { EnhancedOrganizationService } from '@/services/organization/enhanced-organization.service';

const UpdateSeatsSchema = z.object({
  seats: z.number().min(1).max(10000),
  autoUpgrade: z.boolean().optional()
});

const getHandler = async ({ 
  params, 
  userId, 
  services 
}: { 
  params: { orgId: string }, 
  userId?: string, 
  services: any 
}) => {
  // Check if user has access to this organization
  const members = await services.organization.getOrganizationMembers(params.orgId);
  const member = members.find((m: any) => m.userId === userId);
  
  if (!member) {
    return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
  }

  const seatManager = new SeatManager(
    services.organization,
    services.subscription,
    services.team
  );
  
  try {
    const [allocation, usage, upgradeOptions] = await Promise.all([
      seatManager.getSeatAllocation(params.orgId),
      seatManager.getSeatUsage(params.orgId),
      member.role === 'admin' ? seatManager.getUpgradeOptions(params.orgId) : null
    ]);
    
    const response: any = {
      allocation,
      usage,
      canAddMembers: allocation.availableSeats > 0
    };
    
    // Include upgrade options only for admins
    if (member.role === 'admin' && upgradeOptions) {
      response.upgradeOptions = upgradeOptions;
    }
    
    return createSuccessResponse(response);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get seat information' }, 
      { status: 500 }
    );
  }
};

const postHandler = async ({ 
  data,
  params, 
  userId, 
  services 
}: { 
  data: z.infer<typeof UpdateSeatsSchema>,
  params: { orgId: string }, 
  userId?: string, 
  services: any 
}) => {
  // Check if user has admin access
  const members = await services.organization.getOrganizationMembers(params.orgId);
  const member = members.find((m: any) => m.userId === userId);
  
  if (!member || member.role !== 'admin') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const seatManager = new SeatManager(
    services.organization,
    services.subscription,
    services.team
  );
  
  try {
    const result = await seatManager.upgradeSeatCount(params.orgId, data.seats);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    
    // Get updated allocation
    const allocation = await seatManager.getSeatAllocation(params.orgId);
    
    return createSuccessResponse({ 
      message: 'Seat count updated successfully',
      allocation
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update seats' }, 
      { status: 500 }
    );
  }
};

// Check seat availability endpoint
const checkHandler = async ({ 
  query,
  params, 
  userId, 
  services 
}: { 
  query: { count?: string },
  params: { orgId: string }, 
  userId?: string, 
  services: any 
}) => {
  // Check if user has access to this organization
  const members = await services.organization.getOrganizationMembers(params.orgId);
  const member = members.find((m: any) => m.userId === userId);
  
  if (!member) {
    return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
  }

  const seatManager = new SeatManager(
    services.organization,
    services.subscription,
    services.team
  );
  
  const count = parseInt(query.count || '1', 10);
  
  try {
    const result = await seatManager.canAddMember(params.orgId, count);
    return createSuccessResponse(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check seat availability' }, 
      { status: 500 }
    );
  }
};

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['organization', 'subscription', 'team'],
  requireAuth: true,
  handler: getHandler
});

export const POST = withValidatedServices({
  schema: UpdateSeatsSchema,
  requiredServices: ['organization', 'subscription', 'team'],
  requireAuth: true,
  handler: postHandler
});