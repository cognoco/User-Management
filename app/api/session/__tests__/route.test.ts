import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { GET, DELETE } from '../route';

// Mock getUserFromRequest
vi.mock('@/lib/auth/utils', () => ({
  getUserFromRequest: vi.fn()
}));

// Mock the session service factory
vi.mock('@/services/session/factory', () => ({
  getApiSessionService: vi.fn()
}));

// Mock response helpers
vi.mock('@/lib/api/common', () => ({
  createSuccessResponse: vi.fn((data) => {
    return NextResponse.json({ success: true, ...data });
  }),
  createErrorResponse: vi.fn((error, status) => {
    return NextResponse.json({ error }, { status });
  })
}));



describe('/api/session', () => {
  const mockSessionService = {
    listUserSessions: vi.fn().mockResolvedValue([]),
    revokeUserSession: vi.fn().mockResolvedValue({ success: true })
  };

  const mockUser = { id: 'user-1', email: 'test@example.com' };

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Mock the imports
    const { getUserFromRequest } = await import('@/lib/auth/utils');
    const { getApiSessionService } = await import('@/services/session/factory');
    
    // Set up the mocks
    (getUserFromRequest as any).mockResolvedValue(mockUser);
    (getApiSessionService as any).mockReturnValue(mockSessionService);
  });

  it('GET returns sessions for authenticated user', async () => {
    mockSessionService.listUserSessions.mockResolvedValue([{ id: '1' }]);
    const req = new NextRequest('http://localhost/api/session');
    const res = await GET(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.sessions.length).toBe(1);
    expect(mockSessionService.listUserSessions).toHaveBeenCalledWith('user-1');
  });

  it('GET returns 401 for unauthenticated user', async () => {
    const { getUserFromRequest } = await import('@/lib/auth/utils');
    (getUserFromRequest as any).mockResolvedValueOnce(null);
    
    const req = new NextRequest('http://localhost/api/session');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('GET returns 500 on service error', async () => {
    mockSessionService.listUserSessions.mockRejectedValue(new Error('fail'));
    const req = new NextRequest('http://localhost/api/session');
    const res = await GET(req);
    expect(res.status).toBe(500);
  });

  it('DELETE revokes all sessions for authenticated user', async () => {
    mockSessionService.listUserSessions.mockResolvedValue([{ id: '1' }, { id: '2' }]);
    mockSessionService.revokeUserSession.mockResolvedValue({ success: true });
    
    const req = new NextRequest('http://localhost/api/session', { method: 'DELETE' });
    const res = await DELETE(req);
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.count).toBe(2);
    expect(mockSessionService.listUserSessions).toHaveBeenCalledWith('user-1');
    expect(mockSessionService.revokeUserSession).toHaveBeenCalledTimes(2);
  });

  it('DELETE returns 401 for unauthenticated user', async () => {
    const { getUserFromRequest } = await import('@/lib/auth/utils');
    (getUserFromRequest as any).mockResolvedValueOnce(null);
    
    const req = new NextRequest('http://localhost/api/session', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it('DELETE returns 500 on service error', async () => {
    mockSessionService.listUserSessions.mockRejectedValue(new Error('fail'));
    
    const req = new NextRequest('http://localhost/api/session', { method: 'DELETE' });
    const res = await DELETE(req);
    expect(res.status).toBe(500);
  });
});
