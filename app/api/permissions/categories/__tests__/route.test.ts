import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
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
    permissions: [],
    token: 'test-token',
  }),
}));

const mockPermission: Partial<PermissionService> = { getAllPermissions: vi.fn() };
const mockAuth: Partial<AuthService> = { getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1', email: 'test@example.com' }) };

import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';
vi.mocked(getServiceContainer).mockReturnValue({
  permission: mockPermission as PermissionService,
  auth: mockAuth as AuthService,
} as any);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('permission categories API', () => {
  it('returns category list', async () => {
    const res = await GET(createAuthenticatedRequest('GET', 'http://test'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.data.categories)).toBe(true);
    expect(body.data.categories.length).toBeGreaterThan(0);
  });
});
