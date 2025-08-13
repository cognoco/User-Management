import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getApiCompanyService } from '@/services/company/factory';
import { checkRateLimit } from '@/middleware/rate-limit';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';

const ValidationRequestSchema = z.object({
  registrationNumber: z.string().min(1),
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
const countryValidators: Record<string, (registrationNumber: string) => Promise<ValidationResult>> = {
  // UK Companies House (mock)
  'GB': async (registrationNumber) => ({
    isValid: /^[0-9]{8}$/.test(registrationNumber),
    details: { system: 'Companies House', country: 'GB' },
    status: /^[0-9]{8}$/.test(registrationNumber) ? 'valid' : 'invalid',
    message: /^[0-9]{8}$/.test(registrationNumber) ? 'Valid UK registration number' : 'Invalid UK registration number',
  }),
  // Germany, France, Spain (mock EU registry)
  'DE': async (registrationNumber) => ({
    isValid: /^[A-Z0-9]{9}$/.test(registrationNumber),
    details: { system: 'EU Registry', country: 'DE' },
    status: /^[A-Z0-9]{9}$/.test(registrationNumber) ? 'valid' : 'invalid',
    message: /^[A-Z0-9]{9}$/.test(registrationNumber) ? 'Valid German registration number' : 'Invalid German registration number',
  }),
  'FR': async (registrationNumber) => ({
    isValid: /^[A-Z0-9]{9}$/.test(registrationNumber),
    details: { system: 'EU Registry', country: 'FR' },
    status: /^[A-Z0-9]{9}$/.test(registrationNumber) ? 'valid' : 'invalid',
    message: /^[A-Z0-9]{9}$/.test(registrationNumber) ? 'Valid French registration number' : 'Invalid French registration number',
  }),
  'ES': async (registrationNumber) => ({
    isValid: /^[A-Z0-9]{9}$/.test(registrationNumber),
    details: { system: 'EU Registry', country: 'ES' },
    status: /^[A-Z0-9]{9}$/.test(registrationNumber) ? 'valid' : 'invalid',
    message: /^[A-Z0-9]{9}$/.test(registrationNumber) ? 'Valid Spanish registration number' : 'Invalid Spanish registration number',
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

    const { registrationNumber, countryCode } = data;

    const validator = countryValidators[countryCode.toUpperCase()];
    let validationResult: ValidationResult;
    if (validator) {
      validationResult = await validator(registrationNumber);
    } else {
      validationResult = {
        isValid: false,
        details: { message: 'Validation not supported for this country.' },
        status: 'not_supported',
        message: `Validation for country ${countryCode} is not yet implemented.`
      };
    }

    // Update company profile using service layer
    await companyService.updateProfile(companyProfile.id, {
      registration_number_verified: validationResult.isValid,
      registration_number_last_checked: new Date().toISOString(),
      registration_number_validation_details: validationResult.details,
    } as any);

    return createSuccessResponse({
      status: validationResult.status,
      message: validationResult.message,
      details: validationResult.details,
    });

  } catch (error) {
    console.error('Unexpected error in POST /api/company/validate/registration:', error);
    return NextResponse.json({ error: 'An internal server error occurred.' }, { status: 500 });
  }
};

export const POST = withValidatedServices({
  schema: ValidationRequestSchema,
  requiredServices: [],
  requireAuth: true,
  handler: postHandler
});
