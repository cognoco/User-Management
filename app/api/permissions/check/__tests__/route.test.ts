import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from '../route';

vi.mock('@/middleware/auth', () => ({ withRouteAuth: vi.fn() }));
import { withRouteAuth } from '@/middleware/auth';

const mockPermissionService = {
  hasPermission: vi.fn(),
  hasResourcePermission: vi.fn(),
};
vi.mock('@/services/permission/factory', () => ({
  getApiPermissionService: () => mockPermissionService,
}));

vi.mock('@/lib/api/permission/error-handler', async () => {
  return await vi.importActual('@/lib/api/permission/error-handler');
});

beforeEach(() => {
  vi.resetAllMocks();
  (withRouteAuth as any).mockImplementation((handler: any, req: any) =>
    handler(req, {
      userId: 'user-1',
      user: { id: 'user-1', app_metadata: { permissions: ['VIEW_PROJECTS'] } },
    })
  );
});

describe('GET /api/permissions/check', () => {
  it('returns permission result when valid', async () => {
    mockPermissionService.hasPermission.mockResolvedValue(true);
    const req = new NextRequest('http://localhost/api/permissions/check?permission=VIEW_PROJECTS');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.allowed).toBe(true);
    expect(mockPermissionService.hasPermission).not.toHaveBeenCalled();
  });

  it('checks resource permission', async () => {
    mockPermissionService.hasResourcePermission.mockResolvedValue(true);
    const req = new NextRequest('http://localhost/api/permissions/check?permission=VIEW_PROJECTS&resource=project&resourceId=p1');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    expect(mockPermissionService.hasResourcePermission).toHaveBeenCalledWith('user-1', 'VIEW_PROJECTS', 'project', 'p1');
  });

  it('returns 404 for invalid permission', async () => {
    const req = new NextRequest('http://localhost/api/permissions/check?permission=UNKNOWN');
    const res = await GET(req as any);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('not_found');
  });

  it('returns 400 when permission missing', async () => {
    const req = new NextRequest('http://localhost/api/permissions/check');
    const res = await GET(req as any);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe('validation/error');
  });

  it('maps service errors using error handler', async () => {
    mockPermissionService.hasPermission.mockRejectedValue(new Error('permission not found'));
    (withRouteAuth as any).mockImplementationOnce((handler: any, req: any) =>
      handler(req, { userId: 'user-1', user: { id: 'user-1', app_metadata: {} } })
    );
    const req = new NextRequest('http://localhost/api/permissions/check?permission=VIEW_PROJECTS');
    const res = await GET(req as any);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe('not_found');
  });
});

describe('POST /api/permissions/check', () => {
  it('returns batch results', async () => {
    mockPermissionService.hasPermission.mockResolvedValue(true);
    const req = new NextRequest('http://localhost/api/permissions/check', {
      method: 'POST',
      body: JSON.stringify({ checks: [{ permission: 'VIEW_PROJECTS' }] }),
    });
    const res = await POST(req as any);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.data.results[0].allowed).toBe(true);
    expect(mockPermissionService.hasPermission).toHaveBeenCalledWith('user-1', 'VIEW_PROJECTS');
  });
});
