import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { GET } from '../route';
import { getApiPermissionService } from '@/services/permission/factory';

vi.mock('@/middleware/with-security', () => ({ withSecurity: (h: any) => h }));
vi.mock('@/services/permission/factory', () => ({ getApiPermissionService: vi.fn() }));
vi.mock('@/middleware/createMiddlewareChain', async () => {
  const actual = await vi.importActual<any>('@/middleware/createMiddlewareChain');
  return {
    ...actual,
    routeAuthMiddleware: vi.fn(() => (handler: any) => (req: any, _ctx?: any, data?: any) => handler(req, { userId: 'u1' }, data)),
  };
});

const mockService = {
  getUserRoles: vi.fn(),
  getRoleById: vi.fn()
};

beforeEach(() => {
  vi.clearAllMocks();
  (getApiPermissionService as unknown as Mock).mockReturnValue(mockService);
  mockService.getUserRoles.mockResolvedValue([{ roleId: 'r1' }]);
  mockService.getRoleById.mockResolvedValue({ name: 'ADMIN', permissions: ['P1'] });
});

describe('GET /api/auth/my-permissions', () => {
  it('returns aggregated permissions', async () => {
    const res = await GET(new NextRequest('http://test') as any);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.data.roles[0]).toBe('ADMIN');
    expect(body.data.permissions).toContain('P1');
  });
});
