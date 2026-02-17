import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';

vi.mock('@/middleware/auth', () => ({ withRouteAuth: vi.fn() }));
import { withRouteAuth } from '@/middleware/auth';

const mockPermissionService = {
  hasPermission: vi.fn(),
  hasResourcePermission: vi.fn(),
  getUserRoles: vi.fn(),
};
const mockRoleService = {
  getEffectivePermissions: vi.fn(),
};
const mockResolver = {
  getResourceAncestors: vi.fn(),
};

vi.mock('@/services/permission/factory', () => ({
  getApiPermissionService: () => mockPermissionService,
}));
vi.mock('@/services/role/factory', () => ({
  getApiRoleService: () => mockRoleService,
}));
vi.mock('@/lib/services/resource-permission-resolver.service', () => ({
  createResourcePermissionResolver: () => mockResolver,
}));

beforeEach(() => {
  vi.resetAllMocks();
  (withRouteAuth as any).mockImplementation((handler: any, req: any) => handler(req, {}));
});

describe('GET /api/permissions/validate', () => {
  it('returns validation info for user permission', async () => {
    mockPermissionService.hasPermission.mockResolvedValue(true);
    mockPermissionService.getUserRoles.mockResolvedValue([{ roleId: 'r1' }]);
    mockRoleService.getEffectivePermissions.mockResolvedValue(['VIEW']);
    const req = new Request('http://localhost/api/permissions/validate?userId=u1&permission=VIEW');
    const res = await GET(req as any);
    const body = await res.json();
    expect(body.data.allowed).toBe(true);
    expect(body.data.roles).toEqual(['r1']);
  });
});
