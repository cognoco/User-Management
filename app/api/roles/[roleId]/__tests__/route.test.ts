import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PATCH, PUT, DELETE } from '../route';
import { configureServices, resetServiceContainer } from '@/lib/config/service-container';
import type { PermissionService } from '@/core/permission/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

const mockService = {
  getRoleById: vi.fn(),
  updateRole: vi.fn(),
  deleteRole: vi.fn(),
} satisfies Partial<PermissionService>;
const mockAuth = {
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }),
} satisfies Partial<AuthService>;

beforeEach(() => {
  vi.clearAllMocks();
  resetServiceContainer();
  configureServices({
    permissionService: mockService as unknown as PermissionService,
    authService: mockAuth as unknown as AuthService,
  });
});

describe('roles id API', () => {
  it('GET returns role', async () => {
    mockService.getRoleById.mockResolvedValue({ id: '1' });
    const res = await GET(createAuthenticatedRequest('GET', 'http://test/api/roles/1'));
    expect(res.status).toBe(200);
  });

  it('PATCH updates role', async () => {
    const req = createAuthenticatedRequest('PATCH', 'http://test/api/roles/1', { name: 'n' });
    mockService.updateRole.mockResolvedValue({ id: '1' });
    const res = await PATCH(req as any);
    expect(res.status).toBe(200);
    expect(mockService.updateRole).toHaveBeenCalledWith('1', { name: 'n' }, 'u1');
  });

  it('PUT updates role', async () => {
    const req = createAuthenticatedRequest('PUT', 'http://test/api/roles/1', { name: 'n' });
    mockService.updateRole.mockResolvedValue({ id: '1' });
    const res = await PUT(req as any);
    expect(res.status).toBe(200);
    expect(mockService.updateRole).toHaveBeenCalledWith('1', { name: 'n' }, 'u1');
  });

  it('DELETE removes role', async () => {
    mockService.deleteRole.mockResolvedValue(true);
    const res = await DELETE(createAuthenticatedRequest('DELETE', 'http://test/api/roles/1'));
    expect(res.status).toBe(204);
    expect(mockService.deleteRole).toHaveBeenCalledWith('1', 'u1');
  });
});
