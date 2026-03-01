import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiCompanyService } from '@/services/company/factory';
import { checkRateLimit } from '@/middleware/rate-limit';
import { createApiHandler } from '@/lib/api/route-helpers';
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

async function handlePost(
  request: NextRequest,
  auth: { userId?: string },
  data: ValidationRequest,
  services: any
) {
  const isRateLimited = await checkRateLimit(request);
  if (isRateLimited) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  try {
    const userId = auth.userId!;
    const companyProfile = await (services.address as any).getProfileByUserId(userId);
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

    const companyService = getApiCompanyService();
    await companyService.updateProfile(companyProfile.id, {
      tax_id_verified: validationResult.isValid,
      tax_id_last_checked: new Date().toISOString(),
      tax_id_validation_details: validationResult.details,
    } as any);

    return createSuccessResponse({
      status: validationResult.status,
      message: validationResult.message,
      details: validationResult.details,
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/company/validate/tax:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
}

export const POST = createApiHandler(
  ValidationRequestSchema,
  (req, auth, data, services) => handlePost(req, auth, data, services),
  { requireAuth: true }
);
