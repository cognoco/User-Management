import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { type AuthContext } from "@/core/config/interfaces";
import { addressUpdateSchema } from "@/core/address/models";
import { createApiHandler } from "@/lib/api/route-helpers";
import { createSuccessResponse } from "@/lib/api/common";
import { getApiAddressService } from "@/services/address/factory";

// Use the shared address update schema from the core layer
type AddressUpdateRequest = z.infer<typeof addressUpdateSchema>;

async function handlePut(
  _request: NextRequest,
  params: { addressId: string },
  auth: AuthContext,
  data: AddressUpdateRequest,
) {
  try {
    const userId = auth.userId!;
    const addressService = getApiAddressService();

    const updated = await addressService.updateAddress(
      params.addressId,
      data as any,
      userId,
    );

    return createSuccessResponse(updated);
  } catch (error) {
    console.error(
      "Unexpected error in PUT /api/company/addresses/[addressId]:",
      error,
    );
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 },
    );
  }
}

async function handleDelete(
  _request: NextRequest,
  params: { addressId: string },
  auth: AuthContext,
) {
  try {
    const userId = auth.userId!;
    const addressService = getApiAddressService();

    await addressService.deleteAddress(params.addressId, userId);

    return createSuccessResponse({ success: true });
  } catch (error) {
    console.error(
      "Unexpected error in DELETE /api/company/addresses/[addressId]:",
      error,
    );
    return NextResponse.json(
      { error: "An internal server error occurred" },
      { status: 500 },
    );
  }
}

export const PUT = (req: NextRequest, ctx: { params: { addressId: string } }) =>
  createApiHandler(
    addressUpdateSchema,
    (r, auth, data) => handlePut(r, ctx.params, auth, data),
    { requireAuth: true }
  )(req);

export const DELETE = (
  req: NextRequest,
  ctx: { params: { addressId: string } }
) =>
  createApiHandler(
    z.object({}),
    (r, auth, _d) => handleDelete(r, ctx.params, auth),
    { requireAuth: true }
  )(req);
