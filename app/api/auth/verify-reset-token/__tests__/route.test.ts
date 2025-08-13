import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';

// Mock the auth service
const mockAuthService = { 
  verifyPasswordResetToken: vi.fn(),
  getCurrentUser: vi.fn().mockResolvedValue(null)
};

import { POST } from '../route';

describe('POST /api/auth/verify-reset-token', () => {
  const createRequest = (token?: string) =>
    new NextRequest('http://localhost/api/auth/verify-reset-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: token ? JSON.stringify({ token }) : JSON.stringify({}),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Register the mock service in ServiceLocator
    const locator = ServiceLocator.getInstance();
    locator.clear();
    locator.register(ServiceKeys.AUTH_SERVICE, mockAuthService);
    
    mockAuthService.verifyPasswordResetToken.mockResolvedValue({ valid: true });
  });

  afterEach(() => {
    ServiceLocator.getInstance().clear();
  });

  it('validates request body', async () => {
    const res = await POST(createRequest());
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.message).toContain('Required');
  });

  it('returns success when token is valid', async () => {
    const res = await POST(createRequest('abc'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.message).toBe('Token valid');
    expect(mockAuthService.verifyPasswordResetToken).toHaveBeenCalledWith('abc', expect.objectContaining({
      ipAddress: expect.any(String),
      userAgent: expect.any(String)
    }));
  });

  it('returns 400 when token is invalid', async () => {
    mockAuthService.verifyPasswordResetToken.mockResolvedValue({ 
      valid: false, 
      error: 'Token expired' 
    });
    const res = await POST(createRequest('invalid'));
    const data = await res.json();
    expect(res.status).toBe(400);
    expect(data.error.message).toBe('Token expired');
  });
});