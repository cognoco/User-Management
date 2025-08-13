import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the auth service
const mockAuthService = { 
  verifyEmail: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue(null) // Public route
};

// Mock withValidatedServices to inject our mock service
vi.mock('@/lib/api/with-services', () => ({
  withValidatedServices: vi.fn((config: any) => {
    return async (req: NextRequest) => {
      const data = await req.json().catch(() => ({}));
      
      // Validate the token field like the real implementation would
      if (!data.token || typeof data.token !== 'string') {
        return new Response(JSON.stringify({ 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid or missing token' 
          } 
        }), { status: 400 });
      }
      
      const mockServices = { auth: mockAuthService };
      return await config.handler({
        request: req,
        data,
        services: mockServices,
        userId: null,
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

describe('POST /api/auth/verify-email', () => {
  const createRequest = (token?: string) => new NextRequest('http://localhost/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: token ? JSON.stringify({ token }) : JSON.stringify({})
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.verifyEmail.mockResolvedValue(undefined);
  });

  it('returns 400 when body is missing', async () => {
    const res = await POST(createRequest() as any);
    expect(res.status).toBe(400);
  });

  it('returns success when verification succeeds', async () => {
    const res = await POST(createRequest('abc') as any);
    expect(res.status).toBe(200);
    expect(mockAuthService.verifyEmail).toHaveBeenCalledWith('abc');
  });
});