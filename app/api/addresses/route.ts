import { NextRequest } from 'next/server';
import { createApiHandler, emptySchema } from '@/lib/api/route-helpers';
import { addressSchema } from '@/core/address/validation';
import {
  createSuccessResponse,
  createCreatedResponse,
} from '@/lib/api/common';

export const GET = createApiHandler(
  emptySchema,
  async (req: NextRequest, authContext: any, data: any, services: any) => {
    const addresses = await services.address!.getAddresses(authContext.userId);
    return createSuccessResponse({ addresses });
  },
  {
    requireAuth: true,
  }
);

export const POST = createApiHandler(
  addressSchema,
  async (req: NextRequest, authContext: any, data: any, services: any) => {
    const address = await services.address!.createAddress({ ...data, userId: authContext.userId });
    return createCreatedResponse({ address });
  },
  {
    requireAuth: true,
  }
);
