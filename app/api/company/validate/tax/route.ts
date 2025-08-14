import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiCompanyService } from '@/services/company/factory';
import { checkRateLimit } from '@/middleware/rate-limit';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';

const ValidationRequestSchema = z.object({
  taxId: z.string().min(1),
  countryCode: z.string().min(2).max(3), // ISO 3166-1 alpha-2 or alpha-3
});

interface ValidationRequest extends z.infer<typeof ValidationRequestSchema> {}

interface ValidationResult {
  isValid: boolean;
  details: any;
  status: 'valid' | 'invalid' | 'not_supported' | 'error';
  message: string;
}

// --- Country-specific validation strategies ---
const countryValidators: Record<string, (taxId: string) => Promise<ValidationResult>> = {
  // EU VAT (mock VIES)
  'DE': async (taxId) => ({
    isValid: /^DE[0-9]{9}$/.test(taxId),
    details: { system: 'VIES', country: 'DE' },
    status: /^DE[0-9]{9}$/.test(taxId) ? 'valid' : 'invalid',
    message: /^DE[0-9]{9}$/.test(taxId) ? 'Valid German VAT ID' : 'Invalid German VAT ID',
  }),
  'FR': async (taxId) => ({
    isValid: /^FR[0-9A-Z]{2}[0-9]{9}$/.test(taxId),
    details: { system: 'VIES', country: 'FR' },
    status: /^FR[0-9A-Z]{2}[0-9]{9}$/.test(taxId) ? 'valid' : 'invalid',
    message: /^FR[0-9A-Z]{2}[0-9]{9}$/.test(taxId) ? 'Valid French VAT ID' : 'Invalid French VAT ID',
  }),
  // US EIN (mock)
  'US': async (taxId) => ({
    isValid: /^[0-9]{2}-[0-9]{7}$/.test(taxId),
    details: { system: 'IRS', country: 'US' },
    status: /^[0-9]{2}-[0-9]{7}$/.test(taxId) ? 'valid' : 'invalid',
    message: /^[0-9]{2}-[0-9]{7}$/.test(taxId) ? 'Valid US EIN' : 'Invalid US EIN',
  }),
  // Add more countries here as needed
};

const postHandler = async ({ request, data, userId }: { request: any, data: ValidationRequest, userId?: string }) => {
  const isRateLimited = await checkRateLimit(request);
  if (isRateLimited) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const companyService = getApiCompanyService();
    const companyProfile = await companyService.getProfileByUserId(userId!);
    if (!companyProfile) {
      return NextResponse.json({ error: 'Company profile not found' }, { status: 404 });
    }

    const { taxId, countryCode } = data;

    const validator = countryValidators[countryCode.toUpperCase()];
    let validationResult: ValidationResult;
    if (validator) {
      validationResult = await validator(taxId);
    } else {
      validationResult = {
        isValid: false,
        details: { message: 'Validation not supported for this country.' },
        status: 'not_supported',
        message: `Validation for country ${countryCode} is not yet implemented.`
      };
    }

    await companyService.updateProfile(companyProfile.id, {
      tax_id_verified: validationResult.isValid,
      tax_id_last_checked: new Date().toISOString(),
      tax_id_validation_details: validationResult.details,
    });

    return createSuccessResponse({
      status: validationResult.status,
      message: validationResult.message,
      details: validationResult.details,
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/company/validate/tax:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
};

export const POST = withValidatedServices({
  schema: ValidationRequestSchema,
  requiredServices: [],
  requireAuth: true,
  handler: postHandler
});
