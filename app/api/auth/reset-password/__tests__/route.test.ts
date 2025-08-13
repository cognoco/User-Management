import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock the auth service
const mockAuthService = { 
  resetPassword: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue(null) // Public route
};

// Mock withValidatedServices to inject our mock service
vi.mock('@/lib/api/with-services', () => ({
  withValidatedServices: vi.fn((config: any) => {
    return async (req: NextRequest) => {
      const data = await req.json().catch(() => ({}));
      
      // Validate the email field like the real implementation would
      if (!data.email || typeof data.email !== 'string' || !data.email.includes('@')) {
        return new Response(JSON.stringify({ 
          error: { 
            code: 'VALIDATION_ERROR', 
            message: 'Invalid email address' 
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

describe('POST /api/auth/reset-password', () => {
  const createRequest = (email?: string) => new NextRequest('http://localhost/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: email ? JSON.stringify({ email }) : JSON.stringify({})
  });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.resetPassword.mockResolvedValue({ success: true });
  });

  it('validates request body', async () => {
    const res = await POST(createRequest());
    const data = await res.json();
    expect(res.status).toBe(400);
  });

  it('returns success when service succeeds', async () => {
    const res = await POST(createRequest('test@example.com'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.message).toBe('If an account exists with this email, you will receive password reset instructions.');
    expect(mockAuthService.resetPassword).toHaveBeenCalledWith('test@example.com');
  });

  it('still returns success when service fails', async () => {
    mockAuthService.resetPassword.mockResolvedValueOnce({ success: false, error: 'user not found' });
    const res = await POST(createRequest('test@example.com'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.message).toBe('If an account exists with this email, you will receive password reset instructions.');
  });
});