import { type NextRequest } from 'next/server'
import { z } from 'zod'
import { withValidatedServices } from '@/lib/api/with-services'
import { createSuccessResponse, ApiError, ERROR_CODES } from '@/lib/api/common'
import { checkRateLimit } from '@/middleware/rate-limit'

const querySchema = z.object({ limit: z.coerce.number().int().min(1).max(100).optional() })

async function handleGet({ request, userId, services, data, params }: { request: NextRequest, userId: string, services: any, data: z.infer<typeof querySchema>, params: Record<string, string> }) {
  if (await checkRateLimit(request)) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429)
  }
  const hook = await services.webhook.getWebhook(userId, params.webhookId)
  if (!hook) {
    throw new ApiError(ERROR_CODES.NOT_FOUND, 'Webhook not found', 404)
  }
  const deliveries = await services.webhook.getWebhookDeliveries(userId, params.webhookId, data.limit ?? 10)
  return createSuccessResponse({ deliveries })
}

export const GET = withValidatedServices({
  schema: querySchema,
  requiredServices: ['webhook'],
  requireAuth: true,
  handler: handleGet
})
