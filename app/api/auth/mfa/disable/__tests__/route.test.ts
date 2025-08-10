import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { POST } from '../route';
import { getServiceContainer } from '@/lib/config/service-container';

vi.mock('@/lib/config/service-container', () => ({ 
  getServiceContainer: vi.fn() 
}));
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: vi.fn(() => vi.fn(() => Promise.resolve({ userId: 'test-user-id' })))
}));

describe('POST /api/auth/mfa/disable', () => {
  const mockAuthService = { disableMFA: vi.fn() };
  const createRequest = (code?: string) => new NextRequest('http://localhost/api/auth/mfa/disable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: code ? JSON.stringify({ code }) : JSON.stringify({})
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (getServiceContainer as Mock).mockReturnValue({
      auth: mockAuthService
    });
    mockAuthService.disableMFA.mockResolvedValue({ success: true });
  });

  it('returns 400 when code missing', async () => {
    const res = await POST(createRequest());
    expect(res.status).toBe(400);
  });

  it('returns success when MFA disabled', async () => {
    const res = await POST(createRequest('1234'));
    expect(res.status).toBe(200);
  });
});
