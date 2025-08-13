import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidatedServices, schemas, WithServicesContext } from '@/lib/api/with-services';
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common';

const UpdateOrgSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
});

const getHandler = async ({ params, services }: WithServicesContext<Record<string, never>>) => {
  const orgId = params?.orgId;
  if (!orgId) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Organization ID is required', 400);
  }

  const org = await services.organization.getOrganization(orgId);
  if (!org) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, 'Organization not found', 404);
  }
  return createSuccessResponse({ organization: org });
};

const putHandler = async ({ data, params, services }: WithServicesContext<z.infer<typeof UpdateOrgSchema>>) => {
  const orgId = params?.orgId;
  if (!orgId) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Organization ID is required', 400);
  }

  const result = await services.organization.updateOrganization(orgId, data);
  if (!result.success || !result.organization) {
    throw new ApiError(
      ERROR_CODES.INVALID_REQUEST,
      result.error || 'Failed to update organization',
      400
    );
  }
  return createSuccessResponse({ organization: result.organization });
};

const deleteHandler = async ({ params, services }: WithServicesContext<Record<string, never>>) => {
  const orgId = params?.orgId;
  if (!orgId) {
    throw new ApiError(ERROR_CODES.INVALID_REQUEST, 'Organization ID is required', 400);
  }

  const result = await services.organization.deleteOrganization(orgId);
  if (!result.success) {
    throw new ApiError(
      ERROR_CODES.INVALID_REQUEST,
      result.error || 'Failed to delete organization',
      400
    );
  }
  return createSuccessResponse({ success: true });
};

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['organization'],
  requireAuth: true,
  handler: getHandler
});

export const PUT = withValidatedServices({
  schema: UpdateOrgSchema,
  requiredServices: ['organization'],
  requireAuth: true,
  handler: putHandler
});

export const DELETE = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['organization'],
  requireAuth: true,
  handler: deleteHandler
});
