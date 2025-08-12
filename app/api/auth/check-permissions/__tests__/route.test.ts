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
    permissions: ['VIEW_PROJECTS'],
    token: 'test-token',
  }),
}));

const mockService: Partial<PermissionService> = { hasPermission: vi.fn() };
const mockAuth: Partial<AuthService> = {
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1', email: 'test@example.com' }),
};

import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';
vi.mocked(getServiceContainer).mockReturnValue({
  permission: mockService as PermissionService,
  auth: mockAuth as AuthService,
} as any);

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(mockService.hasPermission!).mockResolvedValue(true);
});

function createReq(body: any) {
  return createAuthenticatedRequest(
    'POST',
    'http://test/api/auth/check-permissions',
    body,
  );
}

describe('POST /api/auth/check-permissions', () => {
  it('returns results for checks', async () => {
    const res = await POST(createReq({ checks: [{ permission: 'VIEW_PROJECTS' }] }) as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.results[0].hasPermission).toBe(true);
    expect(mockService.hasPermission).toHaveBeenCalledWith('u1', 'VIEW_PROJECTS');
  });

  it('validates body', async () => {
    const res = await POST(createReq({}) as any);
    expect(res.status).toBe(400);
  });
});
