import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '../route'
import { configureServices, resetServiceContainer } from '@/lib/config/service-container'
import type { IWebhookService } from '@/core/webhooks'
import type { AuthService } from '@/core/auth/interfaces'
import type { UserService } from '@/core/user/interfaces'
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers'

vi.mock('@/services/webhooks/factory', () => ({}))
vi.mock('@/services/auth/factory', () => ({}))
vi.mock('@/middleware/rate-limit', () => ({ checkRateLimit: vi.fn().mockResolvedValue(false) }))

const service: Partial<IWebhookService> = {
  getWebhook: vi.fn(),
  getWebhookDeliveries: vi.fn(),
}
const authService: Partial<AuthService> = {
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }),
}

beforeEach(() => {
  vi.clearAllMocks()
  resetServiceContainer()
  configureServices({
    webhookService: service as IWebhookService,
    authService: authService as AuthService,
    userService: {} as UserService,
    featureFlags: {
      permissions: false, teams: false, sso: false, admin: false,
      gdpr: false, twoFactor: false, subscription: false, apiKeys: false,
      notifications: false, sessions: false, organizations: false,
      csrf: false, consent: false, audit: false, roles: false,
      addresses: false, oauth: false,
    },
  })
})

describe('webhook deliveries route', () => {
  const params = Promise.resolve({ webhookId: 'wh_1' })

  it('returns deliveries', async () => {
    ;(service.getWebhook as vi.Mock).mockResolvedValue({ id: 'wh_1' })
    ;(service.getWebhookDeliveries as vi.Mock).mockResolvedValue([{ id: 'd1' }])
    const res = await GET(createAuthenticatedRequest('GET', 'http://test'), { params })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.deliveries).toHaveLength(1)
    expect(service.getWebhookDeliveries).toHaveBeenCalledWith('u1', 'wh_1', 10)
  })
})
