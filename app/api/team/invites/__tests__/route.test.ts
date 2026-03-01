import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { ERROR_CODES } from '@/lib/api/common';

// --- Mock the service layer ---
const mockTeamService = {
  isTeamMember: vi.fn(),
  getTeam: vi.fn(),
  getTeamInvitations: vi.fn(),
  inviteToTeam: vi.fn(),
};

vi.mock('@/services/team/factory', () => ({
  getApiTeamService: vi.fn(() => mockTeamService),
}));

// Mock middleware chain to pass through with auth context
vi.mock('@/middleware/createMiddlewareChain', () => {
  const errorHandlingMiddleware = () => 'error';
  const routeAuthMiddleware = () => 'auth';
  const validationMiddleware = (_schema: any) => 'validation';

  return {
    errorHandlingMiddleware,
    routeAuthMiddleware,
    validationMiddleware,
    createMiddlewareChain: (_middlewares: any[]) => {
      // Return a function that wraps the handler, providing auth + parsed body
      return (handler: any) => {
        return async (req: NextRequest) => {
          try {
            const body = await req.clone().json();
            const auth = { userId: 'user-123', role: 'user', user: { id: 'user-123', email: 'admin@example.com' } };
            return await handler(req, auth, body);
          } catch (err: any) {
            if (err?.status) {
              return new Response(JSON.stringify({ error: { code: err.code, message: err.message } }), {
                status: err.status,
                headers: { 'Content-Type': 'application/json' },
              });
            }
            throw err;
          }
        };
      };
    },
  };
});

vi.mock('@/lib/rbac/roles', () => ({
  Permission: { INVITE_TEAM_MEMBER: 'invite_team_member' },
}));

describe('POST /api/team/invites', () => {
  const mockTeam = {
    id: 'team-123',
    name: 'Test Team',
  };

  const mockInvitation = {
    id: 'inv-123',
    teamId: 'team-123',
    email: 'new@example.com',
    role: 'member',
    status: 'pending',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockTeamService.isTeamMember.mockResolvedValue(true);
    mockTeamService.getTeam.mockResolvedValue(mockTeam);
    mockTeamService.getTeamInvitations.mockResolvedValue([]);
    mockTeamService.inviteToTeam.mockResolvedValue({
      success: true,
      invitation: mockInvitation,
    });
  });

  function makeRequest(body: Record<string, unknown>) {
    return new NextRequest('http://localhost:3000/api/team/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  }

  const validBody = {
    email: 'new@example.com',
    teamLicenseId: 'license-123',
    role: 'member',
  };

  it('creates a new team invite successfully', async () => {
    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data).toMatchObject({
      id: 'inv-123',
      email: 'new@example.com',
      status: 'pending',
    });

    expect(mockTeamService.isTeamMember).toHaveBeenCalledWith('license-123', 'user-123');
    expect(mockTeamService.getTeam).toHaveBeenCalledWith('license-123');
    expect(mockTeamService.inviteToTeam).toHaveBeenCalledWith('license-123', {
      email: 'new@example.com',
      role: 'member',
    });
  });

  it('returns 403 when user is not a team member', async () => {
    mockTeamService.isTeamMember.mockResolvedValue(false);

    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error.code).toBe(ERROR_CODES.FORBIDDEN);
  });

  it('returns error when team is not found', async () => {
    mockTeamService.getTeam.mockResolvedValue(null);

    const response = await POST(makeRequest(validBody));

    // The route throws createTeamNotFoundError which should result in a 404-ish error
    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('returns error when email is already invited', async () => {
    mockTeamService.getTeamInvitations.mockResolvedValue([
      { id: 'existing', email: 'new@example.com', status: 'pending' },
    ]);

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it('returns 400 when invitation creation fails', async () => {
    mockTeamService.inviteToTeam.mockResolvedValue({
      success: false,
      error: 'Seat limit reached',
    });

    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ERROR_CODES.INVALID_REQUEST);
  });

  it('returns error when team service is unavailable', async () => {
    const { getApiTeamService } = await import('@/services/team/factory');
    (getApiTeamService as any).mockReturnValueOnce(undefined);

    const response = await POST(makeRequest(validBody));
    const data = await response.json();

    expect(response.status).toBe(500);
  });
});
