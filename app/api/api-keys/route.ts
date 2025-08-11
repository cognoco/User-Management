import { type NextRequest } from 'next/server'
export const runtime = 'nodejs'
import { z } from 'zod'
import { withValidatedServices, schemas } from '@/lib/api/with-services'
import { createSuccessResponse, createCreatedResponse, createServerError, ApiError, ERROR_CODES } from '@/lib/api/common'
import { checkRateLimit } from '@/middleware/rate-limit'
import { logUserAction } from '@/lib/audit/auditLogger'
import { apiKeyCreateSchema } from '@/core/api-keys/models'

const createHandler = async ({ data, request, userId, services }: { data: z.infer<typeof apiKeyCreateSchema>, request: NextRequest, userId: string, services: any }) => {
  if (await checkRateLimit(request)) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429)
  }
  const result = await services.apiKey.createApiKey(userId, data)
  if (!result.success || !result.key) {
    throw createServerError(result.error || 'Failed to create API key')
  }
  await logUserAction({
    userId,
    action: 'API_KEY_CREATED',
    status: 'SUCCESS',
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    targetResourceType: 'api_key',
    targetResourceId: result.key.id,
    details: { name: result.key.name, prefix: result.key.prefix },
  })
  return createCreatedResponse({ ...result.key, key: result.plaintext })
}

const listHandler = async ({ request, userId, services }: { request: NextRequest, userId: string, services: any }) => {
  if (await checkRateLimit(request)) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429)
  }
  const keys = await services.apiKey.listApiKeys(userId)
  return createSuccessResponse({ keys })
}

export const GET = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['apiKey'],
  requireAuth: true,
  handler: listHandler
})

export const POST = withValidatedServices({
  schema: apiKeyCreateSchema,
  requiredServices: ['apiKey'],
  requireAuth: true,
  handler: createHandler
})
