import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, POST } from '../route';
import { getApiTeamService } from '@/services/team/factory';
import { withRouteAuth } from '@/middleware/auth';


vi.mock('@/middleware/auth', () => ({
  withRouteAuth: vi.fn((handler: any) => async (req: any) => handler(req, { userId: 'u1', role: 'user' }))
}));

describe('team API', () => {
  const service = {
    getUserTeams: vi.fn(async () => []),
    createTeam: vi.fn(async () => ({ success: true, team: { id: 't' } }))
  } as any;

  beforeEach(() => {
    // Clear and register services in ServiceLocator
  const locator = ServiceLocator.getInstance();
  locator.clear();
  locator.register(ServiceKeys.ADDRESS_SERVICE, service);
    vi.clearAllMocks();
  });

  it('GET returns teams', async () => {
    const req = new NextRequest('http://test');
    const res = await GET(req as any);
    expect(res.status).toBe(200);
    expect(service.getUserTeams).toHaveBeenCalledWith('u1');
  });

  it('POST creates team', async () => {
    const req = new NextRequest('http://test', { method: 'POST', body: JSON.stringify({ name: 'My Team' }) });
    (req as any).json = async () => ({ name: 'My Team' });
    const res = await POST(req as any);
    expect(res.status).toBe(201);
    expect(service.createTeam).toHaveBeenCalled();
  });
});
