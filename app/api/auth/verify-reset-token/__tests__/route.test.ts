import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { getApiAuthService } from '@/services/auth/factory';
import { withAuthRateLimit } from '@/middleware/with-auth-rate-limit';
import { withSecurity } from '@/middleware/with-security';


vi.mock('@/middleware/with-auth-rate-limit', () => ({
  withAuthRateLimit: vi.fn((_req, handler) => handler(_req)),
}));
vi.mock('@/middleware/with-security', () => ({ withSecurity: (h: any) => h }));

describe('POST /api/auth/verify-reset-token', () => {
  const mockAuthService = { verifyPasswordResetToken: vi.fn() };
  const createRequest = (token?: string) =>
    new Request('http://localhost/api/auth/verify-reset-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: token ? JSON.stringify({ token }) : undefined,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    (getApiAuthService as unknown as vi.Mock).mockReturnValue(mockAuthService);
    mockAuthService.verifyPasswordResetToken.mockResolvedValue({ valid: true });
  });

  it('validates request body', async () => {
    const res = await POST(createRequest() as any);
    expect(res.status).toBe(400);
  });

  it('returns success when token is valid', async () => {
    const res = await POST(createRequest('abc') as any);
    expect(res.status).toBe(200);
    expect(mockAuthService.verifyPasswordResetToken).toHaveBeenCalledWith('abc');
  });
});
