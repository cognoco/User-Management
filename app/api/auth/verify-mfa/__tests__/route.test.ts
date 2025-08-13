import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the auth service
const mockAuthService = { 
  verifyMFA: vi.fn()
};

// Mock withValidatedServices to inject our mock service
vi.mock('@/lib/api/with-services', () => ({
  withValidatedServices: vi.fn((config: any) => {
    return async (req: NextRequest) => {
      const data = await req.json().catch(() => ({}));
      
      // Validate the code field
      if (!data.code || typeof data.code !== 'string') {
        return new Response(JSON.stringify({ 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'MFA code is required' 
          } 
        }), { status: 400 });
      }
      
      const mockServices = { auth: mockAuthService };
      return await config.handler({
        request: req,
        data,
        services: mockServices,
        userId: 'test-user-id', // Authenticated endpoint
        params: {}
      });
    };
  })
}));

// Mock audit logger
vi.mock('@/lib/audit/auditLogger', () => ({
  logUserAction: vi.fn().mockResolvedValue(undefined)
}));

import { POST } from '../route';

describe('POST /api/auth/verify-mfa', () => {
  const createRequest = (code?: string) => new NextRequest('http://localhost/api/auth/verify-mfa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: code ? JSON.stringify({ code }) : JSON.stringify({})
  });

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock verifyMFA to handle both signatures: (code) and (code, context)
    mockAuthService.verifyMFA.mockImplementation(async (code: string, context?: any) => ({ 
      success: true, 
      token: 'access-token',
      message: 'MFA verification successful'
    }));
  });

  it('returns 400 when code missing', async () => {
    const res = await POST(createRequest() as any);
    expect(res.status).toBe(400);
  });

  it('returns success when verification succeeds', async () => {
    const res = await POST(createRequest('1234') as any);
    expect(res.status).toBe(200);
    expect(mockAuthService.verifyMFA).toHaveBeenCalledWith('1234', expect.any(Object));
  });

  it('returns 400 when verification fails', async () => {
    mockAuthService.verifyMFA.mockImplementation(async () => ({ success: false, error: 'Invalid MFA code' }));
    const res = await POST(createRequest('1234') as any);
    expect(res.status).toBe(400);
  });
});