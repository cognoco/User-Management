import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the auth service
const mockAuthService = { 
  setupMFA: vi.fn()
};

// Mock withValidatedServices to inject our mock service
vi.mock('@/lib/api/with-services', () => ({
  withValidatedServices: vi.fn((config: any) => {
    return async (req: NextRequest) => {
      const data = await req.json().catch(() => ({}));
      
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

describe('POST /api/auth/setup-mfa', () => {
  const createRequest = () => new NextRequest('http://localhost/api/auth/setup-mfa', { 
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({})
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.setupMFA.mockResolvedValue({ success: true, secret: 'secret123', qrCode: 'qr123' });
  });

  it('returns success when MFA setup succeeds', async () => {
    const res = await POST(createRequest() as any);
    expect(res.status).toBe(200);
    expect(mockAuthService.setupMFA).toHaveBeenCalled();
  });

  it('returns 400 when setup fails', async () => {
    mockAuthService.setupMFA.mockResolvedValue({ success: false, error: 'fail' });
    const res = await POST(createRequest() as any);
    expect(res.status).toBe(400);
  });
});