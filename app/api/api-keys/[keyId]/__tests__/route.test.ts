import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DELETE } from '../route'
import { configureServices, resetServiceContainer } from '@/lib/config/service-container'
import type { ApiKeyService } from '@/core/api-keys/interfaces'
import type { AuthService } from '@/core/auth/interfaces'
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers'

vi.mock('@/services/api-keys/factory', () => ({}))
vi.mock('@/services/auth/factory', () => ({}))
vi.mock('@/middleware/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(false) }))
vi.mock('@/lib/audit/auditLogger', () => ({ logUserAction: vi.fn().mockResolvedValue(undefined) }))

const service: Partial<ApiKeyService> = {
  revokeApiKey: vi.fn(),
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
  const params = Promise.resolve({ keyId: 'k1' })

  it('revokes key', async () => {
    (service.revokeApiKey as vi.Mock).mockResolvedValue({ success: true, key: { id: 'k1', name: 'n', prefix: 'p', scopes: [], createdAt: '', isRevoked: false } })
    const res = await DELETE(createAuthenticatedRequest('DELETE', 'http://test'), { params })
    expect(res.status).toBe(200)
    expect(service.revokeApiKey).toHaveBeenCalledWith('u1', 'k1')
  })
})
