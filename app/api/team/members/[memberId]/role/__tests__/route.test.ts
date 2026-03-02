import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from '../route';
import { getServiceContainer } from '@/lib/config/service-container';
import { NextRequest } from 'next/server';
import type { TeamMember } from '@/core/team/models';

// Mock service container
vi.mock('@/lib/config/service-container', () => ({
  getServiceContainer: vi.fn(),
}));

// Mock auth — default: authenticated as user-123 admin
vi.mock('@/middleware/auth', () => ({
  withRouteAuth: vi.fn(async (handler: any, req: any) =>
    handler(req, { userId: 'user-123', role: 'admin', permissions: [] })),
}));

// withSecurity needs CSRF which we don't want in tests — skip it
vi.mock('@/middleware/with-security', () => ({
  withSecurity: vi.fn((handler: any) => (req: any) => handler(req)),
}));

vi.mock('@/lib/audit/auditLogger', () => ({
  logUserAction: vi.fn(),
}));

const MEMBER_ID = '00000000-0000-0000-0000-000000000001';

const mockTargetMember: TeamMember = {
  id: MEMBER_ID,
  teamId: 'team-1',
  userId: 'user-456',
  role: 'member',
  isActive: true,
  joinedAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

const mockTeamService = {
  getTeamMemberById: vi.fn(),
  hasTeamRole: vi.fn(),
  updateTeamMember: vi.fn(),
};

function createRequest(memberId: string, body: object) {
  return new NextRequest(
    `http://localhost:3000/api/team/members/${memberId}/role`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

describe('PATCH /api/team/members/[memberId]/role', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getServiceContainer as ReturnType<typeof vi.fn>).mockReturnValue({
      team: mockTeamService,
    });
    mockTeamService.getTeamMemberById.mockResolvedValue(mockTargetMember);
    mockTeamService.hasTeamRole.mockResolvedValue(true);
    mockTeamService.updateTeamMember.mockResolvedValue({
      success: true,
      member: { ...mockTargetMember, role: 'viewer' },
    });
  });

  it('updates member role successfully', async () => {
    const request = createRequest(MEMBER_ID, { role: 'viewer' });
    const response = await PATCH(request, { params: Promise.resolve({ memberId: MEMBER_ID }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data.role).toBe('viewer');
    expect(mockTeamService.getTeamMemberById).toHaveBeenCalledWith(MEMBER_ID);
    expect(mockTeamService.hasTeamRole).toHaveBeenCalledWith('team-1', 'user-123', 'admin');
    expect(mockTeamService.updateTeamMember).toHaveBeenCalledWith(
      'team-1',
      'user-456',
      { role: 'viewer' }
    );
  });

  it('returns 403 when user is not an admin', async () => {
    mockTeamService.hasTeamRole.mockResolvedValue(false);

    const request = createRequest(MEMBER_ID, { role: 'viewer' });
    const response = await PATCH(request, { params: Promise.resolve({ memberId: MEMBER_ID }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.message).toContain('Only admins can update member roles');
  });

  it('returns 400 when role is invalid', async () => {
    const request = createRequest(MEMBER_ID, { role: 'superadmin' });
    const response = await PATCH(request, { params: Promise.resolve({ memberId: MEMBER_ID }) });

    expect(response.status).toBe(400);
  });

  it('returns 500 when memberId is not a UUID (unhandled ZodError)', async () => {
    // Note: paramSchema.parse throws ZodError which withErrorHandling wraps as 500
    // TODO: Route should convert ZodError to 400 ApiError
    const request = createRequest('not-a-uuid', { role: 'viewer' });
    const response = await PATCH(request, { params: Promise.resolve({ memberId: 'not-a-uuid' }) });

    expect(response.status).toBe(500);
  });

  it('returns 404 when member is not found', async () => {
    mockTeamService.getTeamMemberById.mockResolvedValue(null);

    const request = createRequest(MEMBER_ID, { role: 'viewer' });
    const response = await PATCH(request, { params: Promise.resolve({ memberId: MEMBER_ID }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.message).toContain('not found');
  });

  it('returns 404 when service update fails', async () => {
    mockTeamService.updateTeamMember.mockResolvedValue({
      success: false,
      error: 'Member not found',
    });

    const request = createRequest(MEMBER_ID, { role: 'viewer' });
    const response = await PATCH(request, { params: Promise.resolve({ memberId: MEMBER_ID }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error.message).toContain('not found');
  });

  it('returns 500 when team service is not available', async () => {
    (getServiceContainer as ReturnType<typeof vi.fn>).mockReturnValue({
      team: null,
    });

    const request = createRequest(MEMBER_ID, { role: 'viewer' });
    const response = await PATCH(request, { params: Promise.resolve({ memberId: MEMBER_ID }) });

    expect(response.status).toBe(500);
  });
});
