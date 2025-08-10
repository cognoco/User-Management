import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import type { PermissionService } from '@/core/permission/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

vi.mock('@/services/permission/factory', () => ({}));
vi.mock('@/services/auth/factory', () => ({}));
vi.mock('@/lib/config/service-container', () => ({
  configureServices: vi.fn(),
  resetServiceContainer: vi.fn(),
  getServiceContainer: vi.fn(),
}));

// Mock auth middleware to return authenticated context
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => () => Promise.resolve({
    isAuthenticated: true,
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: ['ADMIN'],
    token: 'test-token',
  }),
}));

const mockService: Partial<PermissionService> = { hasRole: vi.fn() };
const mockAuth: Partial<AuthService> = {
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1', email: 'test@example.com' }),
};

import { getServiceContainer } from '@/lib/config/service-container';
vi.mocked(getServiceContainer).mockReturnValue({
  permission: mockService as PermissionService,
  auth: mockAuth as AuthService,
} as any);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(mockService.hasRole!).mockResolvedValue(true);
});

function makeReq(body: any) {
  return createAuthenticatedRequest('POST', 'http://test/api/auth/check-role', body);
}

describe('POST /api/auth/check-role', () => {
  it('returns role result', async () => {
    const res = await POST(makeReq({ role: 'ADMIN' }) as any);
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.data.hasRole).toBe(true);
    expect(mockService.hasRole).toHaveBeenCalledWith('u1', 'ADMIN');
  });

  it('validates body', async () => {
    const res = await POST(makeReq({}) as any);
    expect(res.status).toBe(400);
  });
});
