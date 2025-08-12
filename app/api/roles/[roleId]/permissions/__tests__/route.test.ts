import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST, DELETE } from '../route';
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

const mockService: Partial<PermissionService> = {
  getRolePermissions: vi.fn(),
  addPermissionToRole: vi.fn(),
  removePermissionFromRole: vi.fn(),
};
const mockAuth: Partial<AuthService> = {
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }),
};

beforeEach(() => {
  vi.clearAllMocks();
  
  // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.PERMISSION_SERVICE, permission || service);
  locator.register(ServiceKeys.AUTH_SERVICE, auth || service);
});

describe('role permissions API', () => {
  it('GET returns permissions', async () => {
    mockService.getRolePermissions.mockResolvedValue(['p1']);
    const res = await GET(createAuthenticatedRequest('GET', 'http://test/api/roles/1/permissions'));
    expect(res.status).toBe(200);
    expect(mockService.getRolePermissions).toHaveBeenCalledWith('1');
  });

  it('POST assigns permission', async () => {
    const req = createAuthenticatedRequest('POST', 'http://test/api/roles/1/permissions', { permission: 'p1' });
    mockService.addPermissionToRole.mockResolvedValue({ id: '123' });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    expect(mockService.addPermissionToRole).toHaveBeenCalled();
  });

  it('DELETE removes permission', async () => {
    const req = createAuthenticatedRequest('DELETE', 'http://test/api/roles/1/permissions', { permission: 'p1' });
    mockService.removePermissionFromRole.mockResolvedValue(true);
    const res = await DELETE(req as any);
    expect(res.status).toBe(204);
    expect(mockService.removePermissionFromRole).toHaveBeenCalledWith('1', 'p1');
  });
});
