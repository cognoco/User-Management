import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ERROR_CODES } from '@/lib/api/common';

// Mock the auth service
const mockAuthService = { 
  login: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue(null) // Return null for public endpoints
};

// Mock error handlers
vi.mock('@/lib/api/auth/error-handler', () => ({
  createInvalidCredentialsError: () => ({ 
    statusCode: 401, 
    error: { code: ERROR_CODES.INVALID_CREDENTIALS, message: 'Invalid credentials' } 
  }),
  createEmailNotVerifiedError: () => ({ 
    statusCode: 403, 
    error: { code: ERROR_CODES.EMAIL_NOT_VERIFIED, message: 'Email not verified' } 
  })
}));

// Mock withValidatedServices to inject our mock service
vi.mock('@/lib/api/with-services', () => ({
  withValidatedServices: vi.fn((config: any) => {
    return async (req: NextRequest) => {
      const data = await req.json().catch(() => ({}));
      
      // Basic validation like the real implementation would do
      if (!data.email || !data.password) {
        return new Response(JSON.stringify({ 
          error: { 
            code: ERROR_CODES.INVALID_REQUEST, 
            message: 'Email and password are required' 
          } 
        }), { status: 400 });
      }
      
      try {
        const mockServices = { auth: mockAuthService };
        return await config.handler({
          request: req,
          data,
          services: mockServices,
          userId: null,
          params: {}
        });
      } catch (error: any) {
        // Handle thrown errors from the handler
        if (error.statusCode) {
          return new Response(JSON.stringify(error), { status: error.statusCode });
        }
        return new Response(JSON.stringify({ 
          error: { 
            code: ERROR_CODES.INTERNAL_ERROR, 
            message: error.message 
          } 
        }), { status: 500 });
      }
    };
  })
}));

// Mock audit logger
vi.mock('@/lib/audit/auditLogger', () => ({
  logUserAction: vi.fn().mockResolvedValue(undefined)
}));

import { POST } from '../route';

describe('POST /api/auth/login', () => {
  const createRequest = (body?: any) =>
    new NextRequest('http://localhost/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up default successful login response
    mockAuthService.login.mockResolvedValue({
      success: true,
      user: { id: '1', email: 'a@test.com' },
      token: 'token',
      expiresAt: 123,
      requiresMfa: false
    });
  });

  it('returns success on valid login', async () => {
    const res = await POST(createRequest({ email: 'a@test.com', password: 'p', rememberMe: true }));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.token).toBe('token');
    expect(mockAuthService.login).toHaveBeenCalledWith(
      { email: 'a@test.com', password: 'p', rememberMe: true },
      expect.objectContaining({
        ipAddress: expect.any(String),
        userAgent: expect.any(String)
      })
    );
  });

  it('returns 401 for invalid credentials', async () => {
    mockAuthService.login.mockResolvedValue({ 
      success: false, 
      error: 'Invalid login credentials',
      code: 'INVALID_CREDENTIALS'
    });
    const res = await POST(createRequest({ email: 'a@test.com', password: 'wrong' }));
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error.code).toBe(ERROR_CODES.INVALID_CREDENTIALS);
  });

  it('returns 403 when email not verified', async () => {
    mockAuthService.login.mockResolvedValue({ 
      success: false, 
      error: 'Email not confirmed',
      code: 'EMAIL_NOT_VERIFIED'
    });
    const res = await POST(createRequest({ email: 'a@test.com', password: 'p' }));
    const data = await res.json();
    expect(res.status).toBe(403);
    expect(data.error.code).toBe(ERROR_CODES.EMAIL_NOT_VERIFIED);
  });

  it('returns 500 on service error', async () => {
    mockAuthService.login.mockRejectedValue(new Error('boom'));
    const res = await POST(createRequest({ email: 'a@test.com', password: 'p' }));
    const data = await res.json();
    expect(res.status).toBe(500);
    expect(data.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
  });
});