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

describe('POST /api/auth/setup-mfa', () => {
  const mockAuthService = { setupMFA: vi.fn() };
  const createRequest = () => new NextRequest('http://localhost/api/auth/setup-mfa', { method: 'POST' });

  beforeEach(() => {
    vi.clearAllMocks();
    (getApiAuthService as unknown as vi.Mock).mockReturnValue(mockAuthService);
    mockAuthService.setupMFA.mockResolvedValue({ success: true });
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
