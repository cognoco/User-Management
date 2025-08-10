import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { getServiceContainer } from '@/lib/config/service-container';

vi.mock('@/lib/config/service-container', () => ({ 
  getServiceContainer: vi.fn() 
}));
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: vi.fn(() => vi.fn(() => Promise.resolve({ userId: 'test-user-id' })))
}));

describe('POST /api/auth/verify-mfa', () => {
  const mockAuthService = { verifyMFA: vi.fn() };
  const createRequest = (code?: string) => new Request('http://localhost/api/auth/verify-mfa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: code ? JSON.stringify({ code }) : JSON.stringify({})
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (getServiceContainer as vi.Mock).mockReturnValue({
      auth: mockAuthService
    });
    // Mock verifyMFA to handle both signatures: (code) and (code, context)
    mockAuthService.verifyMFA.mockImplementation(async (code: string, context?: any) => ({ 
      success: true, 
      token: 'access-token',
      message: 'MFA verification successful'
    }));
  });

  it('returns 400 when code missing', async () => {
    const res = await POST(createRequest() as any);
    expect(res.status).toBe(400);
  });

  it('returns success when verification succeeds', async () => {
    const res = await POST(createRequest('1234') as any);
    expect(res.status).toBe(200);
    expect(mockAuthService.verifyMFA).toHaveBeenCalledWith('1234', expect.any(Object));
  });

  it('returns 400 when verification fails', async () => {
    mockAuthService.verifyMFA.mockImplementation(async () => ({ success: false, error: 'Invalid MFA code' }));
    const res = await POST(createRequest('1234') as any);
    expect(res.status).toBe(400);
  });
});
