import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PUT, DELETE } from '../route';
import { ServiceLocator, ServiceKeys } from '@/lib/config/service-locator';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

// Mock the auth middleware to bypass authentication
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => vi.fn((req: any) => Promise.resolve({
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: []
  }))
}));


describe('[orgId] API', () => {
  const service = {
    getOrganization: vi.fn(async () => ({ id: 'o1' })),
    updateOrganization: vi.fn(async () => ({ success: true, organization: { id: 'o1' } })),
    deleteOrganization: vi.fn(async () => ({ success: true }))
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    
  // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.ORGANIZATION_SERVICE, organization || service);
  locator.register(ServiceKeys.AUTH_SERVICE, auth || service);
  locator.register(ServiceKeys.USER_SERVICE, user || service);
  locator.register(ServiceKeys.PERMISSION_SERVICE, permission || service);
  locator.register(ServiceKeys.TEAM_SERVICE, team || service);
  locator.register(ServiceKeys.SSO_SERVICE, sso || service);
  });

  it('GET returns organization', async () => {
    const res = await GET(createAuthenticatedRequest('GET', 'http://test'), { params: { orgId: 'o1' } });
    expect(res.status).toBe(200);
    expect(service.getOrganization).toHaveBeenCalledWith('o1');
  });

  it('PUT updates organization', async () => {
    const req = createAuthenticatedRequest('PUT', 'http://test', { name: 'New' });
    (req as any).json = async () => ({ name: 'New' });
    const res = await PUT(req, { params: { orgId: 'o1' } });
    expect(res.status).toBe(200);
    expect(service.updateOrganization).toHaveBeenCalled();
  });

  it('DELETE removes organization', async () => {
    const res = await DELETE(createAuthenticatedRequest('DELETE', 'http://test'), { params: { orgId: 'o1' } });
    expect(res.status).toBe(200);
    expect(service.deleteOrganization).toHaveBeenCalledWith('o1');
  });
});
