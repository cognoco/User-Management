import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DELETE } from '../route'
import type { ApiKeyService } from '@/core/api-keys/interfaces'
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers'

// Mock the auth middleware to bypass authentication
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => vi.fn((req: any) => Promise.resolve({
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: []
  }))
}));

vi.mock('@/middleware/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(false) }))
vi.mock('@/lib/audit/auditLogger', () => ({ logUserAction: vi.fn().mockResolvedValue(undefined) }))

const service: Partial<ApiKeyService> = {
  revokeApiKey: vi.fn(),
  getApiKey: vi.fn(),
}

// Mock withValidatedServices pattern
vi.mock('@/lib/api/with-services', async () => {
  const actual = await vi.importActual('@/lib/api/with-services');
  return {
    ...actual,
    withValidatedServices: ({ handler }: any) => async (req: any, context: any) => {
      return handler({
        request: req,
        userId: 'u1',
        services: {
          apiKey: service,
        },
        params: context.params,
      });
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks()
})

describe('api key delete route', () => {
  const params = { keyId: 'k1' }

  it('revokes key', async () => {
    (service.revokeApiKey as vi.Mock).mockResolvedValue({ success: true, key: { id: 'k1', name: 'n', prefix: 'p', scopes: [], createdAt: '', isRevoked: false } })
    const res = await DELETE(createAuthenticatedRequest('DELETE', 'http://test'), { params })
    expect(res.status).toBe(200)
    expect(service.revokeApiKey).toHaveBeenCalledWith('u1', 'k1')
  })
})
