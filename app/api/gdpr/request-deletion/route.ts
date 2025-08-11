import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withValidatedServices } from '@/src/lib/api/with-services';
import { createSuccessResponse } from '@/lib/api/common';
import { logUserAction } from '@/lib/audit/auditLogger';

const RequestDeletionSchema = z.object({
  mfaCode: z.string().min(6),
});

const postHandler = async ({ data, userId, services }: { data: z.infer<typeof RequestDeletionSchema>, userId?: string, services: any }) => {
  try {
    const verifyRes = await services.auth.verifyMFA(data.mfaCode);
    if (!verifyRes.success) {
      return NextResponse.json({ error: verifyRes.error || 'Invalid MFA code' }, { status: 401 });
    }

    const scheduledDeletionAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const result = await services.gdpr.requestAccountDeletion(userId!, scheduledDeletionAt);
    if (!result.success || !result.request) {
      throw new Error(result.error || 'Failed to create deletion request');
    }

    await logUserAction({
      userId: userId!,
      action: 'ACCOUNT_DELETION_REQUESTED',
      status: 'SUCCESS',
      targetResourceType: 'user',
      targetResourceId: userId!,
    });

    return createSuccessResponse(result.request);
  } catch (error) {
    await logUserAction({
      userId: userId!,
      action: 'ACCOUNT_DELETION_REQUEST_FAILED',
      status: 'FAILURE',
      targetResourceType: 'user',
      targetResourceId: userId!,
      details: { error: error instanceof Error ? error.message : String(error) },
    });
    return NextResponse.json({ error: 'Failed to request account deletion' }, { status: 500 });
  }
};

export const POST = withValidatedServices({
  schema: RequestDeletionSchema,
  requiredServices: ['auth', 'gdpr'],
  requireAuth: true,
  includeUser: true,
  handler: postHandler
});
