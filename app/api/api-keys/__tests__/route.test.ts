import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from '../route'
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
vi.mock('@/services/auth/factory', () => ({}))
vi.mock('@/middleware/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(false) }))
vi.mock('@/lib/audit/auditLogger', () => ({ logUserAction: vi.fn().mockResolvedValue(undefined) }))

const service: Partial<ApiKeyService> = {
  listApiKeys: vi.fn(),
  createApiKey: vi.fn(),
}
const authService: Partial<AuthService> = {
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }),
}

beforeEach(() => {
  vi.clearAllMocks()
  resetServiceContainer()
  configureServices({ apiKeyService: service as ApiKeyService, authService: authService as AuthService })
})

describe('api keys route', () => {
  it('lists keys', async () => {
    (service.listApiKeys as vi.Mock).mockResolvedValue([])
    const res = await GET(createAuthenticatedRequest('GET', 'http://test/api/api-keys'))
    expect(res.status).toBe(200)
    expect(service.listApiKeys).toHaveBeenCalledWith('u1')
  })

  it('creates key', async () => {
    (service.createApiKey as vi.Mock).mockResolvedValue({ success: true, key: { id: 'k1', name: 'n', prefix: 'p', scopes: [], createdAt: '', isRevoked: false }, plaintext: 'pk' })
    const req = createAuthenticatedRequest('POST', 'http://test/api/api-keys', { name: 'n', scopes: [] })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.data.id).toBe('k1')
  })
})
