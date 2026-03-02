import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET, PATCH, DELETE } from '../route';
import { getApiTeamService } from '@/services/team/factory';
import { withRouteAuth } from '@/middleware/auth';

vi.mock('@/services/team/factory', () => ({ getApiTeamService: vi.fn() }));
vi.mock('@/middleware/auth', () => ({
  withRouteAuth: vi.fn((handler: any) => async (req: any) => handler(req, { userId: 'u1', role: 'user' }))
}));

describe('[teamId] API', () => {
  const service = {
    getTeam: vi.fn(async () => ({ id: 't1' })),
    updateTeam: vi.fn(async () => ({ success: true, team: { id: 't1' } })),
    deleteTeam: vi.fn(async () => ({ success: true }))
  } as any;

  beforeEach(() => {
    vi.mocked(getApiTeamService).mockReturnValue(service);
    vi.clearAllMocks();
  });

  it('GET returns team', async () => {
    const res = await GET(new NextRequest('http://test'), { params: Promise.resolve({ teamId: 't1' }) });
    expect(res.status).toBe(200);
    expect(service.getTeam).toHaveBeenCalledWith('t1');
  });

  it('GET validates teamId', async () => {
    const res = await GET(new NextRequest('http://test'), { params: Promise.resolve({ teamId: '' }) });
    expect(res.status).toBe(400);
  });

  it('PATCH updates team', async () => {
    const req = new NextRequest('http://test', { method: 'PATCH', body: JSON.stringify({ name: 'New' }) });
    (req as any).json = async () => ({ name: 'New' });
    const res = await PATCH(req, { params: Promise.resolve({ teamId: 't1' }) });
    expect(res.status).toBe(200);
    expect(service.updateTeam).toHaveBeenCalled();
  });

  it('DELETE removes team', async () => {
    const res = await DELETE(new NextRequest('http://test'), { params: Promise.resolve({ teamId: 't1' }) });
    expect(res.status).toBe(200);
    expect(service.deleteTeam).toHaveBeenCalledWith('t1');
  });
});
