import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { getApiAuthService } from '@/services/auth/factory';

vi.mock('@/services/auth/factory', () => ({ getApiAuthService: vi.fn() }));
vi.mock('@/middleware/with-auth-rate-limit', () => ({
  withAuthRateLimit: vi.fn((_req, handler) => handler(_req))
}));
vi.mock('@/middleware/with-security', () => ({
  withSecurity: (handler: any) => handler
}));

describe('POST /api/auth/verify-mfa', () => {
  const mockAuthService = { verifyMFA: vi.fn() };
  const createRequest = (code?: string) => new NextRequest('http://localhost/api/auth/verify-mfa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: code ? JSON.stringify({ code }) : undefined
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (getApiAuthService as unknown as vi.Mock).mockReturnValue(mockAuthService);
    mockAuthService.verifyMFA.mockResolvedValue({ success: true });
  });

  it('returns 400 when code missing', async () => {
    const res = await POST(createRequest() as any);
    expect(res.status).toBe(400);
  });

  it('returns success when verification succeeds', async () => {
    const res = await POST(createRequest('123') as any);
    expect(res.status).toBe(200);
    expect(mockAuthService.verifyMFA).toHaveBeenCalledWith('123');
  });

  it('returns 400 when verification fails', async () => {
    mockAuthService.verifyMFA.mockResolvedValue({ success: false, error: 'err' });
    const res = await POST(createRequest('123') as any);
    expect(res.status).toBe(400);
  });
});
