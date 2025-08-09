export const runtime = 'nodejs';
import { type NextRequest } from 'next/server';
import { addressSchema } from '@/core/address/validation';
import {
  createSuccessResponse,
  createNoContentResponse,
} from '@/lib/api/common';
import { createApiHandler, emptySchema } from '@/lib/api/route-helpers';

function extractAddressId(url: string): string {
  const parts = new URL(url).pathname.split('/');
  return parts[parts.length - 1] || '';
}

export const GET = createApiHandler(
  emptySchema,
  async (req: NextRequest, auth, _data, services) => {
    const id = extractAddressId(req.url);
    const address = await services.addressService.getAddress(id, auth.userId!);
    return createSuccessResponse({ address });
  },
  { requireAuth: true }
);

export const PUT = createApiHandler(
  addressSchema.partial(),
  async (req: NextRequest, auth, data, services) => {
    const id = extractAddressId(req.url);
    const updated = await services.addressService.updateAddress(
      id,
      data,
      auth.userId!
    );
    return createSuccessResponse({ address: updated });
  },
  { requireAuth: true }
);

export const DELETE = createApiHandler(
  emptySchema,
  async (req: NextRequest, auth, _data, services) => {
    const id = extractAddressId(req.url);
    await services.addressService.deleteAddress(id, auth.userId!);
    return createNoContentResponse();
  },
  { requireAuth: true }
);
