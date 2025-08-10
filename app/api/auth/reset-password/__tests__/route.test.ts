import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { POST } from '../route';

// Mock the service container to avoid circular dependencies
vi.mock('@/lib/config/service-container', () => ({
  getServiceContainer: vi.fn()
}));

vi.mock('@/middleware/with-auth-rate-limit', () => ({
  withAuthRateLimit: vi.fn((_req, handler) => handler(_req))
}));
vi.mock('@/middleware/with-security', () => ({ withSecurity: (h: any) => h }));

describe('POST /api/auth/reset-password', () => {
  const mockAuthService = { 
    resetPassword: vi.fn(),
    getCurrentUser: vi.fn().mockResolvedValue(null) // Public route
  };
  
  const mockServices = {
    auth: mockAuthService,
    user: { getUserById: vi.fn() },
    permission: { checkPermission: vi.fn() },
    session: { createSession: vi.fn() },
    team: { createTeam: vi.fn() },
    subscription: { getSubscription: vi.fn() },
    apiKey: { createApiKey: vi.fn() }
  };
  
  const createRequest = (email?: string) => new NextRequest('http://localhost/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: email ? JSON.stringify({ email }) : JSON.stringify({})
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Set required environment variables for Supabase
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
    
    // Mock the service container to return our mock services
    const { getServiceContainer } = await import('@/lib/config/service-container');
    (getServiceContainer as any).mockReturnValue(mockServices);
    
    mockAuthService.resetPassword.mockResolvedValue({ success: true });
  });

  it('validates request body', async () => {
    const res = await POST(createRequest());
    const data = await res.json();
    expect(res.status).toBe(400);
  });

  it('returns success when service succeeds', async () => {
    const res = await POST(createRequest('test@example.com'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.message).toBe('If an account exists with this email, you will receive password reset instructions.');
    expect(mockAuthService.resetPassword).toHaveBeenCalledWith('test@example.com');
  });

  it('still returns success when service fails', async () => {
    mockAuthService.resetPassword.mockResolvedValueOnce({ success: false, error: 'user not found' });
    const res = await POST(createRequest('test@example.com'));
    const data = await res.json();
    expect(res.status).toBe(200);
    expect(data.data.message).toBe('If an account exists with this email, you will receive password reset instructions.');
  });
});