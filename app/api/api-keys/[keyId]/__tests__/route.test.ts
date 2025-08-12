import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DELETE } from '../route'
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator'
import type { ApiKeyService } from '@/core/api-keys/interfaces'
import type { AuthService } from '@/core/auth/interfaces'
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers'

// Mock the auth middleware to bypass authentication
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => vi.fn((req: any) => Promise.resolve({
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: []
  }))
}));

vi.mock('@/services/api-keys/factory', () => ({}))

vi.mock('@/middleware/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(false) }))
vi.mock('@/lib/audit/auditLogger', () => ({ logUserAction: vi.fn().mockResolvedValue(undefined) }))

const service: Partial<ApiKeyService> = {
  revokeApiKey: vi.fn(),
  getApiKey: vi.fn(),
}
const authService: Partial<AuthService> = {
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }),
}

beforeEach(() => {
  vi.clearAllMocks()
  resetServiceContainer()
  configureServices({ apiKeyService: service as ApiKeyService, authService: authService as AuthService })
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
