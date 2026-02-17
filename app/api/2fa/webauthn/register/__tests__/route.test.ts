import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { getApiTwoFactorService } from '@/services/two-factor/factory';
import { logUserAction } from '@/lib/audit/auditLogger';

vi.mock('@/services/two-factor/factory', () => ({ getApiTwoFactorService: vi.fn() }));
vi.mock('@/middleware/with-security', () => ({ withSecurity: (h: any) => h }));
vi.mock('@/middleware/createMiddlewareChain', async () => {
  const actual = await vi.importActual<any>('@/middleware/createMiddlewareChain');
  return {
    ...actual,
    routeAuthMiddleware: vi.fn(() => (handler: any) =>
      (req: any, _ctx?: any, data?: any) => handler(req, { userId: 'u1' }, data)
    ),
  };
});
vi.mock('@/lib/audit/auditLogger', () => ({ logUserAction: vi.fn() }));

const createRequest = (body: any) =>
  new NextRequest('http://localhost/api/2fa/webauthn/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'test' },
    body: JSON.stringify(body)
  });

describe('WebAuthn register API', () => {
  const mockService = {
    startWebAuthnRegistration: vi.fn(),
    verifyWebAuthnRegistration: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (getApiTwoFactorService as unknown as vi.Mock).mockReturnValue(mockService);
  });

  it('returns registration options', async () => {
    mockService.startWebAuthnRegistration.mockResolvedValue({ success: true, challenge: 'c' } as any);
    const res = await POST(createRequest({ phase: 'options' }) as any);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.challenge).toBe('c');
    expect(mockService.startWebAuthnRegistration).toHaveBeenCalledWith('u1');
  });

  it('verifies registration', async () => {
    mockService.verifyWebAuthnRegistration.mockResolvedValue({ success: true } as any);
    const res = await POST(
      createRequest({ phase: 'verification', credential: 'cred' }) as any
    );
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.verified).toBe(true);
    expect(mockService.verifyWebAuthnRegistration).toHaveBeenCalledWith({ userId: 'u1', method: 'webauthn', code: 'cred' });
  });
});
