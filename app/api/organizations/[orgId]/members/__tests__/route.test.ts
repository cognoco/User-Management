import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { configureServices, resetServiceContainer } from '@/lib/config/service-container';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';


describe('organization members API', () => {
  const service = {
    getOrganizationMembers: vi.fn(async () => []),
    addOrganizationMember: vi.fn(async () => ({ success: true, member: { organizationId: 'o1', userId: 'u1', role: 'member' } }))
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
    resetServiceContainer();
    configureServices({
      organizationService: service as any,
      authService: { getCurrentUser: vi.fn().mockResolvedValue({ id: 'u1' }) } as any,
      userService: {} as any,
      permissionService: {} as any,
      teamService: {} as any,
      ssoService: {} as any,
      featureFlags: { permissions: false, teams: false, sso: false },
    });
  });

  it('GET returns members', async () => {
    const res = await GET(createAuthenticatedRequest('GET', 'http://test'), { params: Promise.resolve({ orgId: 'o1' }) });
    expect(res.status).toBe(200);
    expect(service.getOrganizationMembers).toHaveBeenCalledWith('o1');
  });

  it('POST adds member', async () => {
    const req = createAuthenticatedRequest('POST', 'http://test', { userId: 'u1', role: 'member' });
    (req as any).json = async () => ({ userId: 'u1', role: 'member' });
    const res = await POST(req, { params: Promise.resolve({ orgId: 'o1' }) });
    expect(res.status).toBe(201);
    expect(service.addOrganizationMember).toHaveBeenCalledWith('o1', 'u1', 'member');
  });
});
