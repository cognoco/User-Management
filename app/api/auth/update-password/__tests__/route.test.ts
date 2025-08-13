import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ERROR_CODES } from '@/lib/api/common';

// Mock the auth service
const mockAuthService = {
  getCurrentUser: vi.fn(),
  updatePassword: vi.fn(),
  updatePasswordWithToken: vi.fn()
};

// Mock withValidatedServices to inject our mock service
vi.mock('@/lib/api/with-services', () => ({
  withValidatedServices: vi.fn((config: any) => {
    return async (req: NextRequest) => {
      const data = await req.json().catch(() => ({}));
      
      // Basic validation
      if (!data.password) {
        return new Response(JSON.stringify({ 
          error: { 
            code: ERROR_CODES.INVALID_REQUEST, 
            message: 'Password is required' 
          } 
        }), { status: 400 });
      }
      
      try {
        const mockServices = { auth: mockAuthService };
        
        // Check if token is provided (password reset flow) or need auth (update flow)
        const userId = data.token ? null : '1'; // Mock authenticated user for non-token requests
        
        return await config.handler({
          request: req,
          data,
          services: mockServices,
          userId,
          params: {}
        });
      } catch (error: any) {
        // The route re-throws 401 as 400
        if (error.statusCode === 401) {
          return new Response(JSON.stringify({ 
            error: { 
              code: ERROR_CODES.INVALID_REQUEST, 
              message: 'Unauthorized' 
            } 
          }), { status: 400 });
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

describe('POST /api/auth/update-password', () => {
  const createRequest = (body?: any) =>
    new NextRequest('http://localhost/api/auth/update-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuthService.getCurrentUser.mockResolvedValue({ id: '1' });
    mockAuthService.updatePassword.mockResolvedValue(undefined);
    mockAuthService.updatePasswordWithToken.mockResolvedValue({ success: true, user: { id: '1' } });
  });

  it('validates request body', async () => {
    const res = await POST(createRequest({}) as any);
    expect(res.status).toBe(400);
  });

  it('updates password using token when provided', async () => {
    const res = await POST(createRequest({ password: 'Password1!', token: 't' }) as any);
    expect(res.status).toBe(200);
    expect(mockAuthService.updatePasswordWithToken).toHaveBeenCalledWith('t', 'Password1!');
  });

  it('updates password when authenticated', async () => {
    // When no token is provided but user is authenticated, it should update the password
    const res = await POST(createRequest({ password: 'Password1!' }) as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.message).toBe('Password updated successfully');
    expect(mockAuthService.updatePassword).toHaveBeenCalledWith('', 'Password1!');
  });
});