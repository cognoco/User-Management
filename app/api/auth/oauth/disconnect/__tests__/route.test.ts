import { POST } from '../route';
import { OAuthProvider } from '@/types/oauth';
import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest';
import { configureServices, resetServiceContainer } from '@/lib/config/service-container';
import type { PermissionService } from '@/core/permission/interfaces';
import type { AuthService } from '@/core/auth/interfaces';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';
// import { cookies } from 'next/headers'; // Mocked
// import { createServerClient } from '@supabase/ssr'; // Mocked
import { logUserAction } from '@/lib/audit/auditLogger'; // Mocked

// --- Mocks ---

// 1. Mock next/headers cookies
const mockCookies = new Map<string, any>();
vi.mock('next/headers', () => ({
  cookies: () => ({
    get: (key: string) => mockCookies.get(key),
    set: (key: string | { name: string; [key: string]: any }, value?: string | object) => {
      if (typeof key === 'string') {
        mockCookies.set(key, { name: key, value: value, httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/', ...((typeof value === 'object') ? value : {}) });
      } else {
        mockCookies.set(key.name, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 600, path: '/', ...key });
      }
    },
    has: (key: string) => mockCookies.has(key),
    delete: (key: string) => mockCookies.delete(key),
    getAll: () => Array.from(mockCookies.values()),
  }),
}));

// 2. Mock Supabase Client
const mockSupabaseAuth = {
  getUser: vi.fn(),
  unlinkIdentity: vi.fn(),
};
const mockSupabaseClient = {
  auth: mockSupabaseAuth,
};
vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => mockSupabaseClient),
}));

// 3. Mock Permission Service
const mockPermissionService: Partial<PermissionService> = {
  hasPermission: vi.fn(),
};
vi.mock('@/services/permission/factory', () => ({}));
vi.mock('@/services/auth/factory', () => ({}));

// 4. Mock Audit Logger
vi.mock('@/lib/audit/auditLogger', () => ({
  logUserAction: vi.fn(),
}));

const mockLogUserAction = logUserAction as MockedFunction<typeof logUserAction>;

// --- Test Data ---
const loggedInUserId = 'logged-in-user-abc';
const providerToDisconnect = OAuthProvider.GITHUB;

const mockLoggedInUser = {
  id: loggedInUserId,
  email: 'original@example.com',
  identities: [],
};

// --- Test Suite ---

describe('POST /api/auth/oauth/disconnect', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockCookies.clear();
    // Assume user is logged in for most tests
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: mockLoggedInUser }, error: null });
    (mockPermissionService.hasPermission as MockedFunction<any>).mockResolvedValue(true);
    resetServiceContainer();
    configureServices({
      permissionService: mockPermissionService as PermissionService,
      authService: { getCurrentUser: vi.fn().mockResolvedValue({ id: loggedInUserId }) } as unknown as AuthService,
    });
  });

  // Helper to create request
  const createRequest = (body: object) =>
    createAuthenticatedRequest(
      'POST',
      'http://localhost/api/auth/oauth/disconnect',
      body,
    );

  it('should return 401 if user is not authenticated', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({ data: { user: null }, error: { message: 'Unauthorized', status: 401 } });

    const request = createRequest({ provider: providerToDisconnect });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe('Authentication required');
    expect(mockLogUserAction).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILURE' }));
  });

it('should return 403 if user lacks permission', async () => {
    (mockPermissionService.hasPermission as MockedFunction<any>).mockResolvedValue(false);
    const request = createRequest({ provider: providerToDisconnect });
    const response = await POST(request);
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.error).toBe('Insufficient permissions');
    expect(mockLogUserAction).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILURE' }));
  });
  it('should return 400 if provider is missing from request', async () => {
    const request = createRequest({}); // No provider
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('provider'); // Zod error
    expect(mockLogUserAction).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILURE' }));
  });

  it('should return 400 if trying to unlink the last provider and no password exists', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          ...mockLoggedInUser,
          identities: [{ provider: providerToDisconnect.toLowerCase(), identity_id: 'id1' }],
        },
      },
      error: null,
    });

    const request = createRequest({ provider: providerToDisconnect });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('at least one login method');
    expect(mockSupabaseAuth.unlinkIdentity).not.toHaveBeenCalled();
    expect(mockLogUserAction).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILURE' }));
  });

  it('should return 400 if the specified provider is not linked', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: { user: { ...mockLoggedInUser, identities: [{ provider: 'google', identity_id: 'idg' }] } },
      error: null,
    });

    const request = createRequest({ provider: providerToDisconnect });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error).toContain('No linked account found');
    expect(mockSupabaseAuth.unlinkIdentity).not.toHaveBeenCalled();
    expect(mockLogUserAction).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: loggedInUserId,
        action: 'SSO_UNLINK',
        status: 'FAILURE',
      }),
    );
  });

  it('should successfully disconnect a provider when other methods exist (another provider)', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          ...mockLoggedInUser,
          identities: [
            { provider: 'google', identity_id: 'idg' },
            { provider: providerToDisconnect.toLowerCase(), identity_id: 'idh' },
          ],
        },
      },
      error: null,
    });
    mockSupabaseAuth.unlinkIdentity.mockResolvedValue({ data: {}, error: null });

    const request = createRequest({ provider: providerToDisconnect });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockSupabaseAuth.unlinkIdentity).toHaveBeenCalledWith({ provider: providerToDisconnect.toLowerCase(), identity_id: 'idh' });
    expect(mockLogUserAction).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: loggedInUserId,
        action: 'SSO_UNLINK',
        status: 'SUCCESS',
      }),
    );
  });

  it('should successfully disconnect the last provider if a password exists', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          ...mockLoggedInUser,
          identities: [
            { provider: providerToDisconnect.toLowerCase(), identity_id: 'idh' },
            { provider: 'email', identity_id: 'ide' },
          ],
        },
      },
      error: null,
    });
    mockSupabaseAuth.unlinkIdentity.mockResolvedValue({ data: {}, error: null });

    const request = createRequest({ provider: providerToDisconnect });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(mockSupabaseAuth.unlinkIdentity).toHaveBeenCalledWith({ provider: providerToDisconnect.toLowerCase(), identity_id: 'idh' });
    expect(mockLogUserAction).toHaveBeenCalledWith(expect.objectContaining({ action: 'SSO_UNLINK', status: 'SUCCESS' }));
  });

  it('should handle errors during unlink', async () => {
    mockSupabaseAuth.getUser.mockResolvedValue({
      data: {
        user: {
          ...mockLoggedInUser,
          identities: [
            { provider: 'google', identity_id: 'idg' },
            { provider: providerToDisconnect.toLowerCase(), identity_id: 'idh' },
          ],
        },
      },
      error: null,
    });
    mockSupabaseAuth.unlinkIdentity.mockResolvedValue({ error: new Error('unlink failed'), data: null });

    const request = createRequest({ provider: providerToDisconnect });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe('unlink failed');
    expect(mockLogUserAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'SSO_UNLINK', status: 'FAILURE' }),
    );
  });

}); 