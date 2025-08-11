export const runtime = 'nodejs';
import { addressUpdateSchema } from '@/core/address/models';
import { withValidatedServices, schemas } from '@/lib/api/with-services';
import {
  createSuccessResponse,
  ApiError,
  ERROR_CODES
} from '@/lib/api/common';


export const PUT = withValidatedServices({
  schema: addressUpdateSchema,
  requiredServices: ['company', 'address'],
  requireAuth: true,
  handler: async ({ data, params, userId, services }) => {
    const companyProfile = await services.company.getProfileByUserId(userId!);

    if (!companyProfile) {
      throw new ApiError(
        ERROR_CODES.NOT_FOUND,
        'Company profile not found',
        404
      );
    }

    const result = await services.address.updateAddress(
      companyProfile.id,
      params.addressId,
      data,
    );

    if (!result.success) {
      console.error('Error updating address:', result.error);
      throw new ApiError(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to update address',
        500
      );
    }

    return createSuccessResponse(result.address);
  },
});

export const DELETE = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['company', 'address'],
  requireAuth: true,
  handler: async ({ params, userId, services }) => {
    const companyProfile = await services.company.getProfileByUserId(userId!);

    if (!companyProfile) {
      throw new ApiError(
        ERROR_CODES.NOT_FOUND,
        'Company profile not found',
        404
      );
    }

    const result = await services.address.deleteAddress(
      companyProfile.id,
      params.addressId,
    );

    if (!result.success) {
      console.error('Error deleting address:', result.error);
      throw new ApiError(
        ERROR_CODES.INTERNAL_ERROR,
        'Failed to delete address',
        500
      );
    }

    return createSuccessResponse({ success: true });
  },
});

