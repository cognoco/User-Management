import { NextResponse } from 'next/server';
import { z } from 'zod';
import { TwoFactorMethod } from '@/types/2fa';
import { withValidatedServices } from '@/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';

// Request schema
const setupRequestSchema = z.object({
  method: z.nativeEnum(TwoFactorMethod),
  phone: z.string().optional(),
  email: z.string().optional(),
});

const postHandler = async ({ data, userId, services }: { data: z.infer<typeof setupRequestSchema>, userId?: string, services: any }) => {
  try {
    const { method, phone, email } = data;

    const result = await services.twoFactor.startSetup({
      userId: userId!,
      method,
      phone,
      email,
    });

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to start 2FA setup' },
        { status: 400 },
      );
    }

    return createSuccessResponse(result);
  } catch (error) {
    console.error('Error in 2FA setup:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unexpected error occurred' },
      { status: 500 },
    );
  }
};

export const POST = withValidatedServices({
  schema: setupRequestSchema,
  requiredServices: ['twoFactor'],
  requireAuth: true,
  handler: postHandler
});
