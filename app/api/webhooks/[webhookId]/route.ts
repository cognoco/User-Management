import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { createApiHandler, emptySchema } from '@/lib/api/route-helpers'
import { createSuccessResponse, createServerError, ApiError, ERROR_CODES } from '@/lib/api/common'
import { checkRateLimit } from '@/middleware/rate-limit'
import { logUserAction } from '@/lib/audit/auditLogger'
import { webhookUpdateSchema } from '@/core/webhooks/models/webhook'
import { getServiceContainer } from '@/lib/config/service-container'

const updateSchema = webhookUpdateSchema
const idParamSchema = z.object({ webhookId: z.string() })

async function handleGet(req: NextRequest, ctx: any, _data: unknown, params: { webhookId: string }) {
  if (await checkRateLimit(req)) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429)
  }
  const service = getServiceContainer().webhook!
  const hook = await service.getWebhook(ctx.userId!, params.webhookId)
  if (!hook) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, 'Webhook not found', 404)
  }
  const { secret: _s, ...safe } = hook
  return createSuccessResponse(safe)
}

async function handlePatch(
  req: NextRequest,
  ctx: any,
  data: z.infer<typeof updateSchema>,
  params: { webhookId: string },
) {
  if (await checkRateLimit(req)) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429)
  }
  const service = getServiceContainer().webhook!
  const result = await service.updateWebhook(ctx.userId!, params.webhookId, {
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
    userId: ctx.userId,
    action: 'WEBHOOK_UPDATED',
    status: 'SUCCESS',
    ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
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

async function handleDelete(
  req: NextRequest,
  ctx: any,
  _data: unknown,
  params: { webhookId: string },
) {
  if (await checkRateLimit(req)) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429)
  }
  const service = getServiceContainer().webhook!
  const existing = await service.getWebhook(ctx.userId!, params.webhookId)
  if (!existing) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, 'Webhook not found', 404)
  }
  const result = await service.deleteWebhook(ctx.userId!, params.webhookId)
  if (!result.success) {
    throw createServerError(result.error || 'Failed to delete webhook')
  }
  await logUserAction({
    userId: ctx.userId,
    action: 'WEBHOOK_DELETED',
    status: 'SUCCESS',
    ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    targetResourceType: 'webhook',
    targetResourceId: params.webhookId,
    details: { name: existing.name, url: existing.url },
  })
  return createSuccessResponse({ message: 'Webhook deleted successfully' })
}

export async function GET(req: NextRequest, ctx: { params: Promise<{ webhookId: string }> }) {
  const params = await ctx.params
  return createApiHandler(emptySchema, (r, auth) => handleGet(r, auth, {}, params), { requireAuth: true })(req)
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ webhookId: string }> }) {
  const params = await ctx.params
  return createApiHandler(updateSchema, (r, auth, data) => handlePatch(r, auth, data, params), { requireAuth: true })(req)
}

export async function DELETE(req: NextRequest, ctx: { params: Promise<{ webhookId: string }> }) {
  const params = await ctx.params
  return createApiHandler(emptySchema, (r, auth, data) => handleDelete(r, auth, data, params), { requireAuth: true })(req)
}
