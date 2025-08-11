import { NextResponse } from "next/server";
import { addressCreateSchema } from "@/core/address/models";
import { withValidatedServices, schemas } from "@/src/lib/api/with-services";
import { createSuccessResponse } from "@/lib/api/common";
import { getApiAddressService } from "@/services/address/factory";
import { getApiCompanyService } from "@/services/company/factory";

import { z } from "zod";
type AddressRequest = z.infer<typeof addressCreateSchema>;

const postHandler = async ({ data, userId }: { data: AddressRequest, userId?: string }) => {
  try {
    const companyService = getApiCompanyService();
    const addressService = getApiAddressService();
    const companyProfile = await companyService.getProfileByUserId(userId!);
    if (!companyProfile) {
      return NextResponse.json(
        { error: 'Company profile not found' },
        { status: 404 },
      );
    }

    const result = await addressService.createAddress(
      companyProfile.id,
      data,
    );

    if (!result.success || !result.address) {
      console.error('Error creating address:', result.error);
      return NextResponse.json(
        { error: 'Failed to create address' },
        { status: 500 },
      );
    }

    return createSuccessResponse(result.address, 201);
  } catch (error) {
    console.error('Unexpected error in POST /api/company/addresses:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred' },
      { status: 500 },
    );
  }
};

const getHandler = async ({ userId }: { userId?: string }) => {
  try {
    const companyService = getApiCompanyService();
    const addressService = getApiAddressService();
    const companyProfile = await companyService.getProfileByUserId(userId!);

    if (!companyProfile) {
      return NextResponse.json(
        { error: 'Company profile not found' },
        { status: 404 },
      );
    }

    const addresses = await addressService.getAddresses(companyProfile.id);

    return createSuccessResponse(addresses);
  } catch (error) {
    console.error('Unexpected error in GET /api/company/addresses:', error);
    return NextResponse.json(
      { error: 'An internal server error occurred' },
      { status: 500 },
    );
  }
};

export const POST = withValidatedServices({
  schema: addressCreateSchema,
  requiredServices: [],
  requireAuth: true,
  handler: postHandler
});

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: [],
  requireAuth: true,
  handler: getHandler
});
