import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidatedServices, schemas } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';

const SSOConfigSchema = z.object({
  provider: z.enum(['saml', 'oidc', 'google', 'microsoft', 'okta']),
  enabled: z.boolean(),
  config: z.object({
    issuer: z.string().optional(),
    clientId: z.string().optional(),
    clientSecret: z.string().optional(),
    authorizationUrl: z.string().optional(),
    tokenUrl: z.string().optional(),
    userInfoUrl: z.string().optional(),
    callbackUrl: z.string().optional(),
    metadataUrl: z.string().optional(),
    certificate: z.string().optional(),
    signatureAlgorithm: z.string().optional(),
    assertionConsumerServiceUrl: z.string().optional(),
    entityId: z.string().optional(),
    attributeMapping: z.record(z.string()).optional()
  }).optional()
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
  // Check if user has admin access
  const members = await services.organization.getOrganizationMembers(params.orgId);
  const member = members.find((m: any) => m.userId === userId);
  
  if (!member || member.role !== 'admin') {
    return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
  }

  // Get SSO configuration from storage
  // This is a placeholder - actual implementation would query SSO service
  const ssoConfig = {
    enabled: false,
    providers: [],
    domainRestriction: true,
    autoProvision: false,
    defaultRole: 'member'
  };
  
  return createSuccessResponse({ ssoConfig });
};

const postHandler = async ({ 
  data,
  params, 
  userId, 
  services 
}: { 
  data: z.infer<typeof SSOConfigSchema>,
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

  // Check if organization has SSO enabled in their plan
  const org = await services.organization.getOrganization(params.orgId);
  if (!org?.settings?.ssoEnabled) {
    return NextResponse.json(
      { error: 'SSO is not available for your organization plan' }, 
      { status: 403 }
    );
  }

  try {
    // Store SSO configuration
    // This is a placeholder - actual implementation would use SSO service
    const ssoConfig = {
      organizationId: params.orgId,
      provider: data.provider,
      enabled: data.enabled,
      config: data.config,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Generate SSO URLs for the organization
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const ssoUrls = {
      loginUrl: `${baseUrl}/auth/sso/${params.orgId}`,
      callbackUrl: `${baseUrl}/api/auth/sso/${params.orgId}/callback`,
      metadataUrl: `${baseUrl}/api/organizations/${params.orgId}/sso/metadata`,
      logoutUrl: `${baseUrl}/api/auth/sso/${params.orgId}/logout`
    };
    
    return NextResponse.json({ 
      message: 'SSO configuration updated successfully',
      ssoUrls,
      provider: data.provider,
      enabled: data.enabled
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to configure SSO' }, 
      { status: 500 }
    );
  }
};

const deleteHandler = async ({ 
  params, 
  userId, 
  services 
}: { 
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

  try {
    // Remove SSO configuration
    // This is a placeholder - actual implementation would use SSO service
    
    return createSuccessResponse({ 
      message: 'SSO configuration removed successfully' 
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to remove SSO configuration' }, 
      { status: 500 }
    );
  }
};

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['organization'],
  requireAuth: true,
  handler: getHandler
});

export const POST = withValidatedServices({
  schema: SSOConfigSchema,
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