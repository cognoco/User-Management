import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidatedServices, schemas } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import { DomainVerificationService } from '@/services/domain/domain-verification.service';

const VerifyDomainSchema = z.object({
  method: z.enum(['dns-txt', 'dns-cname', 'email', 'file']).optional(),
  token: z.string().optional()
});

const postHandler = async ({ 
  data,
  params, 
  userId, 
  services 
}: { 
  data: z.infer<typeof VerifyDomainSchema>,
  params: { orgId: string, domain: string }, 
  userId?: string, 
  services: any 
}) => {
  // Check if user has admin access to this organization
  const members = await services.organization.getOrganizationMembers(params.orgId);
  const member = members.find((m: any) => m.userId === userId);
  
  if (!member || member.role !== 'admin') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const domainService = new DomainVerificationService();
  
  try {
    let result;
    
    // If token provided, complete email verification
    if (data.token) {
      result = await domainService.completeEmailVerification(
        params.orgId,
        params.domain,
        data.token
      );
    } else {
      // Check verification status based on method
      result = await domainService.checkVerificationStatus(params.orgId, params.domain);
    }
    
    if (result.verified) {
      return createSuccessResponse({ 
        verified: true,
        domain: params.domain,
        message: 'Domain successfully verified'
      });
    } else {
      return NextResponse.json({ 
        verified: false,
        domain: params.domain,
        error: result.error || 'Verification failed',
        details: result.details
      }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Verification failed' }, 
      { status: 500 }
    );
  }
};

const deleteHandler = async ({ 
  params, 
  userId, 
  services 
}: { 
  params: { orgId: string, domain: string }, 
  userId?: string, 
  services: any 
}) => {
  // Check if user has admin access
  const members = await services.organization.getOrganizationMembers(params.orgId);
  const member = members.find((m: any) => m.userId === userId);
  
  if (!member || member.role !== 'admin') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  const domainService = new DomainVerificationService();
  
  try {
    await domainService.removeDomain(params.orgId, params.domain);
    return createSuccessResponse({ message: 'Domain removed successfully' });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove domain' }, 
      { status: 500 }
    );
  }
};

export const POST = withValidatedServices({
  schema: VerifyDomainSchema,
  requiredServices: ['organization'],
  requireAuth: true,
  handler: postHandler
});

export const DELETE = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['organization'],
  requireAuth: true,
  handler: deleteHandler
});