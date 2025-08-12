import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, DELETE } from '../route';
import { withRouteAuth } from '@/middleware/auth';
import { getApiSessionService } from '@/services/session/factory';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';

// Mock the auth middleware to bypass authentication
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => vi.fn((req: any) => Promise.resolve({
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: []
  }))
}));

vi.mock('@/middleware/auth', () => ({
  withRouteAuth: vi.fn((handler: any) => async (req: any) => handler(req, { userId: 'user-1', role: 'user' })),
}));



interface MockService {
  listUserSessions?: vi.Mock;
  revokeUserSession?: vi.Mock;
}

describe('/api/session', () => {
  const user = { id: 'user-1', email: 'test@example.com' };
  let service: MockService;

  beforeEach(() => {
    service = {
      listUserSessions: vi.fn().mockResolvedValue([]),
      revokeUserSession: vi.fn().mockResolvedValue({ success: true }),
    };
    (getApiSessionService as unknown as vi.Mock).mockReturnValue(service);
  });

  it('GET returns sessions for authenticated user', async () => {
    service.listUserSessions!.mockResolvedValue([{ id: '1' }]);
    const res = await GET(createAuthenticatedRequest('GET', 'http://localhost/api/session'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.sessions.length).toBe(1);
    expect(service.listUserSessions).toHaveBeenCalledWith('user-1');
  });

  it('GET returns 401 for unauthenticated user', async () => {
    vi.mocked(withRouteAuth).mockResolvedValueOnce(new NextResponse('unauth', { status: 401 }));
    const res = await GET(createAuthenticatedRequest('GET', 'http://localhost/api/session'));
    expect(res.status).toBe(401);
  });

  it('GET returns 500 on service error', async () => {
    service.listUserSessions!.mockRejectedValue(new Error('fail'));
    const res = await GET(createAuthenticatedRequest('GET', 'http://localhost/api/session'));
    expect(res.status).toBe(500);
  });

  it('DELETE revokes all sessions for authenticated user', async () => {
    service.listUserSessions!.mockResolvedValue([{ id: '1' }, { id: '2' }]);
    service.revokeUserSession!.mockResolvedValue({ success: true });
    const res = await DELETE(createAuthenticatedRequest('DELETE', 'http://localhost/api/session'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(service.listUserSessions).toHaveBeenCalledWith('user-1');
    expect(service.revokeUserSession).toHaveBeenCalledTimes(2);
  });

  it('DELETE returns 401 for unauthenticated user', async () => {
    vi.mocked(withRouteAuth).mockResolvedValueOnce(new NextResponse('unauth', { status: 401 }));
    const res = await DELETE(createAuthenticatedRequest('DELETE', 'http://localhost/api/session'));
    expect(res.status).toBe(401);
  });

  it('DELETE returns 500 on service error', async () => {
    service.listUserSessions!.mockRejectedValue(new Error('fail'));
    const res = await DELETE(createAuthenticatedRequest('DELETE', 'http://localhost/api/session'));
    expect(res.status).toBe(500);
  });
});
