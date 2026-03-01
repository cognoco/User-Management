import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { GET, POST, DELETE } from '../route';
import { configureServices, resetServiceContainer } from '@/lib/config/service-container';
import type { PermissionService } from '@/core/permission/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

const mockService = {
  getRolePermissions: vi.fn(),
  addPermissionToRole: vi.fn(),
  removePermissionFromRole: vi.fn(),
} satisfies Record<string, Mock>;

const mockAuth = {
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }),
} satisfies Record<string, Mock>;

beforeEach(() => {
  vi.clearAllMocks();
  resetServiceContainer();
  configureServices({
    permissionService: mockService as unknown as PermissionService,
    authService: mockAuth as unknown as AuthService,
  });
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
