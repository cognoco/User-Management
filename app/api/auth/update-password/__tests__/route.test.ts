import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { getApiAuthService } from '@/services/auth/factory';
import { createRateLimit } from '@/middleware/rate-limit';
import { withSecurity } from '@/middleware/with-security';
import { ERROR_CODES } from '@/lib/api/common';

vi.mock('@/services/auth/factory', () => ({ getApiAuthService: vi.fn() }));
vi.mock('@/middleware/rate-limit', () => ({
  createRateLimit: vi.fn(() => vi.fn((_req: any, h: any) => h(_req))),
}));
vi.mock('@/middleware/with-security', () => ({ withSecurity: (h: any) => h }));

describe('POST /api/auth/update-password', () => {
  const mockAuthService = {
    getCurrentUser: vi.fn(),
    updatePassword: vi.fn(),
    updatePasswordWithToken: vi.fn(),
  };
  const createRequest = (body?: any) =>
    new NextRequest('http://localhost/api/auth/update-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    (getApiAuthService as unknown as vi.Mock).mockReturnValue(mockAuthService);
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

  it('requires auth when no token', async () => {
    mockAuthService.getCurrentUser.mockResolvedValueOnce(null);
    const res = await POST(createRequest({ password: 'Password1!' }) as any);
    const data = await res.json();
    expect(res.status).toBe(401);
    expect(data.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
  });
});
