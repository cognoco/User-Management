import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from '../route';
import type { PermissionService } from '@/core/permission/interfaces';

const mockPermissionService: Partial<PermissionService> = {
  getUserRoles: vi.fn(),
  getRoleById: vi.fn(),
};

// Mock withValidatedServices pattern
vi.mock('@/lib/api/with-services', async () => {
  const actual = await vi.importActual('@/lib/api/with-services');
  return {
    ...actual,
    withValidatedServices: ({ handler }: any) => async (req: any) => {
      return handler({
        data: {},
        request: req,
        userId: 'u1',
        services: {
          permissionService: mockPermissionService,
        },
      });
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(mockPermissionService.getUserRoles!).mockResolvedValue([{ roleId: 'r1' }]);
  vi.mocked(mockPermissionService.getRoleById!).mockResolvedValue({ name: 'ADMIN', permissions: ['P1'] });
});

describe('GET /api/auth/my-permissions', () => {
  it('returns aggregated permissions', async () => {
    const res = await GET(new Request('http://test') as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.roles[0]).toBe('ADMIN');
    expect(body.data.permissions).toContain('P1');
    expect(mockPermissionService.getUserRoles).toHaveBeenCalledWith('u1');
    expect(mockPermissionService.getRoleById).toHaveBeenCalledWith('r1');
  });
});
