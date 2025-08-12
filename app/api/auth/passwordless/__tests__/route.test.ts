import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { getApiAuthService } from '@/services/auth/factory';


vi.mock('@/middleware/with-auth-rate-limit', () => ({
  withAuthRateLimit: vi.fn((_req, handler) => handler(_req))
}));
vi.mock('@/middleware/with-security', () => ({
  withSecurity: (handler: any) => handler
}));

describe('POST /api/auth/passwordless', () => {
  const mockAuthService = { sendMagicLink: vi.fn() };
  const createRequest = (email?: string) => new Request('http://localhost/api/auth/passwordless', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: email ? JSON.stringify({ email }) : undefined
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (getApiAuthService as unknown as vi.Mock).mockReturnValue(mockAuthService);
    mockAuthService.sendMagicLink.mockResolvedValue({ success: true });
  });

  it('returns 400 when body is missing', async () => {
    const res = await POST(createRequest() as any);
    expect(res.status).toBe(400);
  });

  it('returns success when magic link sent', async () => {
    const res = await POST(createRequest('test@example.com') as any);
    expect(res.status).toBe(200);
    expect(mockAuthService.sendMagicLink).toHaveBeenCalledWith('test@example.com');
  });
});
