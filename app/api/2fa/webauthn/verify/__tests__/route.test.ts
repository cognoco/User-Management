import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Create mock services that can be controlled in tests
const mockTwoFactorService = {
  startWebAuthnRegistration: vi.fn(),
  verifyWebAuthnRegistration: vi.fn()
};

// Mock withValidatedServices to bypass ServiceLocator entirely
vi.mock('@/lib/api/with-services', () => ({
  withValidatedServices: vi.fn((config: any) => {
    return async (req: NextRequest) => {
      try {
        // Parse body
        const data = await req.json();
        
        // Get mock services
        const mockServices = {
          twoFactor: mockTwoFactorService
        };
        
        // Call the actual handler with mocked context
        return await config.handler({
          request: req,
          data,
          services: mockServices,
          userId: data.userId || 'u1',  // Support userId from body for verify
          params: {}
        });
      } catch (error: any) {
        return Response.json({ error: error.message }, { status: error.status || 500 });
      }
    };
  })
}));

// Mock dependencies before importing the route
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

import { POST } from '../route';

const createRequest = (body: any) =>
  new NextRequest('http://localhost/api/2fa/webauthn/verify', {
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
    
    const res = await POST(createRequest({ phase: 'options', userId: 'u1' }));
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
      createRequest({ phase: 'verification', credential: 'cred', userId: 'u1' })
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