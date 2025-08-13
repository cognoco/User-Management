import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidatedServices, schemas } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';

const CreateOrgSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional()
});

const getHandler = async ({ userId, services }: { userId?: string, services: any }) => {
  const orgs = await services.organization.getUserOrganizations(userId!);
  return createSuccessResponse({ organizations: orgs });
};

const postHandler = async ({ data, userId, services }: { data: z.infer<typeof CreateOrgSchema>, userId?: string, services: any }) => {
  const result = await services.organization.createOrganization(userId!, data);
  if (!result.success || !result.organization) {
    return NextResponse.json({ error: result.error || 'Failed to create organization' }, { status: 400 });
  }
  return NextResponse.json({ organization: result.organization }, { status: 201 });
};

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['organization'],
  requireAuth: true,
  handler: getHandler
});

export const POST = withValidatedServices({
  schema: CreateOrgSchema,
  requiredServices: ['organization'],
  requireAuth: true,
  handler: postHandler
});
