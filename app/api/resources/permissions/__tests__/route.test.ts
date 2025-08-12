import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST, DELETE } from '../route';
import { withRouteAuth } from '@/middleware/auth';
import { getApiPermissionService } from '@/services/permission/factory';
import { checkPermission } from '@/lib/auth/permissionCheck';

vi.mock('@/middleware/with-security', () => ({ withSecurity: (h: any) => h }));
vi.mock('@/middleware/auth', () => ({
  withRouteAuth: vi.fn((handler: any, req: any) => handler(req, { userId: 'u1' })),
}));

vi.mock('@/lib/auth/permissionCheck', () => ({ checkPermission: vi.fn() }));

const mockService = {
  assignResourcePermission: vi.fn(),
  removeResourcePermission: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  (getApiPermissionService as unknown as vi.Mock).mockReturnValue(mockService);
  (checkPermission as unknown as vi.Mock).mockResolvedValue(true);
});

describe('resource permission API', () => {
  it('POST assigns permission', async () => {
    mockService.assignResourcePermission.mockResolvedValue({ id: '1' });
    const req = new Request('http://test', {
      method: 'POST',
      body: JSON.stringify({ userId: 'u1', permission: 'VIEW_PROJECTS', resourceType: 'project', resourceId: 'p1' }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect(mockService.assignResourcePermission).toHaveBeenCalledWith('u1', 'VIEW_PROJECTS', 'project', 'p1', 'u1');
  });

  it('DELETE removes permission', async () => {
    mockService.removeResourcePermission.mockResolvedValue(true);
    const req = new Request('http://test?userId=u1&permission=VIEW_PROJECTS&resourceType=project&resourceId=p1');
    const res = await DELETE(req as any);
    expect(res.status).toBe(204);
    expect(mockService.removeResourcePermission).toHaveBeenCalledWith('u1', 'VIEW_PROJECTS', 'project', 'p1', 'u1');
  });
});
