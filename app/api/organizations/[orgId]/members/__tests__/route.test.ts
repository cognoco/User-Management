import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
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


describe('organization members API', () => {
  const service = {
    getOrganizationMembers: vi.fn(async () => []),
    addOrganizationMember: vi.fn(async () => ({ success: true, member: { organizationId: 'o1', userId: 'u1', role: 'member' } }))
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

  it('GET returns members', async () => {
    const res = await GET(createAuthenticatedRequest('GET', 'http://test'), { params: { orgId: 'o1' } });
    expect(res.status).toBe(200);
    expect(service.getOrganizationMembers).toHaveBeenCalledWith('o1');
  });

  it('POST adds member', async () => {
    const req = createAuthenticatedRequest('POST', 'http://test', { userId: 'u1', role: 'member' });
    (req as any).json = async () => ({ userId: 'u1', role: 'member' });
    const res = await POST(req, { params: { orgId: 'o1' } });
    expect(res.status).toBe(201);
    expect(service.addOrganizationMember).toHaveBeenCalledWith('o1', 'u1', 'member');
  });
});
