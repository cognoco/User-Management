import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '../route';
import { prisma } from '@/lib/database/prisma';
import { withRouteAuth } from '@/middleware/auth';
import { NextRequest, NextResponse } from 'next/server';

// Mock dependencies
vi.mock('@/middleware/auth', () => ({
  withRouteAuth: vi.fn((handler: any) => async (req: any) =>
    handler(req, { userId: 'user-123', role: 'admin', permissions: [] }))
}));

vi.mock('@/lib/database/prisma', () => ({
  prisma: {
    teamMember: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  },
}));

describe('PATCH /api/team/members/[memberId]/role', () => {

  const mockTeamMember = {
    id: 'member-1',
    userId: 'user-456',
    teamLicenseId: 'license-123',
    role: 'member',
    status: 'active',
  };

  const mockAdminMember = {
    id: 'admin-1',
    userId: 'user-123',
    teamLicenseId: 'license-123',
    role: 'admin',
    status: 'active',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.teamMember.findUnique as any).mockResolvedValue(mockTeamMember);
    (prisma.teamMember.findFirst as any).mockResolvedValue(mockAdminMember);
    (prisma.teamMember.update as any).mockResolvedValue({
      ...mockTeamMember,
      role: 'viewer',
    });
  });

  it('updates member role successfully', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/team/members/member-1/role',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'viewer' }),
      }
    );

    const params = { memberId: 'member-1' };
    const response = await PATCH(request, { params });
    expect(response).toBeInstanceOf(NextResponse);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual({
      ...mockTeamMember,
      role: 'viewer',
    });

    expect(prisma.teamMember.update).toHaveBeenCalledWith({
      where: { id: 'member-1' },
      data: { role: 'viewer' },
    });
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(withRouteAuth).mockResolvedValueOnce(
      new NextResponse('unauth', { status: 401 })
    );

    const request = new NextRequest(
      'http://localhost:3000/api/team/members/member-1/role',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'viewer' }),
      }
    );

    const params = { memberId: 'member-1' };
    const response = await PATCH(request, { params });
    expect(response).toBeInstanceOf(NextResponse);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data).toEqual({ error: 'Unauthorized' });
  });

  it('returns 403 when user is not an admin', async () => {
    (prisma.teamMember.findFirst as any).mockResolvedValue({
      ...mockAdminMember,
      role: 'member',
    });

    const request = new NextRequest(
      'http://localhost:3000/api/team/members/member-1/role',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'viewer' }),
      }
    );

    const params = { memberId: 'member-1' };
    const response = await PATCH(request, { params });
    expect(response).toBeInstanceOf(NextResponse);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data).toEqual({ error: 'Only admins can update member roles' });
  });

  it('returns 400 when role is invalid', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/team/members/member-1/role',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'invalid-role' }),
      }
    );

    const params = { memberId: 'member-1' };
    const response = await PATCH(request, { params });
    expect(response).toBeInstanceOf(NextResponse);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain('Invalid request parameters');
  });

  it('returns 403 when updating member from another team', async () => {
    (prisma.teamMember.findUnique as any).mockResolvedValue({
      ...mockTeamMember,
      teamId: 'team-other'
    });
    (prisma.teamMember.findFirst as any).mockResolvedValue(null);

    const request = new NextRequest(
      'http://localhost:3000/api/team/members/member-1/role',
      {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'viewer' })
      }
    );

    const params = { memberId: 'member-1' };
    const response = await PATCH(request, { params });
    expect(response.status).toBe(403);
  });

  it('returns 404 when member is not found', async () => {
    (prisma.teamMember.update as any).mockRejectedValue(new Error('Not found'));

    const request = new NextRequest(
      'http://localhost:3000/api/team/members/invalid-member/role',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: 'viewer' }),
      }
    );

    const params = { memberId: 'invalid-member' };
    const response = await PATCH(request, { params });
    expect(response).toBeInstanceOf(NextResponse);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data).toEqual({ error: 'Team member not found' });
  });
}); 