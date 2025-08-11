import { z } from 'zod';

import { createSuccessResponse } from '@/lib/api/common';
import { withValidatedServices, schemas } from '@/src/lib/api/with-services';
import type { UserService } from '@/core/user/interfaces';
import { userPreferencesSchema } from '@/types/database';
import { mapUserServiceError } from '@/lib/api/user/error-handler';

const UpdateSchema = userPreferencesSchema
  .omit({ id: true, userId: true, createdAt: true, updatedAt: true })
  .partial();

const getHandler = async ({ userId, services }: { userId?: string, services: any }) => {
  const prefs = await services.user.getUserPreferences(userId!);
  return createSuccessResponse(prefs);
};

const patchHandler = async ({ data, userId, services }: { data: z.infer<typeof UpdateSchema>, userId?: string, services: any }) => {
  const result = await services.user.updateUserPreferences(userId!, data as any);
  if (!result.success || !result.preferences) {
    throw mapUserServiceError(new Error(result.error || 'update failed'));
  }
  return createSuccessResponse(result.preferences);
};

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['user'],
  requireAuth: true,
  handler: getHandler
});

export const PATCH = withValidatedServices({
  schema: UpdateSchema,
  requiredServices: ['user'],
  requireAuth: true,
  handler: patchHandler
});
