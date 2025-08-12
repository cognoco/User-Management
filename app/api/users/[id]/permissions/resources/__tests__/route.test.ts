import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';
import type { PermissionService } from '@/core/permission/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

// Mock the auth middleware to bypass authentication
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => vi.fn((req: any) => Promise.resolve({
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: []
  }))
}));

vi.mock('@/services/permission/factory', () => ({}));
vi.mock('@/services/auth/factory', () => ({}));

const mockService: Partial<PermissionService> = { getUserResourcePermissions: vi.fn() };
const mockAuth: Partial<AuthService> = { getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }) };

beforeEach(() => {
  vi.clearAllMocks();
  
  // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.PERMISSION_SERVICE, permission || service);
  locator.register(ServiceKeys.AUTH_SERVICE, auth || service);
});

describe('user resource permissions API', () => {
  it('returns filtered permissions', async () => {
    const now = new Date();
    mockService.getUserResourcePermissions.mockResolvedValue([
      { id: '1', userId: 'u1', permission: 'VIEW_PROJECTS', resourceType: 'project', resourceId: 'p1', createdAt: now },
      { id: '2', userId: 'u1', permission: 'VIEW_PROJECTS', resourceType: 'doc', resourceId: 'd1', createdAt: now },
    ]);
    const req = createAuthenticatedRequest('GET', 'http://test?resourceType=project');
    const res = await GET(req as any, { params: { id: 'u1' } } as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.permissions.length).toBe(1);
    expect(mockService.getUserResourcePermissions).toHaveBeenCalledWith('u1');
  });
});
