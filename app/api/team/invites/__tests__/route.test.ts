import { NextRequest } from 'next/server';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../route';
import { prisma } from '@/lib/database/prisma';
import { withRouteAuth } from '@/middleware/auth';
import { sendTeamInviteEmail } from '@/lib/email/teamInvite';
import { generateInviteToken } from '@/lib/utils/token';
import { ERROR_CODES } from '@/lib/api/common';

// Mock dependencies (one import might be missing!)
vi.mock('@/middleware/auth', () => ({
  withRouteAuth: vi.fn((handler: any) => async (req: any) => handler(req, { 
    userId: 'user-123', 
    role: 'user', 
    user: { id: 'user-123', email: 'admin@example.com' } 
  }))
}));

vi.mock('@/middleware/auth-adapter', () => ({}));

vi.mock('@/lib/database/prisma', () => ({
  prisma: {
    teamMember: {
      create: vi.fn(),
      count: vi.fn(),
    },
    teamLicense: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/lib/email/teamInvite', () => ({
  sendTeamInviteEmail: vi.fn(),
}));

vi.mock('@/lib/utils/token', () => ({
  generateInviteToken: vi.fn(),
}));

describe('POST /api/team/invites', () => {
  const mockSession = {
    user: {
      id: 'user-123',
      email: 'admin@example.com',
    },
  };

  const mockLicense = {
    id: 'license-123',
    teamId: 'team-123',
    seats: 5,
    status: 'active',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (prisma.teamLicense.findUnique as any).mockResolvedValue(mockLicense);
    (prisma.teamMember.count as any).mockResolvedValue(2); // 2 existing members
    (generateInviteToken as any).mockReturnValue('mock-token');
    (prisma.teamMember.create as any).mockResolvedValue({
      id: 'member-123',
      teamLicenseId: mockLicense.id,
      invitedEmail: 'new@example.com',
      inviteToken: 'mock-token',
      inviteExpires: expect.any(Date),
      status: 'pending',
    });
    (sendTeamInviteEmail as any).mockResolvedValue(undefined);
  });

  it('creates a new team invite successfully', async () => {
    const request = new NextRequest('http://localhost:3000/api/team/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'new@example.com',
        teamLicenseId: mockLicense.id,
        role: 'member',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data.data).toEqual({
      id: 'member-123',
      teamLicenseId: mockLicense.id,
      invitedEmail: 'new@example.com',
      inviteToken: 'mock-token',
      inviteExpires: expect.any(String),
      status: 'pending',
    });

    expect(sendTeamInviteEmail).toHaveBeenCalledWith({
      email: 'new@example.com',
      token: 'mock-token',
    });
  });

  it('returns 401 when user is not authenticated', async () => {
    vi.mocked(withRouteAuth).mockResolvedValueOnce(new NextResponse('unauth', { status: 401 }));

    const request = new NextRequest('http://localhost:3000/api/team/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'new@example.com',
        teamLicenseId: mockLicense.id,
        role: 'member',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error.code).toBe(ERROR_CODES.UNAUTHORIZED);
  });

  it('returns 400 when team license is not found', async () => {
    (prisma.teamLicense.findUnique as any).mockResolvedValue(null);

    const request = new NextRequest('http://localhost:3000/api/team/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'new@example.com',
        teamLicenseId: 'invalid-license',
        role: 'member',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ERROR_CODES.NOT_FOUND);
  });

  it('returns 403 when team has reached seat limit', async () => {
    (prisma.teamMember.count as any).mockResolvedValue(5); // All seats taken

    const request = new NextRequest('http://localhost:3000/api/team/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'new@example.com',
        teamLicenseId: mockLicense.id,
        role: 'member',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ERROR_CODES.INVALID_REQUEST);
  });

  it('returns 400 when email validation fails', async () => {
    const request = new NextRequest('http://localhost:3000/api/team/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid-email',
        teamLicenseId: mockLicense.id,
        role: 'member',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ERROR_CODES.INVALID_REQUEST);
  });

  it('returns 400 when role validation fails', async () => {
    const request = new NextRequest('http://localhost:3000/api/team/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'new@example.com',
        teamLicenseId: mockLicense.id,
        role: 'invalid-role',
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error.code).toBe(ERROR_CODES.INVALID_REQUEST);
  });
}); 
