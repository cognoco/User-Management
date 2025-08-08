import { type NextRequest } from 'next/server'
export const runtime = 'nodejs'
import { z } from 'zod'
import { createApiHandler, emptySchema } from '@/lib/api/route-helpers'
import { createSuccessResponse, createCreatedResponse, createServerError, ApiError, ERROR_CODES } from '@/lib/api/common'
import { checkRateLimit } from '@/middleware/rate-limit'
import { logUserAction } from '@/lib/audit/auditLogger'
import { apiKeyCreateSchema } from '@/core/api-keys/models'
import { getServiceContainer } from '@/lib/config/service-container'

const createSchema = apiKeyCreateSchema
const createHandler = async (req: NextRequest, ctx: any, data: z.infer<typeof createSchema>) => {
  if (await checkRateLimit(req)) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429)
  }
  const service = getServiceContainer().apiKey!
  const result = await service.createApiKey(ctx.userId!, data)
  if (!result.success || !result.key) {
    throw createServerError(result.error || 'Failed to create API key')
  }
  await logUserAction({
    userId: ctx.userId,
    action: 'API_KEY_CREATED',
    status: 'SUCCESS',
    ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    targetResourceType: 'api_key',
    targetResourceId: result.key.id,
    details: { name: result.key.name, prefix: result.key.prefix },
  })
  return createCreatedResponse({ ...result.key, key: result.plaintext })
}

const listHandler = async (req: NextRequest, ctx: any) => {
  if (await checkRateLimit(req)) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429)
  }
  const service = getServiceContainer().apiKey!
  const keys = await service.listApiKeys(ctx.userId!)
  return createSuccessResponse({ keys })
}

export const GET = createApiHandler(emptySchema, listHandler, { requireAuth: true })
export const POST = createApiHandler(createSchema, createHandler, { requireAuth: true })
