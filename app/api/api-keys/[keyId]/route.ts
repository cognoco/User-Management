import { type NextRequest } from 'next/server'
import { withValidatedServices, schemas } from '@/lib/api/with-services'
import { createSuccessResponse, createServerError, ApiError, ERROR_CODES } from '@/lib/api/common'
import { checkRateLimit } from '@/middleware/rate-limit'
import { logUserAction } from '@/lib/audit/auditLogger'

const handler = async ({ request, userId, services, params }: { request: NextRequest, userId: string, services: any, params: Record<string, string> }) => {
  if (await checkRateLimit(request)) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429)
  }
  const result = await services.apiKey.revokeApiKey(userId, params.keyId)
  if (!result.success || !result.key) {
    throw createServerError(result.error || 'Failed to revoke API key')
  }
  await logUserAction({
    userId,
    action: 'API_KEY_REVOKED',
    status: 'SUCCESS',
    ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown',
    targetResourceType: 'api_key',
    targetResourceId: params.keyId,
    details: { name: result.key.name, prefix: result.key.prefix },
  })
  return createSuccessResponse({ message: 'API key revoked successfully' })
}

export const DELETE = withValidatedServices({
  schema: schemas.empty,
  requiredServices: ['apiKey'],
  requireAuth: true,
  handler
})
