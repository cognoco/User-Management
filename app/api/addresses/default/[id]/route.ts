export const runtime = 'nodejs';
import { type NextRequest } from 'next/server';
import { createApiHandler, emptySchema } from '@/lib/api/route-helpers';
import { createNoContentResponse } from '@/lib/api/common';

function extractAddressId(url: string): string {
  const parts = new URL(url).pathname.split('/');
  return parts[parts.length - 1] || '';
}

export const POST = createApiHandler(
  emptySchema,
  async (req: NextRequest, auth, _data, services) => {
    const id = extractAddressId(req.url);
    await services.addressService.setDefaultAddress(id, auth.userId!);
    return createNoContentResponse();
  },
  { requireAuth: true }
);
