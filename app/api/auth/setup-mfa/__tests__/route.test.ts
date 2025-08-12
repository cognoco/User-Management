import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';

vi.mock('@/lib/config/service-container', () => ({ 
  getServiceContainer: vi.fn() 
}));
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: vi.fn(() => vi.fn(() => Promise.resolve({ userId: 'test-user-id' })))
}));
vi.mock('@/lib/audit/auditLogger', () => ({
  logUserAction: vi.fn()
}));

describe('POST /api/auth/setup-mfa', () => {
  const mockAuthService = { setupMFA: vi.fn() };
  const createRequest = () => new Request('http://localhost/api/auth/setup-mfa', { 
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({})
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (getServiceContainer as vi.Mock).mockReturnValue({
      auth: mockAuthService
    });
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
