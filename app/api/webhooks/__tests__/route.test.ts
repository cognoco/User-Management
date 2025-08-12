import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST, DELETE } from '../route'
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator'
import type { IWebhookService } from '@/core/webhooks'
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

vi.mock('@/services/webhooks/factory', () => ({}))
vi.mock('@/services/auth/factory', () => ({}))
vi.mock('@/middleware/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(false) }))
vi.mock('@/lib/audit/auditLogger', () => ({ logUserAction: vi.fn().mockResolvedValue(undefined) }))

const service: Partial<IWebhookService> = {
  getWebhooks: vi.fn(),
  createWebhook: vi.fn(),
  deleteWebhook: vi.fn(),
}
const authService: Partial<AuthService> = {
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }),
}

beforeEach(() => {
  vi.clearAllMocks()
  resetServiceContainer()
  configureServices({ webhookService: service as IWebhookService, authService: authService as AuthService })
})

describe('webhooks route', () => {
  it('lists webhooks', async () => {
    (service.getWebhooks as vi.Mock).mockResolvedValue([{ id: 'w1', secret: 's' }])
    const res = await GET(createAuthenticatedRequest('GET', 'http://test/api/webhooks'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.webhooks[0].id).toBe('w1')
  })

  it('creates webhook', async () => {
    (service.createWebhook as vi.Mock).mockResolvedValue({ success: true, webhook: { id: 'w2', name: 'n', url: 'u', events: [], secret: 's', isActive: true, createdAt: '', updatedAt: '' } })
    const req = createAuthenticatedRequest('POST', 'http://test/api/webhooks', { name: 'n', url: 'u', events: [] })
    const res = await POST(req)
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.data.id).toBe('w2')
  })

  it('deletes webhook', async () => {
    (service.deleteWebhook as vi.Mock).mockResolvedValue({ success: true })
    const req = createAuthenticatedRequest('DELETE', 'http://test/api/webhooks', { id: 'w1' })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(service.deleteWebhook).toHaveBeenCalledWith('u1', 'w1')
  })
})
