export const runtime = 'nodejs';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createMiddlewareChain, errorHandlingMiddleware } from '@/middleware/createMiddlewareChain';
import { getOrganizationService } from '@/services/organization';
import { SeatManager } from '@/services/subscription/seat-manager';
import { getSubscriptionService } from '@/services/subscription/subscription.factory';
import { getTeamService } from '@/services/team';
import { getUserService } from '@/services/user';

const middleware = createMiddlewareChain([errorHandlingMiddleware()]);

const AddMemberSchema = z.object({
  userId: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['admin', 'member', 'viewer']).default('member'),
  skipSeatCheck: z.boolean().optional()
}).refine(data => data.userId || data.email, {
  message: 'Either userId or email must be provided'
});

export const GET = middleware(async (req: NextRequest, auth, _data, _services, params) => {
  const orgId = params.orgId as string;
  const service = getOrganizationService();
  const userService = getUserService();
  
  // Get members
  const members = await service.listMembers(orgId, auth.userId);
  
  // Enhance with user details
  const membersWithDetails = await Promise.all(
    members.map(async (member: any) => {
      const user = await userService.getUser(member.userId);
      return {
        ...member,
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar
        } : null
      };
    })
  );
  
  return NextResponse.json({ members: membersWithDetails });
});

export const POST = middleware(async (req: NextRequest, auth, _data, _services, params) => {
  const orgId = params.orgId as string;
  const body = await req.json();
  
  // Validate input
  const validationResult = AddMemberSchema.safeParse(body);
  if (!validationResult.success) {
    return NextResponse.json(
      { error: 'Invalid request data', details: validationResult.error.errors },
      { status: 400 }
    );
  }
  
  const data = validationResult.data;
  const service = getOrganizationService();
  const userService = getUserService();
  
  // Check if user has admin access
  const members = await service.listMembers(orgId, auth.userId);
  const currentMember = members.find((m: any) => m.userId === auth.userId);
  
  if (!currentMember || currentMember.role !== 'admin') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }
  
  // Get user ID from email if not provided
  let targetUserId = data.userId;
  if (!targetUserId && data.email) {
    const user = await userService.getUserByEmail(data.email);
    if (!user) {
      return NextResponse.json({ error: 'User not found with that email' }, { status: 404 });
    }
    targetUserId = user.id;
  }
  
  // Check if user is already a member
  const existingMember = members.find((m: any) => m.userId === targetUserId);
  if (existingMember) {
    return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
  }
  
  // Check seat availability unless explicitly skipped
  if (!data.skipSeatCheck) {
    const seatManager = new SeatManager(
      service,
      getSubscriptionService(),
      getTeamService()
    );
    
    const seatCheck = await seatManager.enforceSeatLimit(
      orgId,
      'add_member',
      1
    );
    
    if (!seatCheck.allowed) {
      return NextResponse.json(
        { 
          error: seatCheck.error,
          suggestion: seatCheck.suggestion 
        }, 
        { status: 402 } // Payment Required
      );
    }
  }
  
  try {
    // Add member to organization
    await service.addMember(orgId, auth.userId, targetUserId!, data.role);
    
    // Get user details for response
    const user = await userService.getUser(targetUserId!);
    
    return NextResponse.json({ 
      member: {
        organizationId: orgId,
        userId: targetUserId,
        role: data.role,
        user: user ? {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar: user.avatar
        } : null
      }
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add member' }, 
      { status: 500 }
    );
  }
});
