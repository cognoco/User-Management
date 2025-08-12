import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';
import type { PermissionService } from '@/core/permission/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';
import { checkPermission } from '@/lib/auth/permissionCheck';

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
vi.mock('@/lib/auth/permissionCheck', () => ({ checkPermission: vi.fn() }));

const mockService: Partial<PermissionService> = { getPermissionsForResource: vi.fn() };
const mockAuth: Partial<AuthService> = { getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }) };

beforeEach(() => {
  vi.clearAllMocks();
  
  // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.PERMISSION_SERVICE, permission || service);
  locator.register(ServiceKeys.AUTH_SERVICE, auth || service);
  (checkPermission as unknown as vi.Mock).mockResolvedValue(true);
});

describe('resource permissions list API', () => {
  it('returns paginated permissions', async () => {
    mockService.getPermissionsForResource.mockResolvedValue([
      { id: '1', userId: 'u1', permission: 'VIEW_PROJECTS', resourceType: 'project', resourceId: 'p1', createdAt: new Date() },
      { id: '2', userId: 'u2', permission: 'VIEW_PROJECTS', resourceType: 'project', resourceId: 'p1', createdAt: new Date() },
    ]);
    const req = createAuthenticatedRequest('GET', 'http://test');
    const res = await GET(req as any, { params: { type: 'project', id: 'p1' } } as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.length).toBe(2);
    expect(mockService.getPermissionsForResource).toHaveBeenCalledWith('project', 'p1');
  });
});
