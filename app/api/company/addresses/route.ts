import { NextRequest, NextResponse } from "next/server";
import { type AuthContext } from "@/core/config/interfaces";
import { addressCreateSchema } from "@/core/address/models";
import { createApiHandler } from "@/lib/api/route-helpers";
import { createSuccessResponse } from "@/lib/api/common";
import { getApiAddressService } from "@/services/address/factory";

import { z } from "zod";
type AddressRequest = z.infer<typeof addressCreateSchema>;

async function handlePost(
  _request: NextRequest,
  auth: AuthContext,
  data: AddressRequest,
) {
  try {
    const userId = auth.userId!;
    const addressService = getApiAddressService();

    const created = await addressService.createAddress({
      userId,
      type: data.type as 'billing' | 'shipping',
      isDefault: data.is_primary ?? false,
      fullName: '',
      street1: data.street_line1,
      street2: data.street_line2,
      city: data.city,
      state: data.state ?? '',
      postalCode: data.postal_code,
      country: data.country,
    });

    return createSuccessResponse(created, 201);
  } catch (error) {
    console.error('Unexpected error in POST /api/company/addresses:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred' },
      { status: 500 },
    );
  }
}

async function handleGet(
  _request: NextRequest,
  auth: AuthContext,
  _data: unknown,
) {
  try {
    const userId = auth.userId!;
    const addressService = getApiAddressService();

    const addresses = await addressService.getAddresses(userId);

    return createSuccessResponse(addresses);
  } catch (error) {
    console.error('Unexpected error in GET /api/company/addresses:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred' },
      { status: 500 },
    );
  }
}

export const POST = createApiHandler(
  addressCreateSchema,
  (req, auth, data) => handlePost(req, auth, data),
  { requireAuth: true }
);

export const GET = createApiHandler(
  z.object({}),
  (req, auth, data) => handleGet(req, auth, data),
  { requireAuth: true }
);
