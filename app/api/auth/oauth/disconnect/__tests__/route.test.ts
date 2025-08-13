import { POST } from '../route';
import { OAuthProvider } from '@/types/oauth';
import { describe, it, expect, vi, beforeEach, MockedFunction } from 'vitest';
import { createAuthenticatedRequest } from '@/tests/utils/request-helpers';
import { logUserAction } from '@/lib/audit/auditLogger';

// Mock the auth middleware to bypass authentication
vi.mock('@/lib/api/auth-middleware', () => ({
  createAuthMiddleware: () => vi.fn((req: any) => Promise.resolve({
    userId: 'u1',
    user: { id: 'u1', email: 'test@example.com' },
    permissions: []
  }))
}));

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

// Mock OAuth service
const mockOAuthService = {
  disconnectProvider: vi.fn()
};

// Mock withValidatedServices pattern
vi.mock('@/lib/api/with-services', async () => {
  const actual = await vi.importActual('@/lib/api/with-services');
  return {
    ...actual,
    withValidatedServices: ({ handler, schema }: any) => async (req: any) => {
      try {
        const body = await req.json();
        const data = schema.parse(body);
        return handler({
          data,
          request: req,
          userId: 'logged-in-user-abc',
          services: {
            oauth: mockOAuthService,
          },
        });
      } catch (error: any) {
        if (error.name === 'ZodError') {
          return new Response(JSON.stringify({ 
            error: { 
              code: 'VALIDATION_ERROR', 
              message: error.issues?.[0]?.message || 'Validation failed' 
            } 
          }), { 
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }
        throw error;
      }
    },
  };
});

// 4. Mock OAuth service factory


// 5. Mock Audit Logger
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
    
    // Default successful responses
    mockOAuthService.disconnectProvider.mockResolvedValue({ success: true });
  });

  // Helper to create request
  const createRequest = (body: object) =>
    createAuthenticatedRequest(
      'POST',
      'http://localhost/api/auth/oauth/disconnect',
      body,
    );

  it('should return 401 if user is not authenticated', async () => {
    mockOAuthService.disconnectProvider.mockResolvedValue({ 
      success: false, 
      status: 401, 
      error: 'Authentication required' 
    });

    const request = createRequest({ provider: providerToDisconnect });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error.message).toBe('Authentication required');
    expect(mockLogUserAction).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILURE' }));
  });

  it('should return 403 if user lacks permission', async () => {
    mockOAuthService.disconnectProvider.mockResolvedValue({ 
      success: false, 
      status: 403, 
      error: 'Insufficient permissions' 
    });
    
    const request = createRequest({ provider: providerToDisconnect });
    const response = await POST(request);
    const body = await response.json();
    
    expect(response.status).toBe(403);
    expect(body.error.message).toBe('Insufficient permissions');
    expect(mockLogUserAction).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILURE' }));
  });

  it('should return 400 if provider is missing from request', async () => {
    const request = createRequest({}); // No provider
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain("provider"); // Validation error
    // Validation errors occur before route handler, so audit logging is not called
  });

  it('should return 400 if trying to unlink the last provider and no password exists', async () => {
    mockOAuthService.disconnectProvider.mockResolvedValue({
      success: false,
      status: 400,
      error: 'Cannot disconnect last authentication method. Please add a password first.'
    });

    const request = createRequest({ provider: providerToDisconnect });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain('authentication method');
    expect(mockLogUserAction).toHaveBeenCalledWith(expect.objectContaining({ status: 'FAILURE' }));
  });

  it('should return 400 if the specified provider is not linked', async () => {
    mockOAuthService.disconnectProvider.mockResolvedValue({
      success: false,
      status: 400,
      error: 'No linked account found for this provider'
    });

    const request = createRequest({ provider: providerToDisconnect });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.message).toContain('No linked account found');
    expect(mockLogUserAction).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: null,
        action: 'OAUTH_DISCONNECT',
        status: 'FAILURE',
      }),
    );
  });

  it('should successfully disconnect a provider when other methods exist (another provider)', async () => {
    mockOAuthService.disconnectProvider.mockResolvedValue({ success: true });

    const request = createRequest({ provider: providerToDisconnect });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.success).toBe(true);
    expect(mockOAuthService.disconnectProvider).toHaveBeenCalledWith(providerToDisconnect);
    expect(mockLogUserAction).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'OAUTH_DISCONNECT',
        status: 'SUCCESS',
      }),
    );
  });

  it('should successfully disconnect the last provider if a password exists', async () => {
    mockOAuthService.disconnectProvider.mockResolvedValue({ success: true });

    const request = createRequest({ provider: providerToDisconnect });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.success).toBe(true);
    expect(mockOAuthService.disconnectProvider).toHaveBeenCalledWith(providerToDisconnect);
    expect(mockLogUserAction).toHaveBeenCalledWith(expect.objectContaining({ 
      action: 'OAUTH_DISCONNECT', 
      status: 'SUCCESS' 
    }));
  });

  it('should handle errors during unlink', async () => {
    mockOAuthService.disconnectProvider.mockResolvedValue({ 
      success: false, 
      status: 500, 
      error: 'unlink failed' 
    });

    const request = createRequest({ provider: providerToDisconnect });
    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error.message).toBe('unlink failed');
    expect(mockLogUserAction).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'OAUTH_DISCONNECT', status: 'FAILURE' }),
    );
  });

});