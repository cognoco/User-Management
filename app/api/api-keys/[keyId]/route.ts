import { type NextRequest } from 'next/server'
import { createApiHandler, emptySchema } from '@/lib/api/route-helpers'
import { createSuccessResponse, createServerError, ApiError, ERROR_CODES } from '@/lib/api/common'
import { checkRateLimit } from '@/middleware/rate-limit'
import { logUserAction } from '@/lib/audit/auditLogger'
import { getServiceContainer } from '@/lib/config/service-container'

const handler = async (req: NextRequest, ctx: any, _data: unknown, params: { keyId: string }) => {
  if (await checkRateLimit(req)) {
    throw new ApiError(ERROR_CODES.OPERATION_FAILED, 'Too many requests', 429)
  }
  const service = getServiceContainer().apiKey!
  const result = await service.revokeApiKey(ctx.userId!, params.keyId)
  if (!result.success || !result.key) {
    throw createServerError(result.error || 'Failed to revoke API key')
  }
  await logUserAction({
    userId: ctx.userId,
    action: 'API_KEY_REVOKED',
    status: 'SUCCESS',
    ipAddress: req.headers.get('x-forwarded-for') || 'unknown',
    userAgent: req.headers.get('user-agent') || 'unknown',
    targetResourceType: 'api_key',
    targetResourceId: params.keyId,
    details: { name: result.key.name, prefix: result.key.prefix },
  })
  return createSuccessResponse({ message: 'API key revoked successfully' })
}

export const DELETE = async (req: NextRequest, ctx: { params: Promise<{ keyId: string }> }) => {
  const params = await ctx.params;
  return createApiHandler(emptySchema, (r, auth, data) => handler(r, auth, data, params), { requireAuth: true })(req);
};
