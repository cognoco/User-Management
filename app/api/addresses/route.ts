export const runtime = 'nodejs';
import { NextRequest } from 'next/server';
import { withValidatedServices, schemas } from '@/lib/api/with-services';
import { addressSchema } from '@/core/address/validation';
import {
  createSuccessResponse,
  createCreatedResponse,
} from '@/lib/api/common';

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['address'],
  requireAuth: true,
  handler: async ({ userId, services }) => {
    const addresses = await services.address.getAddresses(userId);
    return createSuccessResponse({ addresses });
  }
});

export const POST = withValidatedServices({
  schema: addressSchema,
  requiredServices: ['address'],
  requireAuth: true,
  handler: async ({ userId, data, services }) => {
    const address = await services.address.createAddress({ ...data, userId });
    return createCreatedResponse({ address });
  }
});
