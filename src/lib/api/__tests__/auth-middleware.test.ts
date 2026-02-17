import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { createAuthMiddleware } from '../auth-middleware';
import { ApiError } from '../common';

const makeRequest = (token?: string) => {
  const headers: Record<string, string> = {};
  if (token) headers['authorization'] = `Bearer ${token}`;
  return new NextRequest('http://test', { headers });
};

describe('createAuthMiddleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('throws 401 when auth required and no user', async () => {
    const authService = { getCurrentUser: vi.fn().mockResolvedValue(null) } as any;
    const middleware = createAuthMiddleware({ authService, requireAuth: true });

    await expect(middleware(makeRequest('token'))).rejects.toThrow(ApiError);
    await expect(middleware(makeRequest('token'))).rejects.toMatchObject({ statusCode: 401 });
  });

  it('returns unauthenticated context when no token and auth not required', async () => {
    const authService = { getCurrentUser: vi.fn().mockResolvedValue(null) } as any;
    const middleware = createAuthMiddleware({ authService, requireAuth: false });

    const ctx = await middleware(makeRequest());
    expect(ctx.isAuthenticated).toBe(false);
    expect(ctx.userId).toBeUndefined();
  });

  it('returns authenticated context when user found', async () => {
    const authService = { getCurrentUser: vi.fn().mockResolvedValue({ id: '1' }) } as any;
    const middleware = createAuthMiddleware({ authService, requireAuth: false });

    const ctx = await middleware(makeRequest('token'));
    expect(ctx.isAuthenticated).toBe(true);
    expect(ctx.userId).toBe('1');
  });

  it('throws 403 when required permissions are missing', async () => {
    const authService = { getCurrentUser: vi.fn().mockResolvedValue({ id: '1' }) } as any;
    const middleware = createAuthMiddleware({
      authService,
      requireAuth: true,
      requiredPermissions: ['EDIT'],
    });

    // No permissions loaded (permission loading is a TODO in impl) → should throw 403
    await expect(middleware(makeRequest('token'))).rejects.toMatchObject({ statusCode: 403 });
  });
});
