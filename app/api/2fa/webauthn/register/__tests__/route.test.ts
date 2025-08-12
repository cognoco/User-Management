import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';
import { logUserAction } from '@/lib/audit/auditLogger';

vi.mock('@/lib/config/service-container', () => ({ 
  getServiceContainer: vi.fn() 
}));
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: vi.fn(() => vi.fn(() => Promise.resolve({ userId: 'u1' })))
}));
vi.mock('@/middleware/with-security', () => ({ withSecurity: (h: any) => h }));
vi.mock('@/lib/audit/auditLogger', () => ({ logUserAction: vi.fn() }));

const createRequest = (body: any) =>
  new Request('http://localhost/api/2fa/webauthn/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'test' },
    body: JSON.stringify(body)
  });

describe('WebAuthn register API', () => {
  const mockTwoFactorService = {
    startWebAuthnRegistration: vi.fn(),
    verifyWebAuthnRegistration: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getServiceContainer as vi.Mock).mockReturnValue({
      twoFactor: mockTwoFactorService
    });
  });

  it('returns registration options', async () => {
    mockTwoFactorService.startWebAuthnRegistration.mockResolvedValue({ success: true, challenge: 'c' } as any);
    const res = await POST(createRequest({ phase: 'options' }) as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.challenge).toBe('c'); // createSuccessResponse wraps the result in 'data'
    expect(mockTwoFactorService.startWebAuthnRegistration).toHaveBeenCalledWith('u1');
  });

  it('verifies registration', async () => {
    mockTwoFactorService.verifyWebAuthnRegistration.mockResolvedValue({ success: true, verified: true } as any);
    const res = await POST(
      createRequest({ phase: 'verification', credential: 'cred' }) as any
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.verified).toBe(true); // createSuccessResponse wraps the result in 'data'
    expect(mockTwoFactorService.verifyWebAuthnRegistration).toHaveBeenCalledWith({ userId: 'u1', method: 'webauthn', code: 'cred' });
  });
});
