import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from '../route';
import { withRouteAuth } from '@/middleware/auth';
import { setTableMockData, resetSupabaseMock } from '@/tests/mocks/supabase';
import { NextResponse } from 'next/server';
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
  withRouteAuth: vi.fn((handler: any) => async (req: any) => handler(req, { userId: 'u1' }))
}));

beforeEach(() => {
  vi.clearAllMocks();
  resetSupabaseMock();
});

describe('GET /api/audit/permission', () => {
  it('returns 401 when unauthenticated', async () => {
    vi.mocked(withRouteAuth).mockResolvedValueOnce(new NextResponse('unauth', { status: 401 }));
    const res = await GET(createAuthenticatedRequest('GET', 'http://localhost/api/audit/permission'));
    expect(res.status).toBe(401);
  });

  it('validates query parameters', async () => {
    const res = await GET(createAuthenticatedRequest('GET', 'http://localhost/api/audit/permission?page=bad'));
    expect(res.status).toBe(400);
  });

  it('returns logs', async () => {
    setTableMockData('user_actions_log', {
      data: [{ id: '1', created_at: '2023-01-01', user_id: 'u1', action: 'PERMISSION_ADDED', target_resource_type: 'permission' }],
      error: null
    });
    const res = await GET(createAuthenticatedRequest('GET', 'http://localhost/api/audit/permission?page=1&limit=10'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.logs.length).toBe(1);
  });
});
