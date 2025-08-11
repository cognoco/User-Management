import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { withValidatedServices, schemas } from '@/lib/api/with-services'
import { createSuccessResponse, createServerError, ApiError, ERROR_CODES } from '@/lib/api/common'
import { checkRateLimit } from '@/middleware/rate-limit'
import { logUserAction } from '@/lib/audit/auditLogger'
import { webhookUpdateSchema } from '@/core/webhooks/models/webhook'


async function handleGet({ request, userId, services, params }: { request: NextRequest, userId: string, services: any, params: Record<string, string> }) {
  if (await checkRateLimit(request)) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429)
  }
  const hook = await services.webhook.getWebhook(userId, params.webhookId)
  if (!hook) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, 'Webhook not found', 404)
  }
  const { secret: _s, ...safe } = hook
  return createSuccessResponse(safe)
}

async function handlePatch({ request, userId, services, data, params }: { request: NextRequest, userId: string, services: any, data: z.infer<typeof webhookUpdateSchema>, params: Record<string, string> }) {
  if (await checkRateLimit(request)) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429)
  }
  const result = await services.webhook.updateWebhook(userId, params.webhookId, {
    name: data.name,
    url: data.url,
    events: data.events,
    isActive: data.isActive,
    regenerateSecret: data.regenerateSecret,
  })
  if (!result.success || !result.webhook) {
    throw createServerError(result.error || 'Failed to update webhook')
  }
  await logUserAction({
    userId,
    action: 'WEBHOOK_UPDATED',
    status: 'SUCCESS',
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    targetResourceType: 'webhook',
    targetResourceId: params.webhookId,
    details: {
      name: result.webhook.name,
      url: result.webhook.url,
      secret_regenerated: data.regenerateSecret === true,
    },
  })
  return createSuccessResponse(result.webhook)
}

async function handleDelete({ request, userId, services, params }: { request: NextRequest, userId: string, services: any, params: Record<string, string> }) {
  if (await checkRateLimit(request)) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429)
  }
  const existing = await services.webhook.getWebhook(userId, params.webhookId)
  if (!existing) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, 'Webhook not found', 404)
  }
  const result = await services.webhook.deleteWebhook(userId, params.webhookId)
  if (!result.success) {
    throw createServerError(result.error || 'Failed to delete webhook')
  }
  await logUserAction({
    userId,
    action: 'WEBHOOK_DELETED',
    status: 'SUCCESS',
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    targetResourceType: 'webhook',
    targetResourceId: params.webhookId,
    details: { name: existing.name, url: existing.url },
  })
  return createSuccessResponse({ message: 'Webhook deleted successfully' })
}

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['webhook'],
  requireAuth: true,
  handler: handleGet
})

export const PATCH = withValidatedServices({
  schema: webhookUpdateSchema,
  requiredServices: ['webhook'],
  requireAuth: true,
  handler: handlePatch
})

export const DELETE = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['webhook'],
  requireAuth: true,
  handler: handleDelete
})
