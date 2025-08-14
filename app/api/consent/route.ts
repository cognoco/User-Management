import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidatedServices, schemas } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';

const consentSchema = z.object({
  marketing: z.boolean(),
});

const getHandler = async ({ userId, services }: { userId?: string, services: any }) => {
  const consent = await services.consent.getUserConsent(userId!);
  if (!consent) {
    return NextResponse.json({ error: 'Consent not found' }, { status: 404 });
  }
  return createSuccessResponse(consent);
};

const postHandler = async ({ data, userId, services }: { data: z.infer<typeof consentSchema>, userId?: string, services: any }) => {
  const result = await services.consent.updateUserConsent(userId!, { marketing: data.marketing });
  if (!result.success || !result.consent) {
    return NextResponse.json({ error: result.error || 'Failed to save consent' }, { status: 500 });
  }
  return createSuccessResponse(result.consent);
};

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['consent'],
  requireAuth: true,
  handler: getHandler
});

export const POST = withValidatedServices({
  schema: consentSchema,
  requiredServices: ['consent'],
  requireAuth: true,
  handler: postHandler
});
