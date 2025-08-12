import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from '../route';
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';
import type { AuthService } from '@/core/auth/interfaces';
import type { PermissionService } from '@/core/permission/interfaces';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

// Mock the auth middleware to bypass authentication
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => vi.fn((req: any) => Promise.resolve({
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: []
  }))
}));

const mockPermission: Partial<PermissionService> = { getAllPermissions: vi.fn() };
const mockAuth: Partial<AuthService> = { getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }) };

beforeEach(() => {
  vi.resetAllMocks();
  
  // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.PERMISSION_SERVICE, permission || service);
  locator.register(ServiceKeys.AUTH_SERVICE, auth || service);
});

describe('permission id API', () => {
  it('returns details for valid permission', async () => {
    const res = await GET(createAuthenticatedRequest('GET', 'http://test/api/permissions/VIEW_PROJECTS'));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.id).toBe('VIEW_PROJECTS');
  });

  it('PUT not allowed', async () => {
    const res = await PUT(createAuthenticatedRequest('PUT', 'http://test/api/permissions/VIEW_PROJECTS'));
    expect(res.status).toBe(405);
  });
});
