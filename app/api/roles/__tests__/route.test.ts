import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { GET, POST } from '../route';
import { configureServices, resetServiceContainer } from '@/lib/config/service-container';
import type { PermissionService } from '@/core/permission/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

const mockGetAllRoles = vi.fn();
const mockCreateRole = vi.fn();

const mockService: Partial<PermissionService> = {
  getAllRoles: mockGetAllRoles,
  createRole: mockCreateRole,
};
const mockAuth: Partial<AuthService> = {
  getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }),
};

beforeEach(() => {
  vi.clearAllMocks();
  resetServiceContainer();
  configureServices({
    permissionService: mockService as PermissionService,
    authService: mockAuth as AuthService,
  });
});

describe('roles root API', () => {
  it('GET returns roles', async () => {
    mockGetAllRoles.mockResolvedValue([{ id: '1' }]);
    const res = await GET(createAuthenticatedRequest('GET', 'http://test'));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.roles).toEqual([{ id: '1' }]);
  });

  it('GET supports pagination', async () => {
    mockGetAllRoles.mockResolvedValue([{ id: '1' }, { id: '2' }]);
    const res = await GET(createAuthenticatedRequest('GET', 'http://test?page=2&limit=1'));
    const body = await res.json();
    expect(body.data.page).toBe(2);
    expect(body.data.roles).toEqual([{ id: '2' }]);
  });

  it('POST creates role', async () => {
    const req = createAuthenticatedRequest('POST', 'http://test', { name: 'r', permissions: [] });
    mockCreateRole.mockResolvedValue({ id: '1' });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect(mockCreateRole).toHaveBeenCalledWith({ name: 'r', permissions: [] }, 'u1');
  });
});
