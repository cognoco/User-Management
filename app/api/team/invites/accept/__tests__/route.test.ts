import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { NextRequest } from 'next/server';
import { ERROR_CODES } from '@/lib/api/common';

// Mock service container
const mockTeamService = {
  getUserInvitations: vi.fn(),
  acceptInvitation: vi.fn(),
};

const mockAuthService = {
  validateToken: vi.fn(),
  getSession: vi.fn(),
};

vi.mock('@/lib/config/service-container', () => ({
  getServiceContainer: () => ({
    auth: mockAuthService,
    team: mockTeamService,
    permission: { hasPermission: vi.fn().mockResolvedValue(true), getUserRoles: vi.fn().mockResolvedValue([]) },
  }),
}));

// Mock auth middleware to inject auth context
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => async () => ({
    authenticated: true,
    userId: 'user-123',
    user: { id: 'user-123', email: 'test@example.com' },
  }),
}));

function createRequest(body: Record<string, unknown> = {}) {
  return new NextRequest('http://localhost:3000/api/team/invites/accept', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/team/invites/accept', () => {
  const mockInvite = {
    id: 'invite-123',
    invitedEmail: 'test@example.com',
    inviteToken: 'valid-token',
    inviteExpires: new Date(Date.now() + 24 * 60 * 60 * 1000),
    teamLicense: { id: 'license-123' },
  };

  const mockAcceptedMember = {
    id: 'member-123',
    userId: 'user-123',
    status: 'active',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamService.getUserInvitations.mockResolvedValue([mockInvite]);
    mockTeamService.acceptInvitation.mockResolvedValue({
      success: true,
      member: mockAcceptedMember,
    });
  });

  it('accepts a valid invite', async () => {
    const response = await POST(createRequest({ token: 'valid-token' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.data).toEqual(mockAcceptedMember);
    expect(mockTeamService.acceptInvitation).toHaveBeenCalledWith('invite-123', 'user-123');
  });

  it('returns error when no pending invitations exist', async () => {
    mockTeamService.getUserInvitations.mockResolvedValue([]);

    const response = await POST(createRequest({ token: 'invalid-token' }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ERROR_CODES.INVALID_REQUEST);
  });

  it('returns error when accept operation fails', async () => {
    mockTeamService.acceptInvitation.mockResolvedValue({
      success: false,
      error: 'Invitation expired',
    });

    const response = await POST(createRequest({ token: 'valid-token' }));
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error.code).toBe(ERROR_CODES.OPERATION_FAILED);
  });

  it('returns error when database operation fails', async () => {
    mockTeamService.getUserInvitations.mockRejectedValue(new Error('Database error'));

    const response = await POST(createRequest({ token: 'valid-token' }));

    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error.code).toBe(ERROR_CODES.INTERNAL_ERROR);
  });
});
