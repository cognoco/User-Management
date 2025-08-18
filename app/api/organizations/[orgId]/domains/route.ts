import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidatedServices, schemas } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import { DomainVerificationService } from '@/services/domain/domain-verification.service';

const AddDomainSchema = z.object({
  domain: z.string().min(1).regex(/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/),
  verificationMethod: z.enum(['dns-txt', 'dns-cname', 'email', 'file']).optional()
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
  const org = await services.organization.getOrganization(params.orgId);
  if (!org) {
    return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
  }

  // Get verified domains
  const domainService = new DomainVerificationService();
  const domains = await domainService.getVerifiedDomains(params.orgId);
  
  return createSuccessResponse({ domains });
};

const postHandler = async ({ 
  data, 
  params, 
  userId, 
  services 
}: { 
  data: z.infer<typeof AddDomainSchema>, 
  params: { orgId: string }, 
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
    const verification = await domainService.initiateDomainVerification(
      params.orgId,
      data.domain,
      data.verificationMethod || 'dns-txt'
    );
    
    return NextResponse.json({ 
      domain: data.domain,
      verificationMethod: verification.verificationMethod,
      verificationToken: verification.verificationToken,
      verificationValue: verification.verificationValue,
      instructions: getVerificationInstructions(verification.verificationMethod, verification)
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to add domain' }, 
      { status: 400 }
    );
  }
};

function getVerificationInstructions(method: string, verification: any) {
  switch (method) {
    case 'dns-txt':
      return {
        type: 'DNS TXT Record',
        recordName: `_zdx-verify.${verification.domain}`,
        recordValue: verification.verificationValue,
        steps: [
          'Log in to your DNS provider',
          'Add a new TXT record',
          `Set the name/host to: _zdx-verify`,
          `Set the value to: ${verification.verificationValue}`,
          'Save the record and wait for DNS propagation (up to 48 hours)'
        ]
      };
    case 'dns-cname':
      return {
        type: 'DNS CNAME Record',
        recordName: `_zdx-domain.${verification.domain}`,
        recordValue: `verify-${verification.organizationId}.zdx-verification.com`,
        steps: [
          'Log in to your DNS provider',
          'Add a new CNAME record',
          `Set the name/host to: _zdx-domain`,
          `Set the value to: verify-${verification.organizationId}.zdx-verification.com`,
          'Save the record and wait for DNS propagation'
        ]
      };
    case 'email':
      return {
        type: 'Email Verification',
        steps: [
          'Check the admin email address for your domain',
          'Click the verification link in the email',
          'The link expires in 72 hours'
        ]
      };
    case 'file':
      return {
        type: 'File Upload',
        filePath: `/.well-known/zdx-verify/${verification.verificationToken}.txt`,
        fileContent: verification.verificationValue,
        steps: [
          'Create a file with the verification token as the name',
          `Upload it to: /.well-known/zdx-verify/${verification.verificationToken}.txt`,
          `File content should be: ${verification.verificationValue}`,
          'Ensure the file is publicly accessible'
        ]
      };
    default:
      return {};
  }
}

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['organization'],
  requireAuth: true,
  handler: getHandler
});

export const POST = withValidatedServices({
  schema: AddDomainSchema,
  requiredServices: ['organization'],
  requireAuth: true,
  handler: postHandler
});