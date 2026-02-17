import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DELETE } from '../route';
// RESOLVED VERSION
import { prisma } from '@/lib/database/prisma';
import { withRouteAuth } from '@/middleware/auth';

// Combined mocks
vi.mock('@/middleware/auth-adapter');
vi.mock('@/middleware/auth', () => ({
  withRouteAuth: vi.fn((handler: any) => async (req: any) => handler(req, { 
    userId: 'current-user-id', 
    role: 'user', 
    user: { id: 'current-user-id', email: 'admin@example.com' } 
  }))
}));
vi.mock('@/lib/database/prisma');

describe('DELETE /api/team/members/[memberId]', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    (prisma.teamMember.findFirst as any).mockResolvedValue({ id: 'current', teamId: 'team-123' });
  });

  it('should successfully remove a team member', async () => {


    // Mock team member data
    vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
      id: 'member-1',
      userId: 'user-to-remove',
      role: 'MEMBER',
      team: {
        members: [
          { id: 'admin-1', role: 'ADMIN' },
          { id: 'member-1', role: 'MEMBER' }
        ]
      }
    } as any);

    // Mock successful deletion
    vi.mocked(prisma.teamMember.delete).mockResolvedValue({} as any);

    const response = await DELETE(
      new NextRequest('http://localhost'),
      { params: { memberId: 'member-1' } }
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.message).toBe('Team member removed successfully');
  });

  it('should return 401 when user is not authenticated', async () => {
    vi.mocked(withRouteAuth).mockResolvedValueOnce(new NextResponse('unauth', { status: 401 }));

    const response = await DELETE(
      new NextRequest('http://localhost'),
      { params: { memberId: 'member-1' } }
    );

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 403 when user lacks permission', async () => {
    vi.mocked(withRouteAuth).mockResolvedValueOnce(new NextResponse('forbidden', { status: 403 }));

    const response = await DELETE(
      new NextRequest('http://localhost'),
      { params: { memberId: 'member-1' } }
    );

    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('should return 400 when trying to remove self', async () => {

    vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
      id: 'member-1',
      userId: 'current-user-id',
      role: 'MEMBER',
      team: {
        members: [
          { id: 'admin-1', role: 'ADMIN' },
          { id: 'member-1', role: 'MEMBER' }
        ]
      }
    } as any);

    const response = await DELETE(
      new NextRequest('http://localhost'),
      { params: { memberId: 'member-1' } }
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Cannot remove yourself from the team');
  });

  it('should return 400 when trying to remove last admin', async () => {

    vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
      id: 'admin-1',
      userId: 'admin-user-id',
      role: 'ADMIN',
      team: {
        members: [
          { id: 'admin-1', role: 'ADMIN' }
        ]
      }
    } as any);

    const response = await DELETE(
      new NextRequest('http://localhost'),
      { params: { memberId: 'admin-1' } }
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Cannot remove the last admin from the team');
  });

  it('should return 404 when team member is not found', async () => {
    vi.mocked(prisma.teamMember.findUnique).mockResolvedValue(null);

    const response = await DELETE(
      new NextRequest('http://localhost'),
      { params: { memberId: 'non-existent' } }
    );

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Team member not found');
  });

  it('should return 400 when memberId is invalid', async () => {

    const response = await DELETE(
      new NextRequest('http://localhost'),
      { params: { memberId: 'invalid-uuid' } }
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('Invalid member ID format');
  });

  it('should return 403 when removing member from another team', async () => {
    vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
      id: 'member-1',
      userId: 'user-x',
      role: 'MEMBER',
      teamId: 'team-other',
      team: { members: [] }
    } as any);
    vi.mocked(prisma.teamMember.findFirst).mockResolvedValue(null as any);

    const response = await DELETE(
      new NextRequest('http://localhost'),
      { params: { memberId: 'member-1' } }
    );

    expect(response.status).toBe(403);
  });

  it('should return 500 when database operation fails', async () => {

    vi.mocked(prisma.teamMember.findUnique).mockResolvedValue({
      id: 'member-1',
      userId: 'user-to-remove',
      role: 'MEMBER',
      team: {
        members: [
          { id: 'admin-1', role: 'ADMIN' },
          { id: 'member-1', role: 'MEMBER' }
        ]
      }
    } as any);

    vi.mocked(prisma.teamMember.delete).mockRejectedValue(new Error('Database error'));

    const response = await DELETE(
      new NextRequest('http://localhost'),
      { params: { memberId: 'member-1' } }
    );

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to remove team member');
  });
});