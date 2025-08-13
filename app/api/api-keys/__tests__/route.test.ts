import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator'
import { createAuthMiddleware } from '@/lib/api/auth-middleware'
import type { ApiKeyService } from '@/core/api-keys/interfaces'

// Mock the auth middleware to return authenticated context
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: vi.fn(() => vi.fn().mockResolvedValue({
    userId: 'u1',
    isAuthenticated: true,
    user: { id: 'u1', email: 'test@example.com' },
    permissions: []
  }))
}));

vi.mock('@/middleware/rate-limit', () => ({ 
  checkRateLimit: vi.fn().mockResolvedValue(false) 
}))
vi.mock('@/lib/audit/auditLogger', () => ({ 
  logUserAction: vi.fn().mockResolvedValue(undefined) 
}))

// Mock the API key service
const mockApiKeyService: Partial<ApiKeyService> = {
  listApiKeys: vi.fn(),
  createApiKey: vi.fn(),
}

import { GET, POST } from '../route'

beforeEach(() => {
  vi.clearAllMocks()
  
  // Register the mock service in ServiceLocator
  const locator = ServiceLocator.getInstance()
  locator.clear()
  locator.register(ServiceKeys.API_KEY_SERVICE, mockApiKeyService as ApiKeyService)
  
  // Mock auth middleware to return authenticated context
  vi.mocked(createAuthMiddleware).mockReturnValue(
    vi.fn().mockResolvedValue({
      userId: 'u1',
      isAuthenticated: true,
      user: { id: 'u1', email: 'test@example.com' },
      permissions: []
    })
  )
})

afterEach(() => {
  ServiceLocator.getInstance().clear()
})

describe('api keys route', () => {
  const createGetRequest = () => new NextRequest('http://localhost/api/api-keys', {
    method: 'GET',
    headers: { 'Authorization': 'Bearer test-token' }
  })
  
  const createPostRequest = (body: any) => new NextRequest('http://localhost/api/api-keys', {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token'
    },
    body: JSON.stringify(body)
  })

  it('lists keys', async () => {
    vi.mocked(mockApiKeyService.listApiKeys!).mockResolvedValue([])
    const res = await GET(createGetRequest())
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.keys).toEqual([])
    expect(mockApiKeyService.listApiKeys).toHaveBeenCalledWith('u1')
  })

  it('creates key', async () => {
    vi.mocked(mockApiKeyService.createApiKey!).mockResolvedValue({ 
      success: true, 
      key: { id: 'k1', name: 'n', prefix: 'p', scopes: [], createdAt: '', isRevoked: false }, 
      plaintext: 'pk' 
    })
    const res = await POST(createPostRequest({ name: 'n', scopes: [] }))
    const body = await res.json()
    expect(res.status).toBe(201)
    expect(body.data.id).toBe('k1')
    expect(body.data.key).toBe('pk')
  })
})
