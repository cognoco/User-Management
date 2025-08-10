import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { POST } from '../route';
import { getServiceContainer } from '@/lib/config/service-container';

vi.mock('@/lib/config/service-container', () => ({ 
  getServiceContainer: vi.fn() 
}));
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: vi.fn(() => vi.fn(() => Promise.resolve({ userId: 'test-user-id' })))
}));

describe('POST /api/auth/mfa/enable', () => {
  const mockAuthService = { setupMFA: vi.fn() };
  const createRequest = () => new Request('http://localhost/api/auth/mfa/enable', { 
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({})
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (getServiceContainer as Mock).mockReturnValue({
      auth: mockAuthService
    });
    mockAuthService.setupMFA.mockResolvedValue({ success: true, secret: 'secret123', qrCode: 'qr123' });
  });

  it('returns success when MFA enabled', async () => {
    const res = await POST(createRequest() as any);
    expect(res.status).toBe(200);
  });
});
