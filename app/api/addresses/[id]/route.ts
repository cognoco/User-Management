export const runtime = 'nodejs';
import { type NextRequest } from 'next/server';
import { addressSchema } from '@/core/address/validation';
import {
  createSuccessResponse,
  createNoContentResponse,
} from '@/lib/api/common';
import { withValidatedServices, schemas } from '@/lib/api/with-services';

function extractAddressId(url: string): string {
  const parts = new URL(url).pathname.split('/');
  return parts[parts.length - 1] || '';
}

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['address'],
  requireAuth: true,
  handler: async ({ request, userId, services }) => {
    const id = extractAddressId(request.url);
    const address = await services.address.getAddress(id, userId!);
    return createSuccessResponse({ address });
  }
});

export const PUT = withValidatedServices({
  schema: addressSchema.partial(),
  requiredServices: ['address'],
  requireAuth: true,
  handler: async ({ request, userId, data, services }) => {
    const id = extractAddressId(request.url);
    const updated = await services.address.updateAddress(
      id,
      data,
      userId!
    );
    return createSuccessResponse({ address: updated });
  }
});

export const DELETE = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['address'],
  requireAuth: true,
  handler: async ({ request, userId, services }) => {
    const id = extractAddressId(request.url);
    await services.address.deleteAddress(id, userId!);
    return createNoContentResponse();
  }
});
