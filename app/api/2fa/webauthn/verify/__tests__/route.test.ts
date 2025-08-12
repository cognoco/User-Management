import { describe, it, expect, vi, beforeEach } from 'vitest';

// Create mock services that can be controlled in tests
const mockTwoFactorService = {
  startWebAuthnRegistration: vi.fn(),
  verifyWebAuthnRegistration: vi.fn()
};

// Mock the service locator to avoid initialization issues
vi.mock('@/lib/config/service-locator', () => ({
  ServiceLocator: {
    getInstance: vi.fn(() => ({
      has: vi.fn(() => true),
      get: vi.fn((key) => {
        if (key.includes('TWO_FACTOR')) return mockTwoFactorService;
        return {};
      })
    }))
  },
  ServiceKeys: {
    TWO_FACTOR_SERVICE: 'twoFactor'
  }
}));

// Mock dependencies before importing the route
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: vi.fn(() => vi.fn(() => Promise.resolve({ userId: 'u1' })))
}));
vi.mock('@/middleware/with-security', () => ({ withSecurity: (h: any) => h }));
vi.mock('@/lib/audit/auditLogger', () => ({ logUserAction: vi.fn() }));
vi.mock('@/lib/api/common', () => ({
  createSuccessResponse: vi.fn((data) => Response.json(data)),
  createErrorResponse: vi.fn((error) => Response.json({ error: error.message }, { status: error.status })),
  ApiError: class ApiError extends Error {
    constructor(public code: string, message: string, public status: number) {
      super(message);
    }
  },
  ERROR_CODES: {
    INVALID_REQUEST: 'INVALID_REQUEST'
  }
}));

// Don't mock withValidatedServices - let it run with mocked ServiceLocator

import { POST } from '../route';

const createRequest = (body: any) =>
  new Request('http://localhost/api/2fa/webauthn/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'test' },
    body: JSON.stringify(body)
  });

describe('WebAuthn verify API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns authentication options', async () => {
    mockTwoFactorService.startWebAuthnRegistration.mockResolvedValue({ 
      success: true, 
      challenge: 'c' 
    });
    
    const res = await POST(createRequest({ phase: 'options', userId: 'u1' }) as any);
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.challenge).toBe('c');
    expect(mockTwoFactorService.startWebAuthnRegistration).toHaveBeenCalledWith('u1');
  });

  it('verifies authentication', async () => {
    mockTwoFactorService.verifyWebAuthnRegistration.mockResolvedValue({ 
      success: true, 
      verified: true 
    });
    
    const res = await POST(
      createRequest({ phase: 'verification', credential: 'cred', userId: 'u1' }) as any
    );
    const data = await res.json();
    
    expect(res.status).toBe(200);
    expect(data.verified).toBe(true);
    expect(mockTwoFactorService.verifyWebAuthnRegistration).toHaveBeenCalledWith({
      userId: 'u1',
      method: 'webauthn',
      code: 'cred'
    });
  });
});