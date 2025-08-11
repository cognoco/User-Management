import { type NextRequest } from 'next/server';
import { z } from 'zod';
import { withValidatedServices, schemas } from '@/lib/api/with-services';
import {
  createSuccessResponse,
  createCreatedResponse,
  createServerError,
  ApiError,
  ERROR_CODES,
} from '@/lib/api/common';
import { checkRateLimit } from '@/middleware/rate-limit';
import { logUserAction } from '@/lib/audit/auditLogger';

import { webhookCreateSchema } from '@/core/webhooks/models/webhook';

const deleteSchema = z.object({ id: z.string() });

async function handleGet({ request, userId, services }: { request: NextRequest, userId: string, services: any }) {
  if (await checkRateLimit(request)) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429);
  }

  const hooks = await services.webhook.getWebhooks(userId);
  const safe = hooks.map(({ secret, ...rest }) => rest);
  return createSuccessResponse({ webhooks: safe });
}

async function handlePost({ request, userId, services, data }: { request: NextRequest, userId: string, services: any, data: z.infer<typeof webhookCreateSchema> }) {
  if (await checkRateLimit(request)) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429);
  }

  const result = await services.webhook.createWebhook(userId, {
    name: data.name,
    url: data.url,
    events: data.events,
    isActive: data.isActive ?? true,
  });

  if (!result.success || !result.webhook) {
    throw createServerError(result.error || 'Failed to create webhook');
  }

  await logUserAction({
    userId,
    action: 'WEBHOOK_CREATED',
    status: 'SUCCESS',
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    targetResourceType: 'webhook',
    targetResourceId: result.webhook.id,
    details: { name: result.webhook.name, url: result.webhook.url },
  });

  return createCreatedResponse(result.webhook);
}

async function handleDelete({ request, userId, services, data }: { request: NextRequest, userId: string, services: any, data: z.infer<typeof deleteSchema> }) {
  if (await checkRateLimit(request)) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429);
  }

  const result = await services.webhook.deleteWebhook(userId, data.id);
  if (!result.success) {
    throw createServerError(result.error || 'Failed to delete webhook');
  }

  await logUserAction({
    userId,
    action: 'WEBHOOK_DELETED',
    status: 'SUCCESS',
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    targetResourceType: 'webhook',
    targetResourceId: data.id,
  });

  return createSuccessResponse({ success: true });
}

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['webhook'],
  requireAuth: true,
  handler: handleGet
});

export const POST = withValidatedServices({
  schema: webhookCreateSchema,
  requiredServices: ['webhook'],
  requireAuth: true,
  handler: handlePost
});

export const DELETE = withValidatedServices({
  schema: deleteSchema,
  requiredServices: ['webhook'],
  requireAuth: true,
  handler: handleDelete
});

