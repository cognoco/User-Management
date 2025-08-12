import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { NextRequest } from 'next/server';
import { DELETE } from '../route';
import { getApiAuthService } from '@/services/auth/factory';


vi.mock('@/middleware/with-auth-rate-limit', () => ({
  withAuthRateLimit: vi.fn((_req, handler) => handler(_req))
}));
vi.mock('@/middleware/with-security', () => ({
  withSecurity: (handler: any) => handler
}));

describe('DELETE /api/auth/delete-account', () => {
  const mockAuthService = { deleteAccount: vi.fn() };
  const createRequest = (password?: string) => new NextRequest('http://localhost/api/auth/delete-account', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: password ? JSON.stringify({ password }) : undefined
  });

  beforeEach(() => {
    vi.clearAllMocks();
    (getApiAuthService as unknown as Mock).mockReturnValue(mockAuthService);
    mockAuthService.deleteAccount.mockResolvedValue(undefined);
  });

  it('returns 400 when password missing', async () => {
    const res = await DELETE(createRequest());
    expect(res.status).toBe(400);
  });

  it('calls service and returns success', async () => {
    const res = await DELETE(createRequest('pass'));
    expect(res.status).toBe(200);
    expect(mockAuthService.deleteAccount).toHaveBeenCalledWith('pass');
  });
});
